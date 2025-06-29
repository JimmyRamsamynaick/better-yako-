const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('mute')
        .setDescription('Rend muet un utilisateur pendant une durée spécifiée')
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
        .addUserOption(option =>
            option.setName('utilisateur')
                .setDescription('Utilisateur à rendre muet')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('durée')
                .setDescription('Durée du mute (ex: 10m, 2h, 1d)')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('raison')
                .setDescription('Raison du mute')
                .setRequired(false)),
    category: 'moderation',

    async execute(interaction, client, getTranslation) {
        if (!interaction.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
            return interaction.reply({ content: getTranslation(interaction.guild.id, 'error_permissions'), ephemeral: true });
        }

        const userToMute = interaction.options.getUser('utilisateur');
        const memberToMute = interaction.guild.members.cache.get(userToMute.id);

        if (!memberToMute) {
            return interaction.reply({ content: getTranslation(interaction.guild.id, 'error_user_not_found'), ephemeral: true });
        }

        if (memberToMute.roles.highest.position >= interaction.member.roles.highest.position) {
            return interaction.reply({ content: '❌ Vous ne pouvez pas rendre muet cet utilisateur.', ephemeral: true });
        }

        if (!memberToMute.moderatable) {
            return interaction.reply({ content: '❌ Je ne peux pas rendre muet cet utilisateur.', ephemeral: true });
        }

        const timeString = interaction.options.getString('durée');
        const time = module.exports.parseTime(timeString);

        if (!time) {
            return interaction.reply({ content: getTranslation(interaction.guild.id, 'error_invalid_time'), ephemeral: true });
        }

        const reason = interaction.options.getString('raison') || 'Aucune raison fournie';

        try {
            await memberToMute.timeout(time, `${interaction.user.tag}: ${reason}`);

            const embed = new EmbedBuilder()
                .setColor('#ffff00')
                .setTitle('🔇 Utilisateur rendu muet')
                .setDescription(getTranslation(interaction.guild.id, 'mute_success', memberToMute.user.tag, module.exports.formatTime(time)))
                .addFields(
                    { name: 'Durée', value: module.exports.formatTime(time), inline: true },
                    { name: 'Raison', value: reason, inline: false },
                    { name: 'Modérateur', value: interaction.user.tag, inline: true }
                )
                .setThumbnail(memberToMute.user.displayAvatarURL())
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });

            const logChannel = interaction.guild.channels.cache.find(ch => ch.name === 'mod-logs');
            if (logChannel) {
                logChannel.send({ embeds: [embed] });
            }

        } catch (error) {
            console.error('Erreur lors du mute:', error);
            interaction.reply({ content: '❌ Une erreur s\'est produite lors du mute.', ephemeral: true });
        }
    },

    parseTime(timeString) {
        const regex = /(\d+)([smhd])/g;
        let totalMs = 0;
        let match;

        while ((match = regex.exec(timeString)) !== null) {
            const value = parseInt(match[1]);
            const unit = match[2];

            switch (unit) {
                case 's':
                    totalMs += value * 1000;
                    break;
                case 'm':
                    totalMs += value * 60 * 1000;
                    break;
                case 'h':
                    totalMs += value * 60 * 60 * 1000;
                    break;
                case 'd':
                    totalMs += value * 24 * 60 * 60 * 1000;
                    break;
            }
        }

        return totalMs > 0 && totalMs <= 28 * 24 * 60 * 60 * 1000 ? totalMs : null;
    },

    formatTime(ms) {
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (days > 0) return `${days}j ${hours % 24}h`;
        if (hours > 0) return `${hours}h ${minutes % 60}m`;
        if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
        return `${seconds}s`;
    }
};