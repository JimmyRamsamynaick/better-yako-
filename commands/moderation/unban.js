// commands/moderation/unban.js
const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const BotEmbeds = require('../../utils/embeds');
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
                    const noPermEmbed = BotEmbeds.createNoPermissionEmbed(interaction.guild.id, lang);
                    return await interaction.reply({
                        ...noPermEmbed,
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
                    const botNoPermEmbed = BotEmbeds.createBotNoPermissionEmbed(interaction.guild.id, lang);
                    return await interaction.reply({
                        ...botNoPermEmbed,
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
                         const notBannedEmbed = BotEmbeds.createUserNotBannedEmbed({ id: userId }, interaction.guild.id, lang);
                         return await interaction.reply({
                             ...notBannedEmbed,
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
                    const successEmbed = BotEmbeds.createUnbanSuccessEmbed(bannedUser.user, interaction.guild.id, interaction.user, reason, lang);
                    await interaction.reply({
                        ...successEmbed,
                        ephemeral: true
                    });
                } catch (replyError) {
                    console.error('Erreur lors de la réponse d\'interaction (success):', replyError);
                }
            }

        } catch (error) {
            console.error(error);
            
            if (!interaction.replied && !interaction.deferred) {
                try {
                    const errorEmbed = BotEmbeds.createUnbanErrorEmbed(error, interaction.guild.id, lang);
                    await interaction.reply({
                        ...errorEmbed,
                        ephemeral: true
                    });
                } catch (replyError) {
                    console.error('Erreur lors de la réponse d\'interaction (unban error):', replyError);
                }
            }
        }
    }
};