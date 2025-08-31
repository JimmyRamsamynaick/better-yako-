// commands/moderation/clear.js
const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const Guild = require('../../models/Guild');
const BotEmbeds = require('../../utils/embeds');
const LanguageManager = require('../../utils/languageManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('clear')
        .setDescription('Supprimer des messages')
        .addIntegerOption(option =>
            option.setName('amount')
                .setDescription('Nombre de messages à supprimer (1-100)')
                .setMinValue(1)
                .setMaxValue(100)
                .setRequired(true))
        .addUserOption(option =>
            option.setName('user')
                .setDescription('Supprimer seulement les messages de cet utilisateur')
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
    
    async execute(interaction) {
        const amount = interaction.options.getInteger('amount');
        const targetUser = interaction.options.getUser('user');

        // Pas de defer pour éviter l'erreur Unknown interaction

        // Récupérer la langue du serveur
        const guildData = await Guild.findOne({ guildId: interaction.guild.id });
        const lang = guildData?.language || 'fr';

        // Vérifier les permissions de l'utilisateur
        if (!interaction.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
            return interaction.reply({ 
                components: [BotEmbeds.createNoPermissionEmbed(interaction.guild.id, lang)],
                flags: MessageFlags.IsComponentsV2
            });
        }

        // Vérifier les permissions du bot
        if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.ManageMessages)) {
            return interaction.reply({
                components: [BotEmbeds.createBotNoPermissionEmbed(interaction.guild.id, lang)],
                flags: MessageFlags.IsComponentsV2
            });
        }

        try {
            // Récupérer les messages
            const messages = await interaction.channel.messages.fetch({ limit: targetUser ? 100 : amount });
            
            let messagesToDelete;
            if (targetUser) {
                // Filtrer les messages de l'utilisateur spécifique
                messagesToDelete = messages.filter(msg => msg.author.id === targetUser.id).first(amount);
                
                if (messagesToDelete.size === 0) {
                    const errorMsg = LanguageManager.get(lang, 'clear.no_messages_found', {
                        user: targetUser.username
                    });
                    return interaction.reply({
                        components: [BotEmbeds.createGenericErrorEmbed(errorMsg, interaction.guild.id)],
                        flags: MessageFlags.IsComponentsV2
                    });
                }
            } else {
                // Prendre les X derniers messages
                messagesToDelete = messages.first(amount);
            }

            // Supprimer les messages
            const deleted = await interaction.channel.bulkDelete(messagesToDelete, true);

            // Message de succès avec traduction
            let successMsg;
            if (targetUser) {
                successMsg = LanguageManager.get(lang, 'clear.success_user', {
                    user: interaction.user.toString(),
                    count: deleted.size,
                    target: targetUser.toString()
                });
            } else {
                successMsg = LanguageManager.get(lang, 'clear.success', {
                    user: interaction.user.toString(),
                    count: deleted.size
                });
            }

            const successEmbed = BotEmbeds.createClearSuccessEmbed(deleted.size, targetUser, interaction.guild.id, lang, interaction.user);
            await interaction.reply({ ...successEmbed, ephemeral: true });

        } catch (error) {
            console.error('Erreur lors de la suppression des messages:', error);
            const errorMsg = LanguageManager.get(lang, 'clear.error');
            if (!interaction.replied && !interaction.deferred) {
                const errorEmbed = BotEmbeds.createGenericErrorEmbed(errorMsg, interaction.guild.id);
                await interaction.reply({ components: [errorEmbed], flags: MessageFlags.IsComponentsV2 });
            }
        }
    }
};