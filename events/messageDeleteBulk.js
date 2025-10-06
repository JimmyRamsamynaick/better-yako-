// events/messageDeleteBulk.js
const { EmbedBuilder, AttachmentBuilder } = require('discord.js');
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
            if (!guildData.logs.enabled || !guildData.logs.types.message) return;
            
            // Récupérer le canal de logs pour les messages (priorité au canal spécifique, sinon canal global)
            let logChannel = null;
            if (Array.isArray(guildData.logs.channels) && guildData.logs.channels.length > 0) {
                const messageLogChannel = guildData.logs.channels.find(ch => ch.types && ch.types.message);
                if (messageLogChannel) {
                    logChannel = firstMessage.guild.channels.cache.get(messageLogChannel.channelId);
                }
            }
            if (!logChannel && guildData.logs.channelId) {
                logChannel = firstMessage.guild.channels.cache.get(guildData.logs.channelId);
            }
            if (!logChannel) return;
            
            // Construire le contenu du fichier texte listant les messages supprimés
            const sorted = Array.from(messages.values()).sort((a, b) => a.createdTimestamp - b.createdTimestamp);
            let txt = `Messages supprimés en masse\n`;
            txt += `Serveur: ${firstMessage.guild.name} (ID: ${firstMessage.guild.id})\n`;
            txt += `Canal: #${firstMessage.channel?.name || 'inconnu'} (ID: ${firstMessage.channel?.id || 'inconnu'})\n`;
            txt += `Date: ${new Date().toISOString()}\n`;
            txt += `Nombre de messages: ${sorted.length}\n`;
            txt += `----------------------------------------\n\n`;
            for (const m of sorted) {
                const authorTag = m.author ? `${m.author.tag}` : 'Inconnu';
                const authorId = m.author ? m.author.id : 'Inconnu';
                const ts = m.createdTimestamp ? new Date(m.createdTimestamp).toISOString() : 'Inconnu';
                const content = (m.content || '').replace(/\r?\n/g, '\n');
                txt += `[${ts}] ${authorTag} (ID: ${authorId}) - Message ID: ${m.id}\n`;
                txt += content ? `${content}\n` : '(contenu vide)\n';
                if (m.attachments && m.attachments.size > 0) {
                    txt += `Pièces jointes (${m.attachments.size}):\n`;
                    m.attachments.forEach(att => {
                        txt += `- ${att.name || 'fichier'}: ${att.url}\n`;
                    });
                }
                txt += `\n`;
            }

            const timestampName = new Date().toISOString().replace(/[:.]/g, '-');
            const fileName = `deleted-messages-${firstMessage.guild.id}-${firstMessage.channel?.id || 'unknown'}-${timestampName}.txt`;
            const txtAttachment = new AttachmentBuilder(Buffer.from(txt, 'utf8'), { name: fileName });

            // Créer l'embed pour les messages supprimés en masse (format de base)
            const embed = new EmbedBuilder()
                .setTitle('🗑️ Messages supprimés en masse')
                .setColor('#FF0000')
                .setDescription(`**Canal:** ${firstMessage.channel.toString()}\n**Nombre de messages:** ${messages.size}\n**Date:** ${new Date().toLocaleString()}\n\nUn fichier \`.txt\` listant les messages supprimés sera envoyé ci-dessous et supprimé automatiquement après 24h.`)
                .setTimestamp();

            // Envoyer l'embed dans le canal de logs (conservé)
            await logChannel.send({ embeds: [embed] });

            // Envoyer le fichier .txt dans un message séparé (supprimé après 24h)
            const fileMsg = await logChannel.send({ files: [txtAttachment] });

            // Supprimer automatiquement le message du fichier après 24h pour éviter l'accumulation
            setTimeout(() => {
                fileMsg.delete().catch(err => {
                    console.error('Impossible de supprimer le fichier de messages supprimés en masse après 24h:', err?.message || err);
                });
            }, 24 * 60 * 60 * 1000);
            
        } catch (error) {
            console.error('Erreur lors de la journalisation des messages supprimés en masse:', error);
        }
    }
};