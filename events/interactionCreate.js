// events/interactionCreate.js
const { Collection, MessageFlags } = require('discord.js');
const BotEmbeds = require('../utils/embeds');
const helpCommand = require('../commands/public/help');

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
        }

        // Suppression du support des boutons/modals tempvoice
        
        if (!interaction.isChatInputCommand()) return;

        const command = client.commands.get(interaction.commandName);
        if (!command) return;

        // Système de cooldown
        const { cooldowns } = client;
        if (!cooldowns.has(command.data.name)) {
            cooldowns.set(command.data.name, new Collection());
        }

        const now = Date.now();
        const timestamps = cooldowns.get(command.data.name);
        const cooldownAmount = (command.cooldown || 3) * 1000;

        if (timestamps.has(interaction.user.id)) {
            const expirationTime = timestamps.get(interaction.user.id) + cooldownAmount;

            if (now < expirationTime) {
                const timeLeft = (expirationTime - now) / 1000;
                const errorEmbed = BotEmbeds.createCooldownErrorEmbed(timeLeft);
                return interaction.reply({ components: [errorEmbed], flags: require('discord.js').MessageFlags.IsComponentsV2 });
            }
        }

        timestamps.set(interaction.user.id, now);
        setTimeout(() => timestamps.delete(interaction.user.id), cooldownAmount);

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