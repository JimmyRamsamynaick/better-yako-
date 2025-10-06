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
            'en-US': LanguageManager.get('en', 'commands.unban.description') || 'Unban a user'
        })
        .addStringOption(option =>
            option.setName('userid')
                .setDescription(LanguageManager.get('fr', 'commands.unban.userid_option') || 'ID de l\'utilisateur à débannir')
                .setDescriptionLocalizations({
                    'en-US': LanguageManager.get('en', 'commands.unban.userid_option') || 'ID of the user to unban'
                })
                .setRequired(true))
        .addStringOption(option =>
            option.setName('reason')
                .setDescription(LanguageManager.get('fr', 'commands.unban.reason_option') || 'Raison du débannissement')
                .setDescriptionLocalizations({
                    'en-US': LanguageManager.get('en', 'commands.unban.reason_option') || 'Reason for the unban'
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
            console.log('🔍 [UNBAN] Type de userId:', typeof userId);
            console.log('🔍 [UNBAN] Longueur de userId:', userId.length);
            
            // Vérifier d'abord la liste des bans pour diagnostiquer
            console.log('🔍 [UNBAN] Récupération de la liste des bans...');
            const bans = await interaction.guild.bans.fetch();
            console.log('🔍 [UNBAN] Nombre total de bans:', bans.size);
            
            // Chercher l'utilisateur dans les bans
            const bannedUser = bans.find(ban => ban.user.id === userId);
            if (bannedUser) {
                console.log('✅ [UNBAN] Utilisateur trouvé dans les bans:', bannedUser.user.tag, '| ID:', bannedUser.user.id);
                
                // Procéder au débannissement
                console.log('🔍 [UNBAN] Tentative de débannissement...');
                await interaction.guild.bans.remove(userId, reason);
                console.log('✅ [UNBAN] Débannissement réussi pour:', userId);

                // Message de succès
                 console.log('🔍 [UNBAN] Envoi de la réponse de succès...');
                 const translatedMessage = LanguageManager.get(lang, 'commands.unban.success', {
                     executor: interaction.user.toString(),
                     user: bannedUser.user.toString(),
                     reason: reason
                 });
                 
                 const successMessage = await ComponentsV3.successEmbed(interaction.guild.id, 'commands.unban.success_title', translatedMessage);
                 await interaction.editReply(successMessage);
                 console.log('✅ [UNBAN] Réponse envoyée avec succès');
            } else {
                console.log('❌ [UNBAN] Utilisateur non trouvé dans les bans');
                console.log('🔍 [UNBAN] Liste des IDs bannis:');
                bans.forEach(ban => {
                    console.log(`   - ${ban.user.tag}: ${ban.user.id}`);
                });
                
                // L'utilisateur n'est pas banni
                const notBannedMessage = await ComponentsV3.errorEmbed(interaction.guild.id, 'commands.unban.error_not_banned');
                return await interaction.editReply({
                    ...notBannedMessage
                });
            }

        } catch (error) {
            console.error('❌ [UNBAN] Erreur lors du débannissement:', error);
            
            // Autres erreurs
            console.error('❌ [UNBAN] Erreur générique:', error.code, error.message);
            const errorMessage = await ComponentsV3.errorEmbed(interaction.guild.id, 'commands.unban.error_generic');
            await interaction.editReply({
                ...errorMessage
            });
        }
    }
};