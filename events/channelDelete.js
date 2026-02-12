const { EmbedBuilder, ChannelType } = require('discord.js');
const Guild = require('../models/Guild');
const LanguageManager = require('../utils/languageManager');
const fs = require('fs');
const path = require('path');
const { get: getTicketEntry, remove: removeTicketEntry } = require('../utils/ticketsRegistry');
const { getTranscriptFilePath } = require('../utils/ticketTranscripts');

module.exports = {
    name: 'channelDelete',
    async execute(channel) {
        try {
            const guild = await Guild.findOne({ guildId: channel.guild.id });
            if (!guild || !guild.logs.enabled || !guild.logs.types.channels) return;

            // Vérifier s'il y a un canal configuré pour les logs de canaux
            let logChannel = null;
            if (guild.logs.channels && guild.logs.channels.length > 0) {
                const channelLogChannel = guild.logs.channels.find(ch => ch.types.channels);
                if (channelLogChannel) {
                    logChannel = channel.guild.channels.cache.get(channelLogChannel.channelId);
                }
            } else if (guild.logs.channelId) {
                logChannel = channel.guild.channels.cache.get(guild.logs.channelId);
            }

            if (!logChannel) return;

            const channelTypeEmoji = {
                [ChannelType.GuildText]: '💬',
                [ChannelType.GuildVoice]: '🔊',
                [ChannelType.GuildCategory]: '📁',
                [ChannelType.GuildNews]: '📢',
                [ChannelType.GuildStageVoice]: '🎭',
                [ChannelType.GuildForum]: '💭'
            };

            const lang = guild.language || 'fr';
            const channelTypeName = {
                [ChannelType.GuildText]: LanguageManager.get(lang, 'events.common.channel_types.text') || 'Textuel',
                [ChannelType.GuildVoice]: LanguageManager.get(lang, 'events.common.channel_types.voice') || 'Vocal',
                [ChannelType.GuildCategory]: LanguageManager.get(lang, 'events.common.channel_types.category') || 'Catégorie',
                [ChannelType.GuildNews]: LanguageManager.get(lang, 'events.common.channel_types.announcements') || 'Annonces',
                [ChannelType.GuildStageVoice]: LanguageManager.get(lang, 'events.common.channel_types.stage') || 'Scène',
                [ChannelType.GuildForum]: LanguageManager.get(lang, 'events.common.channel_types.forum') || 'Forum'
            };

            const fields = [
                { name: LanguageManager.get(lang, 'events.common.fields.channel') || '📍 Canal', value: `\`#${channel.name}\``, inline: false },
                { name: LanguageManager.get(lang, 'events.common.fields.type') || '🏷️ Type', value: channelTypeName[channel.type] || (LanguageManager.get(lang, 'events.common.unknown') || 'Inconnu'), inline: true },
                { name: LanguageManager.get(lang, 'events.common.fields.position') || '📍 Position', value: `${channel.position}`, inline: true }
            ];

            if (channel.parent) {
                fields.push({ name: LanguageManager.get(lang, 'events.common.fields.category') || '📁 Catégorie', value: channel.parent.name, inline: true });
            }

            if (channel.topic) {
                fields.push({ name: LanguageManager.get(lang, 'events.common.fields.topic') || '📋 Sujet', value: channel.topic, inline: false });
            }

            // Informations spécifiques aux canaux vocaux
            if (channel.type === ChannelType.GuildVoice) {
                fields.push({ name: LanguageManager.get(lang, 'events.common.fields.audio_bitrate') || '🎵 Débit audio', value: `${channel.bitrate}kbps`, inline: true });
                if (channel.userLimit > 0) {
                    fields.push({ name: LanguageManager.get(lang, 'events.common.fields.user_limit') || '👥 Limite d\'utilisateurs', value: `${channel.userLimit}`, inline: true });
                }
            }

            // Informations spécifiques aux canaux texte
            if (channel.type === ChannelType.GuildText) {
                if (channel.nsfw) {
                    fields.push({ name: LanguageManager.get(lang, 'events.common.fields.nsfw') || '🔞 NSFW', value: LanguageManager.get(lang, 'events.common.enabled') || 'Activé', inline: true });
                }
                if (channel.rateLimitPerUser > 0) {
                    fields.push({ name: LanguageManager.get(lang, 'events.common.fields.rate_limit') || '⏱️ Limite de débit', value: `${channel.rateLimitPerUser}s`, inline: true });
                }
            }

            const embed = new EmbedBuilder()
                .setTitle(`${channelTypeEmoji[channel.type] || '📝'} ${LanguageManager.get(lang, 'events.channels.deleted.title_base') || 'Canal supprimé'}`)
                .setColor(0xFF0000)
                .addFields(fields)
                .setTimestamp()
                .setFooter({ text: `ID: ${channel.id}` });

            // Si ce canal correspond à un ticket fermé via le système de tickets, enrichir le log
            const ticketEntry = getTicketEntry(channel.id);
            let files = [];
            if (ticketEntry) {
                const meta = ticketEntry.meta || {};
                const onClose = ticketEntry.onClose || {};
                const closedBy = ticketEntry.closedBy;

                const categoryKey = meta.categoryKey || 'inconnu';
                const categoryLabel = LanguageManager.get(lang, `tickets.categories.${categoryKey}.label`) || (categoryKey.charAt(0).toUpperCase() + categoryKey.slice(1));

                const ticketFields = [
                    { name: LanguageManager.get(lang, 'transcript.log_fields.ticket') || '🎫 Ticket', value: `${LanguageManager.get(lang, 'transcript.log_fields.category') || '📁 Catégorie'} : **${categoryLabel}**`, inline: true },
                ];
                if (meta.openerTag) {
                    ticketFields.push({ name: LanguageManager.get(lang, 'transcript.log_fields.opened_by') || '👤 Ouvert par', value: meta.openerTag, inline: true });
                }
                if (closedBy) {
                    const closedByText = typeof closedBy === 'object' && closedBy.tag ? closedBy.tag : String(closedBy);
                    ticketFields.push({ name: LanguageManager.get(lang, 'transcript.log_fields.closed_by') || '🔒 Fermé par', value: closedByText, inline: true });
                }
                if (typeof onClose.totalMessages === 'number') {
                    ticketFields.push({ name: LanguageManager.get(lang, 'transcript.log_fields.messages') || '💬 Messages', value: String(onClose.totalMessages), inline: true });
                }

                embed.addFields(ticketFields);

                // Joindre le transcript si disponible
                try {
                    const transcriptPath = getTranscriptFilePath(channel.name);
                    if (fs.existsSync(transcriptPath)) {
                        files.push({ attachment: transcriptPath, name: onClose.transcriptFileName || path.basename(transcriptPath) });
                    }
                } catch (_) {}

                // Nettoyer l'entrée du registre après log
                removeTicketEntry(channel.id);
            }

            await logChannel.send({ embeds: [embed], ...(files.length > 0 ? { files } : {}) });

        } catch (error) {
            console.error('Erreur lors du log de suppression de canal:', error);
        }
    }
};