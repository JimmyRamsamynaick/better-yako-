const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const PermissionManager = require('../../utils/permissions');
const DatabaseManager = require('../../utils/database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('unban')
        .setDescription('Débannir un utilisateur du serveur')
        .addStringOption(option =>
            option.setName('utilisateur')
                .setDescription('ID ou nom d\'utilisateur à débannir')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('raison')
                .setDescription('Raison du débannissement')
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

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
                    .setDescription(await t('admin.unban.no_permission_desc'))
                    .setColor('#FF0000')
                    .setTimestamp();
                return await interaction.reply({ embeds: [embed], ephemeral: true });
            }

            const userInput = interaction.options.getString('utilisateur');
            const reason = interaction.options.getString('raison') || await t('admin.unban.default_reason');

            await interaction.deferReply();

            let targetUser = null;
            let banInfo = null;

            try {
                // Essayer de récupérer l'utilisateur par ID
                if (/^\d{17,19}$/.test(userInput)) {
                    targetUser = await interaction.client.users.fetch(userInput);
                } else {
                    // Chercher dans la liste des bannis par nom d'utilisateur
                    const bans = await interaction.guild.bans.fetch();
                    const foundBan = bans.find(ban => 
                        ban.user.username.toLowerCase().includes(userInput.toLowerCase()) ||
                        ban.user.tag.toLowerCase().includes(userInput.toLowerCase())
                    );
                    if (foundBan) {
                        targetUser = foundBan.user;
                        banInfo = foundBan;
                    }
                }

                if (!targetUser) {
                    const embed = new EmbedBuilder()
                        .setTitle(await t('errors.user_not_found'))
                        .setDescription(await t('admin.unban.user_not_found_desc', userInput))
                        .setColor('#FF0000')
                        .setTimestamp();
                    return await interaction.editReply({ embeds: [embed] });
                }

                // Vérifier si l'utilisateur est banni
                if (!banInfo) {
                    try {
                        banInfo = await interaction.guild.bans.fetch(targetUser.id);
                    } catch (error) {
                        const embed = new EmbedBuilder()
                            .setTitle(await t('admin.unban.not_banned'))
                            .setDescription(await t('admin.unban.not_banned_desc', targetUser.tag))
                            .setColor('#FFA500')
                            .setTimestamp();
                        return await interaction.editReply({ embeds: [embed] });
                    }
                }

                // Débannissement
                await interaction.guild.members.unban(targetUser.id, `${reason} | Modérateur: ${interaction.user.tag}`);

                // Enregistrement dans la base de données
                await DatabaseManager.addSanction(
                    targetUser.id,
                    interaction.guild.id,
                    interaction.user.id,
                    'unban',
                    reason
                );

                // Message de confirmation
                const successEmbed = new EmbedBuilder()
                    .setTitle(await t('admin.unban.success'))
                    .setDescription(await t('admin.unban.success_desc', targetUser.tag))
                    .setColor('#00FF00')
                    .setTimestamp()
                    .addFields(
                        { name: await t('admin.unban.details'), value: '\u200B', inline: false },
                        { name: `👤 ${await t('admin.unban.user')}`, value: `${targetUser.tag} (${targetUser.id})`, inline: true },
                        { name: `👮 ${await t('admin.unban.moderator')}`, value: interaction.user.tag, inline: true },
                        { name: `📝 ${await t('admin.unban.reason')}`, value: reason, inline: false },
                        { name: `📅 ${await t('admin.unban.date')}`, value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
                    )
                    .setFooter({ text: await t('admin.unban.footer', interaction.user.tag), iconURL: interaction.user.displayAvatarURL() });

                await interaction.editReply({ embeds: [successEmbed] });

                // Log dans le canal de logs
                if (guildConfig?.logChannelId) {
                    const logChannel = interaction.guild.channels.cache.get(guildConfig.logChannelId);
                    if (logChannel) {
                        const logEmbed = new EmbedBuilder()
                            .setTitle(`🔓 ${await t('admin.unban.log_title')}`)
                            .setDescription(
                                `**${await t('admin.unban.user')}:** ${targetUser.tag} (${targetUser.id})\n` +
                                `**${await t('admin.unban.moderator')}:** ${interaction.user.tag} (${interaction.user.id})\n` +
                                `**${await t('admin.unban.reason')}:** ${reason}\n` +
                                `**${await t('admin.unban.original_ban_reason')}:** ${banInfo?.reason || await t('admin.unban.unknown')}\n` +
                                `**${await t('admin.unban.timestamp')}:** <t:${Math.floor(Date.now() / 1000)}:F>`
                            )
                            .setColor('#0099FF')
                            .setTimestamp();
                        
                        await logChannel.send({ embeds: [logEmbed] });
                    }
                }

            } catch (error) {
                console.error('Erreur lors du débannissement:', error);
                const errorEmbed = new EmbedBuilder()
                    .setTitle(await t('errors.command_failed'))
                    .setDescription(await t('admin.unban.error_desc', error.message))
                    .setColor('#FF0000')
                    .setTimestamp();
                await interaction.editReply({ embeds: [errorEmbed] });
            }

        } catch (error) {
            console.error('Erreur dans la commande unban:', error);
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