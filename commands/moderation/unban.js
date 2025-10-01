// commands/moderation/unban.js
const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const { ComponentsV3 } = require('../../utils/ComponentsV3');
const Guild = require('../../models/Guild');
const LanguageManager = require('../../utils/languageManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('unban')
        .setDescription(LanguageManager.get('fr', 'commands.unban.description') || 'Débannir un utilisateur')
        .setDescriptionLocalizations({
            'EnglishUS': LanguageManager.get('en', 'commands.unban.description') || 'Unban a user'
        })
        .addStringOption(option =>
            option.setName('userid')
                .setDescription(LanguageManager.get('fr', 'commands.unban.userid_option') || 'ID de l\'utilisateur à débannir')
                .setDescriptionLocalizations({
                    'EnglishUS': LanguageManager.get('en', 'commands.unban.userid_option') || 'ID of the user to unban'
                })
                .setRequired(true))
        .addStringOption(option =>
            option.setName('reason')
                .setDescription(LanguageManager.get('fr', 'commands.unban.reason_option') || 'Raison du débannissement')
                .setDescriptionLocalizations({
                    'EnglishUS': LanguageManager.get('en', 'commands.unban.reason_option') || 'Reason for the unban'
                })
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),
    
    async execute(interaction) {
        // Déférer la réponse immédiatement pour éviter l'expiration
        await interaction.deferReply();
        
        let userId = interaction.options.getString('userid');
        
        // Extraire l'ID de la mention si nécessaire
        if (userId.startsWith('<@') && userId.endsWith('>')) {
            userId = userId.slice(2, -1);
            if (userId.startsWith('!')) {
                userId = userId.slice(1);
            }
        }
        
        // Récupération de la langue du serveur
        const guildData = await Guild.findOne({ guildId: interaction.guild.id }) || { language: 'fr' };
        const lang = guildData.language || 'fr';
        
        const reason = interaction.options.getString('reason') || require('../../utils/languageManager').get(lang, 'common.no_reason');

        if (!interaction.member.permissions.has(PermissionFlagsBits.BanMembers)) {
            try {
                const noPermMessage = await ComponentsV3.errorEmbed(interaction.guild.id, 'common.no_permission');
                return await interaction.editReply({
                    ...noPermMessage
                });
            } catch (replyError) {
                console.error('Erreur lors de la réponse d\'interaction (no permission):', replyError);
                return;
            }
        }

        if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.BanMembers)) {
            try {
                const botNoPermMessage = await ComponentsV3.errorEmbed(interaction.guild.id, 'commands.ban.error_bot_permissions');
                return await interaction.editReply({
                    ...botNoPermMessage
                });
            } catch (replyError) {
                console.error('Erreur lors de la réponse d\'interaction (bot no permission):', replyError);
                return;
            }
        }

        try {
            console.log('🔍 [UNBAN] ID utilisateur à débannir:', userId);
            console.log('🔍 [UNBAN] Tentative de débannissement directe...');
            
            // Approche directe : tenter le unban directement
            await interaction.guild.bans.remove(userId, reason);
            console.log('✅ [UNBAN] Débannissement réussi pour:', userId);

            // Si on arrive ici, le débannissement a réussi
            const successMessage = await ComponentsV3.successEmbed(interaction.guild.id, 'commands.unban.success', {
                user: `<@${userId}>`,
                reason: reason
            });

            await interaction.editReply({
                ...successMessage
            });

        } catch (error) {
            console.error('❌ [UNBAN] Erreur lors du débannissement:', error);
            
            if (error.code === 10026) {
                // L'utilisateur n'est pas banni
                console.log('❌ [UNBAN] Utilisateur non banni (code 10026)');
                const notBannedMessage = await ComponentsV3.errorEmbed(interaction.guild.id, 'commands.unban.error_not_banned');
                return await interaction.editReply({
                    ...notBannedMessage
                });
            }

            // Autres erreurs
            console.error('❌ [UNBAN] Erreur générique:', error.code, error.message);
            const errorMessage = await ComponentsV3.errorEmbed(interaction.guild.id, 'commands.unban.error_generic');
            await interaction.editReply({
                ...errorMessage
            });
        }
    }
};