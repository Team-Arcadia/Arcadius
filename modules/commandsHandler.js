const Discord = require('discord.js');
const { REST, Routes } = Discord;
const path = require('path');
const fs = require('fs');
const colors = require('colors');
require('dotenv').config();

const commandsHandler = async (client) => {
    const commands = [];

    const commandsPath = path.join(__dirname, '../commands');

    // Charger les commandes uniquement si le dossier existe
    if (!fs.existsSync(commandsPath)) {
        console.log(colors.yellow("⚠️ Dossier 'commands' introuvable, aucune commande chargée."));
        return;
    }

    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

    for (const file of commandFiles) {
        const filePath = path.join(commandsPath, file);
        const command = require(filePath);
        client.commands.set(command.data.name, command);
        commands.push(command.data.toJSON());
    }

    const token = process.env.DISCORD_TOKEN || process.env.TOKEN;
    if (!token || !process.env.APP_ID) {
        console.log(colors.yellow("⚠️ TOKEN ou APP_ID manquant, enregistrement des commandes ignoré."));
        return;
    }

    const rest = new REST({ version: '10' }).setToken(token);

    try {
        console.log(colors.cyan("🤖 → Enregisrement des commandes..."));

        await rest.put(Routes.applicationCommands(process.env.APP_ID), {
            body: commands
        });

        console.log(colors.green("🤖 → Commandes enregistrées avec succès !"));
    } catch (error) {
        console.error(colors.red("Erreur:"), error);
    }
};

module.exports = commandsHandler;