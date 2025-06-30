const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ChannelType } = require('discord.js');

// Système de traduction intégré
const translations = {
    fr: {
        no_permission_title: "Permission refusée",
        no_permission_desc: "Vous n'avez pas la permission de gérer les salons.",
        bot_no_permission_title: "Permission du bot manquante",
        bot_no_permission_desc: "Je n'ai pas la permission de gérer les salons.",
        default_reason: "Aucune raison fournie",
        already_unlocked_title: "Salon déjà déverrouillé",
        already_unlocked_desc: "Le salon {channel} n'est pas verrouillé.",
        success_title: "Salon déverrouillé",
        success_desc: "Le salon {channel} a été déverrouillé avec succès.",
        channel_unlocked_title: "Salon déverrouillé",
        channel_unlocked_desc: "Ce salon a été déverrouillé par un modérateur.",
        log_title: "Action de modération - Unlock",
        error_title: "Erreur",
        error_desc: "Une erreur s'est produite lors du déverrouillage du salon.",
        audit_reason: "Salon déverrouillé par",
        moderator: "Modérateur",
        reason: "Raison",
        channel: "Salon"
    },
    en: {
        no_permission_title: "Permission Denied",
        no_permission_desc: "You don't have permission to manage channels.",
        bot_no_permission_title: "Bot Permission Missing",
        bot_no_permission_desc: "I don't have permission to manage channels.",
        default_reason: "No reason provided",
        already_unlocked_title: "Channel Already Unlocked",
        already_unlocked_desc: "The channel {channel} is not locked.",
        success_title: "Channel Unlocked",
        success_desc: "The channel {channel} has been unlocked successfully.",
        channel_unlocked_title: "Channel Unlocked",
        channel_unlocked_desc: "This channel has been unlocked by a moderator.",
        log_title: "Moderation Action - Unlock",
        error_title: "Error",
        error_desc: "An error occurred while unlocking the channel.",
        audit_reason: "Channel unlocked by",
        moderator: "Moderator",
        reason: "Reason",
        channel: "Channel"
    }
};

// Fonction pour obtenir la langue du serveur (par défaut français)
function getServerLanguage(guildId) {
    // Vous pouvez implémenter une logique plus complexe ici
    // Pour l'instant, on retourne 'fr' par défaut
    return 'fr';
}

