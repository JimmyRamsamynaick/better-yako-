const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const PermissionManager = require('../../utils/permissions');
const DatabaseManager = require('../../utils/database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('lock')
        .setDescription('Verrouiller un canal')
        .addChannelOption(option =>
            option.setName('canal')
                .setDescription('Canal à verrouiller (canal actuel si non spécifié)')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('raison')
                .setDescription('Raison du verrouillage')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('duree')
                .setDescription('Durée du verrouillage (ex: 1h, 30m, 2d)')
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

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
                const embed = new EmbedBuilder()
                    .setTitle(t('errors.no_permission'))
                    .setDescription(t('admin.lock.no_permission_desc'))
                    .setColor(0xED4245)
                    .setTimestamp();
                return await interaction.reply({ embeds: [embed], ephemeral: true });
            }

            // Vérification des permissions du bot
            if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.ManageChannels)) {
                const embed = new EmbedBuilder()
                    .setTitle(t('errors.bot_no_permission'))
                    .setDescription(t('admin.lock.bot_no_permission_desc'))
                    .setColor(0xED4245)
                    .setTimestamp();
                return await interaction.reply({ embeds: [embed], ephemeral: true });
            }

            const targetChannel = interaction.options.getChannel('canal') || interaction.channel;
            const reason = interaction.options.getString('raison') || t('admin.lock.default_reason');
            const durationStr = interaction.options.getString('duree');

            // Vérification que c'est un canal textuel
            if (!targetChannel.isTextBased()) {
                const embed = new EmbedBuilder()
                    .setTitle(t('admin.lock.invalid_channel'))
                    .setDescription(t('admin.lock.invalid_channel_desc'))
                    .setColor(0xED4245)
                    .setTimestamp();
                return await interaction.reply({ embeds: [embed], ephemeral: true });
            }

            // Vérification des permissions du bot sur le canal cible
            if (!targetChannel.permissionsFor(interaction.guild.members.me).has(PermissionFlagsBits.ManageChannels)) {
                const embed = new EmbedBuilder()
                    .setTitle(t('errors.bot_no_permission'))
                    .setDescription(t('admin.lock.bot_no_channel_permission_desc', targetChannel.name))
                    .setColor(0xED4245)
                    .setTimestamp();
                return await interaction.reply({ embeds: [embed], ephemeral: true });
            }

            // DEFER REPLY ICI - après toutes les vérifications qui peuvent retourner early
            await interaction.deferReply();

            try {
                // Parsing de la durée si spécifiée
                let duration = null;
                let expiresAt = null;
                
                if (durationStr) {
                    const durationRegex = /^(\d+)([smhd])$/i;
                    const match = durationStr.match(durationRegex);
                    
                    if (match) {
                        const value = parseInt(match[1]);
                        const unit = match[2].toLowerCase();
                        
                        switch (unit) {
                            case 's':
                                duration = value * 1000;
                                break;
                            case 'm':
                                duration = value * 60 * 1000;
                                break;
                            case 'h':
                                duration = value * 60 * 60 * 1000;
                                break;
                            case 'd':
                                duration = value * 24 * 60 * 60 * 1000;
                                break;
                        }
                        
                        expiresAt = new Date(Date.now() + duration);
                    } else {
                        const embed = new EmbedBuilder()
                            .setTitle(t('admin.lock.invalid_duration'))
                            .setDescription(t('admin.lock.invalid_duration_desc'))
                            .setColor(0xED4245)
                            .setTimestamp();
                        return await interaction.editReply({ embeds: [embed] });
                    }
                }

                // Vérification si le canal est déjà verrouillé
                const everyoneRole = interaction.guild.roles.everyone;
                const currentPermissions = targetChannel.permissionOverwrites.cache.get(everyoneRole.id);
                
                if (currentPermissions && currentPermissions.deny.has(PermissionFlagsBits.SendMessages)) {
                    const embed = new EmbedBuilder()
                        .setTitle(t('admin.lock.already_locked'))
                        .setDescription(t('admin.lock.already_locked_desc', targetChannel.name))
                        .setColor(0xFEE75C)
                        .setTimestamp();
                    return await interaction.editReply({ embeds: [embed] });
                }

                // Sauvegarde des permissions actuelles pour pouvoir les restaurer
                const originalPermissions = {
                    allow: currentPermissions?.allow?.bitfield || 0n,
                    deny: currentPermissions?.deny?.bitfield || 0n
                };

                // Verrouillage du canal
                await targetChannel.permissionOverwrites.edit(everyoneRole, {
                    SendMessages: false,
                    AddReactions: false,
                    CreatePublicThreads: false,
                    CreatePrivateThreads: false,
                    SendMessagesInThreads: false
                }, { reason: `Verrouillage par ${interaction.user.tag}: ${reason}` });

                // Formatage de la durée pour l'affichage
                let durationText = t('admin.lock.permanent');
                if (duration) {
                    const hours = Math.floor(duration / (60 * 60 * 1000));
                    const minutes = Math.floor((duration % (60 * 60 * 1000)) / (60 * 1000));
                    const seconds = Math.floor((duration % (60 * 1000)) / 1000);
                    
                    if (hours > 0) {
                        durationText = `${hours}h ${minutes}m`;
                    } else if (minutes > 0) {
                        durationText = `${minutes}m ${seconds}s`;
                    } else {
                        durationText = `${seconds}s`;
                    }
                }

                // Message de confirmation
                const successEmbed = new EmbedBuilder()
                    .setTitle(t('admin.lock.success'))
                    .setDescription(t('admin.lock.success_desc', targetChannel.name))
                    .setColor(0xFEE75C)
                    .addFields(
                        { name: '🔒 Canal', value: targetChannel.toString(), inline: true },
                        { name: '⏰ Durée', value: durationText, inline: true },
                        { name: '📝 Raison', value: reason, inline: false }
                    )
                    .setTimestamp();

                await interaction.editReply({ embeds: [successEmbed] });

                // Enregistrement de la sanction dans la base de données
                await DatabaseManager.addSanction(
                    'channel_' + targetChannel.id,
                    interaction.guild.id,
                    interaction.user.id,
                    'lock',
                    reason,
                    duration,
                    expiresAt
                );

                // Message dans le canal verrouillé
                const lockNotification = new EmbedBuilder()
                    .setTitle(`🔒 ${t('admin.lock.channel_locked')}`)
                    .setDescription(t('admin.lock.channel_locked_desc', interaction.user.tag, reason) +
                        (expiresAt ? `\n\n⏰ **${t('admin.lock.unlock_time')}:** <t:${Math.floor(expiresAt.getTime() / 1000)}:R>` : ''))
                    .setColor('#ffcc00')
                    .setTimestamp();

                await targetChannel.send({ embeds: [lockNotification] });

                // Log dans le canal de logs
                if (guildConfig?.logChannelId) {
                    const logChannel = interaction.guild.channels.cache.get(guildConfig.logChannelId);
                    if (logChannel) {
                        const logEmbed = new EmbedBuilder()
                            .setTitle(`🔒 ${t('admin.lock.log_title')}`)
                            .setDescription(`**${t('admin.lock.channel')}:** ${targetChannel.name} (${targetChannel.id})\n` +
                                `**${t('admin.lock.moderator')}:** ${interaction.user.tag} (${interaction.user.id})\n` +
                                `**${t('admin.lock.reason')}:** ${reason}\n` +
                                `**${t('admin.lock.duration')}:** ${durationText}\n` +
                                (expiresAt ? `**${t('admin.lock.expires_at')}:** <t:${Math.floor(expiresAt.getTime() / 1000)}:F>\n` : '') +
                                `**${t('admin.lock.timestamp')}:** <t:${Math.floor(Date.now() / 1000)}:F>`)
                            .setColor('#ffcc00')
                            .setTimestamp();
                        
                        await logChannel.send({ embeds: [logEmbed] });
                    }
                }

                // Programmation du déverrouillage automatique si une durée est spécifiée
                if (duration && expiresAt) {
                    setTimeout(async () => {
                        try {
                            // Vérification que le canal existe encore et est toujours verrouillé
                            const channel = interaction.guild.channels.cache.get(targetChannel.id);
                            if (!channel) return;

                            const currentPerms = channel.permissionOverwrites.cache.get(everyoneRole.id);
                            if (!currentPerms || !currentPerms.deny.has(PermissionFlagsBits.SendMessages)) {
                                return; // Canal déjà déverrouillé
                            }

                            // Restauration des permissions originales
                            if (originalPermissions.allow === 0n && originalPermissions.deny === 0n) {
                                // Supprimer l'override si il n'y en avait pas avant
                                await channel.permissionOverwrites.delete(everyoneRole, 'Déverrouillage automatique');
                            } else {
                                // Restaurer les permissions originales
                                await channel.permissionOverwrites.edit(everyoneRole, {
                                    allow: originalPermissions.allow,
                                    deny: originalPermissions.deny
                                }, { reason: 'Déverrouillage automatique' });
                            }

                            // Message de déverrouillage automatique
                            const unlockNotification = new EmbedBuilder()
                                .setTitle(`🔓 ${t('admin.lock.auto_unlock')}`)
                                .setDescription(t('admin.lock.auto_unlock_desc'))
                                .setColor('#00ff00')
                                .setTimestamp();

                            await channel.send({ embeds: [unlockNotification] });

                            // Log du déverrouillage automatique
                            if (guildConfig?.logChannelId) {
                                const logChannel = interaction.guild.channels.cache.get(guildConfig.logChannelId);
                                if (logChannel) {
                                    const autoUnlockLogEmbed = new EmbedBuilder()
                                        .setTitle(`🔓 ${t('admin.lock.auto_unlock_log')}`)
                                        .setDescription(`**${t('admin.lock.channel')}:** ${channel.name} (${channel.id})\n` +
                                            `**${t('admin.lock.original_moderator')}:** ${interaction.user.tag}\n` +
                                            `**${t('admin.lock.timestamp')}:** <t:${Math.floor(Date.now() / 1000)}:F>`)
                                        .setColor('#00ff00')
                                        .setTimestamp();
                                    await logChannel.send({ embeds: [autoUnlockLogEmbed] });
                                }
                            }

                        } catch (error) {
                            console.error('Erreur lors du déverrouillage automatique:', error);
                        }
                    }, duration);
                }

            } catch (error) {
                console.error('Erreur lors du verrouillage du canal:', error);
                
                let errorMessage = t('admin.lock.error_desc', error.message);
                
                if (error.code === 50013) {
                    errorMessage = t('admin.lock.permission_error');
                } else if (error.code === 50001) {
                    errorMessage = t('admin.lock.access_error');
                }
                
                const errorEmbed = new EmbedBuilder()
                    .setTitle(t('errors.command_failed'))
                    .setDescription(errorMessage)
                    .setColor(0xED4245)
                    .setTimestamp();
                await interaction.editReply({ embeds: [errorEmbed] });
            }

        } catch (error) {
            console.error('Erreur dans la commande lock:', error);
            
            // Créer un embed d'erreur basique au cas où ModernComponents ne serait pas disponible
            const errorEmbed = {
                color: 0xff0000,
                title: '❌ Erreur',
                description: 'Une erreur inattendue s\'est produite. Veuillez réessayer.',
                timestamp: new Date().toISOString()
            };

            const modernErrorEmbed = new EmbedBuilder()
                .setTitle(t('errors.unexpected'))
                .setDescription(t('errors.try_again'))
                .setColor(0xED4245)
                .setTimestamp();
            
            if (interaction.deferred || interaction.replied) {
                await interaction.editReply({ embeds: [modernErrorEmbed] });
            } else {
                await interaction.reply({ embeds: [modernErrorEmbed], ephemeral: true });
            }
        }
    }
};