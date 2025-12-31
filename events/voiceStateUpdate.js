const { EmbedBuilder, AuditLogEvent } = require('discord.js');
const Guild = require('../models/Guild');
const LanguageManager = require('../utils/languageManager');

// Map globale pour suivre les sessions vocales en mémoire
// Clé: `${guildId}-${userId}`, Valeur: timestamp de début
if (!global.voiceSessions) {
    global.voiceSessions = new Map();
}

module.exports = {
    name: 'voiceStateUpdate',
    async execute(oldState, newState) {
        const guildId = newState.guild.id;
        const userId = newState.member ? newState.member.id : oldState.member ? oldState.member.id : null;
        
        if (!userId) return;

        // Récupérer les données de la guilde une seule fois
        const guildData = await Guild.findOne({ guildId });
        if (!guildData) return;

        const lang = guildData.language || 'fr';

        // ==========================================
        // 1. LOGIQUE LEVELING / STATS VOCAL
        // ==========================================
        
        // NOTE: La logique de leveling vocal est désormais gérée par l'intervalle dans events/ready.js
        // pour permettre une progression en temps réel et éviter les conflits (double comptage).
        // Le code ci-dessous est conservé uniquement pour la gestion des sessions si besoin futur (logs précis),
        // mais ne crédite plus d'XP ni de temps vocal pour le moment.

        // Ignorer les bots pour le leveling
        if (!newState.member?.user.bot && !oldState.member?.user.bot) {
            const sessionKey = `${guildId}-${userId}`;
            const now = Date.now();

            // CAS 1: L'utilisateur quitte un salon ou change de salon
            if (oldState.channelId && global.voiceSessions.has(sessionKey)) {
                // Nettoyer la session
                global.voiceSessions.delete(sessionKey);
            }

            // CAS 2: L'utilisateur rejoint un salon (ou a changé de salon)
            if (newState.channelId) {
                global.voiceSessions.set(sessionKey, now);
            }
        }

        // ==========================================
        // 2. LOGIQUE DES LOGS
        // ==========================================

        if (!guildData.logs || guildData.logs.enabled === false) return;
        if (!guildData.logs.types || guildData.logs.types.voice === false) return;

        // Sélectionner le canal de logs pour les événements vocaux
        let logChannel = null;
        if (Array.isArray(guildData.logs.channels) && guildData.logs.channels.length > 0) {
            const voiceLogChannel = guildData.logs.channels.find(ch => ch.types && ch.types.voice);
            if (voiceLogChannel) {
                logChannel = newState.guild.channels.cache.get(voiceLogChannel.channelId);
            }
        }
        if (!logChannel && guildData.logs.channelId) {
            logChannel = newState.guild.channels.cache.get(guildData.logs.channelId);
        }
        if (!logChannel) return;

        const userLabel = LanguageManager.get(lang, 'events.voice.fields.user') || '👤 Utilisateur';
        const channelLabel = LanguageManager.get(lang, 'events.voice.fields.channel') || '📍 Canal';
        const oldChannelLabel = LanguageManager.get(lang, 'events.voice.fields.old_channel') || '📍 Ancien canal';
        const newChannelLabel = LanguageManager.get(lang, 'events.voice.fields.new_channel') || '📍 Nouveau canal';
        const stateLabel = LanguageManager.get(lang, 'events.voice.fields.state') || 'État';
        const actionLabel = LanguageManager.get(lang, 'events.voice.fields.action') || 'Action';
        const moderatorLabel = LanguageManager.get(lang, 'common.moderator') || 'Modérateur';

        const member = newState.member || oldState.member;
        const userTag = member ? `${member} (${member.user.username})` : 'Inconnu';

        // Anti-doublons léger
        const DEDUP_WINDOW_MS = 1500;
        const dedupKeyBase = `${guildId}:${newState.id || oldState.id}`;

        const shouldSkip = (eventKey) => {
            const key = `${dedupKeyBase}:${eventKey}`;
            const now = Date.now();
            if (!global.__yakoVoiceDedup) global.__yakoVoiceDedup = new Map();
            const last = global.__yakoVoiceDedup.get(key);
            if (last && now - last < DEDUP_WINDOW_MS) return true;
            global.__yakoVoiceDedup.set(key, now);
            return false;
        };

        const findModerator = async (types) => {
            try {
                const checkTypes = Array.isArray(types) ? types : [types];
                for (const t of checkTypes) {
                    const audit = await newState.guild.fetchAuditLogs({ limit: 6, type: t }).catch(() => null);
                    if (!audit) continue;
                    const entries = audit.entries?.filter?.(() => true) || audit.entries;
                    for (const [, entry] of entries) {
                        if (!entry?.target?.id) continue;
                        if (entry.target.id !== (newState.id || oldState.id)) continue;
                        if (Math.abs(Date.now() - entry.createdTimestamp) <= 7000) {
                            return entry.executor ? `${entry.executor} (${entry.executor.username})` : null;
                        }
                    }
                }
            } catch (_) {}
            return null;
        };

        const sendEmbed = async (title, color, fields, eventKey) => {
            if (eventKey && shouldSkip(eventKey)) return;
            
            const dateStr = new Date().toLocaleString('fr-FR', {
                day: '2-digit', month: '2-digit', year: 'numeric',
                hour: '2-digit', minute: '2-digit'
            });

            const embed = new EmbedBuilder()
                .setAuthor({ name: title, iconURL: 'https://cdn-icons-png.flaticon.com/512/59/59284.png' })
                .setThumbnail(member?.user?.displayAvatarURL({ dynamic: true }) || null)
                .addFields(fields)
                .setFooter({ text: `ID: ${member?.id} • ${dateStr}` })
                .setColor(color);

            try {
                await logChannel.send({ embeds: [embed] });
            } catch (_) {}
        };

        const oldChannel = oldState.channel;
        const newChannel = newState.channel;

        // 1) Join
        if (!oldChannel && newChannel) {
            const title = LanguageManager.get(lang, 'events.voice.join.title') || 'Utilisateur rejoint un canal vocal';
            await sendEmbed(title, 0x2ecc71, [
                { name: userLabel, value: userTag, inline: true },
                { name: channelLabel, value: `🔊 ${newChannel.name}`, inline: true }
            ], 'join');
        }

        // 2) Leave
        if (oldChannel && !newChannel) {
            const title = LanguageManager.get(lang, 'events.voice.leave.title') || 'Utilisateur quitte un canal vocal';
            const moderator = await findModerator([AuditLogEvent.MemberDisconnect, AuditLogEvent.MemberUpdate]);
            const fields = [
                { name: userLabel, value: userTag, inline: true },
                { name: channelLabel, value: `🔊 ${oldChannel.name}`, inline: true }
            ];
            if (moderator) fields.push({ name: moderatorLabel, value: moderator, inline: true });
            await sendEmbed(title, 0xe74c3c, fields, 'leave');
        }

        // 3) Switch channel
        if (oldChannel && newChannel && oldChannel.id !== newChannel.id) {
            const title = LanguageManager.get(lang, 'events.voice.switch.title') || 'Utilisateur change de canal vocal';
            const moderator = await findModerator([AuditLogEvent.MemberMove, AuditLogEvent.MemberUpdate]);
            const fields = [
                { name: userLabel, value: userTag, inline: true },
                { name: oldChannelLabel, value: `🔊 ${oldChannel.name}`, inline: true },
                { name: newChannelLabel, value: `🔊 ${newChannel.name}`, inline: true }
            ];
            if (moderator) fields.push({ name: moderatorLabel, value: moderator, inline: true });
            await sendEmbed(title, 0x3498db, fields, 'switch');
        }

        // 4) Server mute toggles
        if (oldState.serverMute !== newState.serverMute && oldState.serverDeaf === newState.serverDeaf) {
            const title = newState.serverMute
                ? (LanguageManager.get(lang, 'events.voice.mute_micro.title_muted') || 'Utilisateur mis en sourdine (micro)')
                : (LanguageManager.get(lang, 'events.voice.mute_micro.title_unmuted') || 'Utilisateur retiré de sourdine (micro)');
            const stateText = newState.serverMute
                ? (LanguageManager.get(lang, 'common.muted') || 'Muted')
                : (LanguageManager.get(lang, 'common.unmuted') || 'Unmuted');
            const moderator = await findModerator(AuditLogEvent.MemberUpdate);
            const fields = [
                { name: userLabel, value: userTag, inline: true },
                { name: channelLabel, value: `🔊 ${newChannel?.name || oldChannel?.name || '—'}`, inline: true },
                { name: stateLabel, value: stateText, inline: true }
            ];
            if (moderator) fields.push({ name: moderatorLabel, value: moderator, inline: true });
            await sendEmbed(title, 0xe67e22, fields, newState.serverMute ? 'serverMuteOn' : 'serverMuteOff');
        }

        // 5) Server deaf toggles
        if (oldState.serverDeaf !== newState.serverDeaf) {
            const title = newState.serverDeaf
                ? (LanguageManager.get(lang, 'events.voice.deaf.title_deafened') || 'Utilisateur assourdi (casque)')
                : (LanguageManager.get(lang, 'events.voice.deaf.title_undeafened') || 'Utilisateur non assourdi (casque)');
            const stateText = newState.serverDeaf
                ? (LanguageManager.get(lang, 'common.deafened') || 'Deafened')
                : (LanguageManager.get(lang, 'common.undeafened') || 'Undeafened');
            const moderator = await findModerator(AuditLogEvent.MemberUpdate);
            const fields = [
                { name: userLabel, value: userTag, inline: true },
                { name: channelLabel, value: `🔊 ${newChannel?.name || oldChannel?.name || '—'}`, inline: true },
                { name: stateLabel, value: stateText, inline: true }
            ];
            if (moderator) fields.push({ name: moderatorLabel, value: moderator, inline: true });
            await sendEmbed(title, 0xe67e22, fields, newState.serverDeaf ? 'serverDeafOn' : 'serverDeafOff');
        }

        // 6) Self mute toggles
        if (oldState.selfMute !== newState.selfMute && oldState.selfDeaf === newState.selfDeaf) {
            const title = newState.selfMute
                ? (LanguageManager.get(lang, 'events.voice.self_mute.title_on') || "Utilisateur s'est mis en sourdine")
                : (LanguageManager.get(lang, 'events.voice.self_mute.title_off') || "Utilisateur s'est retiré de sourdine");
            const action = newState.selfMute
                ? (LanguageManager.get(lang, 'events.voice.self_mute.action_on') || 'Sourdine activée')
                : (LanguageManager.get(lang, 'events.voice.self_mute.action_off') || 'Sourdine désactivée');
            await sendEmbed(title, 0x95a5a6, [
                { name: userLabel, value: userTag, inline: true },
                { name: channelLabel, value: `🔊 ${newChannel?.name || oldChannel?.name || '—'}`, inline: true },
                { name: actionLabel, value: action, inline: true }
            ], newState.selfMute ? 'selfMuteOn' : 'selfMuteOff');
        }

        // 7) Self deaf toggles
        if (oldState.selfDeaf !== newState.selfDeaf) {
            const title = newState.selfDeaf
                ? (LanguageManager.get(lang, 'events.voice.self_deaf.title_on') || "Utilisateur s'est assourdi")
                : (LanguageManager.get(lang, 'events.voice.self_deaf.title_off') || "Utilisateur n'est plus assourdi");
            const action = newState.selfDeaf
                ? (LanguageManager.get(lang, 'events.voice.self_deaf.action_on') || 'Assourdi')
                : (LanguageManager.get(lang, 'events.voice.self_deaf.action_off') || 'Non assourdi');
            await sendEmbed(title, 0x95a5a6, [
                { name: userLabel, value: userTag, inline: true },
                { name: channelLabel, value: `🔊 ${newChannel?.name || oldChannel?.name || '—'}`, inline: true },
                { name: actionLabel, value: action, inline: true }
            ], newState.selfDeaf ? 'selfDeafOn' : 'selfDeafOff');
        }
    }
};
