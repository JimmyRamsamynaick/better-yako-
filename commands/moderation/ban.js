// commands/moderation/ban.js
const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const { ComponentsV3 } = require('../../utils/ComponentsV3');
const Guild = require('../../models/Guild');
const LanguageManager = require('../../utils/languageManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ban')
        .setDescription(LanguageManager.get('fr', 'commands.ban.description') || 'Bannir un membre du serveur')
        .setDescriptionLocalizations({
            'EnglishUS': LanguageManager.get('en', 'commands.ban.description') || 'Ban a member from the server'
        })
        .addUserOption(option =>
            option.setName('user')
                .setDescription(LanguageManager.get('fr', 'commands.ban.user_option') || 'Le membre à bannir')
                .setDescriptionLocalizations({
                    'EnglishUS': LanguageManager.get('en', 'commands.ban.user_option') || 'The member to ban'
                })
                .setRequired(true))
        .addStringOption(option =>
            option.setName('reason')
                .setDescription(LanguageManager.get('fr', 'commands.ban.reason_option') || 'Raison du bannissement')
                .setDescriptionLocalizations({
                    'EnglishUS': LanguageManager.get('en', 'commands.ban.reason_option') || 'Reason for the ban'
                })
                .setRequired(false))
        .addIntegerOption(option =>
            option.setName('days')
                .setDescription(LanguageManager.get('fr', 'commands.ban.days_option') || 'Nombre de jours de messages à supprimer (0-7)')
                .setDescriptionLocalizations({
                    'EnglishUS': LanguageManager.get('en', 'commands.ban.days_option') || 'Number of days of messages to delete (0-7)'
                })
                .setMinValue(0)
                .setMaxValue(7)
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),
    
    async execute(interaction) {
        // Déférer la réponse immédiatement pour éviter l'expiration
        await interaction.deferReply();
        
        console.log('🔍 [BAN] Commande ban exécutée par:', interaction.user.tag);
        
        const user = interaction.options.getUser('user');
        const days = interaction.options.getInteger('days') || 0;
        
        // Récupération de la langue du serveur
        const guildData = await Guild.findOne({ guildId: interaction.guild.id }) || { language: 'fr' };
        const lang = guildData.language || 'fr';
        
        const reason = interaction.options.getString('reason') || require('../../utils/languageManager').get(lang, 'common.no_reason');
        
        console.log('🔍 [BAN] Utilisateur ciblé:', user.tag, '| Raison:', reason, '| Jours:', days);

        if (!interaction.member.permissions.has(PermissionFlagsBits.BanMembers)) {
            console.log('❌ [BAN] Permissions insuffisantes pour:', interaction.user.tag);
            const noPermMessage = await ComponentsV3.errorEmbed(interaction.guild.id, 'common.no_permission');
            return interaction.editReply({
                ...noPermMessage
            });
        }

        if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.BanMembers)) {
            console.log('❌ [BAN] Le bot n\'a pas les permissions de bannissement');
            const botNoPermMessage = await ComponentsV3.errorEmbed(interaction.guild.id, 'commands.ban.error_bot_permissions');
            return interaction.editReply({
                ...botNoPermMessage
            });
        }

        if (user.id === interaction.user.id) {
            console.log('❌ [BAN] Tentative d\'auto-ban par:', interaction.user.tag);
            const selfBanMessage = await ComponentsV3.errorEmbed(interaction.guild.id, 'commands.ban.error_self');
            return interaction.editReply({
                ...selfBanMessage
            });
        }

        if (user.id === interaction.client.user.id) {
            console.log('❌ [BAN] Tentative de ban du bot par:', interaction.user.tag);
            const botBanMessage = await ComponentsV3.errorEmbed(interaction.guild.id, 'commands.ban.error_bot');
            return interaction.editReply({
                ...botBanMessage
            });
        }

        try {
            // Vérifier d'abord si l'utilisateur est déjà banni
            try {
                const bannedUser = await interaction.guild.bans.fetch(user.id);
                if (bannedUser) {
                    console.log('❌ [BAN] Utilisateur déjà banni:', user.tag);
                    const alreadyBannedMessage = await ComponentsV3.errorEmbed(interaction.guild.id, 'commands.ban.error_already_banned');
                    return await interaction.editReply({
                        ...alreadyBannedMessage
                    });
                }
            } catch (banCheckError) {
                // Si l'utilisateur n'est pas banni, continuer normalement
                console.log('🔍 [BAN] Utilisateur non banni, procédure normale');
            }

            console.log('🔍 [BAN] Récupération du membre...');
            const member = await interaction.guild.members.fetch(user.id);
            console.log('✅ [BAN] Membre récupéré:', member.user.tag);
            
            console.log('🔍 [BAN] Vérification hiérarchie - Membre:', member.roles.highest.position, '| Exécuteur:', interaction.member.roles.highest.position);
            if (member.roles.highest.position >= interaction.member.roles.highest.position) {
                console.log('❌ [BAN] Hiérarchie insuffisante');
                const hierarchyMessage = await ComponentsV3.errorEmbed(interaction.guild.id, 'commands.ban.error_hierarchy', { user: user.toString() });
                return await interaction.editReply({
                    ...hierarchyMessage
                });
            }

            console.log('🔍 [BAN] Vérification bannable:', member.bannable);
            if (!member.bannable) {
                console.log('❌ [BAN] Membre non bannable (permissions bot insuffisantes)');
                const botPermMessage = await ComponentsV3.errorEmbed(interaction.guild.id, 'commands.ban.error_bot_permissions');
                return await interaction.editReply({
                    ...botPermMessage
                });
            }

            console.log('🔍 [BAN] Tentative de bannissement avec deleteMessageSeconds:', days * 24 * 60 * 60);
            await member.ban({ reason, deleteMessageSeconds: days * 24 * 60 * 60 });
            console.log('✅ [BAN] Bannissement réussi pour:', user.tag);

            console.log('🔍 [BAN] Envoi de la réponse de succès...');
            // Récupérer le message traduit avec les placeholders remplacés
            const translatedMessage = LanguageManager.get(lang, 'commands.ban.success', {
                executor: interaction.user.toString(),
                user: user.toString(),
                reason: reason
            });
            
            const successMessage = await ComponentsV3.successEmbed(interaction.guild.id, 'commands.ban.success_title', translatedMessage);
            await interaction.editReply(successMessage);
            console.log('✅ [BAN] Réponse envoyée avec succès');

        } catch (error) {
            console.error('❌ [BAN] ERREUR DÉTAILLÉE:', {
                message: error.message,
                code: error.code,
                stack: error.stack,
                user: user.tag,
                reason: reason,
                days: days
            });
            
            // Gérer l'erreur avec editReply puisque l'interaction est déjà déférée
            try {
                const errorMessage = await ComponentsV3.errorEmbed(interaction.guild.id, 'commands.ban.error');
                await interaction.editReply({
                    ...errorMessage
                });
            } catch (replyError) {
                console.error('Erreur lors de la réponse d\'erreur:', replyError);
            }
        }
    }
};