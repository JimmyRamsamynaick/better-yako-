const Guild = require('../models/Guild');
const ServerStats = require('../utils/serverStats');
const { ActivityType } = require('discord.js');

module.exports = {
  name: 'ready',
  once: true,
  async execute(client) {
    try {
      for (const [id, guild] of client.guilds.cache) {
        const doc = await Guild.findOne({ guildId: id });
        if (doc && doc.serverStats && doc.serverStats.enabled) {
          try { await ServerStats.updateForGuild(guild); } catch (_) {}
        }
      }
      try {
        client.user.setPresence({
          activities: [{
            name: `🛡️ ${client.guilds.cache.size} serveurs protégés`,
            type: ActivityType.Streaming,
            url: 'https://www.twitch.tv/jimmy_9708'
          }],
          status: 'dnd'
        });
      } catch (_) {}

      try {
        setInterval(async () => {
          for (const [id, guild] of client.guilds.cache) {
            const doc = await Guild.findOne({ guildId: id });
            if (doc && doc.serverStats && doc.serverStats.enabled) {
              try { await ServerStats.updateForGuild(guild); } catch (_) {}
            }
          }
        }, 60 * 1000);
      } catch (_) {}
    } catch (_) {}
  }
};
