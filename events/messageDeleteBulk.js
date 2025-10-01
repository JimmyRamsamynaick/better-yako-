// events/messageDeleteBulk.js
const { EmbedBuilder } = require('discord.js');
const Guild = require('../models/Guild');

module.exports = {
    name: 'messageDeleteBulk',
    async execute(messages) {
        // Vérifier si nous avons des messages
        if (messages.size === 0) return;
        
        // Récupérer le premier message pour obtenir les informations du serveur
        const firstMessage = messages.first();
        if (!firstMessage || !firstMessage.guild) return;
        
        try {
            // Récupérer les données du serveur
            const guildData = await Guild.findOne({ guildId: firstMessage.guild.id });
            if (!guildData) return;
            
            // Vérifier si les logs sont activés et si le type de log 'message' est activé
            if (!guildData.logs.enabled || !guildData.logs.channelId || !guildData.logs.types.message) return;
            
            // Récupérer le canal de logs
            const logChannel = firstMessage.guild.channels.cache.get(guildData.logs.channelId);
            if (!logChannel) return;
            
            // Créer l'embed pour les messages supprimés en masse
            const embed = new EmbedBuilder()
                .setTitle('🗑️ Messages supprimés en masse')
                .setColor('#FF0000')
                .setDescription(`**Canal:** ${firstMessage.channel.toString()}
**Nombre de messages:** ${messages.size}
**Date:** ${new Date().toLocaleString()}`)
                .setTimestamp();
            
            // Envoyer l'embed dans le canal de logs
            await logChannel.send({ embeds: [embed] });
            
        } catch (error) {
            console.error('Erreur lors de la journalisation des messages supprimés en masse:', error);
        }
    }
};