const { ActivityType } = require('discord.js');

module.exports = {
    name: 'guildDelete',
    async execute(guild, client) {
        try {
            console.log(`❌ Retiré du serveur: ${guild.name} (${guild.id})`);

            // Mettre à jour la présence pour refléter le nombre actuel de serveurs
            client.user.setPresence({
                activities: [{
                    name: `🛡️ ${client.guilds.cache.size} serveurs protégés`,
                    type: ActivityType.Streaming,
                    url: 'https://www.twitch.tv/jimmy_9708'
                }],
                status: 'dnd'
            });
        } catch (err) {
            console.error('Erreur mise à jour présence (guildDelete):', err);
        }
    }
};