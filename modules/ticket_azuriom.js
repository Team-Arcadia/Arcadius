import 'dotenv/config';
import { Client, GatewayIntentBits, Partials, EmbedBuilder } from 'discord.js';

const {
    DISCORD_TOKEN,
    AZURIOM_URL,
    SUPPORT_TOKEN,
    POLL_INTERVAL_SECONDS = '10',
    POLL_LIMIT = '50',
    FORWARD_DM_REPLIES = '1',
    LOG_LEVEL = 'info',
} = process.env;

if (!DISCORD_TOKEN || !AZURIOM_URL || !SUPPORT_TOKEN) {
    console.error('Missing required env vars: DISCORD_TOKEN, AZURIOM_URL, SUPPORT_TOKEN');
    process.exit(1);
}

const apiBase = AZURIOM_URL.replace(/\/+$/, '') + '/api/support/discord-follow';
const pollInterval = Math.max(2, parseInt(POLL_INTERVAL_SECONDS, 10) || 10) * 1000;
const pollLimit = Math.min(200, Math.max(1, parseInt(POLL_LIMIT, 10) || 50));
const forwardReplies = FORWARD_DM_REPLIES === '1' || FORWARD_DM_REPLIES === 'true';

const LEVELS = { error: 0, warn: 1, info: 2, debug: 3 };
const currentLevel = LEVELS[LOG_LEVEL] ?? LEVELS.info;
const log = {
    error: (...a) => currentLevel >= LEVELS.error && console.error('[error]', ...a),
    warn: (...a) => currentLevel >= LEVELS.warn && console.warn('[warn]', ...a),
    info: (...a) => currentLevel >= LEVELS.info && console.log('[info]', ...a),
    debug: (...a) => currentLevel >= LEVELS.debug && console.log('[debug]', ...a),
};

const recentTicketByDiscordId = new Map();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.MessageContent,
    ],
    partials: [Partials.Channel, Partials.Message, Partials.User],
});

const labels = {
    created: 'New ticket opened',
    staff_comment: 'Staff replied',
    status_closed: 'Ticket closed',
    status_reopened: 'Ticket reopened',
    assigned: 'Ticket assigned',
    priority: 'Priority changed',
};

const colors = {
    created: 0x004de6,
    staff_comment: 0x0d6efd,
    status_closed: 0xdc3545,
    status_reopened: 0x198754,
    assigned: 0x0dcaf0,
    priority: 0xfd7e14,
};

function buildEmbed(event) {
    const { type, ticket, payload } = event;
    const embed = new EmbedBuilder()
        .setColor(colors[type] ?? 0x004de6)
        .setTitle(labels[type] ?? type)
        .setURL(ticket.url)
        .setTimestamp(new Date(event.created_at))
        .addFields(
            { name: 'Ticket', value: `#${ticket.id} — ${ticket.subject}` },
            { name: 'Category', value: ticket.category ?? '—', inline: true },
            { name: 'Priority', value: ticket.priority ?? 'normal', inline: true },
        );

    if (type === 'staff_comment' && payload?.excerpt) {
        embed.addFields({ name: payload.author ? `Reply from ${payload.author}` : 'Reply', value: payload.excerpt });
    }

    if (type === 'assigned' && payload?.assignee_name) {
        embed.addFields({ name: 'Assigned to', value: payload.assignee_name, inline: true });
    }

    if (type === 'priority') {
        const previous = payload?.previous ?? '—';
        const current = payload?.current ?? ticket.priority ?? '—';
        embed.addFields({ name: 'Change', value: `${previous} → **${current}**`, inline: true });
    }

    embed.setFooter({ text: 'Azuriom Support' });

    return embed;
}

async function api(path, options = {}) {
    const url = apiBase + path;
    const headers = {
        Authorization: `Bearer ${SUPPORT_TOKEN}`,
        Accept: 'application/json',
        ...(options.headers ?? {}),
    };

    if (options.body && !headers['Content-Type']) {
        headers['Content-Type'] = 'application/json';
    }

    const res = await fetch(url, { ...options, headers });
    const text = await res.text();
    let data = null;
    try {
        data = text ? JSON.parse(text) : null;
    } catch {
        data = text;
    }

    if (!res.ok) {
        const err = new Error(`API ${path} failed with ${res.status}`);
        err.status = res.status;
        err.body = data;
        throw err;
    }

    return data;
}

