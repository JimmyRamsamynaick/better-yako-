const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { ModernComponents } = require('../../utils/modernComponents');
const PermissionManager = require('../../utils/permissions');
const DatabaseManager = require('../../utils/database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('kick')
        .setDescription('Expulser un utilisateur du serveur')
        .addUserOption(option =>
            option.setName('utilisateur')
                .setDescription('L\'utilisateur à expulser')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('raison')
                .setDescription('Raison de l\'expulsion')
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),

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
                const embed = ModernComponents.createErrorMessage({
                    title: t('errors.no_permission'),
                    description: t('admin.kick.no_permission_desc')
                });
                return await interaction.reply({ embeds: [embed], ephemeral: true });
            }

            const targetUser = interaction.options.getUser('utilisateur');
            const reason = interaction.options.getString('raison') || t('admin.kick.no_reason');

            // Vérification si l'utilisateur est dans le serveur
            const targetMember = interaction.guild.members.cache.get(targetUser.id);
            
            if (!targetMember) {
                const embed = ModernComponents.createErrorMessage({
                    title: t('errors.user_not_found'),
                    description: t('admin.kick.user_not_in_server')
                });
                return await interaction.reply({ embeds: [embed], ephemeral: true });
            }

            // Vérification si on peut modérer cet utilisateur
            if (!PermissionManager.canModerate(member, targetMember)) {
                const embed = ModernComponents.createErrorMessage({
                    title: t('errors.cannot_moderate'),
                    description: t('admin.kick.cannot_moderate_desc')
                });
                return await interaction.reply({ embeds: [embed], ephemeral: true });
            }

            // Vérification si le bot peut expulser cet utilisateur
            const botMember = interaction.guild.members.me;
            if (!PermissionManager.canBotModerate(botMember, targetMember, 'kick')) {
                const embed = ModernComponents.createErrorMessage({
                    title: t('errors.bot_cannot_moderate'),
                    description: t('admin.kick.bot_cannot_moderate_desc')
                });
                return await interaction.reply({ embeds: [embed], ephemeral: true });
            }

            await interaction.deferReply();

            try {
                // Tentative d'envoi d'un message privé à l'utilisateur
                try {
                    const dmEmbed = ModernComponents.createWarningMessage({
                        title: t('admin.kick.dm_title'),
                        description: t('admin.kick.dm_description', interaction.guild.name, reason)
                    });
                    await targetUser.send({ embeds: [dmEmbed] });
                } catch (error) {
                    // Impossible d'envoyer le MP, on continue
                }

                // Expulsion
                await targetMember.kick(`${reason} | Modérateur: ${interaction.user.tag}`);

                // Enregistrement dans la base de données
                await DatabaseManager.addSanction(
                    targetUser.id,
                    interaction.guild.id,
                    interaction.user.id,
                    'kick',
                    reason
                );

                // Message de confirmation
                const successEmbed = ModernComponents.createSuccessMessage({
                    title: t('admin.kick.success'),
                    description: t('admin.kick.success_desc', targetUser.tag, reason)
                });

                const container = ModernComponents.createContainer()
                    .addComponent(successEmbed)
                    .addComponent(ModernComponents.createSeparator())
                    .addComponent(ModernComponents.createTextDisplay(
                        `**${t('admin.kick.details')}**\n` +
                        `👤 **${t('admin.kick.user')}:** ${targetUser.tag} (${targetUser.id})\n` +
                        `👮 **${t('admin.kick.moderator')}:** ${interaction.user.tag}\n` +
                        `📝 **${t('admin.kick.reason')}:** ${reason}`
                    ));

                await interaction.editReply(container.toMessage());

                // Log dans le canal de logs
                if (guildConfig?.logChannelId) {
                    const logChannel = interaction.guild.channels.cache.get(guildConfig.logChannelId);
                    if (logChannel) {
                        const logEmbed = ModernComponents.createInfoMessage({
                            title: `👢 ${t('admin.kick.log_title')}`,
                            description: `**${t('admin.kick.user')}:** ${targetUser.tag} (${targetUser.id})\n` +
                            `**${t('admin.kick.moderator')}:** ${interaction.user.tag} (${interaction.user.id})\n` +
                            `**${t('admin.kick.reason')}:** ${reason}\n` +
                            `**${t('admin.kick.timestamp')}:** <t:${Math.floor(Date.now() / 1000)}:F>`
                        });
                        
                        await logChannel.send({ embeds: [logEmbed] });
                    }
                }

            } catch (error) {
                console.error('Erreur lors de l\'expulsion:', error);
                const errorEmbed = ModernComponents.createErrorMessage({
                    title: t('errors.command_failed'),
                    description: t('admin.kick.error_desc', error.message)
                });
                await interaction.editReply({ embeds: [errorEmbed] });
            }

        } catch (error) {
            console.error('Erreur dans la commande kick:', error);
            const errorEmbed = ModernComponents.createErrorMessage({
                title: t('errors.unexpected'),
                description: t('errors.try_again')
            });
            
            if (interaction.deferred) {
                await interaction.editReply({ embeds: [errorEmbed] });
            } else {
                await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
            }
        }
    }
};