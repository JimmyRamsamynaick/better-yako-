const { EmbedBuilder, ChannelType } = require('discord.js');
const Guild = require('../models/Guild');

module.exports = {
    name: 'channelCreate',
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

            const channelTypeName = {
                [ChannelType.GuildText]: 'Textuel',
                [ChannelType.GuildVoice]: 'Vocal',
                [ChannelType.GuildCategory]: 'Catégorie',
                [ChannelType.GuildNews]: 'Annonces',
                [ChannelType.GuildStageVoice]: 'Scène',
                [ChannelType.GuildForum]: 'Forum'
            };

            const fields = [
                { name: '📍 Canal', value: `${channel} (\`${channel.name}\`)`, inline: false },
                { name: '🏷️ Type', value: channelTypeName[channel.type] || 'Inconnu', inline: true },
                { name: '📍 Position', value: `${channel.position}`, inline: true }
            ];

            if (channel.parent) {
                fields.push({ name: '📁 Catégorie', value: channel.parent.name, inline: true });
            }

            if (channel.topic) {
                fields.push({ name: '📋 Sujet', value: channel.topic, inline: false });
            }

            // Informations spécifiques aux canaux vocaux
            if (channel.type === ChannelType.GuildVoice) {
                fields.push({ name: '🎵 Débit audio', value: `${channel.bitrate}kbps`, inline: true });
                if (channel.userLimit > 0) {
                    fields.push({ name: '👥 Limite d\'utilisateurs', value: `${channel.userLimit}`, inline: true });
                }
            }

            // Informations spécifiques aux canaux texte
            if (channel.type === ChannelType.GuildText) {
                if (channel.nsfw) {
                    fields.push({ name: '🔞 NSFW', value: 'Activé', inline: true });
                }
                if (channel.rateLimitPerUser > 0) {
                    fields.push({ name: '⏱️ Limite de débit', value: `${channel.rateLimitPerUser}s`, inline: true });
                }
            }

            const embed = new EmbedBuilder()
                .setTitle(`${channelTypeEmoji[channel.type] || '📝'} Canal créé`)
                .setColor(0x00FF00)
                .addFields(fields)
                .setTimestamp()
                .setFooter({ text: `ID: ${channel.id}` });

            await logChannel.send({ embeds: [embed] });

        } catch (error) {
            console.error('Erreur lors du log de création de canal:', error);
        }
    }
};