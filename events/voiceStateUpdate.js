const { EmbedBuilder } = require('discord.js');
const Guild = require('../models/Guild');
const LanguageManager = require('../utils/languageManager');

module.exports = {
    name: 'voiceStateUpdate',
    async execute(oldState, newState) {
        try {
            const guild = await Guild.findOne({ guildId: newState.guild.id });
            if (!guild || !guild.logs.enabled || !guild.logs.types.voice) return;

            // Vérifier s'il y a un canal configuré pour les logs vocaux
            let logChannel = null;
            if (guild.logs.channels && guild.logs.channels.length > 0) {
                const voiceLogChannel = guild.logs.channels.find(ch => ch.types.voice);
                if (voiceLogChannel) {
                    logChannel = newState.guild.channels.cache.get(voiceLogChannel.channelId);
                }
            } else if (guild.logs.channelId) {
                logChannel = newState.guild.channels.cache.get(guild.logs.channelId);
            }

            if (!logChannel) return;

            const lang = guild.language || 'fr';

            const member = newState.member || oldState.member;
            if (!member) return;

            // Rejoindre un canal vocal
            if (!oldState.channel && newState.channel) {
                const embed = new EmbedBuilder()
                    .setTitle(LanguageManager.get(lang, 'events.voice.join.title') || '🔊 Utilisateur rejoint un canal vocal')
                    .setColor(0x00FF00)
                    .addFields(
                        { name: LanguageManager.get(lang, 'events.voice.fields.user') || '👤 Utilisateur', value: `${member.user} (${member.user.tag})`, inline: true },
                        { name: LanguageManager.get(lang, 'events.voice.fields.channel') || '📍 Canal', value: `${newState.channel}`, inline: true }
                    )
                    .setTimestamp()
                    .setFooter({ text: `ID: ${member.user.id}` });

                if (member.user.displayAvatarURL()) {
                    embed.setThumbnail(member.user.displayAvatarURL());
                }

                await logChannel.send({ embeds: [embed] });
            }

            // Quitter un canal vocal
            if (oldState.channel && !newState.channel) {
                const embed = new EmbedBuilder()
                    .setTitle(LanguageManager.get(lang, 'events.voice.leave.title') || '🔇 Utilisateur quitte un canal vocal')
                    .setColor(0xFF0000)
                    .addFields(
                        { name: LanguageManager.get(lang, 'events.voice.fields.user') || '👤 Utilisateur', value: `${member.user} (${member.user.tag})`, inline: true },
                        { name: LanguageManager.get(lang, 'events.voice.fields.channel') || '📍 Canal', value: `${oldState.channel}`, inline: true }
                    )
                    .setTimestamp()
                    .setFooter({ text: `ID: ${member.user.id}` });

                if (member.user.displayAvatarURL()) {
                    embed.setThumbnail(member.user.displayAvatarURL());
                }

                await logChannel.send({ embeds: [embed] });
            }

            // Changer de canal vocal
            if (oldState.channel && newState.channel && oldState.channel.id !== newState.channel.id) {
                const embed = new EmbedBuilder()
                    .setTitle(LanguageManager.get(lang, 'events.voice.switch.title') || '🔄 Utilisateur change de canal vocal')
                    .setColor(0xFFA500)
                    .addFields(
                        { name: LanguageManager.get(lang, 'events.voice.fields.user') || '👤 Utilisateur', value: `${member.user} (${member.user.tag})`, inline: true },
                        { name: LanguageManager.get(lang, 'events.voice.fields.old_channel') || '📍 Ancien canal', value: `${oldState.channel}`, inline: true },
                        { name: LanguageManager.get(lang, 'events.voice.fields.new_channel') || '📍 Nouveau canal', value: `${newState.channel}`, inline: true }
                    )
                    .setTimestamp()
                    .setFooter({ text: `ID: ${member.user.id}` });

                if (member.user.displayAvatarURL()) {
                    embed.setThumbnail(member.user.displayAvatarURL());
                }

                await logChannel.send({ embeds: [embed] });
            }

            // Mute/Demute micro
            if (oldState.mute !== newState.mute) {
                const embed = new EmbedBuilder()
                    .setTitle(newState.mute ? (LanguageManager.get(lang, 'events.voice.mute_micro.title_muted') || '🎤 Utilisateur muté (micro)') : (LanguageManager.get(lang, 'events.voice.mute_micro.title_unmuted') || '🎤 Utilisateur démuté (micro)'))
                    .setColor(newState.mute ? 0xFF0000 : 0x00FF00)
                    .addFields(
                        { name: LanguageManager.get(lang, 'events.voice.fields.user') || '👤 Utilisateur', value: `${member.user} (${member.user.tag})`, inline: true },
                        { name: LanguageManager.get(lang, 'events.voice.fields.channel') || '📍 Canal', value: `${newState.channel || oldState.channel}`, inline: true },
                        { name: LanguageManager.get(lang, 'events.voice.fields.state') || '🎤 État', value: newState.mute ? (LanguageManager.get(lang, 'common.muted') || 'Muté') : (LanguageManager.get(lang, 'common.unmuted') || 'Démuté'), inline: true }
                    )
                    .setTimestamp()
                    .setFooter({ text: `ID: ${member.user.id}` });

                if (member.user.displayAvatarURL()) {
                    embed.setThumbnail(member.user.displayAvatarURL());
                }

                await logChannel.send({ embeds: [embed] });
            }

            // Mute/Demute casque
            if (oldState.deaf !== newState.deaf) {
                const embed = new EmbedBuilder()
                    .setTitle(newState.deaf ? (LanguageManager.get(lang, 'events.voice.deaf.title_deafened') || '🎧 Utilisateur sourdé (casque)') : (LanguageManager.get(lang, 'events.voice.deaf.title_undeafened') || '🎧 Utilisateur désourdé (casque)'))
                    .setColor(newState.deaf ? 0xFF0000 : 0x00FF00)
                    .addFields(
                        { name: LanguageManager.get(lang, 'events.voice.fields.user') || '👤 Utilisateur', value: `${member.user} (${member.user.tag})`, inline: true },
                        { name: LanguageManager.get(lang, 'events.voice.fields.channel') || '📍 Canal', value: `${newState.channel || oldState.channel}`, inline: true },
                        { name: LanguageManager.get(lang, 'events.voice.fields.state') || '🎧 État', value: newState.deaf ? (LanguageManager.get(lang, 'common.deafened') || 'Sourdé') : (LanguageManager.get(lang, 'common.undeafened') || 'Désourdé'), inline: true }
                    )
                    .setTimestamp()
                    .setFooter({ text: `ID: ${member.user.id}` });

                if (member.user.displayAvatarURL()) {
                    embed.setThumbnail(member.user.displayAvatarURL());
                }

                await logChannel.send({ embeds: [embed] });
            }

            // Self mute/demute
            if (oldState.selfMute !== newState.selfMute) {
                const embed = new EmbedBuilder()
                    .setTitle(newState.selfMute ? (LanguageManager.get(lang, 'events.voice.self_mute.title_on') || '🎤 Utilisateur s\'est muté') : (LanguageManager.get(lang, 'events.voice.self_mute.title_off') || '🎤 Utilisateur s\'est démuté'))
                    .setColor(newState.selfMute ? 0xFF0000 : 0x00FF00)
                    .addFields(
                        { name: LanguageManager.get(lang, 'events.voice.fields.user') || '👤 Utilisateur', value: `${member.user} (${member.user.tag})`, inline: true },
                        { name: LanguageManager.get(lang, 'events.voice.fields.channel') || '📍 Canal', value: `${newState.channel || oldState.channel}`, inline: true },
                        { name: LanguageManager.get(lang, 'events.voice.fields.action') || '🎤 Action', value: newState.selfMute ? (LanguageManager.get(lang, 'events.voice.self_mute.action_on') || 'S\'est muté') : (LanguageManager.get(lang, 'events.voice.self_mute.action_off') || 'S\'est démuté'), inline: true }
                    )
                    .setTimestamp()
                    .setFooter({ text: `ID: ${member.user.id}` });

                if (member.user.displayAvatarURL()) {
                    embed.setThumbnail(member.user.displayAvatarURL());
                }

                await logChannel.send({ embeds: [embed] });
            }

            // Self deaf/undeaf
            if (oldState.selfDeaf !== newState.selfDeaf) {
                const embed = new EmbedBuilder()
                    .setTitle(newState.selfDeaf ? (LanguageManager.get(lang, 'events.voice.self_deaf.title_on') || '🎧 Utilisateur s\'est sourdé') : (LanguageManager.get(lang, 'events.voice.self_deaf.title_off') || '🎧 Utilisateur s\'est désourdé'))
                    .setColor(newState.selfDeaf ? 0xFF0000 : 0x00FF00)
                    .addFields(
                        { name: LanguageManager.get(lang, 'events.voice.fields.user') || '👤 Utilisateur', value: `${member.user} (${member.user.tag})`, inline: true },
                        { name: LanguageManager.get(lang, 'events.voice.fields.channel') || '📍 Canal', value: `${newState.channel || oldState.channel}`, inline: true },
                        { name: LanguageManager.get(lang, 'events.voice.fields.action') || '🎧 Action', value: newState.selfDeaf ? (LanguageManager.get(lang, 'events.voice.self_deaf.action_on') || 'S\'est sourdé') : (LanguageManager.get(lang, 'events.voice.self_deaf.action_off') || 'S\'est désourdé'), inline: true }
                    )
                    .setTimestamp()
                    .setFooter({ text: `ID: ${member.user.id}` });

                if (member.user.displayAvatarURL()) {
                    embed.setThumbnail(member.user.displayAvatarURL());
                }

                await logChannel.send({ embeds: [embed] });
            }

        } catch (error) {
            console.error('Erreur lors du log d\'état vocal:', error);
        }
    }
};