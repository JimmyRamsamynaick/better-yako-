const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const PermissionManager = require('../../utils/permissions');
const DatabaseManager = require('../../utils/database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('unmute')
        .setDescription('Retirer le mute d\'un utilisateur')
        .addUserOption(option =>
            option.setName('utilisateur')
                .setDescription('L\'utilisateur à démuter')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('raison')
                .setDescription('Raison du démute')
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
                    .setDescription(t('admin.unmute.no_permission_desc'))
                    .setColor('#FF0000')
                    .setTimestamp();
                return await interaction.reply({ embeds: [embed], ephemeral: true });
            }

            const targetUser = interaction.options.getUser('utilisateur');
            const reason = interaction.options.getString('raison') || t('admin.unmute.no_reason');

            // Vérification si l'utilisateur est dans le serveur
            const targetMember = interaction.guild.members.cache.get(targetUser.id);
            
            if (!targetMember) {
                const embed = new EmbedBuilder()
                    .setTitle(t('errors.user_not_found'))
                    .setDescription(t('admin.unmute.user_not_in_server'))
                    .setColor('#FF0000')
                    .setTimestamp();
                return await interaction.reply({ embeds: [embed], ephemeral: true });
            }

            await interaction.deferReply();

            try {
                // Obtenir le rôle de mute
                const muteRole = await PermissionManager.getMuteRole(interaction.guild, guildConfig);
                
                if (!muteRole) {
                    const embed = new EmbedBuilder()
                        .setTitle(t('admin.unmute.role_error'))
                        .setDescription(t('admin.unmute.role_error_desc'))
                        .setColor('#FF0000')
                        .setTimestamp();
                    return await interaction.editReply({ embeds: [embed] });
                }

                // Vérification si l'utilisateur est muet
                const isMuted = targetMember.roles.cache.has(muteRole.id) || targetMember.isCommunicationDisabled();
                
                if (!isMuted) {
                    const embed = new EmbedBuilder()
                        .setTitle(t('admin.unmute.not_muted'))
                        .setDescription(t('admin.unmute.not_muted_desc', targetUser.tag))
                        .setColor('#FFA500')
                        .setTimestamp();
                    return await interaction.editReply({ embeds: [embed] });
                }

                // Tentative d'envoi d'un message privé à l'utilisateur
                try {
                    const dmEmbed = new EmbedBuilder()
                        .setTitle(t('admin.unmute.dm_title'))
                        .setDescription(t('admin.unmute.dm_description', interaction.guild.name, reason))
                        .setColor('#00FF00')
                        .setTimestamp();
                    await targetUser.send({ embeds: [dmEmbed] });
                } catch (error) {
                    // Impossible d'envoyer le MP, on continue
                }

                // Retrait du mute
                if (targetMember.roles.cache.has(muteRole.id)) {
                    await targetMember.roles.remove(muteRole, `${reason} | Modérateur: ${interaction.user.tag}`);
                }

                // Retrait du timeout Discord si présent
                if (targetMember.isCommunicationDisabled()) {
                    await targetMember.timeout(null, `${reason} | Modérateur: ${interaction.user.tag}`);
                }

                // Enregistrement dans la base de données
                await DatabaseManager.addSanction(
                    targetUser.id,
                    interaction.guild.id,
                    interaction.user.id,
                    'unmute',
                    reason
                );

                // Désactiver les mutes actifs dans la base de données
                const activeMutes = await DatabaseManager.getActiveMutes(interaction.guild.id);
                const userMutes = activeMutes.filter(mute => mute.userId === targetUser.id);
                
                for (const mute of userMutes) {
                    await DatabaseManager.expireMute(mute._id);
                }

                // Message de confirmation
                const successEmbed = new EmbedBuilder()
                    .setTitle(t('admin.unmute.success'))
                    .setDescription(t('admin.unmute.success_desc', targetUser.tag, reason))
                    .addFields(
                        { name: '👤 Utilisateur', value: `${targetUser.tag} (${targetUser.id})`, inline: true },
                        { name: '👮 Modérateur', value: interaction.user.tag, inline: true },
                        { name: '📝 Raison', value: reason, inline: false }
                    )
                    .setColor('#00FF00')
                    .setTimestamp();

                await interaction.editReply({ embeds: [successEmbed] });

                // Log dans le canal de logs
                if (guildConfig?.logChannelId) {
                    const logChannel = interaction.guild.channels.cache.get(guildConfig.logChannelId);
                    if (logChannel) {
                        const logEmbed = new EmbedBuilder()
                            .setTitle(`🔊 ${t('admin.unmute.log_title')}`)
                            .setDescription(
                                `**${t('admin.unmute.user')}:** ${targetUser.tag} (${targetUser.id})\n` +
                                `**${t('admin.unmute.moderator')}:** ${interaction.user.tag} (${interaction.user.id})\n` +
                                `**${t('admin.unmute.reason')}:** ${reason}\n` +
                                `**${t('admin.unmute.timestamp')}:** <t:${Math.floor(Date.now() / 1000)}:F>`
                            )
                            .setColor('#0099FF')
                            .setTimestamp();
                        
                        await logChannel.send({ embeds: [logEmbed] });
                    }
                }

            } catch (error) {
                console.error('Erreur lors du démute:', error);
                const errorEmbed = new EmbedBuilder()
                    .setTitle(t('errors.command_failed'))
                    .setDescription(t('admin.unmute.error_desc', error.message))
                    .setColor('#FF0000')
                    .setTimestamp();
                await interaction.editReply({ embeds: [errorEmbed] });
            }

        } catch (error) {
            console.error('Erreur dans la commande unmute:', error);
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