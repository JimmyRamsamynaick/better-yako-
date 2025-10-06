const { EmbedBuilder } = require('discord.js');
const Guild = require('../models/Guild');

module.exports = {
    name: 'roleUpdate',
    async execute(oldRole, newRole) {
        try {
            const guild = await Guild.findOne({ guildId: newRole.guild.id });
            if (!guild || !guild.logs.enabled || !guild.logs.types.roles) return;

            let logChannel = null;
            if (guild.logs.channels && guild.logs.channels.length > 0) {
                const roleLogChannel = guild.logs.channels.find(ch => ch.types.roles);
                if (roleLogChannel) {
                    logChannel = newRole.guild.channels.cache.get(roleLogChannel.channelId);
                }
            } else if (guild.logs.channelId) {
                logChannel = newRole.guild.channels.cache.get(guild.logs.channelId);
            }

            if (!logChannel) return;

            const changes = [];

            if (oldRole.name !== newRole.name) {
                changes.push({ name: '📝 Nom', value: `\`${oldRole.name}\` → \`${newRole.name}\``, inline: false });
            }
            if (oldRole.hexColor !== newRole.hexColor) {
                changes.push({ name: '🎨 Couleur', value: `${oldRole.hexColor} → ${newRole.hexColor}`, inline: true });
            }
            if (oldRole.hoist !== newRole.hoist) {
                changes.push({ name: '📌 Afficher séparément', value: `${oldRole.hoist ? 'Oui' : 'Non'} → ${newRole.hoist ? 'Oui' : 'Non'}`, inline: true });
            }
            if (oldRole.mentionable !== newRole.mentionable) {
                changes.push({ name: '🔖 Mentionnable', value: `${oldRole.mentionable ? 'Oui' : 'Non'} → ${newRole.mentionable ? 'Oui' : 'Non'}`, inline: true });
            }
            if (oldRole.position !== newRole.position) {
                changes.push({ name: '📍 Position', value: `\`${oldRole.position}\` → \`${newRole.position}\``, inline: true });
            }

            const oldPerms = oldRole.permissions.toArray();
            const newPerms = newRole.permissions.toArray();
            const addedPerms = newPerms.filter(p => !oldPerms.includes(p));
            const removedPerms = oldPerms.filter(p => !newPerms.includes(p));

            if (addedPerms.length > 0) {
                changes.push({ name: '✅ Permissions ajoutées', value: addedPerms.join(', '), inline: false });
            }
            if (removedPerms.length > 0) {
                changes.push({ name: '❌ Permissions supprimées', value: removedPerms.join(', '), inline: false });
            }

            if (changes.length === 0) return;

            const embed = new EmbedBuilder()
                .setTitle('🎭 Rôle modifié')
                .setColor(0xFFA500)
                .addFields(
                    { name: '🎭 Rôle', value: `<@&${newRole.id}> (\`${newRole.name}\`)`, inline: false },
                    ...changes
                )
                .setTimestamp()
                .setFooter({ text: `ID: ${newRole.id}` });

            await logChannel.send({ embeds: [embed] });
        } catch (error) {
            console.error('Erreur lors du log de mise à jour de rôle:', error);
        }
    }
};