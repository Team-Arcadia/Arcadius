#!/usr/bin/env node
/**
 * Test script to debug bot status presence
 * Usage: node test-bot-status.js
 */

const colors = require('colors');
const { Client, GatewayIntentBits, ActivityType, PresenceUpdateStatus } = require('discord.js');
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

testClient.once('ready', async () => {
    console.log(colors.green(`✅ Bot connecté: ${testClient.user.tag}`));
    console.log(colors.cyan(`   ID: ${testClient.user.id}`));
    console.log(colors.cyan(`   Username: ${testClient.user.username}`));
    console.log(colors.cyan(`   Discriminator: ${testClient.user.discriminator}`));
    console.log('');

    try {
        console.log(colors.cyan('🔄 Testing presence update...'));

        // Test 1: Simple activity
        await testClient.user.setActivity('Test Activity', { type: ActivityType.Watching });
        console.log(colors.green('✅ Simple activity set successfully'));

        // Wait a bit
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Test 2: Full presence with status
        await testClient.user.setPresence({
            activities: [{
                name: '24 joueurs en ligne',
                type: ActivityType.Watching
            }],
            status: PresenceUpdateStatus.Online
        });
        console.log(colors.green('✅ Full presence set successfully'));
        console.log('   Name: "24 joueurs en ligne"');
        console.log('   Type: Watching');
        console.log('   Status: Online');

        console.log('');
        console.log(colors.yellow('⏳ Keeping connection open for 10 seconds to verify...'));

        await new Promise(resolve => setTimeout(resolve, 10000));

        console.log(colors.green('✅ Test completed!'));
        console.log(colors.yellow('📝 Note: Check Discord to confirm the presence is visible'));

    } catch (err) {
        console.error(colors.red('❌ Error setting presence:'), err.message);
        console.error(err);
    }

    process.exit(0);
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
