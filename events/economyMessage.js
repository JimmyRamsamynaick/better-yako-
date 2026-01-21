const EconomyManager = require('../utils/economyManager');

// Configuration des gains (pourrait être en DB plus tard)
const COINS_PER_MESSAGE = 5;

module.exports = {
    name: 'messageCreate',
    async execute(message, client) {
        if (message.author.bot || !message.guild) return;

        // Anti-spam simple (optionnel, à améliorer)
        // Ici on donne des coins à chaque message pour simplifier, 
        // idéalement on ajouterait un cooldown.
        
        try {
            // On utilise un cooldown basique via une map en mémoire si besoin,
            // mais pour l'instant on reste simple comme demandé.
            await EconomyManager.addCoins(message.guild.id, message.author.id, COINS_PER_MESSAGE);
        } catch (error) {
            console.error('Erreur gain coins message:', error);
        }
    },
};