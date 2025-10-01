// events/messageDelete.js
const { EmbedBuilder } = require('discord.js');
const Guild = require('../models/Guild');
const LanguageManager = require('../utils/languageManager');
const ComponentsV3 = require('../utils/ComponentsV3');

module.exports = {
    name: 'messageDelete',
    async execute(message) {
        // Ignorer les messages des bots et les messages privés
        if (message.author?.bot || !message.guild) return;
        
        try {
            // Récupérer les données du serveur
            const guildData = await Guild.findOne({ guildId: message.guild.id });
            if (!guildData) return;
            
            // Vérifier si les logs sont activés et si le type de log 'message' est activé
            if (!guildData.logs.enabled || !guildData.logs.channelId || !guildData.logs.types.message) return;
            
            // Récupérer le canal de logs
            const logChannel = message.guild.channels.cache.get(guildData.logs.channelId);
            if (!logChannel) return;
            
            // Créer le message avec le format components
            let content = `## 🗑️ Message supprimé\n\n`;
            content += `**Auteur:** ${message.author.toString()} (${message.author.tag})\n`;
            content += `**Canal:** ${message.channel.toString()}\n`;
            content += `**Date:** <t:${Math.floor(Date.now() / 1000)}:F>\n\n`;
            
            // Ajouter le contenu du message s'il existe
            if (message.content) {
                const messageContent = message.content.length > 1000 
                    ? message.content.substring(0, 997) + '...' 
                    : message.content;
                content += `### 📝 Contenu du message:\n\`\`\`\n${messageContent}\n\`\`\`\n`;
            }
            
            // Ajouter les pièces jointes s'il y en a
            if (message.attachments.size > 0) {
                content += `### 📎 Pièces jointes (${message.attachments.size}):\n`;
                message.attachments.forEach(attachment => {
                    content += `• [${attachment.name}](${attachment.url})\n`;
                });
            }
            
            const componentMessage = {
                flags: 32768,
                components: [{
                    type: 17,
                    components: [{
                        type: 10,
                        content: content
                    }]
                }]
            };
            
            // Envoyer le message dans le canal de logs
            await logChannel.send(componentMessage);
            
        } catch (error) {
            console.error('Erreur lors de la journalisation du message supprimé:', error);
        }
    }
};