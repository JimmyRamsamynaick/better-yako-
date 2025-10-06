const Guild = require('../models/Guild');
const BotEmbeds = require('../utils/embeds');
const LanguageManager = require('../utils/languageManager');
const { ActivityType } = require('discord.js');

// Fonction pour détecter la langue du serveur
function detectServerLanguage(guild) {
    const locale = guild.preferredLocale;
    
    // Mapping des locales Discord vers nos langues supportées
    const localeMap = {
        'French': 'fr',
        'en-US': 'en',
        'en-GB': 'en',
        'es-ES': 'en', // Pas de support espagnol pour l'instant
        'pt-BR': 'en', // Pas de support portugais pour l'instant
        'de': 'en',
        'it': 'en',
        'ru': 'en',
        'ja': 'en',
        'ko': 'en',
        'zh-CN': 'en',
        'zh-TW': 'en'
    };
    
    return localeMap[locale] || 'en'; // Par défaut anglais
}

module.exports = {
    name: 'guildCreate',
    async execute(guild, client) {
        // Détecter la langue du serveur
        const detectedLanguage = detectServerLanguage(guild);
        
        // Créer l'entrée dans la base de données avec la langue détectée
        const guildDoc = await Guild.findOneAndUpdate(
            { guildId: guild.id },
            { 
                guildId: guild.id,
                language: detectedLanguage
            },
            { upsert: true, new: true }
        );

        console.log(`✅ Ajouté au serveur: ${guild.name} (${guild.id}) - Langue: ${detectedLanguage}`);

        // Envoyer un message de bienvenue dans la langue détectée
        const welcomeEmbed = BotEmbeds.createWelcomeEmbed(client.guilds.cache.size, detectedLanguage);

        const channel = guild.channels.cache
            .filter(c => c.type === 0 && c.permissionsFor(guild.members.me).has('SendMessages'))
            .first();

        if (channel) {
            channel.send({ embeds: [welcomeEmbed] });
        }

        // Mettre à jour la présence pour refléter le nouveau nombre de serveurs
        try {
            client.user.setPresence({
                activities: [{
                    name: `🛡️ ${client.guilds.cache.size} serveurs protégés`,
                    type: ActivityType.Streaming,
                    url: 'https://www.twitch.tv/jimmy_9708'
                }],
                status: 'dnd'
            });
        } catch (err) {
            console.error('Erreur mise à jour présence (guildCreate):', err);
        }
    }
};