const { EmbedBuilder } = require('discord.js');
const Guild = require('../models/Guild');
const ComponentsV3 = require('../utils/ComponentsV3');

module.exports = {
    name: 'messageUpdate',
    async execute(oldMessage, newMessage) {
        // Ignorer les messages de bots et les messages partiels
        if (newMessage.author.bot || newMessage.partial || oldMessage.partial) return;
        
        // Ignorer si le contenu n'a pas changé
        if (oldMessage.content === newMessage.content) return;

        try {
            const guild = await Guild.findOne({ guildId: newMessage.guild.id });
            if (!guild || !guild.logs.enabled || !guild.logs.types.message) return;

            // Vérifier s'il y a un canal configuré pour les logs de messages
            let logChannel = null;
            if (guild.logs.channels && guild.logs.channels.length > 0) {
                const messageLogChannel = guild.logs.channels.find(ch => ch.types.message);
                if (messageLogChannel) {
                    logChannel = newMessage.guild.channels.cache.get(messageLogChannel.channelId);
                }
            } else if (guild.logs.channelId) {
                logChannel = newMessage.guild.channels.cache.get(guild.logs.channelId);
            }

            if (!logChannel) return;

            // Créer le message avec le format components
            let content = `## 📝 Message modifié\n\n`;
            content += `**Utilisateur:** ${newMessage.author.toString()} (${newMessage.author.tag})\n`;
            content += `**Canal:** ${newMessage.channel.toString()}\n`;
            content += `**Date:** <t:${Math.floor(Date.now() / 1000)}:F>\n`;
            content += `**Lien:** [Aller au message](${newMessage.url})\n\n`;
            
            // Ancien contenu
            const oldContent = oldMessage.content.length > 800 
                ? oldMessage.content.substring(0, 797) + '...' 
                : oldMessage.content || '*Contenu vide*';
            content += `### 📜 Ancien contenu:\n\`\`\`\n${oldContent}\n\`\`\`\n\n`;
            
            // Nouveau contenu
            const newContent = newMessage.content.length > 800 
                ? newMessage.content.substring(0, 797) + '...' 
                : newMessage.content || '*Contenu vide*';
            content += `### 📝 Nouveau contenu:\n\`\`\`\n${newContent}\n\`\`\``;
            
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
            
            await logChannel.send(componentMessage);
        } catch (error) {
            console.error('Erreur lors du log de modification de message:', error);
        }
    }
};