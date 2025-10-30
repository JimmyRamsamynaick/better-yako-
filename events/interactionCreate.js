// events/interactionCreate.js
const { Collection, MessageFlags } = require('discord.js');
const BotEmbeds = require('../utils/embeds');
const helpCommand = require('../commands/public/help');
const ticketpanelCommand = require('../commands/public/ticketpanel');

module.exports = {
    name: 'interactionCreate',
    async execute(interaction, client) {
        // Gérer les interactions de composants (menus déroulants, boutons)
        if (interaction.isStringSelectMenu()) {
            // Déléguer les interactions help au fichier help.js
            if (interaction.customId === 'help_category_select') {
                await helpCommand.handleSelectMenuInteraction(interaction);
                return;
            }

            // Sélecteur de catégorie de ticket
            if (interaction.customId === 'ticket_category_select') {
                try {
                    await ticketpanelCommand.handleSelectMenuInteraction(interaction);
                } catch (err) {
                    console.error('[Tickets] Select menu handling failed:', err);
                    const errorEmbed = BotEmbeds.createGenericErrorEmbed('Échec de l\'interaction de ticket.');
                    try { await interaction.reply(errorEmbed); } catch (_) {}
                }
                return;
            }
        }

        // Boutons du système de tickets (ouvrir/fermer)
        if (interaction.isButton()) {
            const id = interaction.customId || '';
            if (id.startsWith('ticket_category:')) {
                try {
                    await ticketpanelCommand.handleButtonInteraction(interaction);
                } catch (err) {
                    console.error('[Tickets] Button handling failed:', err);
                    const errorEmbed = BotEmbeds.createGenericErrorEmbed('Échec de l\'interaction de ticket.');
                    try { await interaction.reply(errorEmbed); } catch (_) {}
                }
                return;
            }
            if (id.startsWith('ticket_close:')) {
                try {
                    await ticketpanelCommand.handleCloseButton(interaction);
                } catch (err) {
                    console.error('[Tickets] Close button handling failed:', err);
                    const errorEmbed = BotEmbeds.createGenericErrorEmbed('Échec de la fermeture du ticket.');
                    try { await interaction.reply(errorEmbed); } catch (_) {}
                }
                return;
            }
        }

        // Suppression du support des boutons/modals tempvoice
        
        if (!interaction.isChatInputCommand()) return;

        const command = client.commands.get(interaction.commandName);
        if (!command) return;

        // Système de cooldown
        // Désactivation du système de cooldown (à la demande de l'utilisateur)
        // Si vous souhaitez le réactiver, entourez le bloc avec:
        // if (process.env.ENABLE_COOLDOWN === 'true') { ... }

        try {
            // Laisser chaque commande gérer son propre acquittement (deferReply)
            if (process.env.DEBUG_INTERACTIONS === 'true') {
                console.log('[Handler] Before execute:', { deferred: interaction.deferred, replied: interaction.replied, cmd: command.data.name });
            }
            await command.execute(interaction);
        } catch (error) {
            console.error('Erreur lors de l\'exécution de la commande:', error);
            const errorEmbed = BotEmbeds.createCommandErrorEmbed();

            // Si la commande a déjà acquitté ou répondu, éviter le doublon
            if (interaction.deferred || interaction.replied) {
                console.warn('[Handler] Interaction déjà acquittée, on évite le message d\'erreur global.');
                return;
            }

            // Sinon, tenter une réponse éphémère puis basculer sur editReply/followUp si nécessaire
            try {
                await interaction.reply({ ...errorEmbed, flags: MessageFlags.Ephemeral });
            } catch (replyError) {
                console.error('Réponse directe impossible, tentative editReply:', replyError.message);
                try {
                    await interaction.editReply({ ...errorEmbed });
                } catch (editError) {
                    console.error('Impossible d\'envoyer l\'erreur via editReply:', editError.message);
                    try {
                        await interaction.followUp({ ...errorEmbed, flags: MessageFlags.Ephemeral });
                    } catch (followError) {
                        console.error('Échec du followUp pour l\'erreur:', followError.message);
                    }
                }
            }
        }
    }
};