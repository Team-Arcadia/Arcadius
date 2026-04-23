// modules/readyHandler.js
// @author vyrriox
// Sets bot presence to display total Minecraft player count across all servers.

const colors = require('colors');
const { PresenceUpdateStatus, ActivityType } = require('discord.js');
const { getTotalPlayerCount } = require('./serverStatus');

const UPDATE_INTERVAL = 60_000; // Refresh every 60 seconds

/**
 * Updates the bot presence with current total player count.
 * @param {import('discord.js').Client} client
 */
async function updatePresence(client) {
    try {
        console.log(colors.cyan('🔄 Fetching player count...'));
        const totalPlayers = await getTotalPlayerCount();

        console.log(colors.green(`✅ Setting presence to: ${totalPlayers} joueur${totalPlayers !== 1 ? 's' : ''} en ligne`));

        client.user.setPresence({
            activities: [{
                name: `${totalPlayers} joueur${totalPlayers !== 1 ? 's' : ''} en ligne`,
                type: ActivityType.Watching
            }],
            status: PresenceUpdateStatus.Online
        });
    } catch (err) {
        console.error(colors.red('❌ Failed to update player count presence:'), err.message);
    }
}

const ReadyHandler = (client) => {
    client.once('ready', async () => {
        console.log(colors.green(`✅ Connecté en tant que ${colors.bold(client.user.username)}`) + colors.cyan(' • Statut: Online'));

        // Initial presence update
        console.log(colors.cyan('⏳ Updating player count on startup...'));
        await updatePresence(client);

        // Periodic refresh every 60 seconds
        console.log(colors.cyan(`⏱️  Setting up player count refresh every 60 seconds...`));
        setInterval(() => updatePresence(client), UPDATE_INTERVAL);
    });
};

module.exports = ReadyHandler;