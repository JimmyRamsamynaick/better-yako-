const Guild = require('../models/Guild');
const BotEmbeds = require('../utils/embeds');
const LanguageManager = require('../utils/languageManager');
const { ActivityType, REST, Routes } = require('discord.js');

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

        // Le message de bienvenue a été désactivé à la demande de l'utilisateur
        /*
        const welcomeEmbed = BotEmbeds.createWelcomeEmbed(client.guilds.cache.size, detectedLanguage);

        const channel = guild.channels.cache
            .filter(c => c.type === 0 && c.permissionsFor(guild.members.me).has('SendMessages'))
            .first();

        if (channel) {
            channel.send({ embeds: [welcomeEmbed] });
        }
        */

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

        // Déployer les commandes sur le nouveau serveur
        try {
            console.log(`🚀 Déploiement des commandes pour le nouveau serveur: ${guild.name} (${guild.id})...`);
            
            const commands = [];
            client.commands.forEach(cmd => {
                if (cmd.data && typeof cmd.data.toJSON === 'function') {
                    commands.push(cmd.data.toJSON());
                }
            });

            if (commands.length > 0) {
                const rest = new REST().setToken(process.env.DISCORD_TOKEN);
                await rest.put(
                    Routes.applicationGuildCommands(client.user.id, guild.id),
                    { body: commands }
                );
                console.log(`✅ Commandes déployées avec succès sur ${guild.name} !`);
            } else {
                console.warn(`⚠️ Aucune commande à déployer pour ${guild.name}.`);
            }
        } catch (error) {
            console.error(`❌ Erreur lors du déploiement des commandes sur ${guild.name}:`, error);
        }
    }
};