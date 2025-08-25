const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const PermissionManager = require('../../utils/permissions');
const DatabaseManager = require('../../utils/database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ban')
        .setDescription('Bannir un utilisateur du serveur')
        .addUserOption(option =>
            option.setName('utilisateur')
                .setDescription('L\'utilisateur à bannir')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('raison')
                .setDescription('Raison du bannissement')
                .setRequired(false))
        .addIntegerOption(option =>
            option.setName('supprimer_messages')
                .setDescription('Nombre de jours de messages à supprimer (0-7)')
                .setMinValue(0)
                .setMaxValue(7)
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

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
                    .setDescription(t('admin.ban.no_permission_desc'))
                    .setColor('#FF0000')
                    .setTimestamp();
                return await interaction.reply({ embeds: [embed], ephemeral: true });
            }

            const targetUser = interaction.options.getUser('utilisateur');
            const reason = interaction.options.getString('raison') || t('admin.ban.no_reason');
            const deleteMessageDays = interaction.options.getInteger('supprimer_messages') || 0;

            // Vérification si l'utilisateur est dans le serveur
            const targetMember = interaction.guild.members.cache.get(targetUser.id);
            
            if (targetMember) {
                // Vérification si on peut modérer cet utilisateur
                if (!PermissionManager.canModerate(member, targetMember)) {
                    const embed = new EmbedBuilder()
                        .setTitle(t('errors.cannot_moderate'))
                        .setDescription(t('admin.ban.cannot_moderate_desc'))
                        .setColor('#FF0000')
                        .setTimestamp();
                    return await interaction.reply({ embeds: [embed], ephemeral: true });
                }

                // Vérification si le bot peut bannir cet utilisateur
                const botMember = interaction.guild.members.me;
                if (!PermissionManager.canBotModerate(botMember, targetMember, 'ban')) {
                    const embed = new EmbedBuilder()
                        .setTitle(t('errors.bot_cannot_moderate'))
                        .setDescription(t('admin.ban.bot_cannot_moderate_desc'))
                        .setColor('#FF0000')
                        .setTimestamp();
                    return await interaction.reply({ embeds: [embed], ephemeral: true });
                }
            }

            // Vérification si l'utilisateur est déjà banni
            try {
                const banInfo = await interaction.guild.bans.fetch(targetUser.id);
                if (banInfo) {
                    const embed = new EmbedBuilder()
                        .setTitle(t('admin.ban.already_banned'))
                        .setDescription(t('admin.ban.already_banned_desc', targetUser.tag))
                        .setColor('#FFA500')
                        .setTimestamp();
                    return await interaction.reply({ embeds: [embed], ephemeral: true });
                }
            } catch (error) {
                // L'utilisateur n'est pas banni, on continue
            }

            await interaction.deferReply();

            try {
                // Tentative d'envoi d'un message privé à l'utilisateur
                if (targetMember) {
                    try {
                        const dmEmbed = new EmbedBuilder()
                            .setTitle(t('admin.ban.dm_title'))
                            .setDescription(t('admin.ban.dm_description', interaction.guild.name, reason))
                            .setColor('#FFA500')
                            .setTimestamp();
                        await targetUser.send({ embeds: [dmEmbed] });
                    } catch (error) {
                        // Impossible d'envoyer le MP, on continue
                    }
                }

                // Bannissement
                await interaction.guild.members.ban(targetUser, {
                    reason: `${reason} | Modérateur: ${interaction.user.tag}`,
                    deleteMessageSeconds: deleteMessageDays * 24 * 60 * 60 // Conversion jours en secondes
                });

                // Enregistrement dans la base de données
                await DatabaseManager.addSanction(
                    targetUser.id,
                    interaction.guild.id,
                    interaction.user.id,
                    'ban',
                    reason
                );

                // Message de confirmation
                const successEmbed = new EmbedBuilder()
                    .setTitle(t('admin.ban.success'))
                    .setDescription(t('admin.ban.success_desc', targetUser.tag, reason))
                    .setColor('#00FF00')
                    .setTimestamp()
                    .addFields(
                        { name: t('admin.ban.details'), value: '\u200B', inline: false },
                        { name: `👤 ${t('admin.ban.user')}`, value: `${targetUser.tag} (${targetUser.id})`, inline: true },
                        { name: `👮 ${t('admin.ban.moderator')}`, value: interaction.user.tag, inline: true },
                        { name: `📝 ${t('admin.ban.reason')}`, value: reason, inline: false },
                        { name: `🗑️ ${t('admin.ban.deleted_messages')}`, value: `${deleteMessageDays} ${t('admin.ban.days')}`, inline: true }
                    );

                await interaction.editReply({ embeds: [successEmbed] });

                // Log dans le canal de logs
                if (guildConfig?.logChannelId) {
                    const logChannel = interaction.guild.channels.cache.get(guildConfig.logChannelId);
                    if (logChannel) {
                        const logEmbed = new EmbedBuilder()
                            .setTitle(`🔨 ${t('admin.ban.log_title')}`)
                            .setDescription(
                                `**${t('admin.ban.user')}:** ${targetUser.tag} (${targetUser.id})\n` +
                                `**${t('admin.ban.moderator')}:** ${interaction.user.tag} (${interaction.user.id})\n` +
                                `**${t('admin.ban.reason')}:** ${reason}\n` +
                                `**${t('admin.ban.deleted_messages')}:** ${deleteMessageDays} ${t('admin.ban.days')}\n` +
                                `**${t('admin.ban.timestamp')}:** <t:${Math.floor(Date.now() / 1000)}:F>`
                            )
                            .setColor('#0099FF')
                            .setTimestamp();
                        
                        await logChannel.send({ embeds: [logEmbed] });
                    }
                }

            } catch (error) {
                console.error('Erreur lors du bannissement:', error);
                const errorEmbed = new EmbedBuilder()
                    .setTitle(t('errors.command_failed'))
                    .setDescription(t('admin.ban.error_desc', error.message))
                    .setColor('#FF0000')
                    .setTimestamp();
                await interaction.editReply({ embeds: [errorEmbed] });
            }

        } catch (error) {
            console.error('Erreur dans la commande ban:', error);
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