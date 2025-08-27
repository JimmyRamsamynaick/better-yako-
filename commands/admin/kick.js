const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
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
                const embed = new EmbedBuilder()
                    .setTitle(await t('errors.no_permission'))
        .setDescription(await t('admin.kick.no_permission_desc'))
                    .setColor('#FF0000')
                    .setTimestamp();
                return await interaction.reply({ embeds: [embed], ephemeral: true });
            }

            const targetUser = interaction.options.getUser('utilisateur');
            const reason = interaction.options.getString('raison') || await t('admin.kick.no_reason');

            // Vérification si l'utilisateur est dans le serveur
            const targetMember = interaction.guild.members.cache.get(targetUser.id);
            
            if (!targetMember) {
                const embed = new EmbedBuilder()
                    .setTitle(await t('errors.user_not_found'))
        .setDescription(await t('admin.kick.user_not_in_server'))
                    .setColor('#FF0000')
                    .setTimestamp();
                return await interaction.reply({ embeds: [embed], ephemeral: true });
            }

            // Vérification si on peut modérer cet utilisateur
            if (!PermissionManager.canModerate(member, targetMember)) {
                const embed = new EmbedBuilder()
                    .setTitle(await t('errors.cannot_moderate'))
        .setDescription(await t('admin.kick.cannot_moderate_desc'))
                    .setColor('#FF0000')
                    .setTimestamp();
                return await interaction.reply({ embeds: [embed], ephemeral: true });
            }

            // Vérification si le bot peut expulser cet utilisateur
            const botMember = interaction.guild.members.me;
            if (!PermissionManager.canBotModerate(botMember, targetMember, 'kick')) {
                const embed = new EmbedBuilder()
                    .setTitle(await t('errors.bot_cannot_moderate'))
        .setDescription(await t('admin.kick.bot_cannot_moderate_desc'))
                    .setColor('#FF0000')
                    .setTimestamp();
                return await interaction.reply({ embeds: [embed], ephemeral: true });
            }

            await interaction.deferReply();

            try {
                // Tentative d'envoi d'un message privé à l'utilisateur
                try {
                    const dmEmbed = new EmbedBuilder()
                        .setTitle(await t('admin.kick.dm_title'))
        .setDescription(await t('admin.kick.dm_description', interaction.guild.name, reason))
                        .setColor('#FFA500')
                        .setTimestamp();
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
                const successEmbed = new EmbedBuilder()
                    .setTitle(await t('admin.kick.success'))
        .setDescription(await t('admin.kick.success_desc', targetUser.tag, reason))
                    .setColor('#00FF00')
                    .setTimestamp()
                    .addFields(
                        { name: await t('admin.kick.details'), value: '\u200B', inline: false },
        { name: `👤 ${await t('admin.kick.user')}`, value: `${targetUser.tag} (${targetUser.id})`, inline: true },
        { name: `👮 ${await t('admin.kick.moderator')}`, value: interaction.user.tag, inline: true },
        { name: `📝 ${await t('admin.kick.reason')}`, value: reason, inline: false }
                    );

                await interaction.editReply({ embeds: [successEmbed] });

                // Log dans le canal de logs
                if (guildConfig?.logChannelId) {
                    const logChannel = interaction.guild.channels.cache.get(guildConfig.logChannelId);
                    if (logChannel) {
                        const logEmbed = new EmbedBuilder()
                            .setTitle(`👢 ${await t('admin.kick.log_title')}`)
        .setDescription(
            `**${await t('admin.kick.user')}:** ${targetUser.tag} (${targetUser.id})\n` +
            `**${await t('admin.kick.moderator')}:** ${interaction.user.tag} (${interaction.user.id})\n` +
            `**${await t('admin.kick.reason')}:** ${reason}\n` +
            `**${await t('admin.kick.timestamp')}:** <t:${Math.floor(Date.now() / 1000)}:F>`
                            )
                            .setColor('#0099FF')
                            .setTimestamp();
                        
                        await logChannel.send({ embeds: [logEmbed] });
                    }
                }

            } catch (error) {
                console.error('Erreur lors de l\'expulsion:', error);
                const errorEmbed = new EmbedBuilder()
                    .setTitle(await t('errors.command_failed'))
        .setDescription(await t('admin.kick.error_desc', error.message))
                    .setColor('#FF0000')
                    .setTimestamp();
                await interaction.editReply({ embeds: [errorEmbed] });
            }

        } catch (error) {
            console.error('Erreur dans la commande kick:', error);
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