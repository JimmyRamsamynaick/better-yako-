// commands/moderation/ban.js
const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const { ComponentsV3 } = require('../../utils/ComponentsV3');
const Guild = require('../../models/Guild');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ban')
        .setDescription('Bannir un membre du serveur')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('Le membre à bannir')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('Raison du bannissement')
                .setRequired(false))
        .addIntegerOption(option =>
            option.setName('days')
                .setDescription('Nombre de jours de messages à supprimer (0-7)')
                .setMinValue(0)
                .setMaxValue(7)
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),
    
    async execute(interaction) {
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
            return interaction.reply({
                ...noPermMessage,
                ephemeral: true
            });
        }

        if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.BanMembers)) {
            console.log('❌ [BAN] Le bot n\'a pas les permissions de bannissement');
            const botNoPermMessage = await ComponentsV3.errorEmbed(interaction.guild.id, 'commands.ban.error_bot_permissions');
            return interaction.reply({
                ...botNoPermMessage,
                ephemeral: true
            });
        }

        if (user.id === interaction.user.id) {
            console.log('❌ [BAN] Tentative d\'auto-ban par:', interaction.user.tag);
            const selfBanMessage = await ComponentsV3.errorEmbed(interaction.guild.id, 'commands.ban.error_self');
            return interaction.reply({
                ...selfBanMessage,
                ephemeral: true
            });
        }

        if (user.id === interaction.client.user.id) {
            console.log('❌ [BAN] Tentative de ban du bot par:', interaction.user.tag);
            const botBanMessage = await ComponentsV3.errorEmbed(interaction.guild.id, 'commands.ban.error_bot');
            return interaction.reply({
                ...botBanMessage,
                ephemeral: true
            });
        }

        try {
            console.log('🔍 [BAN] Récupération du membre...');
            const member = await interaction.guild.members.fetch(user.id);
            console.log('✅ [BAN] Membre récupéré:', member.user.tag);
            
            console.log('🔍 [BAN] Vérification hiérarchie - Membre:', member.roles.highest.position, '| Exécuteur:', interaction.member.roles.highest.position);
            if (member.roles.highest.position >= interaction.member.roles.highest.position) {
                console.log('❌ [BAN] Hiérarchie insuffisante');
                const hierarchyMessage = await ComponentsV3.errorEmbed(interaction.guild.id, 'commands.ban.error_hierarchy', { user: user.toString() });
                return interaction.reply({
                    ...hierarchyMessage,
                    ephemeral: true
                });
            }

            console.log('🔍 [BAN] Vérification bannable:', member.bannable);
            if (!member.bannable) {
                console.log('❌ [BAN] Membre non bannable (permissions bot insuffisantes)');
                const botPermMessage = await ComponentsV3.errorEmbed(interaction.guild.id, 'commands.ban.error_bot_permissions');
                return interaction.reply({
                    ...botPermMessage,
                    ephemeral: true
                });
            }

            console.log('🔍 [BAN] Tentative de bannissement avec deleteMessageSeconds:', days * 24 * 60 * 60);
            await member.ban({ reason, deleteMessageSeconds: days * 24 * 60 * 60 });
            console.log('✅ [BAN] Bannissement réussi pour:', user.tag);

            console.log('🔍 [BAN] Envoi de la réponse de succès...');
            const successMessage = await ComponentsV3.successEmbed(interaction.guild.id, 'commands.ban.success', {
                executor: interaction.user.toString(),
                user: user.toString(),
                reason: reason
            });
            await interaction.reply(successMessage);
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
            
            // Vérifier si l'interaction n'a pas déjà été répondue
            if (!interaction.replied && !interaction.deferred) {
                try {
                    // Vérifier si l'utilisateur est déjà banni
                    if (error.code === 10026 || error.message.includes('Unknown Member')) {
                        // Vérifier si l'utilisateur est dans la liste des bannis
                        try {
                            const bannedUser = await interaction.guild.bans.fetch(user.id);
                            if (bannedUser) {
                                console.log('❌ [BAN] Utilisateur déjà banni:', user.tag);
                                const alreadyBannedMessage = await ComponentsV3.errorEmbed(interaction.guild.id, 'commands.ban.error_already_banned');
                                return await interaction.reply({
                                    ...alreadyBannedMessage,
                                    ephemeral: true
                                });
                            }
                        } catch (banCheckError) {
                            // Si on ne peut pas vérifier les bans, continuer avec l'erreur générale
                        }
                    }
                    
                    const errorMessage = await ComponentsV3.errorEmbed(interaction.guild.id, 'commands.ban.error');
                    await interaction.reply({
                        ...errorMessage,
                        ephemeral: true
                    });
                } catch (replyError) {
                    console.error('Erreur lors de la réponse d\'erreur:', replyError);
                }
            }
        }
    }
};