const { EmbedBuilder } = require('discord.js');
const Guild = require('../models/Guild');
const LanguageManager = require('../utils/languageManager');

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

            const lang = guildData.language || 'fr';
            const changes = [];

            if (oldGuild.name !== newGuild.name) {
                changes.push({ name: LanguageManager.get(lang, 'events.server.updated.fields.name'), value: `\`${oldGuild.name}\` → \`${newGuild.name}\``, inline: false });
            }

            if (oldGuild.icon !== newGuild.icon) {
                const oldIcon = oldGuild.iconURL({ size: 128 }) || LanguageManager.get(lang, 'common.none');
                const newIcon = newGuild.iconURL({ size: 128 }) || LanguageManager.get(lang, 'common.none');
                changes.push({ name: LanguageManager.get(lang, 'events.server.updated.fields.icon'), value: `${oldIcon} → ${newIcon}`, inline: false });
            }

            if (changes.length === 0) return; // Rien à signaler

            const embed = new EmbedBuilder()
                .setTitle(LanguageManager.get(lang, 'events.server.updated.title'))
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