// Fonction pour obtenir une traduction
function getTranslation(guildId, key) {
    const lang = getServerLanguage(guildId);
    return translations[lang]?.[key] || translations.fr[key] || key;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('unlock')
        .setDescription('Déverrouille un salon (autorise l\'envoi de messages)')
        .addChannelOption(option =>
            option.setName('salon')
                .setDescription('Le salon à déverrouiller (salon actuel par défaut)')
                .setRequired(false)
                .addChannelTypes(ChannelType.GuildText, ChannelType.GuildVoice, ChannelType.GuildAnnouncement))
        .addStringOption(option =>
            option.setName('raison')
                .setDescription('Raison du déverrouillage')
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

    async execute(interaction) {
        try {
            // Vérification des permissions utilisateur
            if (!interaction.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
                const embed = new EmbedBuilder()
                    .setColor('#FF0000')
                    .setTitle('❌ ' + getTranslation(interaction.guild.id, 'no_permission_title'))
                    .setDescription(getTranslation(interaction.guild.id, 'no_permission_desc'))
                    .setTimestamp();
                return interaction.reply({ embeds: [embed], ephemeral: true });
            }

            // Vérification des permissions du bot
            if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.ManageChannels)) {
                const embed = new EmbedBuilder()
                    .setColor('#FF0000')
                    .setTitle('❌ ' + getTranslation(interaction.guild.id, 'bot_no_permission_title'))
                    .setDescription(getTranslation(interaction.guild.id, 'bot_no_permission_desc'))
                    .setTimestamp();
                return interaction.reply({ embeds: [embed], ephemeral: true });
            }

            const targetChannel = interaction.options.getChannel('salon') || interaction.channel;
            const reason = interaction.options.getString('raison') || getTranslation(interaction.guild.id, 'default_reason');

            // Déférer la réponse
            await interaction.deferReply();

            // Vérifier si le salon est déjà déverrouillé
            const everyoneRole = interaction.guild.roles.everyone;
            const permissions = targetChannel.permissionOverwrites.cache.get(everyoneRole.id);

            if (!permissions || !permissions.deny.has(PermissionFlagsBits.SendMessages)) {
                const embed = new EmbedBuilder()
                    .setColor('#FF8C00')
                    .setTitle('⚠️ ' + getTranslation(interaction.guild.id, 'already_unlocked_title'))
                    .setDescription(getTranslation(interaction.guild.id, 'already_unlocked_desc').replace('{channel}', targetChannel.toString()))
                    .setTimestamp();
                return interaction.editReply({ embeds: [embed] });
            }

            // Déverrouiller le salon
            await targetChannel.permissionOverwrites.edit(everyoneRole, {
                SendMessages: null,
                AddReactions: null,
                SendMessagesInThreads: null,
                CreatePublicThreads: null,
                CreatePrivateThreads: null
            }, {
                reason: `${getTranslation(interaction.guild.id, 'audit_reason')} ${interaction.user.tag} - ${reason}`
            });

            // Embed de confirmation
            const embed = new EmbedBuilder()
                .setColor('#00FF00')
                .setTitle('🔓 ' + getTranslation(interaction.guild.id, 'success_title'))
                .setDescription(getTranslation(interaction.guild.id, 'success_desc').replace('{channel}', targetChannel.toString()))
                .addFields([
                    {
                        name: getTranslation(interaction.guild.id, 'moderator'),
                        value: `<@${interaction.user.id}>`,
                        inline: true
                    },
                    {
                        name: getTranslation(interaction.guild.id, 'reason'),
                        value: reason,
                        inline: true
                    },
                    {
                        name: getTranslation(interaction.guild.id, 'channel'),
                        value: targetChannel.toString(),
                        inline: true
                    }
                ])
                .setTimestamp()
                .setFooter({
                    text: 'Yako Bot',
                    iconURL: interaction.client.user.displayAvatarURL()
                });

            await interaction.editReply({ embeds: [embed] });

            // Message dans le salon déverrouillé (si différent du salon actuel)
            if (targetChannel.id !== interaction.channel.id && targetChannel.type === ChannelType.GuildText) {
                try {
                    const channelEmbed = new EmbedBuilder()
                        .setColor('#00FF00')
                        .setTitle('🔓 ' + getTranslation(interaction.guild.id, 'channel_unlocked_title'))
                        .setDescription(getTranslation(interaction.guild.id, 'channel_unlocked_desc'))
                        .addFields([
                            {
                                name: getTranslation(interaction.guild.id, 'moderator'),
                                value: `<@${interaction.user.id}>`,
                                inline: true
                            },
                            {
                                name: getTranslation(interaction.guild.id, 'reason'),
                                value: reason,
                                inline: true
                            }
                        ])
                        .setTimestamp();

                    await targetChannel.send({ embeds: [channelEmbed] });
                } catch (channelError) {
                    console.error('Erreur lors de l\'envoi du message dans le salon déverrouillé:', channelError);
                }
            }

            // Log dans le salon de logs si configuré
            try {
                const logChannel = interaction.guild.channels.cache.find(ch =>
                    ['yako-logs', 'mod-logs', 'moderation-logs', 'logs'].includes(ch.name.toLowerCase())
                );

                if (logChannel) {
                    const logEmbed = new EmbedBuilder()
                        .setColor('#00FF00')
                        .setTitle('🔓 ' + getTranslation(interaction.guild.id, 'log_title'))
                        .addFields([
                            {
                                name: getTranslation(interaction.guild.id, 'moderator'),
                                value: `<@${interaction.user.id}> (${interaction.user.tag})`,
                                inline: true
                            },
                            {
                                name: getTranslation(interaction.guild.id, 'channel'),
                                value: `<#${targetChannel.id}> (${targetChannel.name})`,
                                inline: true
                            },
                            {
                                name: getTranslation(interaction.guild.id, 'reason'),
                                value: reason,
                                inline: false
                            }
                        ])
                        .setTimestamp();

                    await logChannel.send({ embeds: [logEmbed] });
                }
            } catch (logError) {
                console.error('Erreur lors de l\'envoi du log:', logError);
            }

        } catch (error) {
            console.error('Erreur lors du déverrouillage du salon:', error);

            const errorEmbed = new EmbedBuilder()
                .setColor('#FF0000')
                .setTitle('❌ ' + getTranslation(interaction.guild.id, 'error_title'))
                .setDescription(getTranslation(interaction.guild.id, 'error_desc'))
                .setTimestamp();

            if (interaction.deferred) {
                await interaction.editReply({ embeds: [errorEmbed] });
            } else {
                await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
            }
        }
    },
};