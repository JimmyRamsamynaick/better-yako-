// commands/moderation/clear.js
const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const Guild = require('../../models/Guild');
const BotEmbeds = require('../../utils/embeds');
const LanguageManager = require('../../utils/languageManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('clear')
        .setDescription(LanguageManager.get('fr', 'commands.clear.description') || 'Supprimer des messages')
        .setDescriptionLocalizations({
            'en': LanguageManager.get('en', 'commands.clear.description') || 'Delete messages'
        })
        .addIntegerOption(option =>
            option.setName('amount')
                .setDescription(LanguageManager.get('fr', 'commands.clear.amount_option') || 'Nombre de messages à supprimer (1-100)')
                .setDescriptionLocalizations({
                    'en': LanguageManager.get('en', 'commands.clear.amount_option') || 'Number of messages to delete (1-100)'
                })
                .setMinValue(1)
                .setMaxValue(100)
                .setRequired(true))
        .addUserOption(option =>
            option.setName('user')
                .setDescription(LanguageManager.get('fr', 'commands.clear.user_option') || 'Supprimer seulement les messages de cet utilisateur')
                .setDescriptionLocalizations({
                    'en': LanguageManager.get('en', 'commands.clear.user_option') || 'Delete only messages from this user'
                })
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
            const noPermEmbed = BotEmbeds.createNoPermissionEmbed(interaction.guild.id, lang);
            return interaction.reply({
                ...noPermEmbed,
                ephemeral: true
            });
        }

        // Vérifier les permissions du bot
        if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.ManageMessages)) {
            const botNoPermEmbed = BotEmbeds.createBotNoPermissionEmbed(interaction.guild.id, lang);
            return interaction.reply({
                ...botNoPermEmbed,
                ephemeral: true
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
                    const errorEmbed = BotEmbeds.createGenericErrorEmbed(errorMsg, interaction.guild.id);
                    return interaction.reply({
                        ...errorEmbed,
                        ephemeral: true
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
                await interaction.reply({ ...errorEmbed, ephemeral: true });
            }
        }
    }
};