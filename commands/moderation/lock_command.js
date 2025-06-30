// verouillage d'un salon discord
const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');

// Système de traduction intégré
const translations = {
    fr: {
        error_permissions: "❌ Vous n'avez pas les permissions nécessaires pour utiliser cette commande.",
        lock_success: "Le salon a été verrouillé avec succès.",
        bot_no_permission: "❌ Je n'ai pas les permissions pour verrouiller ce salon.",
        already_locked: "❌ Ce salon est déjà verrouillé.",
        lock_error: "❌ Une erreur s'est produite lors du verrouillage du salon.",
        moderator: "Modérateur",
        channel: "Salon",
        reason: "Raison",
        default_reason: "Aucune raison fournie",
        footer_text: "Utilisez /unlock pour déverrouiller le salon"
    },
    en: {
        error_permissions: "❌ You don't have the necessary permissions to use this command.",
        lock_success: "The channel has been locked successfully.",
        bot_no_permission: "❌ I don't have permissions to lock this channel.",
        already_locked: "❌ This channel is already locked.",
        lock_error: "❌ An error occurred while locking the channel.",
        moderator: "Moderator",
        channel: "Channel",
        reason: "Reason",
        default_reason: "No reason provided",
        footer_text: "Use /unlock to unlock the channel"
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
        .setName('lock')
        .setDescription('Verrouille un salon (empêche les membres d\'écrire)')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
        .addChannelOption(option =>
            option.setName('salon')
                .setDescription('Salon à verrouiller (optionnel)')
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(false))
        .addStringOption(option =>
            option.setName('raison')
                .setDescription('Raison du verrouillage')
                .setRequired(false)),
    category: 'moderation',

    async execute(interaction, client) {
        try {
            // Vérification des permissions utilisateur
            if (!interaction.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
                return interaction.reply({
                    content: getTranslation(interaction.guild.id, 'error_permissions'),
                    ephemeral: true
                });
            }

            const targetChannel = interaction.options.getChannel('salon') || interaction.channel;

            // Vérification des permissions du bot (Admin OU ManageChannels)
            const botMember = interaction.guild.members.me;
            const hasAdmin = botMember.permissions.has(PermissionFlagsBits.Administrator);
            const hasManageChannels = targetChannel.permissionsFor(botMember).has(PermissionFlagsBits.ManageChannels);

            if (!hasAdmin && !hasManageChannels) {
                return interaction.reply({
                    content: getTranslation(interaction.guild.id, 'bot_no_permission'),
                    ephemeral: true
                });
            }

            const reason = interaction.options.getString('raison') || getTranslation(interaction.guild.id, 'default_reason');

            // Vérifier si le salon est déjà verrouillé
            const everyoneRole = interaction.guild.roles.everyone;
            const currentPermissions = targetChannel.permissionOverwrites.cache.get(everyoneRole.id);

            if (currentPermissions && currentPermissions.deny.has(PermissionFlagsBits.SendMessages)) {
                return interaction.reply({
                    content: getTranslation(interaction.guild.id, 'already_locked'),
                    ephemeral: true
                });
            }

            // Déférer la réponse pour éviter le timeout
            await interaction.deferReply();

            // Verrouiller le salon
            await targetChannel.permissionOverwrites.edit(everyoneRole, {
                SendMessages: false,
                AddReactions: false,
                CreatePublicThreads: false,
                CreatePrivateThreads: false,
                SendMessagesInThreads: false
            }, {
                reason: `Salon verrouillé par ${interaction.user.tag}: ${reason}`
            });

            // Créer l'embed de confirmation
            const embed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('🔒 Salon verrouillé')
                .setDescription(getTranslation(interaction.guild.id, 'lock_success'))
                .addFields(
                    {
                        name: getTranslation(interaction.guild.id, 'channel'),
                        value: targetChannel.toString(),
                        inline: true
                    },
                    {
                        name: getTranslation(interaction.guild.id, 'moderator'),
                        value: `<@${interaction.user.id}>`,
                        inline: true
                    },
                    {
                        name: getTranslation(interaction.guild.id, 'reason'),
                        value: reason,
                        inline: false
                    }
                )
                .setTimestamp()
                .setFooter({
                    text: getTranslation(interaction.guild.id, 'footer_text'),
                    iconURL: client.user.displayAvatarURL()
                });

            // Répondre à l'interaction
            await interaction.editReply({ embeds: [embed] });

            // Envoyer un message dans le salon verrouillé (si différent du salon actuel)
            if (targetChannel.id !== interaction.channel.id) {
                try {
                    await targetChannel.send({ embeds: [embed] });
                } catch (channelError) {
                    console.error('Erreur lors de l\'envoi du message dans le salon verrouillé:', channelError);
                }
            }

            // Logger dans le salon de logs (optionnel)
            try {
                const logChannel = interaction.guild.channels.cache.find(ch =>
                    ['mod-logs', 'moderation-logs', 'yako-logs', 'logs'].includes(ch.name.toLowerCase())
                );

                if (logChannel && logChannel.id !== targetChannel.id) {
                    const logEmbed = new EmbedBuilder()
                        .setColor('#ff0000')
                        .setTitle('🔒 Action de modération - Lock')
                        .addFields(
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
                        )
                        .setTimestamp();

                    await logChannel.send({ embeds: [logEmbed] });
                }
            } catch (logError) {
                console.error('Erreur lors de l\'envoi du log:', logError);
            }

        } catch (error) {
            console.error('Erreur lors du verrouillage:', error);

            const errorContent = getTranslation(interaction.guild.id, 'lock_error');

            if (interaction.deferred) {
                await interaction.editReply({ content: errorContent });
            } else {
                await interaction.reply({ content: errorContent, ephemeral: true });
            }
        }
    }
};