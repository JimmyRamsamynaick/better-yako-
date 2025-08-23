const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { ModernComponents } = require('../../utils/modernComponents');
const PermissionManager = require('../../utils/permissions');
const DatabaseManager = require('../../utils/database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('clear')
        .setDescription('Supprimer des messages en masse')
        .addIntegerOption(option =>
            option.setName('nombre')
                .setDescription('Nombre de messages à supprimer (1-100)')
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(100))
        .addUserOption(option =>
            option.setName('utilisateur')
                .setDescription('Supprimer uniquement les messages de cet utilisateur')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('raison')
                .setDescription('Raison de la suppression')
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

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
                    t('admin.clear.no_permission_desc')
                );
                return await interaction.reply({ embeds: [embed], ephemeral: true });
            }

            // Vérification des permissions du bot
            if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.ManageMessages)) {
                const embed = ModernComponents.createErrorMessage(
                    t('errors.bot_no_permission'),
                    t('admin.clear.bot_no_permission_desc')
                );
                return await interaction.reply({ embeds: [embed], ephemeral: true });
            }

            const amount = interaction.options.getInteger('nombre');
            const targetUser = interaction.options.getUser('utilisateur');
            const reason = interaction.options.getString('raison') || t('admin.clear.default_reason');

            await interaction.deferReply({ ephemeral: true });

            try {
                let messages;
                let deletedCount = 0;
                let skippedCount = 0;
                let oldMessagesCount = 0;

                if (targetUser) {
                    // Supprimer les messages d'un utilisateur spécifique
                    const fetchedMessages = await interaction.channel.messages.fetch({ limit: 100 });
                    const userMessages = fetchedMessages.filter(msg => 
                        msg.author.id === targetUser.id && 
                        (Date.now() - msg.createdTimestamp) < 14 * 24 * 60 * 60 * 1000 // Messages de moins de 14 jours
                    );
                    
                    const messagesToDelete = userMessages.first(amount);
                    
                    if (messagesToDelete.length === 0) {
                        const embed = ModernComponents.createWarningMessage(
                            t('admin.clear.no_messages'),
                            t('admin.clear.no_user_messages_desc', targetUser.tag)
                        );
                        return await interaction.editReply({ embeds: [embed] });
                    }

                    // Compter les messages trop anciens
                    const allUserMessages = fetchedMessages.filter(msg => msg.author.id === targetUser.id);
                    oldMessagesCount = allUserMessages.size - userMessages.size;

                    messages = await interaction.channel.bulkDelete(messagesToDelete, true);
                    deletedCount = messages.size;
                    skippedCount = messagesToDelete.length - deletedCount;
                } else {
                    // Supprimer les messages récents
                    const fetchedMessages = await interaction.channel.messages.fetch({ limit: amount });
                    const recentMessages = fetchedMessages.filter(msg => 
                        (Date.now() - msg.createdTimestamp) < 14 * 24 * 60 * 60 * 1000 // Messages de moins de 14 jours
                    );
                    
                    if (recentMessages.size === 0) {
                        const embed = ModernComponents.createWarningMessage(
                            t('admin.clear.no_messages'),
                            t('admin.clear.no_recent_messages_desc')
                        );
                        return await interaction.editReply({ embeds: [embed] });
                    }

                    oldMessagesCount = fetchedMessages.size - recentMessages.size;
                    messages = await interaction.channel.bulkDelete(recentMessages, true);
                    deletedCount = messages.size;
                    skippedCount = recentMessages.size - deletedCount;
                }

                // Message de confirmation
                const successEmbed = ModernComponents.createSuccessMessage(
                    t('admin.clear.success'),
                    t('admin.clear.success_desc', deletedCount, interaction.channel.name)
                );

                const container = ModernComponents.createContainer()
                    .addComponent(successEmbed)
                    .addComponent(ModernComponents.createSeparator())
                    .addComponent(ModernComponents.createTextDisplay(
                        `**${t('admin.clear.details')}**\n` +
                        `📊 **${t('admin.clear.requested')}:** ${amount}\n` +
                        `✅ **${t('admin.clear.deleted')}:** ${deletedCount}\n` +
                        (skippedCount > 0 ? `⚠️ **${t('admin.clear.skipped')}:** ${skippedCount}\n` : '') +
                        (oldMessagesCount > 0 ? `🕒 **${t('admin.clear.too_old')}:** ${oldMessagesCount}\n` : '') +
                        `📍 **${t('admin.clear.channel')}:** ${interaction.channel.name}\n` +
                        (targetUser ? `👤 **${t('admin.clear.target_user')}:** ${targetUser.tag}\n` : '') +
                        `👮 **${t('admin.clear.moderator')}:** ${interaction.user.tag}\n` +
                        `📝 **${t('admin.clear.reason')}:** ${reason}`
                    ));

                // Ajouter des avertissements si nécessaire
                if (skippedCount > 0 || oldMessagesCount > 0) {
                    let warningText = '';
                    if (oldMessagesCount > 0) {
                        warningText += t('admin.clear.old_messages_warning', oldMessagesCount) + '\n';
                    }
                    if (skippedCount > 0) {
                        warningText += t('admin.clear.skipped_warning', skippedCount);
                    }
                    
                    const warningEmbed = ModernComponents.createWarningMessage(
                        `⚠️ ${t('admin.clear.limitations')}`,
                        warningText.trim()
                    );
                    container.addComponent(warningEmbed);
                }

                await interaction.editReply(container.toMessage());

                // Enregistrement de la sanction dans la base de données
                await DatabaseManager.addSanction(
                    targetUser?.id || 'bulk',
                    interaction.guild.id,
                    interaction.user.id,
                    'clear',
                    reason,
                    null, // Pas de durée pour clear
                    null  // Pas d'expiration
                );

                // Log dans le canal de logs
                if (guildConfig?.logChannelId && guildConfig.logChannelId !== interaction.channel.id) {
                    const logChannel = interaction.guild.channels.cache.get(guildConfig.logChannelId);
                    if (logChannel) {
                        const logEmbed = ModernComponents.createInfoMessage(
                            `🗑️ ${t('admin.clear.log_title')}`,
                            `**${t('admin.clear.channel')}:** ${interaction.channel.name} (${interaction.channel.id})\n` +
                            `**${t('admin.clear.moderator')}:** ${interaction.user.tag} (${interaction.user.id})\n` +
                            `**${t('admin.clear.deleted')}:** ${deletedCount} ${t('admin.clear.messages')}\n` +
                            (targetUser ? `**${t('admin.clear.target_user')}:** ${targetUser.tag} (${targetUser.id})\n` : '') +
                            `**${t('admin.clear.reason')}:** ${reason}\n` +
                            `**${t('admin.clear.timestamp')}:** <t:${Math.floor(Date.now() / 1000)}:F>`
                        );
                        
                        await logChannel.send({ embeds: [logEmbed] });
                    }
                }

                // Message temporaire dans le canal pour informer les utilisateurs
                const publicNotification = ModernComponents.createInfoMessage(
                    `🗑️ ${t('admin.clear.public_notification')}`,
                    t('admin.clear.public_notification_desc', deletedCount, interaction.user.tag, reason)
                );

                const notificationMessage = await interaction.channel.send({ embeds: [publicNotification] });
                
                // Supprimer le message de notification après 10 secondes
                setTimeout(async () => {
                    try {
                        await notificationMessage.delete();
                    } catch (error) {
                        // Message déjà supprimé ou erreur, on ignore
                    }
                }, 10000);

            } catch (error) {
                console.error('Erreur lors de la suppression des messages:', error);
                
                let errorMessage = t('admin.clear.error_desc', error.message);
                
                if (error.code === 50013) {
                    errorMessage = t('admin.clear.permission_error');
                } else if (error.code === 50034) {
                    errorMessage = t('admin.clear.bulk_delete_error');
                }
                
                const errorEmbed = ModernComponents.createErrorMessage(
                    t('errors.command_failed'),
                    errorMessage
                );
                await interaction.editReply({ embeds: [errorEmbed] });
            }

        } catch (error) {
            console.error('Erreur dans la commande clear:', error);
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