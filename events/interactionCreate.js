// events/interactionCreate.js
const { Collection } = require('discord.js');
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
            await command.execute(interaction);
        } catch (error) {
            console.error(error);
            
            // Vérifier si l'interaction n'a pas déjà été traitée
            if (!interaction.replied && !interaction.deferred) {
                const errorEmbed = BotEmbeds.createCommandErrorEmbed();
                try {
                    await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
                } catch (replyError) {
                    console.error('Erreur lors de la réponse d\'erreur:', replyError);
                }
            }
        }
    }
};