const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { ModernComponents } = require('../../utils/modernComponents');
const PermissionManager = require('../../utils/permissions');
const DatabaseManager = require('../../utils/database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('warn')
        .setDescription('Avertir un utilisateur')
        .addUserOption(option =>
            option.setName('utilisateur')
                .setDescription('L\'utilisateur à avertir')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('raison')
                .setDescription('Raison de l\'avertissement')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

    async execute(interaction) {
        const { getTranslation } = require('../../index');
        const guildConfig = await DatabaseManager.getGuildConfig(interaction.guild.id);
        const lang = guildConfig?.language || 'fr';
        const t = (key, ...args) => getTranslation(lang, key, ...args);

        try {
            // Vérification des permissions
            const member = interaction.member;
            const isModerator = await PermissionManager.isModerator(member, guildConfig);
            
            if (!isModerator) {
                const embed = ModernComponents.createErrorMessage(
                    t('errors.no_permission'),
                    t('admin.warn.no_permission_desc')
                );
                return await interaction.reply({ embeds: [embed], ephemeral: true });
            }

            const targetUser = interaction.options.getUser('utilisateur');
            const reason = interaction.options.getString('raison');

            // Vérification si l'utilisateur est dans le serveur
            const targetMember = interaction.guild.members.cache.get(targetUser.id);
            
            if (!targetMember) {
                const embed = ModernComponents.createErrorMessage(
                    t('errors.user_not_found'),
                    t('admin.warn.user_not_in_server')
                );
                return await interaction.reply({ embeds: [embed], ephemeral: true });
            }

            // Vérification si on peut modérer cet utilisateur
            if (!PermissionManager.canModerate(member, targetMember)) {
                const embed = ModernComponents.createErrorMessage(
                    t('errors.cannot_moderate'),
                    t('admin.warn.cannot_moderate_desc')
                );
                return await interaction.reply({ embeds: [embed], ephemeral: true });
            }

            await interaction.deferReply();

            try {
                // Ajout de l'avertissement dans la base de données
                const warning = await DatabaseManager.addWarning(
                    targetUser.id,
                    interaction.guild.id,
                    interaction.user.id,
                    reason
                );

                if (!warning) {
                    const embed = ModernComponents.createErrorMessage(
                        t('errors.database_error'),
                        t('admin.warn.database_error_desc')
                    );
                    return await interaction.editReply({ embeds: [embed] });
                }

                // Récupération du nombre total d'avertissements
                const userWarnings = await DatabaseManager.getUserWarnings(targetUser.id, interaction.guild.id);
                const warningCount = userWarnings.length;

                // Tentative d'envoi d'un message privé à l'utilisateur
                try {
                    const dmEmbed = ModernComponents.createWarningMessage(
                        t('admin.warn.dm_title'),
                        t('admin.warn.dm_description', interaction.guild.name, reason, warningCount)
                    );
                    await targetUser.send({ embeds: [dmEmbed] });
                } catch (error) {
                    // Impossible d'envoyer le MP, on continue
                }

                // Message de confirmation
                const successEmbed = ModernComponents.createWarningMessage(
                    t('admin.warn.success'),
                    t('admin.warn.success_desc', targetUser.tag, reason)
                );

                // Déterminer la couleur selon le nombre d'avertissements
                let warningLevel = 'info';
                let warningLevelText = t('admin.warn.level_low');
                
                if (warningCount >= 5) {
                    warningLevel = 'error';
                    warningLevelText = t('admin.warn.level_critical');
                } else if (warningCount >= 3) {
                    warningLevel = 'warning';
                    warningLevelText = t('admin.warn.level_high');
                } else if (warningCount >= 2) {
                    warningLevel = 'warning';
                    warningLevelText = t('admin.warn.level_medium');
                }

                const container = ModernComponents.createContainer()
                    .addComponent(successEmbed)
                    .addComponent(ModernComponents.createSeparator())
                    .addComponent(ModernComponents.createTextDisplay(
                        `**${t('admin.warn.details')}**\n` +
                        `👤 **${t('admin.warn.user')}:** ${targetUser.tag} (${targetUser.id})\n` +
                        `👮 **${t('admin.warn.moderator')}:** ${interaction.user.tag}\n` +
                        `📝 **${t('admin.warn.reason')}:** ${reason}\n` +
                        `⚠️ **${t('admin.warn.total_warnings')}:** ${warningCount}\n` +
                        `📊 **${t('admin.warn.warning_level')}:** ${warningLevelText}`
                    ));

                // Ajouter un avertissement si le nombre d'avertissements est élevé
                if (warningCount >= 3) {
                    const alertEmbed = ModernComponents.createErrorMessage(
                        `⚠️ ${t('admin.warn.alert_title')}`,
                        t('admin.warn.alert_desc', targetUser.tag, warningCount)
                    );
                    container.addComponent(alertEmbed);
                }

                await interaction.editReply(container.toMessage());

                // Log dans le canal de logs
                if (guildConfig?.logChannelId) {
                    const logChannel = interaction.guild.channels.cache.get(guildConfig.logChannelId);
                    if (logChannel) {
                        const logEmbed = ModernComponents.createInfoMessage(
                            `⚠️ ${t('admin.warn.log_title')}`,
                            `**${t('admin.warn.user')}:** ${targetUser.tag} (${targetUser.id})\n` +
                            `**${t('admin.warn.moderator')}:** ${interaction.user.tag} (${interaction.user.id})\n` +
                            `**${t('admin.warn.reason')}:** ${reason}\n` +
                            `**${t('admin.warn.warning_id')}:** ${warning._id}\n` +
                            `**${t('admin.warn.total_warnings')}:** ${warningCount}\n` +
                            `**${t('admin.warn.timestamp')}:** <t:${Math.floor(Date.now() / 1000)}:F>`
                        );
                        
                        await logChannel.send({ embeds: [logEmbed] });
                    }
                }

                // Actions automatiques selon le nombre d'avertissements
                if (warningCount >= 5) {
                    // Auto-ban après 5 avertissements
                    try {
                        await targetMember.ban({
                            reason: `Auto-ban: ${warningCount} avertissements | Dernier: ${reason}`,
                            deleteMessageDays: 1
                        });

                        const autoBanEmbed = ModernComponents.createErrorMessage(
                            `🔨 ${t('admin.warn.auto_ban_title')}`,
                            t('admin.warn.auto_ban_desc', targetUser.tag, warningCount)
                        );
                        
                        await interaction.followUp({ embeds: [autoBanEmbed] });

                        // Log de l'auto-ban
                        if (guildConfig?.logChannelId) {
                            const logChannel = interaction.guild.channels.cache.get(guildConfig.logChannelId);
                            if (logChannel) {
                                const autoBanLogEmbed = ModernComponents.createErrorMessage(
                                    `🔨 ${t('admin.warn.auto_ban_log_title')}`,
                                    `**${t('admin.warn.user')}:** ${targetUser.tag} (${targetUser.id})\n` +
                                    `**${t('admin.warn.reason')}:** ${t('admin.warn.auto_ban_reason', warningCount)}\n` +
                                    `**${t('admin.warn.timestamp')}:** <t:${Math.floor(Date.now() / 1000)}:F>`
                                );
                                await logChannel.send({ embeds: [autoBanLogEmbed] });
                            }
                        }
                    } catch (error) {
                        console.error('Erreur lors de l\'auto-ban:', error);
                    }
                } else if (warningCount >= 3) {
                    // Auto-mute après 3 avertissements
                    try {
                        const muteRole = await PermissionManager.getMuteRole(interaction.guild, guildConfig);
                        if (muteRole && !targetMember.roles.cache.has(muteRole.id)) {
                            await targetMember.roles.add(muteRole, `Auto-mute: ${warningCount} avertissements`);
                            await targetMember.timeout(60 * 60 * 1000, `Auto-mute: ${warningCount} avertissements`); // 1 heure

                            const autoMuteEmbed = ModernComponents.createWarningMessage(
                                `🔇 ${t('admin.warn.auto_mute_title')}`,
                                t('admin.warn.auto_mute_desc', targetUser.tag, warningCount)
                            );
                            
                            await interaction.followUp({ embeds: [autoMuteEmbed] });
                        }
                    } catch (error) {
                        console.error('Erreur lors de l\'auto-mute:', error);
                    }
                }

            } catch (error) {
                console.error('Erreur lors de l\'avertissement:', error);
                const errorEmbed = ModernComponents.createErrorMessage(
                    t('errors.command_failed'),
                    t('admin.warn.error_desc', error.message)
                );
                await interaction.editReply({ embeds: [errorEmbed] });
            }

        } catch (error) {
            console.error('Erreur dans la commande warn:', error);
            const errorEmbed = ModernComponents.createErrorMessage(
                t('errors.unexpected'),
                t('errors.try_again')
            );
            
            if (interaction.deferred) {
                await interaction.editReply({ embeds: [errorEmbed] });
            } else {
                await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
            }
        }
    }
};