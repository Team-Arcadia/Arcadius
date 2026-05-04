#!/usr/bin/env node
/**
 * Test script to debug player count fetching
 * Usage: node test-player-count.js
 */

const colors = require('colors');
const { getTotalPlayerCount, SERVERS } = require('../modules/serverStatus');

console.log(colors.cyan('🔍 Testing Minecraft server player count fetching...\n'));

// Affichage des serveurs configurés avec label et région
console.log(colors.bold('Configured servers:'));
SERVERS.forEach((s, i) => {
    const region = s.region === 'FR' ? colors.blue('[FR]') : colors.red('[US]');
    console.log(`  ${i + 1}. ${region} ${colors.bold(s.label)} — ${s.host}:${s.port}`);
});
console.log('');

async function testPlayerCount() {
    try {
        console.log(colors.cyan('⏳ Fetching total player count...\n'));
        const startTime = Date.now();

        const totalPlayers = await getTotalPlayerCount();

        const elapsed = Date.now() - startTime;

        console.log(colors.green('✅ Success!'));
        console.log(`   Total players online : ${colors.bold.green(totalPlayers)}`);
        console.log(`   Query time           : ${elapsed}ms`);

        // Avertissement si le total semble suspicieusement bas
        if (totalPlayers === 0) {
            console.log('');
            console.log(colors.yellow('⚠️  Total is 0 — tous les serveurs ont échoué ou sont hors ligne.'));
            console.log(colors.yellow('   Vérifie les IPs/ports et que le ping TCP est autorisé sur les serveurs.'));
        }



    } catch (err) {
        console.log('');
        console.log(colors.red('❌ Error:'), err.message);
    }

    process.exit(0);
}

testPlayerCount();