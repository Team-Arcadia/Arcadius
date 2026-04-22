#!/usr/bin/env node
/**
 * Test script to debug player count fetching
 * Usage: node test-player-count.js
 */

const colors = require('colors');
const { getTotalPlayerCount, SERVERS } = require('./modules/serverStatus');

console.log(colors.cyan('🔍 Testing Minecraft server player count fetching...\n'));

console.log('Configured servers:');
SERVERS.forEach((s, i) => {
    console.log(`  ${i + 1}. ${s.host}:${s.port}`);
});
console.log('');

async function testPlayerCount() {
    try {
        console.log(colors.cyan('⏳ Fetching total player count...'));
        const startTime = Date.now();

        const totalPlayers = await getTotalPlayerCount();

        const elapsed = Date.now() - startTime;

        console.log('');
        console.log(colors.green('✅ Success!'));
        console.log(`   Total players online: ${colors.bold(totalPlayers)}`);
        console.log(`   Query time: ${elapsed}ms`);

    } catch (err) {
        console.log('');
        console.log(colors.red('❌ Error:'), err.message);
    }

    process.exit(0);
}

testPlayerCount();
