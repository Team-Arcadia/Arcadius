// modules/serverStatus.js
// @author vyrriox
// Queries Minecraft servers via native TCP (MC Server List Ping protocol).
// Zero external dependencies.

const net = require('net');

const SERVERS = [
    { host: '57.128.100.254', port: 25567, label: 'FR-1', region: 'FR' },
    { host: '51.195.235.151', port: 25565, label: 'FR-2', region: 'FR' },
    { host: '51.195.235.74', port: 25565, label: 'FR-3', region: 'FR' },
    { host: '51.210.178.102', port: 25565, label: 'FR-4', region: 'FR' },
    { host: '103.195.102.81', port: 25525, label: 'US-1', region: 'US' },
    { host: '172.93.103.205', port: 25545, label: 'US-2', region: 'US' },
];

// Timeouts par région (ms) — les serveurs US sont plus longs à répondre
const REGION_TIMEOUTS = {
    FR: 10000,
    US: 20000,
};

const GLOBAL_TIMEOUT = 20000; // Timeout global pour toute la requête

// ─────────────────────────────────────────────
// Helpers VarInt
// ─────────────────────────────────────────────

/**
 * Writes a VarInt to a buffer and returns the bytes.
 * @param {number} value
 * @returns {Buffer}
 */
function writeVarInt(value) {
    const bytes = [];
    while (true) {
        if ((value & ~0x7F) === 0) {
            bytes.push(value);
            break;
        }
        bytes.push((value & 0x7F) | 0x80);
        value >>>= 7;
    }
    return Buffer.from(bytes);
}

/**
 * Reads a VarInt from buffer starting at offset.
 * @param {Buffer} buffer
 * @param {number} offset
 * @returns {{value: number, newOffset: number} | null}
 */
function readVarInt(buffer, offset) {
    let value = 0;
    let shift = 0;
    let i = 0;

    while (i < 5 && offset + i < buffer.length) {
        const byte = buffer[offset + i];
        value |= (byte & 0x7F) << shift;
        i++;
        if ((byte & 0x80) === 0) {
            return { value, newOffset: offset + i };
        }
        shift += 7;
    }

    return null; // Not enough data
}

/**
 * Builds the MC handshake + status request packet.
 * @param {string} host
 * @param {number} port
 * @returns {Buffer}
 */
function buildPingPacket(host, port) {
    const hostBuf = Buffer.from(host, 'utf8');
    const hostLen = writeVarInt(hostBuf.length);

    const protocolVersion = writeVarInt(0xFFFFFFFF); // -1 = unknown
    const portBuf = Buffer.alloc(2);
    portBuf.writeUInt16BE(port);
    const nextState = writeVarInt(1); // 1 = status
    const packetId = writeVarInt(0x00);

    const handshakeData = Buffer.concat([packetId, protocolVersion, hostLen, hostBuf, portBuf, nextState]);
    const handshakeLen = writeVarInt(handshakeData.length);
    const handshakePacket = Buffer.concat([handshakeLen, handshakeData]);

    // Status request: length(1) + packetId(0x00)
    const statusRequest = Buffer.from([0x01, 0x00]);

    return Buffer.concat([handshakePacket, statusRequest]);
}

// ─────────────────────────────────────────────
// Core query
// ─────────────────────────────────────────────

/**
 * Fetches online player count from a single Minecraft server.
 * @param {string} host
 * @param {number} port
 * @param {string} label  - Friendly name for logs
 * @param {string} region - 'FR' | 'US' (controls timeout)
 * @returns {Promise<{ count: number, raw: object | null, error: string | null, latency: number }>}
 */
