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
            // Vérifier d'abord si l'utilisateur est banni avec un petit délai pour la synchronisation
            let isBanned = false;
            let fetchAttempts = 0;
            const maxAttempts = 3;
            
            while (fetchAttempts < maxAttempts && !isBanned) {
                try {
                    await interaction.guild.bans.fetch(userId);
                    isBanned = true;
                    console.log(`✅ [UNBAN] Utilisateur ${userId} trouvé dans les bans`);
                } catch (fetchError) {
                    fetchAttempts++;
                    if (fetchError.code === 10026) {
                        if (fetchAttempts < maxAttempts) {
                            console.log(`🔍 [UNBAN] Tentative ${fetchAttempts}/${maxAttempts} - Ban non trouvé, attente...`);
                            await new Promise(resolve => setTimeout(resolve, 1000)); // Attendre 1 seconde
                            continue;
                        }
                        // L'utilisateur n'est vraiment pas banni après toutes les tentatives
                        console.log(`❌ [UNBAN] Utilisateur ${userId} n'est pas banni après ${maxAttempts} tentatives`);
                        const notBannedMessage = await ComponentsV3.errorEmbed(interaction.guild.id, 'commands.unban.error_not_banned');
                        return await interaction.editReply({
                            ...notBannedMessage
                        });
                    }
                    // Autre erreur lors de la vérification
                    throw fetchError;
                }
            }

            // Si l'utilisateur est banni, procéder au débannissement
            if (isBanned) {
                console.log(`🔍 [UNBAN] Débannissement de l'utilisateur ${userId}...`);
                await interaction.guild.bans.remove(userId, reason);
                console.log(`✅ [UNBAN] Débannissement réussi pour ${userId}`);

                // Récupérer l'utilisateur pour l'affichage
                let userForDisplay;
                try {
                    const user = await interaction.client.users.fetch(userId);
                    userForDisplay = user.toString();
                } catch {
                    userForDisplay = `<@${userId}>`;
                }

                const translatedMessage = LanguageManager.get(lang, 'commands.unban.success', {
                    executor: interaction.user.toString(),
                    user: userForDisplay,
                    reason: reason
                });
                
                const successMessage = await ComponentsV3.successEmbed(interaction.guild.id, 'commands.unban.success_title', translatedMessage);
                await interaction.editReply(successMessage);
                console.log(`✅ [UNBAN] Message de succès envoyé`);
            }

        } catch (error) {
            console.error('❌ [UNBAN] ERREUR DÉTAILLÉE:', {
                message: error.message,
                code: error.code,
                userId: userId,
                reason: reason
            });
            
            try {
                const errorMessage = await ComponentsV3.errorEmbed(interaction.guild.id, 'commands.unban.error');
                await interaction.editReply({
                    ...errorMessage
                });
            } catch (replyError) {
                console.error('Erreur lors de la réponse d\'interaction (unban error):', replyError);
            }
        }
    }
};