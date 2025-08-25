const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const PermissionManager = require('../../utils/permissions');
const DatabaseManager = require('../../utils/database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('unlock')
        .setDescription('Déverrouiller un canal')
        .addChannelOption(option =>
            option.setName('canal')
                .setDescription('Canal à déverrouiller (canal actuel si non spécifié)')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('raison')
                .setDescription('Raison du déverrouillage')
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
                    .setDescription(t('admin.unlock.no_permission_desc'))
                    .setColor('#FF0000')
                    .setTimestamp();
                return await interaction.reply({ embeds: [embed], ephemeral: true });
            }

            // Vérification des permissions du bot
            if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.ManageChannels)) {
                const embed = new EmbedBuilder()
                    .setTitle(t('errors.bot_no_permission'))
                    .setDescription(t('admin.unlock.bot_no_permission_desc'))
                    .setColor('#FF0000')
                    .setTimestamp();
                return await interaction.reply({ embeds: [embed], ephemeral: true });
            }

            const targetChannel = interaction.options.getChannel('canal') || interaction.channel;
            const reason = interaction.options.getString('raison') || t('admin.unlock.default_reason');

            // Vérification que c'est un canal textuel
            if (!targetChannel.isTextBased()) {
                const embed = new EmbedBuilder()
                    .setTitle(t('admin.unlock.invalid_channel'))
                    .setDescription(t('admin.unlock.invalid_channel_desc'))
                    .setColor('#FF0000')
                    .setTimestamp();
                return await interaction.reply({ embeds: [embed], ephemeral: true });
            }

            // Vérification des permissions du bot sur le canal cible
            if (!targetChannel.permissionsFor(interaction.guild.members.me).has(PermissionFlagsBits.ManageChannels)) {
                const embed = new EmbedBuilder()
                    .setTitle(t('errors.bot_no_permission'))
                    .setDescription(t('admin.unlock.bot_no_channel_permission_desc', targetChannel.name))
                    .setColor('#FF0000')
                    .setTimestamp();
                return await interaction.reply({ embeds: [embed], ephemeral: true });
            }

            await interaction.deferReply();

            try {
                // Vérification si le canal est verrouillé
                const everyoneRole = interaction.guild.roles.everyone;
                const currentPermissions = targetChannel.permissionOverwrites.cache.get(everyoneRole.id);
                
                if (!currentPermissions || !currentPermissions.deny.has(PermissionFlagsBits.SendMessages)) {
                    const embed = new EmbedBuilder()
                        .setTitle(t('admin.unlock.not_locked'))
                        .setDescription(t('admin.unlock.not_locked_desc', targetChannel.name))
                        .setColor('#FFA500')
                        .setTimestamp();
                    return await interaction.editReply({ embeds: [embed] });
                }

                // Récupération des sanctions de verrouillage actives pour ce canal
                const activeLockSanctions = await DatabaseManager.getActiveSanctions(
                    'channel_' + targetChannel.id,
                    interaction.guild.id,
                    'lock'
                );

                // Déverrouillage du canal - restauration des permissions par défaut
                // On supprime complètement l'override pour @everyone pour restaurer les permissions par défaut
                const hadOtherPermissions = currentPermissions.allow.bitfield !== 0n || 
                    (currentPermissions.deny.bitfield & ~(
                        PermissionFlagsBits.SendMessages |
                        PermissionFlagsBits.AddReactions |
                        PermissionFlagsBits.CreatePublicThreads |
                        PermissionFlagsBits.CreatePrivateThreads |
                        PermissionFlagsBits.SendMessagesInThreads
                    )) !== 0n;

                if (hadOtherPermissions) {
                    // Si il y avait d'autres permissions, on les garde et on retire juste les restrictions de verrouillage
                    await targetChannel.permissionOverwrites.edit(everyoneRole, {
                        SendMessages: null,
                        AddReactions: null,
                        CreatePublicThreads: null,
                        CreatePrivateThreads: null,
                        SendMessagesInThreads: null
                    }, { reason: `Déverrouillage par ${interaction.user.tag}: ${reason}` });
                } else {
                    // Si il n'y avait que les restrictions de verrouillage, on supprime complètement l'override
                    await targetChannel.permissionOverwrites.delete(everyoneRole, 
                        `Déverrouillage par ${interaction.user.tag}: ${reason}`);
                }

                // Message de confirmation
                const successEmbed = new EmbedBuilder()
                    .setTitle(`🔓 ${t('admin.unlock.success')}`)
                    .setDescription(`✅ ${t('admin.unlock.success_desc', targetChannel.name)}`)
                    .addFields(
                        { name: '🔓 Canal déverrouillé', value: `${targetChannel.toString()}\n\`#${targetChannel.name}\``, inline: true },
                        { name: '👮 Modérateur', value: `${interaction.user.toString()}\n\`${interaction.user.tag}\``, inline: true },
                        { name: '📝 Raison du déverrouillage', value: `\`${reason}\``, inline: false },
                        { name: '✅ Permissions restaurées', value: '💬 Envoyer des messages\n😀 Ajouter des réactions\n🧵 Créer des fils\n📝 Écrire dans les fils', inline: false },
                        { name: '📅 Date', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
                    )
                    .setColor('#57f287')
                    .setTimestamp();

                // Affichage des informations sur les verrouillages précédents
                if (activeLockSanctions.length > 0) {
                    const lockInfo = activeLockSanctions.map(sanction => {
                        const lockDate = new Date(sanction.createdAt);
                        const moderator = sanction.moderatorId;
                        return `• **${sanction.reason}** - <t:${Math.floor(lockDate.getTime() / 1000)}:R> par <@${moderator}>`;
                    }).join('\n');

                    const lockHistoryEmbed = new EmbedBuilder()
                        .setTitle(`📋 ${t('admin.unlock.previous_locks')}`)
                        .setDescription(lockInfo)
                        .setColor('#0099FF')
                        .setTimestamp();

                    // Désactivation des sanctions de verrouillage
                    for (const sanction of activeLockSanctions) {
                        await DatabaseManager.expireSanction(sanction._id);
                    }
                }

                const embeds = [successEmbed];
                if (activeLockSanctions.length > 0) {
                    embeds.push(lockHistoryEmbed);
                }
                await interaction.editReply({ embeds });

                // Enregistrement de la sanction de déverrouillage dans la base de données
                await DatabaseManager.addSanction(
                    'channel_' + targetChannel.id,
                    interaction.guild.id,
                    interaction.user.id,
                    'unlock',
                    reason,
                    null, // Pas de durée pour unlock
                    null  // Pas d'expiration
                );

                // Message dans le canal déverrouillé
                const unlockNotification = new EmbedBuilder()
                    .setTitle(`🔓 ${t('admin.unlock.channel_unlocked')}`)
                    .setDescription(`🎉 **Ce canal a été déverrouillé par ${interaction.user.tag}**\n\n📝 **Raison:** ${reason}\n\n✅ **Vous pouvez maintenant écrire à nouveau dans ce canal !**`)
                    .setColor('#57f287')
                    .setTimestamp()
                    .setFooter({ text: '🔓 Canal accessible à nouveau', iconURL: interaction.guild.iconURL() });

                await targetChannel.send({ embeds: [unlockNotification] });

                // Log dans le canal de logs
                if (guildConfig?.logChannelId) {
                    const logChannel = interaction.guild.channels.cache.get(guildConfig.logChannelId);
                    if (logChannel) {
                        const logEmbed = new EmbedBuilder()
                            .setTitle(`🔓 ${t('admin.unlock.log_title')}`)
                            .setDescription(
                                `**${t('admin.unlock.channel')}:** ${targetChannel.name} (${targetChannel.id})\n` +
                                `**${t('admin.unlock.moderator')}:** ${interaction.user.tag} (${interaction.user.id})\n` +
                                `**${t('admin.unlock.reason')}:** ${reason}\n` +
                                (activeLockSanctions.length > 0 ? `**${t('admin.unlock.expired_locks')}:** ${activeLockSanctions.length}\n` : '') +
                                `**${t('admin.unlock.timestamp')}:** <t:${Math.floor(Date.now() / 1000)}:F>`
                            )
                            .setColor('#00FF00')
                            .setTimestamp();
                        
                        await logChannel.send({ embeds: [logEmbed] });
                    }
                }

            } catch (error) {
                console.error('Erreur lors du déverrouillage du canal:', error);
                
                let errorMessage = t('admin.unlock.error_desc', error.message);
                
                if (error.code === 50013) {
                    errorMessage = t('admin.unlock.permission_error');
                } else if (error.code === 50001) {
                    errorMessage = t('admin.unlock.access_error');
                }
                
                const errorEmbed = new EmbedBuilder()
                    .setTitle(t('errors.command_failed'))
                    .setDescription(errorMessage)
                    .setColor('#FF0000')
                    .setTimestamp();
                await interaction.editReply({ embeds: [errorEmbed] });
            }

        } catch (error) {
            console.error('Erreur dans la commande unlock:', error);
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