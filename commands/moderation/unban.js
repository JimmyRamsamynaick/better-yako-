// commands/moderation/unban.js
const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const { ComponentsV3 } = require('../../utils/ComponentsV3');
const Guild = require('../../models/Guild');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('unban')
        .setDescription('Débannir un utilisateur')
        .addStringOption(option =>
            option.setName('userid')
                .setDescription('ID de l\'utilisateur à débannir')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('Raison du débannissement')
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),
    
    async execute(interaction) {
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
            if (!interaction.replied && !interaction.deferred) {
                try {
                    const noPermMessage = await ComponentsV3.errorEmbed(interaction.guild.id, 'common.no_permission');
                    return await interaction.reply({
                        ...noPermMessage,
                        ephemeral: true
                    });
                } catch (replyError) {
                    console.error('Erreur lors de la réponse d\'interaction (no permission):', replyError);
                    return;
                }
            }
            return;
        }

        if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.BanMembers)) {
            if (!interaction.replied && !interaction.deferred) {
                try {
                    const botNoPermMessage = await ComponentsV3.errorEmbed(interaction.guild.id, 'commands.ban.error_bot_permissions');
                    return await interaction.reply({
                        ...botNoPermMessage,
                        ephemeral: true
                    });
                } catch (replyError) {
                    console.error('Erreur lors de la réponse d\'interaction (bot no permission):', replyError);
                    return;
                }
            }
            return;
        }

        try {
            const bannedUser = await interaction.guild.bans.fetch(userId);
            
            if (!bannedUser) {
                if (!interaction.replied && !interaction.deferred) {
                     try {
                         const notBannedMessage = await ComponentsV3.errorEmbed(interaction.guild.id, 'commands.unban.error_not_banned');
                         return await interaction.reply({
                             ...notBannedMessage,
                             ephemeral: true
                         });
                     } catch (replyError) {
                         console.error('Erreur lors de la réponse d\'interaction (not banned):', replyError);
                         return;
                     }
                 }
                 return;
            }

            await interaction.guild.members.unban(userId, reason);

            if (!interaction.replied && !interaction.deferred) {
                try {
                    const successMessage = await ComponentsV3.successEmbed(interaction.guild.id, 'commands.unban.success', {
                        executor: interaction.user.toString(),
                        user: bannedUser.user.toString(),
                        reason: reason
                    });
                    await interaction.reply(successMessage);
                } catch (replyError) {
                    console.error('Erreur lors de la réponse d\'interaction (success):', replyError);
                }
            }

        } catch (error) {
            console.error(error);
            
            if (!interaction.replied && !interaction.deferred) {
                try {
                    const errorMessage = await ComponentsV3.errorEmbed(interaction.guild.id, 'commands.unban.error');
                    await interaction.reply({
                        ...errorMessage,
                        ephemeral: true
                    });
                } catch (replyError) {
                    console.error('Erreur lors de la réponse d\'interaction (unban error):', replyError);
                }
            }
        }
    }
};