const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const PermissionManager = require('../../utils/permissions');
const DatabaseManager = require('../../utils/database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('mute')
        .setDescription('Rendre muet un utilisateur')
        .addUserOption(option =>
            option.setName('utilisateur')
                .setDescription('L\'utilisateur à rendre muet')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('duree')
                .setDescription('Durée du mute (ex: 10m, 1h, 1d) - permanent si non spécifié')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('raison')
                .setDescription('Raison du mute')
                .setRequired(false))
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
                const embed = new EmbedBuilder()
                    .setTitle(t('errors.no_permission'))
                    .setDescription(t('admin.mute.no_permission_desc'))
                    .setColor('#FF0000')
                    .setTimestamp();
                return await interaction.reply({ embeds: [embed], ephemeral: true });
            }

            const targetUser = interaction.options.getUser('utilisateur');
            const durationStr = interaction.options.getString('duree');
            const reason = interaction.options.getString('raison') || t('admin.mute.no_reason');

            // Vérification si l'utilisateur est dans le serveur
            const targetMember = interaction.guild.members.cache.get(targetUser.id);
            
            if (!targetMember) {
                const embed = new EmbedBuilder()
                    .setTitle(t('errors.user_not_found'))
                    .setDescription(t('admin.mute.user_not_in_server'))
                    .setColor('#FF0000')
                    .setTimestamp();
                return await interaction.reply({ embeds: [embed], ephemeral: true });
            }

            // Vérification si on peut modérer cet utilisateur
            if (!PermissionManager.canModerate(member, targetMember)) {
                const embed = new EmbedBuilder()
                    .setTitle(t('errors.cannot_moderate'))
                    .setDescription(t('admin.mute.cannot_moderate_desc'))
                    .setColor('#FF0000')
                    .setTimestamp();
                return await interaction.reply({ embeds: [embed], ephemeral: true });
            }

            // Vérification si le bot peut mute cet utilisateur
            const botMember = interaction.guild.members.me;
            if (!PermissionManager.canBotModerate(botMember, targetMember, 'mute')) {
                const embed = new EmbedBuilder()
                    .setTitle(t('errors.bot_cannot_moderate'))
                    .setDescription(t('admin.mute.bot_cannot_moderate_desc'))
                    .setColor('#FF0000')
                    .setTimestamp();
                return await interaction.reply({ embeds: [embed], ephemeral: true });
            }

            // Parsing de la durée
            let duration = null;
            let durationMs = null;
            let expiresAt = null;
            
            if (durationStr) {
                const durationRegex = /^(\d+)([smhd])$/i;
                const match = durationStr.match(durationRegex);
                
                if (!match) {
                    const embed = new EmbedBuilder()
                        .setTitle(t('admin.mute.invalid_duration'))
                        .setDescription(t('admin.mute.duration_format'))
                        .setColor('#FF0000')
                        .setTimestamp();
                    return await interaction.reply({ embeds: [embed], ephemeral: true });
                }
                
                const value = parseInt(match[1]);
                const unit = match[2].toLowerCase();
                
                switch (unit) {
                    case 's':
                        durationMs = value * 1000;
                        duration = `${value} ${t('admin.mute.seconds')}`;
                        break;
                    case 'm':
                        durationMs = value * 60 * 1000;
                        duration = `${value} ${t('admin.mute.minutes')}`;
                        break;
                    case 'h':
                        durationMs = value * 60 * 60 * 1000;
                        duration = `${value} ${t('admin.mute.hours')}`;
                        break;
                    case 'd':
                        durationMs = value * 24 * 60 * 60 * 1000;
                        duration = `${value} ${t('admin.mute.days')}`;
                        break;
                }
                
                expiresAt = new Date(Date.now() + durationMs);
                
                // Vérification de la durée maximale (30 jours)
                if (durationMs > 30 * 24 * 60 * 60 * 1000) {
                    const embed = new EmbedBuilder()
                        .setTitle(t('admin.mute.duration_too_long'))
                        .setDescription(t('admin.mute.max_duration'))
                        .setColor('#FF0000')
                        .setTimestamp();
                    return await interaction.reply({ embeds: [embed], ephemeral: true });
                }
            } else {
                duration = t('admin.mute.permanent');
            }

            await interaction.deferReply();

            try {
                // Obtenir ou créer le rôle de mute
                const muteRole = await PermissionManager.getMuteRole(interaction.guild, guildConfig);
                
                if (!muteRole) {
                    const embed = new EmbedBuilder()
                        .setTitle(t('admin.mute.role_error'))
                        .setDescription(t('admin.mute.role_error_desc'))
                        .setColor('#FF0000')
                        .setTimestamp();
                    return await interaction.editReply({ embeds: [embed] });
                }

                // Vérification si l'utilisateur est déjà muet
                if (targetMember.roles.cache.has(muteRole.id)) {
                    const embed = new EmbedBuilder()
                        .setTitle(t('admin.mute.already_muted'))
                        .setDescription(t('admin.mute.already_muted_desc', targetUser.tag))
                        .setColor('#FFA500')
                        .setTimestamp();
                    return await interaction.editReply({ embeds: [embed] });
                }

                // Tentative d'envoi d'un message privé à l'utilisateur
                try {
                    const dmEmbed = new EmbedBuilder()
                         .setTitle(t('admin.mute.dm_title'))
                         .setDescription(t('admin.mute.dm_description', interaction.guild.name, duration, reason))
                         .setColor('#FFA500')
                         .setTimestamp();
                    await targetUser.send({ embeds: [dmEmbed] });
                } catch (error) {
                    // Impossible d'envoyer le MP, on continue
                }

                // Application du mute
                await targetMember.roles.add(muteRole, `${reason} | Modérateur: ${interaction.user.tag}`);

                // Si c'est un mute temporaire, utiliser aussi le timeout Discord
                if (durationMs && durationMs <= 28 * 24 * 60 * 60 * 1000) { // Max 28 jours pour Discord
                    await targetMember.timeout(durationMs, `${reason} | Modérateur: ${interaction.user.tag}`);
                }

                // Enregistrement dans la base de données
                await DatabaseManager.addSanction(
                    targetUser.id,
                    interaction.guild.id,
                    interaction.user.id,
                    'mute',
                    reason,
                    durationMs
                );

                // Message de confirmation
                const successEmbed = new EmbedBuilder()
                    .setTitle(t('admin.mute.success'))
                    .setDescription(t('admin.mute.success_desc', targetUser.tag, duration, reason))
                    .addFields(
                        { name: t('admin.mute.details'), value: 
                            `👤 **${t('admin.mute.user')}:** ${targetUser.tag} (${targetUser.id})\n` +
                            `👮 **${t('admin.mute.moderator')}:** ${interaction.user.tag}\n` +
                            `⏱️ **${t('admin.mute.duration')}:** ${duration}\n` +
                            `📝 **${t('admin.mute.reason')}:** ${reason}` +
                            (expiresAt ? `\n⏰ **${t('admin.mute.expires')}:** <t:${Math.floor(expiresAt.getTime() / 1000)}:F>` : ''),
                            inline: false
                        }
                    )
                    .setColor('#00FF00')
                    .setTimestamp();

                await interaction.editReply({ embeds: [successEmbed] });

                // Log dans le canal de logs
                if (guildConfig?.logChannelId) {
                    const logChannel = interaction.guild.channels.cache.get(guildConfig.logChannelId);
                    if (logChannel) {
                        const logEmbed = new EmbedBuilder()
                            .setTitle(`🔇 ${t('admin.mute.log_title')}`)
                            .setDescription(
                                `**${t('admin.mute.user')}:** ${targetUser.tag} (${targetUser.id})\n` +
                                `**${t('admin.mute.moderator')}:** ${interaction.user.tag} (${interaction.user.id})\n` +
                                `**${t('admin.mute.duration')}:** ${duration}\n` +
                                `**${t('admin.mute.reason')}:** ${reason}\n` +
                                (expiresAt ? `**${t('admin.mute.expires')}:** <t:${Math.floor(expiresAt.getTime() / 1000)}:F>\n` : '') +
                                `**${t('admin.mute.timestamp')}:** <t:${Math.floor(Date.now() / 1000)}:F>`
                            )
                            .setColor('#0099FF')
                            .setTimestamp();
                        
                        await logChannel.send({ embeds: [logEmbed] });
                    }
                }

                // Programmer l'unmute automatique si nécessaire
                if (durationMs) {
                    setTimeout(async () => {
                        try {
                            const stillMuted = await interaction.guild.members.fetch(targetUser.id)
                                .then(m => m.roles.cache.has(muteRole.id))
                                .catch(() => false);
                            
                            if (stillMuted) {
                                const member = await interaction.guild.members.fetch(targetUser.id);
                                await member.roles.remove(muteRole, 'Mute temporaire expiré');
                                
                                // Log de l'unmute automatique
                                if (guildConfig?.logChannelId) {
                                    const logChannel = interaction.guild.channels.cache.get(guildConfig.logChannelId);
                                    if (logChannel) {
                                        const unmuteEmbed = new EmbedBuilder()
                                            .setTitle(`🔊 ${t('admin.mute.auto_unmute_title')}`)
                                            .setDescription(
                                                `**${t('admin.mute.user')}:** ${targetUser.tag} (${targetUser.id})\n` +
                                                `**${t('admin.mute.reason')}:** ${t('admin.mute.auto_unmute_reason')}\n` +
                                                `**${t('admin.mute.timestamp')}:** <t:${Math.floor(Date.now() / 1000)}:F>`
                                            )
                                            .setColor('#0099FF')
                                            .setTimestamp();
                                        await logChannel.send({ embeds: [unmuteEmbed] });
                                    }
                                }
                            }
                        } catch (error) {
                            console.error('Erreur lors de l\'unmute automatique:', error);
                        }
                    }, durationMs);
                }

            } catch (error) {
                console.error('Erreur lors du mute:', error);
                const errorEmbed = new EmbedBuilder()
                    .setTitle(t('errors.command_failed'))
                    .setDescription(t('admin.mute.error_desc', error.message))
                    .setColor('#FF0000')
                    .setTimestamp();
                await interaction.editReply({ embeds: [errorEmbed] });
            }

        } catch (error) {
            console.error('Erreur dans la commande mute:', error);
            const errorEmbed = new EmbedBuilder()
                .setTitle(t('errors.unexpected'))
                .setDescription(t('errors.try_again'))
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