// Discord error codes that mean "do not retry, ack and move on"
const PERMANENT_ERROR_CODES = new Set([
    50007, // Cannot send messages to this user (DMs disabled / blocked / no mutual guild)
    10013, // Unknown user
    10003, // Unknown channel
]);

function isPermanentError(err) {
    const codes = [err?.code, err?.rawError?.code, err?.errors?.code];
    if (codes.some((c) => PERMANENT_ERROR_CODES.has(c))) {
        return true;
    }
    const msg = (err?.message ?? '').toLowerCase();
    return (
        msg.includes('cannot send messages to this user') ||
        msg.includes('no mutual guilds') ||
        msg.includes('unknown user')
    );
}

async function deliverEvent(event) {
    const discordId = event.recipient?.discord_id;

    if (!discordId) {
        log.debug('event', event.event_id, 'has no recipient discord id, skipping');
        return { ack: true };
    }

    try {
        const user = await client.users.fetch(discordId);
        await user.send({ embeds: [buildEmbed(event)] });
        recentTicketByDiscordId.set(discordId, event.ticket.id);
        log.info(`delivered event #${event.event_id} (${event.type}) to ${user.tag}`);
        return { ack: true };
    } catch (e) {
        const permanent = isPermanentError(e);
        const reason = (e?.message ?? '').slice(0, 180) || 'unknown_error';
        log.warn(
            `could not DM ${discordId} for event #${event.event_id} (${permanent ? 'discarded' : 'will retry'}): ${reason}`
        );
        return permanent ? { fail: true, reason } : { retry: true };
    }
}

async function pollOnce() {
    let result;
    try {
        result = await api(`/events?limit=${pollLimit}`);
    } catch (e) {
        log.error('poll failed:', e?.message ?? e);
        return;
    }

    const events = result?.events ?? [];

    if (events.length === 0) {
        log.debug('no events to deliver');
        return;
    }

    log.info(`pulled ${events.length} event(s)`);

    const acked = [];
    const failed = [];
    let lastFailReason = null;

    for (const event of events) {
        const outcome = await deliverEvent(event);
        if (outcome.ack) {
            acked.push(event.event_id);
        } else if (outcome.fail) {
            failed.push(event.event_id);
            lastFailReason = outcome.reason;
        }
    }

    if (acked.length > 0) {
        try {
            await api('/ack', { method: 'POST', body: JSON.stringify({ event_ids: acked }) });
            log.debug(`acked ${acked.length} event(s)`);
        } catch (e) {
            log.error('ack failed:', e?.message ?? e);
        }
    }

    if (failed.length > 0) {
        try {
            await api('/fail', {
                method: 'POST',
                body: JSON.stringify({ event_ids: failed, reason: lastFailReason ?? 'undeliverable' }),
            });
            log.info(`discarded ${failed.length} undeliverable event(s)`);
        } catch (e) {
            log.error('fail-ack failed:', e?.message ?? e);
        }
    }
}

client.once('ready', () => {
    log.info(`logged in as ${client.user.tag}`);
    log.info(`polling ${apiBase}/events every ${pollInterval / 1000}s`);
    pollOnce();
    setInterval(pollOnce, pollInterval);
});

if (forwardReplies) {
    client.on('messageCreate', async (message) => {
        if (message.author.bot || message.guild) {
            return;
        }

        if (!message.content || message.content.trim().length === 0) {
            return;
        }

        const ticketId = recentTicketByDiscordId.get(message.author.id);

        if (!ticketId) {
            await message.reply('Reply received but I do not know which ticket it is for. Please reply on the website directly.').catch(() => { });
            return;
        }

        try {
            await api('/reply', {
                method: 'POST',
                body: JSON.stringify({
                    ticket_id: ticketId,
                    discord_id: message.author.id,
                    content: message.content,
                }),
            });
            await message.react('✅').catch(() => { });
            log.info(`forwarded DM reply from ${message.author.tag} to ticket #${ticketId}`);
        } catch (e) {
            await message.reply('Could not forward your reply to the ticket. Please reply on the website.').catch(() => { });
            log.warn('reply forward failed:', e?.message ?? e);
        }
    });
}

client.on('error', (err) => log.error('discord client error:', err?.message ?? err));
process.on('unhandledRejection', (err) => log.error('unhandled rejection:', err?.message ?? err));

client.login(DISCORD_TOKEN);
