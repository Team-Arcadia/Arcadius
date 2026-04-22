const fs = require('fs');
const path = require('path');
const colors = require('colors');
const { InteractionType, EmbedBuilder, MessageFlags } = require('discord.js');

module.exports = (client) => {
    const eventsPath = path.join(__dirname, '..', 'events');

    // Charger les fichiers d'événements uniquement si le dossier existe
    if (fs.existsSync(eventsPath)) {
        const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

        for (const file of eventFiles) {
            const filePath = path.join(eventsPath, file);
            const event = require(filePath);

            if (event.once) {
                client.once(event.name, (...args) => event.execute(...args));
            } else {
                client.on(event.name, (...args) => event.execute(...args));
            }
        }
    }

    client.on('interactionCreate', async interaction => {
        try {
            if (interaction.type === InteractionType.ApplicationCommand) {
                const command = client.commands.get(interaction.commandName);
                if (!command) return;

                try {
                    await command.execute(interaction);
                } catch (error) {
                    console.error(colors.red('Erreur lors de l\'exécution de la commande:'), error);
                    try {
                        if (interaction.deferred && !interaction.replied) {
                            await interaction.editReply({
                                content: '❌ Une erreur est survenue lors de l\'exécution de cette commande !'
                            });
                        } else if (!interaction.replied && !interaction.deferred) {
                            await interaction.reply({
                                content: '❌ Une erreur est survenue lors de l\'exécution de cette commande !',
                                flags: MessageFlags.Ephemeral
                            });
                        }
                    } catch (replyError) {
                        console.error(colors.red('Impossible de répondre à l\'interaction:'), replyError.message);
                    }
                }
            } else if (interaction.type === InteractionType.ModalSubmit) {
                try {
                    if (interaction.customId === 'suggestionModal') {
                        // Vérification que tous les champs requis sont présents
                        if (!interaction.fields.fields.has('titleInput') || !interaction.fields.fields.has('descriptionInput')) {
                            throw new Error('Champs manquants dans le modal');
                        }

                        // Récupération des valeurs du modal
                        const title = interaction.fields.getTextInputValue('titleInput');
                        const description = interaction.fields.getTextInputValue('descriptionInput');

                        // Vérification que les champs ne sont pas vides
                        if (!title.trim() || !description.trim()) {
                            await interaction.reply({
                                content: '❌ Les champs ne peuvent pas être vides.',
                                flags: MessageFlags.Ephemeral
                            });
                            return;
                        }

                        // Création de l'embed pour la suggestion
                        const suggestionEmbed = new EmbedBuilder()
                            .setColor('#00ff00')
                            .setTitle('📝 Nouvelle Suggestion')
                            .setAuthor({
                                name: interaction.user.tag,
                                iconURL: interaction.user.displayAvatarURL({ dynamic: true })
                            })
                            .addFields(
                                { name: '📌 Titre', value: title },
                                { name: '📄 Description', value: description }
                            )
                            .setFooter({
                                text: `ID: ${interaction.user.id}`
                            })
                            .setTimestamp();

                        // Envoi dans le canal de suggestions
                        const channel = interaction.channel;
                        if (!channel) {
                            throw new Error('Canal introuvable');
                        }

                        const message = await channel.send({ embeds: [suggestionEmbed] });
                        // Ajout des réactions pour le vote
                        await message.react('👍');
                        await message.react('👎');

                        // Confirmation à l'utilisateur
                        if (!interaction.replied) {
                            await interaction.reply({
                                content: '✅ Votre suggestion a été envoyée avec succès !',
                                flags: MessageFlags.Ephemeral
                            });
                        }
                    }
                } catch (error) {
                    console.error(colors.red('Erreur dans le traitement du modal:'), error);
                    try {
                        if (!interaction.replied && !interaction.deferred) {
                            await interaction.reply({
                                content: '❌ Une erreur est survenue lors du traitement de votre suggestion.',
                                flags: MessageFlags.Ephemeral
                            });
                        }
                    } catch (replyError) {
                        console.error(colors.red('Impossible de répondre à l\'interaction:'), replyError.message);
                    }
                }
            }
        } catch (error) {
            console.error(colors.red('Erreur dans le gestionnaire d\'interactions:'), error);
        }
    });
};
