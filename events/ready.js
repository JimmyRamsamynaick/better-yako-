// events/ready.js
const { ActivityType } = require('discord.js');
const Guild = require('../models/Guild');

module.exports = {
    name: 'ready',
    once: true,
    async execute(client) {
        console.log(`✅ ${client.user.tag} est en ligne !`);
        
        client.user.setPresence({
            activities: [{
                name: `${client.guilds.cache.size} serveurs`,
                type: ActivityType.Watching
            }],
            status: 'online'
        });

        // Initialiser les guildes en base
        for (const guild of client.guilds.cache.values()) {
            await Guild.findOneAndUpdate(
                { guildId: guild.id },
                { guildId: guild.id },
                { upsert: true, new: true }
            );
        }
    }
};
