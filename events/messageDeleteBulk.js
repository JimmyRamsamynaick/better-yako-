// events/messageDeleteBulk.js
const { EmbedBuilder, AttachmentBuilder } = require('discord.js');
const Guild = require('../models/Guild');
const LanguageManager = require('../utils/languageManager');

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
            
            const lang = guildData.language || 'fr';

            // Construire le contenu du fichier texte listant les messages supprimés (i18n)
            const sorted = Array.from(messages.values()).sort((a, b) => a.createdTimestamp - b.createdTimestamp);
            const fileTitle = LanguageManager.get(lang, 'events.messages.bulk_deleted.file.title') || '=== MESSAGES SUPPRIMÉS ===';
            const serverLabel = LanguageManager.get(lang, 'common.server') || 'Serveur';
            const channelLabel = LanguageManager.get(lang, 'common.channel') || 'Canal';
            const dateLabel = LanguageManager.get(lang, 'common.date') || 'Date';
            const messageCountLabel = LanguageManager.get(lang, 'common.message_count') || 'Nombre de messages';
            const unknownLabel = LanguageManager.get(lang, 'common.unknown') || 'Inconnu';
            const attachmentsLabel = LanguageManager.get(lang, 'common.attachments') || 'Pièces jointes';
            const emptyContentLabel = LanguageManager.get(lang, 'events.messages.bulk_deleted.file.empty_content') || '(contenu vide)';

            let txt = `${fileTitle}\n`;
            txt += `${serverLabel}: ${firstMessage.guild.name} (ID: ${firstMessage.guild.id})\n`;
            txt += `${channelLabel}: #${firstMessage.channel?.name || unknownLabel} (ID: ${firstMessage.channel?.id || unknownLabel})\n`;
            txt += `${dateLabel}: ${new Date().toISOString()}\n`;
            txt += `${messageCountLabel}: ${sorted.length}\n`;
            txt += `----------------------------------------\n\n`;
            for (const m of sorted) {
                const authorTag = m.author ? `${m.author.tag}` : unknownLabel;
                const authorId = m.author ? m.author.id : unknownLabel;
                const ts = m.createdTimestamp ? new Date(m.createdTimestamp).toISOString() : unknownLabel;
                const content = (m.content || '').replace(/\r?\n/g, '\n');
                txt += `[${ts}] ${authorTag} (ID: ${authorId}) - Message ID: ${m.id}\n`;
                txt += content ? `${content}\n` : `${emptyContentLabel}\n`;
                if (m.attachments && m.attachments.size > 0) {
                    txt += `${attachmentsLabel} (${m.attachments.size}):\n`;
                    m.attachments.forEach(att => {
                        txt += `- ${att.name || 'fichier'}: ${att.url}\n`;
                    });
                }
                txt += `\n`;
            }

            const timestampName = new Date().toISOString().replace(/[:.]/g, '-');
            const fileName = `deleted-messages-${firstMessage.guild.id}-${firstMessage.channel?.id || 'unknown'}-${timestampName}.txt`;
            const txtAttachment = new AttachmentBuilder(Buffer.from(txt, 'utf8'), { name: fileName });

            // Créer l'embed pour les messages supprimés en masse (i18n)
            const bulkTitle = LanguageManager.get(lang, 'events.messages.bulk_deleted.title') || '🗑️ Messages supprimés en masse';
            const bulkDescription = LanguageManager.get(lang, 'events.messages.bulk_deleted.description', {
                channel: firstMessage.channel.toString(),
                count: messages.size,
                date: new Date().toLocaleString(lang === 'en' ? 'en-US' : 'fr-FR')
            }) || `**Canal:** ${firstMessage.channel.toString()}\n**Nombre de messages:** ${messages.size}\n**Date:** ${new Date().toLocaleString()}\n\nUn fichier \`.txt\` listant les messages supprimés sera envoyé ci-dessous et supprimé automatiquement après 24h.`;

            const embed = new EmbedBuilder()
                .setTitle(bulkTitle)
                .setColor('#FF0000')
                .setDescription(bulkDescription)
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