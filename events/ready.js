const Guild = require('../models/Guild');
const ServerStats = require('../utils/serverStats');
const LevelingManager = require('../utils/levelingManager');
const LanguageManager = require('../utils/languageManager');
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
        // Boucle pour les stats du serveur (Toutes les 10 minutes pour éviter les rate limits)
        setInterval(async () => {
          for (const [id, guild] of client.guilds.cache) {
            const doc = await Guild.findOne({ guildId: id });
            
            // Stats update
            if (doc && doc.serverStats && doc.serverStats.enabled) {
              try { await ServerStats.updateForGuild(guild); } catch (_) {}
            }
          }
        }, 10 * 60 * 1000);

        // Boucle pour l'XP Vocal (Toutes les 10 secondes pour plus de précision)
        setInterval(async () => {
          for (const [id, guild] of client.guilds.cache) {
            const doc = await Guild.findOne({ guildId: id });

            // Voice XP
            if (doc && doc.leveling && doc.leveling.enabled) {
                try {
                    const xpPerMinute = doc.leveling.xpPerVoiceMinute || 10;
                    
                    // Calcul pour 10 secondes (1/6 de minute)
                    // On divise par 6 car la boucle tourne 6 fois par minute
                    const xpPerTick = xpPerMinute / 6;
                    const voiceTimePerTick = 10 / 60; // ~0.166 minutes

                    guild.voiceStates.cache.forEach(async (voiceState) => {
                        const member = voiceState.member;
                        if (!member || member.user.bot) return;
                        
                        // Check if user is muted or deafened (optional, but often requested to avoid AFK farming)
                        // Désactivé temporairement car l'utilisateur veut que son temps soit compté même s'il est auto-deaf
                        // if (voiceState.selfMute || voiceState.selfDeaf || voiceState.serverMute || voiceState.serverDeaf) return;
                        
                        // Check if user is in a valid channel (not AFK channel)
                        if (!voiceState.channelId) return;
                        if (guild.afkChannelId && voiceState.channelId === guild.afkChannelId) return;

                        const result = await LevelingManager.addXp(id, member.id, xpPerTick, { voice: voiceTimePerTick });
                        
                        if (result && result.leveledUp) {
                            const channelId = doc.leveling.levelUpChannelId;
                            const channel = channelId ? guild.channels.cache.get(channelId) : null;
                            
                            // If specific channel set, send there. 
                            // For voice, we can't send to "current channel" easily, so only send if channel is configured
                            if (channel) {
                                const lang = doc.language || 'fr';
                                const defaultMsg = LanguageManager.get(lang, 'leveling.levelup_message_default');
                                const msg = (doc.leveling.levelUpMessage || defaultMsg)
                                    .replace('{user}', member.toString())
                                    .replace('{level}', result.newLevel)
                                    .replace('{coins}', result.reward || 0);
                                try { await channel.send(msg); } catch (_) {}
                            }
                        }
                    });
                } catch (err) {
                    console.error('Error updating voice XP:', err);
                }
            }
          }
        }, 10 * 1000); // 10 secondes
      } catch (_) {}
    } catch (_) {}
  }
};

