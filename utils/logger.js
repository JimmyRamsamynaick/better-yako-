const Guild = require('../models/Guild');
const LanguageManager = require('./languageManager');

class Logger {
    static async log(guild, type, content, data = {}) {
        try {
            const guildData = await Guild.findOne({ guildId: guild.id });
            if (!guildData || !guildData.logs.enabled || !guildData.logs.types[type]) return;

            let logChannel = null;
            if (Array.isArray(guildData.logs.channels) && guildData.logs.channels.length > 0) {
                const typeLogChannel = guildData.logs.channels.find(ch => ch.types && ch.types[type]);
                if (typeLogChannel) {
                    logChannel = guild.channels.cache.get(typeLogChannel.channelId);
                }
            }
            if (!logChannel && guildData.logs.channelId) {
                logChannel = guild.channels.cache.get(guildData.logs.channelId);
            }
            if (!logChannel) return;

            const lang = guildData.language || 'fr';
            
            let logContent = `## 🎰 Casino Log - ${type}\n\n`;
            logContent += `**User:** ${data.user.tag} (${data.user.id})\n`;
            logContent += `**Game:** ${data.game}\n`;
            logContent += `**Bet:** ${data.bet} 🪙\n`;
            logContent += `**Result:** ${data.result}\n`;
            logContent += `**Amount:** ${data.amount} 🪙\n`;
            logContent += `**Date:** <t:${Math.floor(Date.now() / 1000)}:F>\n`;

            const message = {
                components: [{
                    type: 17,
                    components: [{
                        type: 10,
                        content: logContent
                    }]
                }]
            };

            await logChannel.send(message);
        } catch (error) {
            console.error(`[Logger] Error logging ${type}:`, error);
        }
    }
}

module.exports = Logger;
