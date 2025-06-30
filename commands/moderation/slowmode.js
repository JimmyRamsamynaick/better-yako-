// commands/moderation/slowmode.js
const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('slowmode')
        .setDescription('Active ou désactive le mode lent dans un salon')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
        .addIntegerOption(option =>
            option.setName('durée')
                .setDescription('Durée en secondes entre chaque message (0 pour désactiver)')
                .setRequired(true)
                .setMinValue(0)
                .setMaxValue(21600)) // Maximum 6 heures
        .addChannelOption(option =>
            option.setName('salon')
                .setDescription('Salon à modifier (salon actuel par défaut)')
                .setRequired(false)
                .addChannelTypes(ChannelType.GuildText))
        .addStringOption(option =>
            option.setName('raison')
                .setDescription('Raison du changement')
                .setRequired(false)),

    async execute(interaction, client, getTranslation) {
        // Vérification des permissions
        if (!interaction.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
            return interaction.reply({
                content: '❌ Vous n\'avez pas la permission de gérer les salons.',
                ephemeral: true
            });
        }

        const targetChannel = interaction.options.getChannel('salon') || interaction.channel;
        const duration = interaction.options.getInteger('durée');
        const reason = interaction.options.getString('raison') || 'Aucune raison fournie';

        // Vérifier les permissions du bot
        if (!targetChannel.permissionsFor(interaction.guild.members.me).has(PermissionFlagsBits.ManageChannels)) {
            return interaction.reply({
                content: '❌ Je n\'ai pas les permissions pour modifier ce salon.',
                ephemeral: true
            });
        }

        try {
            await targetChannel.setRateLimitPerUser(duration, `${interaction.user.tag}: ${reason}`);

            const embed = new EmbedBuilder()
                .setColor(duration === 0 ? '#00ff00' : '#ffaa00')
                .setTitle(duration === 0 ? '⚡ Mode lent désactivé' : '🐌 Mode lent activé')
                .setDescription(duration === 0 ?
                    `Le mode lent a été désactivé dans ${targetChannel.toString()}` :
                    `Le mode lent a été activé dans ${targetChannel.toString()}`)
                .addFields([
                    {
                        name: 'Salon',
                        value: targetChannel.toString(),
                        inline: true
                    },
                    {
                        name: 'Durée',
                        value: duration === 0 ? 'Désactivé' : `${duration} seconde(s)`,
                        inline: true
                    },
                    {
                        name: 'Modérateur',
                        value: interaction.user.tag,
                        inline: true
                    },
                    {
                        name: 'Raison',
                        value: reason,
                        inline: false
                    }
                ])
                .setTimestamp()
                .setFooter({
                    text: 'Yako Bot',
                    iconURL: client.user.displayAvatarURL()
                });

            await interaction.reply({ embeds: [embed] });

            // Log dans le salon de logs si configuré
            const logChannel = interaction.guild.channels.cache.find(ch => ch.name === 'yako-logs');
            if (logChannel && logChannel.id !== targetChannel.id) {
                logChannel.send({ embeds: [embed] });
            }

        } catch (error) {
            console.error('Erreur lors du changement du slowmode:', error);
            interaction.reply({
                content: '❌ Une erreur s\'est produite lors de la modification du mode lent.',
                ephemeral: true
            });
        }
    },

    category: 'Modération'
};