const Guild = require('../models/Guild');
const LevelingManager = require('../utils/levelingManager');
const LanguageManager = require('../utils/languageManager');

module.exports = {
    name: 'messageCreate',
    async execute(message) {
        if (message.author.bot || !message.guild) return;

        try {
            const guildData = await Guild.findOne({ guildId: message.guild.id });
            if (!guildData || !guildData.leveling || !guildData.leveling.enabled) return;

            let user = guildData.users.find(u => u.userId === message.author.id);
            
            // Add XP
            const xpAmount = guildData.leveling.xpPerMessage || 15;
            const result = await LevelingManager.addXp(message.guild.id, message.author.id, xpAmount, { messages: 1 });

            if (result && result.leveledUp) {
                const channelId = guildData.leveling.levelUpChannelId || message.channel.id;
                const channel = message.guild.channels.cache.get(channelId);
                
                if (channel) {
                    const lang = guildData.language || 'fr';
                    const defaultMsg = LanguageManager.get(lang, 'leveling.levelup_message_default');
                    const msg = (guildData.leveling.levelUpMessage || defaultMsg)
                        .replace('{user}', message.author.toString())
                        .replace('{level}', result.newLevel);
                    
                    await channel.send(msg);
                }
            }
        } catch (error) {
            console.error('Erreur dans messageCreate (Leveling):', error);
        }
    }
};
