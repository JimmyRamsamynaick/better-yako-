const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
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
        const { getTranslationSync } = require('../../index');
        const t = async (key, ...args) => await getTranslationSync(interaction.guild.id, key, ...args);

        try {
            // Vérification des permissions
            const member = interaction.member;
            const guildConfig = await DatabaseManager.getGuildConfig(interaction.guild.id);
            const isModerator = await PermissionManager.isModerator(member, guildConfig);
            
            if (!isModerator) {
                const embed = new EmbedBuilder()
                    .setTitle(await t('errors.no_permission'))
                .setDescription(await t('admin.warn.no_permission_desc'))
                    .setColor('#FF0000')
                    .setTimestamp();
                return await interaction.reply({ embeds: [embed], ephemeral: true });
            }

            const targetUser = interaction.options.getUser('utilisateur');
            const reason = interaction.options.getString('raison');

            // Vérification si l'utilisateur est dans le serveur
            const targetMember = interaction.guild.members.cache.get(targetUser.id);
            
            if (!targetMember) {
                const embed = new EmbedBuilder()
                    .setTitle(await t('errors.user_not_found'))
                .setDescription(await t('admin.warn.user_not_in_server'))
                    .setColor('#FF0000')
                    .setTimestamp();
                return await interaction.reply({ embeds: [embed], ephemeral: true });
            }

            // Vérification si on peut modérer cet utilisateur
            if (!PermissionManager.canModerate(member, targetMember)) {
                const embed = new EmbedBuilder()
                    .setTitle(await t('errors.cannot_moderate'))
                .setDescription(await t('admin.warn.cannot_moderate_desc'))
                    .setColor('#FF0000')
                    .setTimestamp();
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
                    const embed = new EmbedBuilder()
                        .setTitle(await t('errors.database_error'))
                    .setDescription(await t('admin.warn.database_error_desc'))
                        .setColor('#FF0000')
                        .setTimestamp();
                    return await interaction.editReply({ embeds: [embed] });
                }

                // Récupération du nombre total d'avertissements
                const userWarnings = await DatabaseManager.getUserWarnings(targetUser.id, interaction.guild.id);
                const warningCount = userWarnings.length;

                // Tentative d'envoi d'un message privé à l'utilisateur
                try {
                    const dmEmbed = new EmbedBuilder()
                        .setTitle(await t('admin.warn.dm_title'))
                    .setDescription(await t('admin.warn.dm_description', interaction.guild.name, reason, warningCount))
                        .setColor('#FFA500')
                        .setTimestamp();
                    await targetUser.send({ embeds: [dmEmbed] });
                } catch (error) {
                    // Impossible d'envoyer le MP, on continue
                }

                // Message de confirmation
                const successEmbed = new EmbedBuilder()
                    .setTitle(await t('admin.warn.success'))
                .setDescription(await t('admin.warn.success_desc', targetUser.tag, reason))
                    .setColor('#FFA500')
                    .setTimestamp();

                // Déterminer la couleur selon le nombre d'avertissements
                let warningLevel = 'info';
                let warningLevelText = await t('admin.warn.level_low');
                
                if (warningCount >= 5) {
                    warningLevel = 'error';
                    warningLevelText = await t('admin.warn.level_critical');
                } else if (warningCount >= 3) {
                    warningLevel = 'warning';
                    warningLevelText = await t('admin.warn.level_high');
                } else if (warningCount >= 2) {
                    warningLevel = 'warning';
                    warningLevelText = await t('admin.warn.level_medium');
                }

                successEmbed.addFields(
                    { name: await t('admin.warn.details'), value: 
                        `👤 **${await t('admin.warn.user')}:** ${targetUser.tag} (${targetUser.id})\n` +
                        `👮 **${await t('admin.warn.moderator')}:** ${interaction.user.tag}\n` +
                        `📝 **${await t('admin.warn.reason')}:** ${reason}\n` +
                        `⚠️ **${await t('admin.warn.total_warnings')}:** ${warningCount}\n` +
                        `📊 **${await t('admin.warn.warning_level')}:** ${warningLevelText}`,
                        inline: false
                    }
                );

                // Ajouter un avertissement si le nombre d'avertissements est élevé
                const embeds = [successEmbed];
                if (warningCount >= 3) {
                    const alertEmbed = new EmbedBuilder()
                        .setTitle(`⚠️ ${await t('admin.warn.alert_title')}`)
                        .setDescription(await t('admin.warn.alert_desc', targetUser.tag, warningCount))
                        .setColor('#FF0000')
                        .setTimestamp();
                    embeds.push(alertEmbed);
                }

                await interaction.editReply({ embeds });

                // Log dans le canal de logs
                if (guildConfig?.logChannelId) {
                    const logChannel = interaction.guild.channels.cache.get(guildConfig.logChannelId);
                    if (logChannel) {
                        const logEmbed = new EmbedBuilder()
                            .setTitle(`⚠️ ${await t('admin.warn.log_title')}`)
                        .setDescription(
                            `**${await t('admin.warn.user')}:** ${targetUser.tag} (${targetUser.id})\n` +
                            `**${await t('admin.warn.moderator')}:** ${interaction.user.tag} (${interaction.user.id})\n` +
                            `**${await t('admin.warn.reason')}:** ${reason}\n` +
                            `**${await t('admin.warn.warning_id')}:** ${warning._id}\n` +
                            `**${await t('admin.warn.total_warnings')}:** ${warningCount}\n` +
                            `**${await t('admin.warn.timestamp')}:** <t:${Math.floor(Date.now() / 1000)}:F>`
                            )
                            .setColor('#0099FF')
                            .setTimestamp();
                        
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

                        const autoBanEmbed = new EmbedBuilder()
                            .setTitle(`🔨 ${await t('admin.warn.auto_ban_title')}`)
                            .setDescription(await t('admin.warn.auto_ban_desc', targetUser.tag, warningCount))
                            .setColor('#FF0000')
                            .setTimestamp();
                        
                        await interaction.followUp({ embeds: [autoBanEmbed] });

                        // Log de l'auto-ban
                        if (guildConfig?.logChannelId) {
                            const logChannel = interaction.guild.channels.cache.get(guildConfig.logChannelId);
                            if (logChannel) {
                                const autoBanLogEmbed = new EmbedBuilder()
                                    .setTitle(`🔨 ${await t('admin.warn.auto_ban_log_title')}`)
                                    .setDescription(
                                        `**${await t('admin.warn.user')}:** ${targetUser.tag} (${targetUser.id})\n` +
                                        `**${await t('admin.warn.reason')}:** ${await t('admin.warn.auto_ban_reason', warningCount)}\n` +
                                        `**${await t('admin.warn.timestamp')}:** <t:${Math.floor(Date.now() / 1000)}:F>`
                                    )
                                    .setColor('#FF0000')
                                    .setTimestamp();
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

                            const autoMuteEmbed = new EmbedBuilder()
                                .setTitle(`🔇 ${await t('admin.warn.auto_mute_title')}`)
                                .setDescription(await t('admin.warn.auto_mute_desc', targetUser.tag, warningCount))
                                .setColor('#FFA500')
                                .setTimestamp();
                            
                            await interaction.followUp({ embeds: [autoMuteEmbed] });
                        }
                    } catch (error) {
                        console.error('Erreur lors de l\'auto-mute:', error);
                    }
                }

            } catch (error) {
                console.error('Erreur lors de l\'avertissement:', error);
                const errorEmbed = new EmbedBuilder()
                    .setTitle(await t('errors.command_failed'))
                    .setDescription(await t('admin.warn.error_desc', error.message))
                    .setColor('#FF0000')
                    .setTimestamp();
                await interaction.editReply({ embeds: [errorEmbed] });
            }

        } catch (error) {
            console.error('Erreur dans la commande warn:', error);
            const errorEmbed = new EmbedBuilder()
                .setTitle(await t('errors.unexpected'))
                .setDescription(await t('errors.try_again'))
                .setColor('#FF0000')
                .setTimestamp();
            
            if (interaction.deferred) {
                await interaction.editReply({ embeds: [errorEmbed] });
            } else {
                await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
            }
        }
    }
};