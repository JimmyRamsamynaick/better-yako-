const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { ModernComponents } = require('../../utils/modernComponents');
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
                const embed = ModernComponents.createErrorMessage(
                    t('errors.no_permission'),
                    t('admin.unlock.no_permission_desc')
                );
                return await interaction.reply({ embeds: [embed], ephemeral: true });
            }

            // Vérification des permissions du bot
            if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.ManageChannels)) {
                const embed = ModernComponents.createErrorMessage(
                    t('errors.bot_no_permission'),
                    t('admin.unlock.bot_no_permission_desc')
                );
                return await interaction.reply({ embeds: [embed], ephemeral: true });
            }

            const targetChannel = interaction.options.getChannel('canal') || interaction.channel;
            const reason = interaction.options.getString('raison') || t('admin.unlock.default_reason');

            // Vérification que c'est un canal textuel
            if (!targetChannel.isTextBased()) {
                const embed = ModernComponents.createErrorMessage(
                    t('admin.unlock.invalid_channel'),
                    t('admin.unlock.invalid_channel_desc')
                );
                return await interaction.reply({ embeds: [embed], ephemeral: true });
            }

            // Vérification des permissions du bot sur le canal cible
            if (!targetChannel.permissionsFor(interaction.guild.members.me).has(PermissionFlagsBits.ManageChannels)) {
                const embed = ModernComponents.createErrorMessage(
                    t('errors.bot_no_permission'),
                    t('admin.unlock.bot_no_channel_permission_desc', targetChannel.name)
                );
                return await interaction.reply({ embeds: [embed], ephemeral: true });
            }

            await interaction.deferReply();

            try {
                // Vérification si le canal est verrouillé
                const everyoneRole = interaction.guild.roles.everyone;
                const currentPermissions = targetChannel.permissionOverwrites.cache.get(everyoneRole.id);
                
                if (!currentPermissions || !currentPermissions.deny.has(PermissionFlagsBits.SendMessages)) {
                    const embed = ModernComponents.createWarningMessage(
                        t('admin.unlock.not_locked'),
                        t('admin.unlock.not_locked_desc', targetChannel.name)
                    );
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
                const successEmbed = ModernComponents.createSuccessMessage(
                    t('admin.unlock.success'),
                    t('admin.unlock.success_desc', targetChannel.name)
                );

                const container = ModernComponents.createContainer()
                    .addComponent(successEmbed)
                    .addComponent(ModernComponents.createSeparator())
                    .addComponent(ModernComponents.createTextDisplay(
                        `**${t('admin.unlock.details')}**\n` +
                        `🔓 **${t('admin.unlock.channel')}:** ${targetChannel.name} (${targetChannel.id})\n` +
                        `👮 **${t('admin.unlock.moderator')}:** ${interaction.user.tag}\n` +
                        `📝 **${t('admin.unlock.reason')}:** ${reason}\n` +
                        `✅ **${t('admin.unlock.restored_permissions')}:** ${t('admin.unlock.permissions_list')}`
                    ));

                // Affichage des informations sur les verrouillages précédents
                if (activeLockSanctions.length > 0) {
                    const lockInfo = activeLockSanctions.map(sanction => {
                        const lockDate = new Date(sanction.createdAt);
                        const moderator = sanction.moderatorId;
                        return `• **${sanction.reason}** - <t:${Math.floor(lockDate.getTime() / 1000)}:R> par <@${moderator}>`;
                    }).join('\n');

                    const lockHistoryEmbed = ModernComponents.createInfoMessage(
                        `📋 ${t('admin.unlock.previous_locks')}`,
                        lockInfo
                    );
                    container.addComponent(lockHistoryEmbed);

                    // Désactivation des sanctions de verrouillage
                    for (const sanction of activeLockSanctions) {
                        await DatabaseManager.expireSanction(sanction._id);
                    }
                }

                await interaction.editReply(container.toMessage());

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
                const unlockNotification = ModernComponents.createSuccessMessage(
                    `🔓 ${t('admin.unlock.channel_unlocked')}`,
                    t('admin.unlock.channel_unlocked_desc', interaction.user.tag, reason)
                );

                await targetChannel.send({ embeds: [unlockNotification] });

                // Log dans le canal de logs
                if (guildConfig?.logChannelId) {
                    const logChannel = interaction.guild.channels.cache.get(guildConfig.logChannelId);
                    if (logChannel) {
                        const logEmbed = ModernComponents.createSuccessMessage(
                            `🔓 ${t('admin.unlock.log_title')}`,
                            `**${t('admin.unlock.channel')}:** ${targetChannel.name} (${targetChannel.id})\n` +
                            `**${t('admin.unlock.moderator')}:** ${interaction.user.tag} (${interaction.user.id})\n` +
                            `**${t('admin.unlock.reason')}:** ${reason}\n` +
                            (activeLockSanctions.length > 0 ? `**${t('admin.unlock.expired_locks')}:** ${activeLockSanctions.length}\n` : '') +
                            `**${t('admin.unlock.timestamp')}:** <t:${Math.floor(Date.now() / 1000)}:F>`
                        );
                        
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
                
                const errorEmbed = ModernComponents.createErrorMessage(
                    t('errors.command_failed'),
                    errorMessage
                );
                await interaction.editReply({ embeds: [errorEmbed] });
            }

        } catch (error) {
            console.error('Erreur dans la commande unlock:', error);
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