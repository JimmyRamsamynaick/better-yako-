const { EmbedBuilder } = require('discord.js');
const Guild = require('../models/Guild');

module.exports = {
    name: 'guildUpdate',
    async execute(oldGuild, newGuild) {
        try {
            const guildData = await Guild.findOne({ guildId: newGuild.id });
            if (!guildData || !guildData.logs.enabled || !guildData.logs.types.server) return;

            // Trouver le canal de logs « serveur »
            let logChannel = null;
            if (Array.isArray(guildData.logs.channels) && guildData.logs.channels.length > 0) {
                const serverLogChannel = guildData.logs.channels.find(ch => ch.types && ch.types.server);
                if (serverLogChannel) {
                    logChannel = newGuild.channels.cache.get(serverLogChannel.channelId);
                }
            }
            if (!logChannel && guildData.logs.channelId) {
                logChannel = newGuild.channels.cache.get(guildData.logs.channelId);
            }
            if (!logChannel) return;

            const changes = [];

            if (oldGuild.name !== newGuild.name) {
                changes.push({ name: '📝 Nom du serveur', value: `\`${oldGuild.name}\` → \`${newGuild.name}\``, inline: false });
            }

            if (oldGuild.icon !== newGuild.icon) {
                const oldIcon = oldGuild.iconURL({ size: 128 }) || '*Aucune*';
                const newIcon = newGuild.iconURL({ size: 128 }) || '*Aucune*';
                changes.push({ name: '🖼️ Icône', value: `${oldIcon} → ${newIcon}`, inline: false });
            }

            if (changes.length === 0) return; // Rien à signaler

            const embed = new EmbedBuilder()
                .setTitle('⚙️ Serveur modifié')
                .setColor(0x5865F2)
                .addFields(...changes)
                .setTimestamp()
                .setFooter({ text: `ID: ${newGuild.id}` });

            await logChannel.send({ embeds: [embed] });
        } catch (error) {
            console.error('Erreur lors du log de mise à jour du serveur:', error);
        }
    }
};