const EconomyManager = require('../utils/economyManager');

// Configuration
const COINS_PER_MINUTE_VOICE = 10;
const CHECK_INTERVAL = 60 * 1000; // 1 minute

module.exports = {
    name: 'ready',
    once: false, // On veut que ce fichier soit chargé, mais c'est un event ready comme l'autre
    async execute(client) {
        console.log('Système économie vocal initialisé.');
        
        setInterval(async () => {
            for (const [guildId, guild] of client.guilds.cache) {
                // Pour chaque membre en vocal
                guild.voiceStates.cache.forEach(async (voiceState) => {
                    const member = voiceState.member;
                    if (!member || member.user.bot) return;

                    // Vérifications de base (mute/deaf)
                    // Si on veut être strict :
                    // if (voiceState.selfMute || voiceState.selfDeaf || voiceState.serverMute || voiceState.serverDeaf) return;
                    
                    // Vérifier si salon AFK
                    if (guild.afkChannelId && voiceState.channelId === guild.afkChannelId) return;
                    
                    // Vérifier si connecté à un salon
                    if (!voiceState.channelId) return;

                    try {
                        await EconomyManager.addCoins(guildId, member.id, COINS_PER_MINUTE_VOICE);
                    } catch (err) {
                        console.error('Erreur gain coins vocal:', err);
                    }
                });
            }
        }, CHECK_INTERVAL);
    },
};