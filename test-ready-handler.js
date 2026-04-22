#!/usr/bin/env node
/**
 * Test script to verify the readyHandler works correctly
 * Usage: node test-ready-handler.js
 */

const colors = require('colors');
const { Client, GatewayIntentBits } = require('discord.js');
const readyHandler = require('./modules/readyHandler');
require('dotenv').config();

const TEST_TOKEN = process.env.DISCORD_TOKEN || process.env.TOKEN;

if (!TEST_TOKEN) {
    console.error(colors.red('❌ No token found (DISCORD_TOKEN or TOKEN env var)'));
    process.exit(1);
}

const testClient = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildPresences
    ],
});

console.log(colors.cyan('🔍 Testing readyHandler with Minecraft player count...\n'));

// Register the ready handler
readyHandler(testClient);

let readyFired = false;

testClient.on('clientReady', () => {
    readyFired = true;
    console.log(colors.green('\n✅ clientReady event fired!'));
});

testClient.on('error', (err) => {
    console.error(colors.red('❌ Client error:'), err.message);
    process.exit(1);
});

console.log(colors.cyan('🔌 Logging in...'));
testClient.login(TEST_TOKEN).catch(err => {
    console.error(colors.red('❌ Login failed:'), err.message);
    process.exit(1);
});

// Wait 15 seconds to see if ready event fires
setTimeout(() => {
    if (!readyFired) {
        console.error(colors.red('\n❌ clientReady event did not fire!'));
        process.exit(1);
    }

    console.log(colors.green('\n✅ Test completed successfully!'));
    console.log(colors.cyan('   Check Discord to verify the player count is displayed'));
    console.log(colors.cyan('   The presence should update every 60 seconds automatically'));

    process.exit(0);
}, 15000);
