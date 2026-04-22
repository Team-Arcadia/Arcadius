// modules/serverStatus.js
// @author vyrriox
// Queries Minecraft servers via native TCP (MC Server List Ping protocol).
// Zero external dependencies.

const net = require('net');

const SERVERS = [
    { host: '57.128.100.254', port: 25567 },
    { host: '51.195.235.151', port: 25565 },
    { host: '51.195.235.74', port: 25565 },
    { host: '51.210.178.102', port: 25565 }
];

const QUERY_TIMEOUT = 10000; // 10 secondes timeout par serveur

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
 * Builds the MC handshake + status request packet.
 * @param {string} host
 * @param {number} port
 * @returns {Buffer}
 */
function buildPingPacket(host, port) {
    const hostBuf = Buffer.from(host, 'utf8');
    const hostLen = writeVarInt(hostBuf.length);

    // Handshake payload: packetId(0x00) + protocolVersion(-1/0xFFFFFFFF) + host + port + nextState(1)
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

/**
 * Reads a VarInt from buffer starting at offset, returns {value, newOffset}
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
 * Fetches online player count from a single Minecraft server.
 * @param {string} host
 * @param {number} port
 * @returns {Promise<number>}
 */
function getPlayerCount(host, port) {
    return new Promise((resolve) => {
        const socket = new net.Socket();
        let buffer = Buffer.alloc(0);
        let resolved = false;

        const cleanup = () => {
            if (!resolved) {
                resolved = true;
                resolve(0);
            }
            socket.destroy();
        };

        socket.setTimeout(QUERY_TIMEOUT);
        socket.on('timeout', cleanup);
        socket.on('error', cleanup);

        socket.connect(port, host, () => {
            socket.write(buildPingPacket(host, port));
        });

        socket.on('data', (data) => {
            buffer = Buffer.concat([buffer, data]);

            try {
                // Read packet length VarInt
                const packetLenResult = readVarInt(buffer, 0);
                if (!packetLenResult) return; // Not enough data

                const { value: packetLen, newOffset: offset1 } = packetLenResult;

                // Check if we have the full packet
                if (buffer.length < offset1 + packetLen) return;

                // Read packet ID VarInt
                const packetIdResult = readVarInt(buffer, offset1);
                if (!packetIdResult) return; // Not enough data

                const { value: packetIdVal, newOffset: offset2 } = packetIdResult;

                if (packetIdVal !== 0x00) {
                    console.error(`Unexpected packet ID: ${packetIdVal} from ${host}:${port}`);
                    cleanup();
                    return;
                }

                // Read JSON string length VarInt
                const strLenResult = readVarInt(buffer, offset2);
                if (!strLenResult) return; // Not enough data

                const { value: strLen, newOffset: offset3 } = strLenResult;

                if (buffer.length < offset3 + strLen) return; // Not enough data for JSON

                const jsonStr = buffer.toString('utf8', offset3, offset3 + strLen);
                const response = JSON.parse(jsonStr);

                if (!resolved) {
                    resolved = true;
                    const playerCount = response.players?.online || 0;
                    resolve(playerCount);
                }
                socket.destroy();
            } catch (err) {
                console.error(`Error parsing response from ${host}:${port}: ${err.message}`);
                cleanup();
            }
        });
    });
}

/**
 * Fetches total player count across all configured servers.
 * @returns {Promise<number>}
 */
async function getTotalPlayerCount() {
    try {
        // Set a global timeout for all queries
        const globalTimeout = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Global player count query timeout')), 15000)
        );

        const counts = await Promise.race([
            Promise.all(
                SERVERS.map(s => getPlayerCount(s.host, s.port).catch(err => {
                    console.error(`Error querying ${s.host}:${s.port}: ${err.message}`);
                    return 0;
                }))
            ),
            globalTimeout
        ]);

        const total = counts.reduce((sum, c) => sum + c, 0);
        console.log(`✅ Player count updated: ${total} players online`);
        return total;
    } catch (err) {
        console.error(`❌ Failed to get total player count: ${err.message}`);
        return 0;
    }
}

module.exports = { getTotalPlayerCount, SERVERS };
