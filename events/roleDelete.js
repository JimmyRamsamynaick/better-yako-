const { EmbedBuilder } = require('discord.js');
const Guild = require('../models/Guild');

module.exports = {
    name: 'roleDelete',
    async execute(role) {
        try {
            const guild = await Guild.findOne({ guildId: role.guild.id });
            if (!guild || !guild.logs.enabled || !guild.logs.types.roles) return;

            let logChannel = null;
            if (guild.logs.channels && guild.logs.channels.length > 0) {
                const roleLogChannel = guild.logs.channels.find(ch => ch.types.roles);
                if (roleLogChannel) {
                    logChannel = role.guild.channels.cache.get(roleLogChannel.channelId);
                }
            } else if (guild.logs.channelId) {
                logChannel = role.guild.channels.cache.get(guild.logs.channelId);
            }

            if (!logChannel) return;

            const embed = new EmbedBuilder()
                .setTitle('🎭 Rôle supprimé')
                .setColor(0xFF0000)
                .addFields(
                    { name: '🎭 Rôle', value: `\`${role.name}\``, inline: false },
                    { name: '🎨 Couleur', value: role.hexColor || '#000000', inline: true },
                    { name: '📍 Ancienne position', value: `${role.position}`, inline: true }
                )
                .setTimestamp()
                .setFooter({ text: `ID: ${role.id}` });

            await logChannel.send({ embeds: [embed] });
        } catch (error) {
            console.error('Erreur lors du log de suppression de rôle:', error);
        }
    }
};