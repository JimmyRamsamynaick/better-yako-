const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');

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

    async execute(interaction, client, getTranslation) {
        if (!interaction.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
            return interaction.reply({ content: getTranslation(interaction.guild.id, 'error_permissions'), ephemeral: true });
        }

        const targetChannel = interaction.options.getChannel('salon') || interaction.channel;

        if (!targetChannel.permissionsFor(interaction.guild.members.me).has(PermissionFlagsBits.ManageChannels)) {
            return interaction.reply({ content: '❌ Je n\'ai pas les permissions pour verrouiller ce salon.', ephemeral: true });
        }

        const reason = interaction.options.getString('raison') || 'Aucune raison fournie';

        try {
            const everyoneRole = interaction.guild.roles.everyone;
            const currentPermissions = targetChannel.permissionOverwrites.cache.get(everyoneRole.id);
            if (currentPermissions && currentPermissions.deny.has(PermissionFlagsBits.SendMessages)) {
                return interaction.reply({ content: '❌ Ce salon est déjà verrouillé.', ephemeral: true });
            }

            await targetChannel.permissionOverwrites.edit(everyoneRole, {
                SendMessages: false,
                AddReactions: false,
                CreatePublicThreads: false,
                CreatePrivateThreads: false
            }, {
                reason: `Salon verrouillé par ${interaction.user.tag}: ${reason}`
            });

            const embed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('🔒 Salon verrouillé')
                .setDescription(getTranslation(interaction.guild.id, 'lock_success'))
                .addFields(
                    { name: 'Salon', value: targetChannel.toString(), inline: true },
                    { name: 'Modérateur', value: interaction.user.tag, inline: true },
                    { name: 'Raison', value: reason, inline: false }
                )
                .setTimestamp()
                .setFooter({
                    text: 'Utilisez /unlock pour déverrouiller le salon',
                    iconURL: client.user.displayAvatarURL()
                });

            if (targetChannel.id !== interaction.channel.id) {
                await targetChannel.send({ embeds: [embed] });
            }

            await interaction.reply({ embeds: [embed] });

            const logChannel = interaction.guild.channels.cache.find(ch => ch.name === 'mod-logs');
            if (logChannel && logChannel.id !== targetChannel.id) {
                logChannel.send({ embeds: [embed] });
            }

        } catch (error) {
            console.error('Erreur lors du verrouillage:', error);
            interaction.reply({ content: '❌ Une erreur s\'est produite lors du verrouillage du salon.', ephemeral: true });
        }
    }
};