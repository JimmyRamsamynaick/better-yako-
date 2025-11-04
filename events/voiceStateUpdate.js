const { EmbedBuilder, AuditLogEvent } = require('discord.js');
const Guild = require('../models/Guild');
const LanguageManager = require('../utils/languageManager');

module.exports = {
    name: 'voiceStateUpdate',
    async execute(oldState, newState) {
        try {
            const guildDoc = await Guild.findOne({ guildId: newState.guild.id });
            if (!guildDoc) return;

            const logsEnabled = guildDoc.logs?.enabled;
            const voiceEnabled = guildDoc.logs?.types?.voice;
            if (!logsEnabled || !voiceEnabled) return;

            let logChannel = null;
            if (Array.isArray(guildDoc.logs?.channels) && guildDoc.logs.channels.length > 0) {
                const specific = guildDoc.logs.channels.find(ch => ch?.types?.voice);
                if (specific) logChannel = newState.guild.channels.cache.get(specific.channelId);
            }
            if (!logChannel && guildDoc.logs?.channelId) {
                logChannel = newState.guild.channels.cache.get(guildDoc.logs.channelId);
            }
            if (!logChannel) return;

            const lang = guildDoc.language || 'fr';
            const userMention = newState.member ? newState.member.toString() : `<@${newState.id}>`;
            const oldChannel = oldState.channel;
            const newChannel = newState.channel;

            let serverMute = false;
            let serverDeaf = false;

            // Server mute / unmute
            if (oldState.serverMute !== newState.serverMute) {
                serverMute = true;
                const fetchedLogs = await newState.guild.fetchAuditLogs({
                    limit: 1,
                    type: AuditLogEvent.MemberUpdate,
                });
                const log = fetchedLogs.entries.first();
                let executor = null;
                if (log) {
                    const { executor: logExecutor, target } = log;
                    if (target.id === newState.member.id) {
                        executor = logExecutor;
                    }
                }

                const embed = new EmbedBuilder()
                    .setColor(newState.serverMute ? 0xFF0000 : 0x00FF00)
                    .setTitle(newState.serverMute ? LanguageManager.get(lang, 'events.voice.mute_micro.title_muted') : LanguageManager.get(lang, 'events.voice.mute_micro.title_unmuted'))
                    .addFields(
                        { name: LanguageManager.get(lang, 'events.voice.fields.user'), value: userMention, inline: true },
                        { name: LanguageManager.get(lang, 'events.voice.fields.channel'), value: `${newChannel || oldChannel || '—'}`, inline: true },
                        { name: LanguageManager.get(lang, 'events.voice.fields.state'), value: newState.serverMute ? LanguageManager.get(lang, 'events.voice.self_mute.action_on') : LanguageManager.get(lang, 'events.voice.self_mute.action_off'), inline: true }
                    )
                    .setTimestamp();
                if (executor) {
                    embed.addFields({ name: LanguageManager.get(lang, 'events.voice.fields.moderator'), value: executor.toString(), inline: true });
                }
                await logChannel.send({ embeds: [embed] });
            }

            // Server deaf / undeaf
            if (oldState.serverDeaf !== newState.serverDeaf) {
                serverDeaf = true;
                 const fetchedLogs = await newState.guild.fetchAuditLogs({
                    limit: 1,
                    type: AuditLogEvent.MemberUpdate,
                });
                const log = fetchedLogs.entries.first();
                let executor = null;
                if (log) {
                    const { executor: logExecutor, target } = log;
                    if (target.id === newState.member.id) {
                        executor = logExecutor;
                    }
                }

                const embed = new EmbedBuilder()
                    .setColor(newState.serverDeaf ? 0xFF0000 : 0x00FF00)
                    .setTitle(newState.serverDeaf ? LanguageManager.get(lang, 'events.voice.deaf.title_deafened') : LanguageManager.get(lang, 'events.voice.deaf.title_undeafened'))
                    .addFields(
                        { name: LanguageManager.get(lang, 'events.voice.fields.user'), value: userMention, inline: true },
                        { name: LanguageManager.get(lang, 'events.voice.fields.channel'), value: `${newChannel || oldChannel || '—'}`, inline: true },
                        { name: LanguageManager.get(lang, 'events.voice.fields.state'), value: newState.serverDeaf ? LanguageManager.get(lang, 'events.voice.self_deaf.action_on') : LanguageManager.get(lang, 'events.voice.self_deaf.action_off'), inline: true }
                    )
                    .setTimestamp();
                if (executor) {
                    embed.addFields({ name: LanguageManager.get(lang, 'events.voice.fields.moderator'), value: executor.toString(), inline: true });
                }
                await logChannel.send({ embeds: [embed] });
            }

            // Self mute / unmute
            if (oldState.selfMute !== newState.selfMute && !serverMute) {
                const embed = new EmbedBuilder()
                    .setColor(newState.selfMute ? 0xFFA500 : 0x00FF00)
                    .setTitle(newState.selfMute ? LanguageManager.get(lang, 'events.voice.self_mute.title_on') : LanguageManager.get(lang, 'events.voice.self_mute.title_off'))
                    .addFields(
                        { name: LanguageManager.get(lang, 'events.voice.fields.user'), value: userMention, inline: true },
                        { name: LanguageManager.get(lang, 'events.voice.fields.channel'), value: `${newChannel || oldChannel || '—'}`, inline: true },
                        { name: LanguageManager.get(lang, 'events.voice.fields.action'), value: newState.selfMute ? LanguageManager.get(lang, 'events.voice.self_mute.action_on') : LanguageManager.get(lang, 'events.voice.self_mute.action_off'), inline: true }
                    )
                    .setTimestamp();
                await logChannel.send({ embeds: [embed] });
            }

            // Self deaf / undeaf
            if (oldState.selfDeaf !== newState.selfDeaf && !serverDeaf) {
                const embed = new EmbedBuilder()
                    .setColor(newState.selfDeaf ? 0xFFA500 : 0x00FF00)
                    .setTitle(newState.selfDeaf ? LanguageManager.get(lang, 'events.voice.self_deaf.title_on') : LanguageManager.get(lang, 'events.voice.self_deaf.title_off'))
                    .addFields(
                        { name: LanguageManager.get(lang, 'events.voice.fields.user'), value: userMention, inline: true },
                        { name: LanguageManager.get(lang, 'events.voice.fields.channel'), value: `${newChannel || oldChannel || '—'}`, inline: true },
                        { name: LanguageManager.get(lang, 'events.voice.fields.action'), value: newState.selfDeaf ? LanguageManager.get(lang, 'events.voice.self_deaf.action_on') : LanguageManager.get(lang, 'events.voice.self_deaf.action_off'), inline: true }
                    )
                    .setTimestamp();
                await logChannel.send({ embeds: [embed] });
            }

            // Join / Leave / Switch
            if (!oldChannel && newChannel) {
                const embed = new EmbedBuilder()
                    .setColor(0x00FF00)
                    .setTitle(LanguageManager.get(lang, 'events.voice.join.title'))
                    .addFields(
                        { name: LanguageManager.get(lang, 'events.voice.fields.user'), value: userMention, inline: true },
                        { name: LanguageManager.get(lang, 'events.voice.fields.channel'), value: `${newChannel}`, inline: true }
                    )
                    .setTimestamp();
                await logChannel.send({ embeds: [embed] });
            } else if (oldChannel && !newChannel) {
                const embed = new EmbedBuilder()
                    .setColor(0xFF0000)
                    .setTitle(LanguageManager.get(lang, 'events.voice.leave.title'))
                    .addFields(
                        { name: LanguageManager.get(lang, 'events.voice.fields.user'), value: userMention, inline: true },
                        { name: LanguageManager.get(lang, 'events.voice.fields.channel'), value: `${oldChannel}`, inline: true }
                    )
                    .setTimestamp();
                await logChannel.send({ embeds: [embed] });
            } else if (oldChannel && newChannel && oldChannel.id !== newChannel.id) {
                const embed = new EmbedBuilder()
                    .setColor(0x0000FF)
                    .setTitle(LanguageManager.get(lang, 'events.voice.switch.title'))
                    .addFields(
                        { name: LanguageManager.get(lang, 'events.voice.fields.user'), value: userMention, inline: true },
                        { name: LanguageManager.get(lang, 'events.voice.fields.old_channel'), value: `${oldChannel}`, inline: true },
                        { name: LanguageManager.get(lang, 'events.voice.fields.new_channel'), value: `${newChannel}`, inline: true }
                    )
                    .setTimestamp();
                await logChannel.send({ embeds: [embed] });
            }

        } catch (err) {
            console.error('[VoiceLogs] Error handling voiceStateUpdate:', err);
        }
    }
};