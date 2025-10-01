// events/messageDelete.js
const { EmbedBuilder } = require('discord.js');
const Guild = require('../models/Guild');
const LanguageManager = require('../utils/languageManager');

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
            
            // Créer l'embed pour le message supprimé
            const embed = new EmbedBuilder()
                .setTitle('🗑️ Message supprimé')
                .setColor('#FF0000')
                .setDescription(`**Auteur:** ${message.author.toString()} (${message.author.tag})
**Canal:** ${message.channel.toString()}
**Date:** ${new Date().toLocaleString()}`)
                .setTimestamp();
            
            // Ajouter le contenu du message s'il existe
            if (message.content) {
                // Limiter la taille du contenu pour éviter les erreurs Discord
                const content = message.content.length > 1024 
                    ? message.content.substring(0, 1021) + '...' 
                    : message.content;
                
                embed.addFields({ name: 'Contenu', value: content });
            }
            
            // Ajouter les pièces jointes s'il y en a
            if (message.attachments.size > 0) {
                const attachments = message.attachments.map(a => `[${a.name}](${a.url})`).join('\n');
                embed.addFields({ name: 'Pièces jointes', value: attachments.substring(0, 1024) });
                
                // Ajouter la première image comme thumbnail si c'est une image
                const firstAttachment = message.attachments.first();
                if (firstAttachment && firstAttachment.contentType && firstAttachment.contentType.startsWith('image/')) {
                    embed.setThumbnail(firstAttachment.url);
                }
            }
            
            // Envoyer l'embed dans le canal de logs
            await logChannel.send({ embeds: [embed] });
            
        } catch (error) {
            console.error('Erreur lors de la journalisation du message supprimé:', error);
        }
    }
};