const { EmbedBuilder, ChannelType } = require('discord.js');
const Guild = require('../models/Guild');
const LanguageManager = require('../utils/languageManager');

module.exports = {
    name: 'channelCreate',
    async execute(channel) {
        try {
            const guild = await Guild.findOne({ guildId: channel.guild.id });
            if (!guild) return;

            // Appliquer automatiquement les permissions du rôle Muted sur les nouveaux salons
            if (guild.muteRole) {
                try {
                    const muteRole = channel.guild.roles.cache.get(guild.muteRole);
                    if (muteRole && channel.permissionOverwrites) {
                        if (channel.isTextBased()) {
                            await channel.permissionOverwrites.edit(muteRole, {
                                SendMessages: false,
                                AddReactions: false,
                                CreatePublicThreads: false,
                                CreatePrivateThreads: false,
                                SendMessagesInThreads: false
                            });
                        } else if (channel.isVoiceBased()) {
                            await channel.permissionOverwrites.edit(muteRole, {
                                Speak: false,
                                Stream: false
                            });
                        }
                    }
                } catch (permError) {
                    console.error(`Erreur application permissions Muted sur ${channel.name}:`, permError.message);
                }
            }

            if (!guild.logs.enabled || !guild.logs.types.channels) return;

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
                [ChannelType.GuildText]: LanguageManager.get(lang, 'common.channel_types.text') || 'Textuel',
                [ChannelType.GuildVoice]: LanguageManager.get(lang, 'common.channel_types.voice') || 'Vocal',
                [ChannelType.GuildCategory]: LanguageManager.get(lang, 'common.channel_types.category') || 'Catégorie',
                [ChannelType.GuildNews]: LanguageManager.get(lang, 'common.channel_types.announcements') || 'Annonces',
                [ChannelType.GuildStageVoice]: LanguageManager.get(lang, 'common.channel_types.stage') || 'Scène',
                [ChannelType.GuildForum]: LanguageManager.get(lang, 'common.channel_types.forum') || 'Forum'
            };

            const fields = [
                { name: LanguageManager.get(lang, 'events.channels.created.fields.channel') || '📍 Canal', value: `${channel} (\`${channel.name}\`)`, inline: false },
                { name: LanguageManager.get(lang, 'events.channels.created.fields.type') || '🏷️ Type', value: channelTypeName[channel.type] || (LanguageManager.get(lang, 'common.unknown') || 'Inconnu'), inline: true },
                { name: LanguageManager.get(lang, 'events.channels.created.fields.position') || '📍 Position', value: `${channel.position}`, inline: true }
            ];

            if (channel.parent) {
                fields.push({ name: LanguageManager.get(lang, 'events.channels.created.fields.category') || '📁 Catégorie', value: channel.parent.name, inline: true });
            }

            if (channel.topic) {
                fields.push({ name: LanguageManager.get(lang, 'events.channels.created.fields.topic') || '📋 Sujet', value: channel.topic, inline: false });
            }

            // Informations spécifiques aux canaux vocaux
            if (channel.type === ChannelType.GuildVoice) {
                fields.push({ name: LanguageManager.get(lang, 'events.channels.created.fields.audio_bitrate') || '🎵 Débit audio', value: `${channel.bitrate}kbps`, inline: true });
                if (channel.userLimit > 0) {
                    fields.push({ name: LanguageManager.get(lang, 'events.channels.created.fields.user_limit') || '👥 Limite d\'utilisateurs', value: `${channel.userLimit}`, inline: true });
                }
            }

            // Informations spécifiques aux canaux texte
            if (channel.type === ChannelType.GuildText) {
                if (channel.nsfw) {
                    fields.push({ name: LanguageManager.get(lang, 'events.channels.created.fields.nsfw') || '🔞 NSFW', value: LanguageManager.get(lang, 'common.enabled') || 'Activé', inline: true });
                }
                if (channel.rateLimitPerUser > 0) {
                    fields.push({ name: LanguageManager.get(lang, 'events.channels.created.fields.rate_limit') || '⏱️ Limite de débit', value: `${channel.rateLimitPerUser}s`, inline: true });
                }
            }

            const embed = new EmbedBuilder()
                .setTitle(`${channelTypeEmoji[channel.type] || '📝'} ${LanguageManager.get(lang, 'events.channels.created.title_base') || 'Canal créé'}`)
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