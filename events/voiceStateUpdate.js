const { EmbedBuilder, ChannelType, AuditLogEvent } = require('discord.js');
const Guild = require('../models/Guild');
const LanguageManager = require('../utils/languageManager');

module.exports = {
    name: 'voiceStateUpdate',
    async execute(oldState, newState) {
        try {
            const guildObj = await Guild.findOne({ guildId: newState.guild.id });
            if (!guildObj || !guildObj.logs || !guildObj.logs.enabled) return;

            // Vérifier que les logs vocaux sont activés globalement
            if (!guildObj.logs.types || !guildObj.logs.types.voice) {
                // Même si global désactivé, vérifier si un canal spécifique Voice est configuré
                const hasSpecificVoice = Array.isArray(guildObj.logs.channels)
                    && guildObj.logs.channels.some(ch => ch.types && ch.types.voice);
                if (!hasSpecificVoice) return;
            }

            // Trouver le canal de logs pour Voice
            let logChannel = null;
            if (Array.isArray(guildObj.logs.channels) && guildObj.logs.channels.length > 0) {
                const channelEntry = guildObj.logs.channels.find(ch => ch.types && ch.types.voice);
                if (channelEntry) {
                    logChannel = newState.guild.channels.cache.get(channelEntry.channelId);
                }
            }
            if (!logChannel && guildObj.logs.channelId) {
                logChannel = newState.guild.channels.cache.get(guildObj.logs.channelId);
            }
            if (!logChannel) return;

            const lang = guildObj.language || 'fr';
            const userMention = newState.member ? newState.member.toString() : `<@${newState.id}>`;
            const oldChannel = oldState.channel;
            const newChannel = newState.channel;

            // Déterminer le type d'événement: join / leave / switch
            let embed = null;
            if (!oldChannel && newChannel) {
                // JOIN
                embed = new EmbedBuilder()
                    .setTitle(LanguageManager.get(lang, 'events.voice.join.title') || '🔊 Entrée en vocal')
                    .setColor(0x00FF00)
                    .addFields(
                        { name: LanguageManager.get(lang, 'events.voice.fields.user') || '👤 Utilisateur', value: `${userMention}`, inline: true },
                        { name: LanguageManager.get(lang, 'events.voice.fields.channel') || '📍 Canal', value: `${newChannel} (\`${newChannel.name}\`)`, inline: true }
                    )
                    .setTimestamp()
                    .setFooter({ text: `UserID: ${newState.id}` });
            } else if (oldChannel && !newChannel) {
                // LEAVE
                embed = new EmbedBuilder()
                    .setTitle(LanguageManager.get(lang, 'events.voice.leave.title') || '🔇 Sortie du vocal')
                    .setColor(0xFF0000)
                    .addFields(
                        { name: LanguageManager.get(lang, 'events.voice.fields.user') || '👤 Utilisateur', value: `${userMention}`, inline: true },
                        { name: LanguageManager.get(lang, 'events.voice.fields.channel') || '📍 Canal', value: `${oldChannel} (\`${oldChannel.name}\`)`, inline: true }
                    )
                    .setTimestamp()
                    .setFooter({ text: `UserID: ${newState.id}` });
            } else if (oldChannel && newChannel && oldChannel.id !== newChannel.id) {
                // SWITCH (changement de canal)
                embed = new EmbedBuilder()
                    .setTitle(LanguageManager.get(lang, 'events.voice.switch.title') || '🔄 Changement de vocal')
                    .setColor(0x5865F2)
                    .addFields(
                        { name: LanguageManager.get(lang, 'events.voice.fields.user') || '👤 Utilisateur', value: `${userMention}`, inline: true },
                        { name: LanguageManager.get(lang, 'events.voice.fields.old_channel') || '📍 Ancien canal', value: `${oldChannel} (\`${oldChannel.name}\`)`, inline: true },
                        { name: LanguageManager.get(lang, 'events.voice.fields.new_channel') || '📍 Nouveau canal', value: `${newChannel} (\`${newChannel.name}\`)`, inline: true }
                    )
                    .setTimestamp()
                    .setFooter({ text: `UserID: ${newState.id}` });
            }

            if (embed) {
                await logChannel.send({ embeds: [embed] });
            }

            // Événements: self-mute / self-unmute
            if (oldState.selfMute !== newState.selfMute) {
                const titleKey = newState.selfMute ? 'events.voice.self_mute.title_on' : 'events.voice.self_mute.title_off';
                const actionKey = newState.selfMute ? 'events.voice.self_mute.action_on' : 'events.voice.self_mute.action_off';
                const ch = newChannel || oldChannel;
                const e = new EmbedBuilder()
                    .setTitle(LanguageManager.get(lang, titleKey) || (newState.selfMute ? '🎤 Auto-mute activé' : '🎤 Auto-mute désactivé'))
                    .setColor(newState.selfMute ? 0xFFA500 : 0x00B2FF)
                    .addFields(
                        { name: LanguageManager.get(lang, 'events.voice.fields.user') || '👤 Utilisateur', value: `${userMention}`, inline: true },
                        ...(ch ? [{ name: LanguageManager.get(lang, 'events.voice.fields.channel') || '📍 Canal', value: `${ch} (\`${ch.name}\`)`, inline: true }] : []),
                        { name: LanguageManager.get(lang, 'events.voice.fields.action') || 'Action', value: LanguageManager.get(lang, actionKey) || (newState.selfMute ? 'Self-muted' : 'Self-unmuted'), inline: true }
                    )
                    .setTimestamp()
                    .setFooter({ text: `UserID: ${newState.id}` });
                await logChannel.send({ embeds: [e] });
            }

            // Événements: self-deaf / self-undeaf
            if (oldState.selfDeaf !== newState.selfDeaf) {
                const titleKey = newState.selfDeaf ? 'events.voice.self_deaf.title_on' : 'events.voice.self_deaf.title_off';
                const actionKey = newState.selfDeaf ? 'events.voice.self_deaf.action_on' : 'events.voice.self_deaf.action_off';
                const ch = newChannel || oldChannel;
                const e = new EmbedBuilder()
                    .setTitle(LanguageManager.get(lang, titleKey) || (newState.selfDeaf ? '🎧 Auto-deaf activé' : '🎧 Auto-deaf désactivé'))
                    .setColor(newState.selfDeaf ? 0x8B00FF : 0x00B2FF)
                    .addFields(
                        { name: LanguageManager.get(lang, 'events.voice.fields.user') || '👤 Utilisateur', value: `${userMention}`, inline: true },
                        ...(ch ? [{ name: LanguageManager.get(lang, 'events.voice.fields.channel') || '📍 Canal', value: `${ch} (\`${ch.name}\`)`, inline: true }] : []),
                        { name: LanguageManager.get(lang, 'events.voice.fields.action') || 'Action', value: LanguageManager.get(lang, actionKey) || (newState.selfDeaf ? 'Self-deafened' : 'Self-undeafened'), inline: true }
                    )
                    .setTimestamp()
                    .setFooter({ text: `UserID: ${newState.id}` });
                await logChannel.send({ embeds: [e] });
            }

            // Déterminer précisément les changements côté serveur
            const serverMuteChanged = (typeof oldState.serverMute === 'boolean' && typeof newState.serverMute === 'boolean')
                ? oldState.serverMute !== newState.serverMute
                : (oldState.mute !== newState.mute && oldState.selfMute === newState.selfMute);
            const serverDeafChanged = (typeof oldState.serverDeaf === 'boolean' && typeof newState.serverDeaf === 'boolean')
                ? oldState.serverDeaf !== newState.serverDeaf
                : (oldState.deaf !== newState.deaf && oldState.selfDeaf === newState.selfDeaf);

            // Événements: mute/unmute par staff (server mute)
            if (serverMuteChanged) {
                const titleKey = newState.mute ? 'events.voice.mute_micro.title_muted' : 'events.voice.mute_micro.title_unmuted';
                const ch = newChannel || oldChannel;
                const e = new EmbedBuilder()
                    .setTitle(LanguageManager.get(lang, titleKey) || (newState.mute ? '🎤 Muet (serveur)' : '🎤 Démuet (serveur)'))
                    .setColor(newState.mute ? 0xDC143C : 0x2ECC71)
                    .addFields(
                        { name: LanguageManager.get(lang, 'events.voice.fields.user') || '👤 Utilisateur', value: `${userMention}`, inline: true },
                        ...(ch ? [{ name: LanguageManager.get(lang, 'events.voice.fields.channel') || '📍 Canal', value: `${ch} (\`${ch.name}\`)`, inline: true }] : [])
                    )
                    .setTimestamp()
                    .setFooter({ text: `UserID: ${newState.id}` });

                // Tenter de récupérer le modérateur via les audits
                try {
                    if (newState.guild.members.me.permissions.has('ViewAuditLog')) {
                        const audits = await newState.guild.fetchAuditLogs({ type: AuditLogEvent.MemberUpdate, limit: 6 });
                        const entry = audits.entries.find(a => a.target?.id === newState.id);
                        if (entry && entry.executor) {
                            e.addFields({ name: LanguageManager.get(lang, 'common.moderator') || 'Modérateur', value: `${entry.executor}`, inline: true });
                        }
                    }
                } catch (_) {}

                await logChannel.send({ embeds: [e] });
            }

            // Événements: deaf/undeaf par staff (server deaf)
            if (serverDeafChanged) {
                const titleKey = newState.deaf ? 'events.voice.deaf.title_deafened' : 'events.voice.deaf.title_undeafened';
                const ch = newChannel || oldChannel;
                const e = new EmbedBuilder()
                    .setTitle(LanguageManager.get(lang, titleKey) || (newState.deaf ? '🎧 Sourd (serveur)' : '🎧 Non-sourd (serveur)'))
                    .setColor(newState.deaf ? 0x8B0000 : 0x2ECC71)
                    .addFields(
                        { name: LanguageManager.get(lang, 'events.voice.fields.user') || '👤 Utilisateur', value: `${userMention}`, inline: true },
                        ...(ch ? [{ name: LanguageManager.get(lang, 'events.voice.fields.channel') || '📍 Canal', value: `${ch} (\`${ch.name}\`)`, inline: true }] : [])
                    )
                    .setTimestamp()
                    .setFooter({ text: `UserID: ${newState.id}` });

                // Tenter de récupérer le modérateur via les audits
                try {
                    if (newState.guild.members.me.permissions.has('ViewAuditLog')) {
                        const audits = await newState.guild.fetchAuditLogs({ type: AuditLogEvent.MemberUpdate, limit: 6 });
                        const entry = audits.entries.find(a => a.target?.id === newState.id);
                        if (entry && entry.executor) {
                            e.addFields({ name: LanguageManager.get(lang, 'common.moderator') || 'Modérateur', value: `${entry.executor}`, inline: true });
                        }
                    }
                } catch (_) {}

                await logChannel.send({ embeds: [e] });
            }
        } catch (error) {
            console.error('Erreur lors du log vocal (voiceStateUpdate):', error);
        }
    }
};