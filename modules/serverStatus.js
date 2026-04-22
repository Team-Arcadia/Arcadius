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

const QUERY_TIMEOUT = 120000; // 120 secondes (2 minutes)

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
                let offset = 0;
                let packetLen = 0;
                let shift = 0;
                while (offset < buffer.length) {
                    const byte = buffer[offset++];
                    packetLen |= (byte & 0x7F) << shift;
                    shift += 7;
                    if ((byte & 0x80) === 0) break;
                }

                // Check if we have the full packet
                if (buffer.length < offset + packetLen) return;

                // Read packet ID VarInt
                let packetIdVal = 0;
                shift = 0;
                while (offset < buffer.length) {
                    const byte = buffer[offset++];
                    packetIdVal |= (byte & 0x7F) << shift;
                    shift += 7;
                    if ((byte & 0x80) === 0) break;
                }

                if (packetIdVal !== 0x00) { cleanup(); return; }

                // Read JSON string length VarInt
                let strLen = 0;
                shift = 0;
                while (offset < buffer.length) {
                    const byte = buffer[offset++];
                    strLen |= (byte & 0x7F) << shift;
                    shift += 7;
                    if ((byte & 0x80) === 0) break;
                }

                if (buffer.length < offset + strLen) return;

                const jsonStr = buffer.toString('utf8', offset, offset + strLen);
                const response = JSON.parse(jsonStr);

                if (!resolved) {
                    resolved = true;
                    resolve(response.players?.online || 0);
                }
                socket.destroy();
            } catch {
                // Incomplete data, wait for more
            }
        });
    });
}

/**
 * Fetches total player count across all configured servers.
 * @returns {Promise<number>}
 */
async function getTotalPlayerCount() {
    const counts = await Promise.all(
        SERVERS.map(s => getPlayerCount(s.host, s.port))
    );
    return counts.reduce((sum, c) => sum + c, 0);
}

module.exports = { getTotalPlayerCount, SERVERS };