function getPlayerCount(host, port, label = `${host}:${port}`, region = 'FR') {
    const timeout = REGION_TIMEOUTS[region] ?? 10000;

    return new Promise((resolve) => {
        const socket = new net.Socket();
        let buffer = Buffer.alloc(0);
        let resolved = false;
        const startTime = Date.now();

        const fail = (reason) => {
            if (resolved) return;
            resolved = true;
            const latency = Date.now() - startTime;
            console.warn(`  ⚠️  [${label}] ÉCHEC après ${latency}ms — ${reason}`);
            resolve({ count: 0, raw: null, error: reason, latency });
            socket.destroy();
        };

        socket.setTimeout(timeout);
        socket.on('timeout', () => fail(`Timeout (>${timeout}ms) [région ${region}]`));
        socket.on('error', (err) => fail(`Erreur socket: ${err.message}`));

        socket.connect(port, host, () => {
            console.log(`  🔌 [${label}] Connecté, envoi du ping...`);
            socket.write(buildPingPacket(host, port));
        });

        socket.on('data', (data) => {
            buffer = Buffer.concat([buffer, data]);

            try {
                const packetLenResult = readVarInt(buffer, 0);
                if (!packetLenResult) return;

                const { value: packetLen, newOffset: offset1 } = packetLenResult;
                if (buffer.length < offset1 + packetLen) return;

                const packetIdResult = readVarInt(buffer, offset1);
                if (!packetIdResult) return;

                const { value: packetIdVal, newOffset: offset2 } = packetIdResult;

                if (packetIdVal !== 0x00) {
                    fail(`Packet ID inattendu: 0x${packetIdVal.toString(16)}`);
                    return;
                }

                const strLenResult = readVarInt(buffer, offset2);
                if (!strLenResult) return;

                const { value: strLen, newOffset: offset3 } = strLenResult;
                if (buffer.length < offset3 + strLen) return;

                const jsonStr = buffer.toString('utf8', offset3, offset3 + strLen);
                const response = JSON.parse(jsonStr);

                if (!resolved) {
                    resolved = true;
                    const latency = Date.now() - startTime;
                    const count = response.players?.online ?? 0;
                    const max = response.players?.max ?? '?';
                    const motd = typeof response.description === 'string'
                        ? response.description
                        : response.description?.text ?? '(no MOTD)';

                    console.log(`  ✅ [${label}] ${count}/${max} joueurs — ${latency}ms — MOTD: "${motd.replace(/§./g, '')}"`);

                    resolve({ count, raw: response, error: null, latency });
                }
                socket.destroy();
            } catch (err) {
                fail(`Erreur parsing JSON: ${err.message}`);
            }
        });
    });
}

// ─────────────────────────────────────────────
// Agrégateur principal
// ─────────────────────────────────────────────

/**
 * Fetches total player count across all configured servers.
 * @returns {Promise<number>}
 */
async function getTotalPlayerCount() {
    console.log('\n📡 Interrogation des serveurs Minecraft...');
    console.log(`   ${SERVERS.length} serveurs configurés (${[...new Set(SERVERS.map(s => s.region))].join(', ')})\n`);

    const globalTimeout = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Timeout global dépassé (20s)')), GLOBAL_TIMEOUT)
    );

    try {
        const results = await Promise.race([
            Promise.all(
                SERVERS.map(s =>
                    getPlayerCount(s.host, s.port, s.label, s.region).catch(err => {
                        console.error(`  ❌ [${s.label}] Exception inattendue: ${err.message}`);
                        return { count: 0, raw: null, error: err.message, latency: -1 };
                    })
                )
            ),
            globalTimeout,
        ]);

        let frTotal = 0, usTotal = 0;
        results.forEach((r, i) => {
            const s = SERVERS[i];
            const label = s.label.padEnd(12);
            const region = s.region.padEnd(6);
            const players = (r.error ? 'ERREUR' : String(r.count)).padEnd(8);
            const latency = r.latency >= 0 ? `${r.latency}ms` : 'N/A';
            if (s.region === 'FR') frTotal += r.count;
            if (s.region === 'US') usTotal += r.count;
        });

        const grandTotal = frTotal + usTotal;

        console.log(`>_ 🌍 TOTAL : ${String(grandTotal).padEnd(36)}`);

        return grandTotal;

    } catch (err) {
        console.error(`\n❌ getTotalPlayerCount échoué: ${err.message}\n`);
        return 0;
    }
}

module.exports = { getTotalPlayerCount, SERVERS };