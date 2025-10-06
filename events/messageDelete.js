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
            if (!guildData.logs.enabled || !guildData.logs.types.message) return;
            
            // Récupérer le canal de logs pour les messages (priorité au canal spécifique, sinon canal global)
            let logChannel = null;
            if (Array.isArray(guildData.logs.channels) && guildData.logs.channels.length > 0) {
                const messageLogChannel = guildData.logs.channels.find(ch => ch.types && ch.types.message);
                if (messageLogChannel) {
                    logChannel = message.guild.channels.cache.get(messageLogChannel.channelId);
                }
            }
            if (!logChannel && guildData.logs.channelId) {
                logChannel = message.guild.channels.cache.get(guildData.logs.channelId);
            }
            if (!logChannel) return;
            
            const lang = guildData.language || 'fr';

            // Créer le message avec le format components (i18n)
            const title = LanguageManager.get(lang, 'events.messages.deleted.title') || '🗑️ Message supprimé';
            const authorLabel = LanguageManager.get(lang, 'events.messages.deleted.fields.author') || 'Auteur';
            const channelLabel = LanguageManager.get(lang, 'events.messages.deleted.fields.channel') || 'Canal';
            const dateLabel = LanguageManager.get(lang, 'events.messages.deleted.fields.date') || 'Date';
            const contentTitle = LanguageManager.get(lang, 'events.messages.deleted.fields.content_title') || '📝 Contenu du message';
            const attachmentsTitle = LanguageManager.get(lang, 'events.messages.deleted.fields.attachments_title') || '📎 Pièces jointes';
            const attachmentsLabel = LanguageManager.get(lang, 'common.attachments') || 'Pièces jointes';

            let content = `## ${title}\n\n`;
            content += `**${authorLabel}:** ${message.author.toString()} (${message.author.tag})\n`;
            content += `**${channelLabel}:** ${message.channel.toString()}\n`;
            content += `**${dateLabel}:** <t:${Math.floor(Date.now() / 1000)}:F>\n\n`;
            
            // Ajouter le contenu du message s'il existe
            if (message.content) {
                const messageContent = message.content.length > 1000 
                    ? message.content.substring(0, 997) + '...' 
                    : message.content;
                content += `### ${contentTitle}:\n\`\`\`\n${messageContent}\n\`\`\`\n`;
            }
            
            // Ajouter les pièces jointes s'il y en a
            if (message.attachments.size > 0) {
                content += `### ${attachmentsTitle} (${message.attachments.size}):\n`;
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