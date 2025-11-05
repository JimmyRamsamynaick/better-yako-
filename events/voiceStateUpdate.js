const { EmbedBuilder, AuditLogEvent } = require('discord.js');
const Guild = require('../models/Guild');
const LanguageManager = require('../utils/languageManager');

module.exports = {
  name: 'voiceStateUpdate',
  async execute(oldState, newState) {
    try {
      const guildId = newState.guild.id;
      const guildData = await Guild.findOne({ guildId });
      if (!guildData || !guildData.logs || guildData.logs.enabled === false) return;
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

      const lang = guildData.language || 'fr';
      const userLabel = LanguageManager.get(lang, 'events.voice.fields.user') || '👤 Utilisateur';
      const channelLabel = LanguageManager.get(lang, 'events.voice.fields.channel') || '📍 Canal';
      const oldChannelLabel = LanguageManager.get(lang, 'events.voice.fields.old_channel') || '📍 Ancien canal';
      const newChannelLabel = LanguageManager.get(lang, 'events.voice.fields.new_channel') || '📍 Nouveau canal';
      const stateLabel = LanguageManager.get(lang, 'events.voice.fields.state') || 'État';
      const actionLabel = LanguageManager.get(lang, 'events.voice.fields.action') || 'Action';
      const moderatorLabel = LanguageManager.get(lang, 'common.moderator') || 'Modérateur';

      const userTag = `${newState.member?.user ?? oldState.member?.user}`;

      // Anti-doublons léger (certaines transitions déclenchent des mises à jour multiples)
      const DEDUP_WINDOW_MS = 1500;
      const dedupKeyBase = `${guildId}:${newState.id || oldState.id}`;
      if (!global.__yakoVoiceDedup) global.__yakoVoiceDedup = new Map();

      const shouldSkip = (eventKey) => {
        const key = `${dedupKeyBase}:${eventKey}`;
        const now = Date.now();
        const last = global.__yakoVoiceDedup.get(key);
        if (last && now - last < DEDUP_WINDOW_MS) return true;
        global.__yakoVoiceDedup.set(key, now);
        return false;
      };

      // Essaie d'attribuer l'action à un mod via les logs d'audit
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
              // fenêtre courte pour éviter mauvaises attributions
              if (Math.abs(Date.now() - entry.createdTimestamp) <= 7000) {
                return entry.executor ? `<@${entry.executor.id}>` : null;
              }
            }
          }
        } catch (_) {}
        return null;
      };

      // Helper pour envoyer un embed au canal de logs
      const sendEmbed = async (title, fields, eventKey) => {
        if (eventKey && shouldSkip(eventKey)) return; // évite les doublons proches
        const embed = new EmbedBuilder()
          .setTitle(title)
          .setColor(0x5865F2)
          .addFields(fields)
          .setTimestamp();
        try {
          await logChannel.send({ embeds: [embed] });
        } catch (_) {}
      };

      const oldChannel = oldState.channel;
      const newChannel = newState.channel;

      // 1) Join
      if (!oldChannel && newChannel) {
        const title = LanguageManager.get(lang, 'events.voice.join.title') || '🔊 Utilisateur a rejoint un salon vocal';
        await sendEmbed(title, [
          { name: userLabel, value: `${userTag}`, inline: true },
          { name: channelLabel, value: `${newChannel}`, inline: true }
        ], 'join');
      }

      // 2) Leave
      if (oldChannel && !newChannel) {
        const title = LanguageManager.get(lang, 'events.voice.leave.title') || '🔇 Utilisateur a quitté un salon vocal';
        const moderator = await findModerator([AuditLogEvent.MemberDisconnect, AuditLogEvent.MemberUpdate]);
        const fields = [
          { name: userLabel, value: `${userTag}`, inline: true },
          { name: channelLabel, value: `${oldChannel}`, inline: true }
        ];
        if (moderator) fields.push({ name: moderatorLabel, value: moderator, inline: true });
        await sendEmbed(title, fields, 'leave');
      }

      // 3) Switch channel
      if (oldChannel && newChannel && oldChannel.id !== newChannel.id) {
        const title = LanguageManager.get(lang, 'events.voice.switch.title') || '🔄 Utilisateur a changé de salon vocal';
        const moderator = await findModerator([AuditLogEvent.MemberMove, AuditLogEvent.MemberUpdate]);
        const fields = [
          { name: userLabel, value: `${userTag}`, inline: true },
          { name: oldChannelLabel, value: `${oldChannel}`, inline: true },
          { name: newChannelLabel, value: `${newChannel}`, inline: true }
        ];
        if (moderator) fields.push({ name: moderatorLabel, value: moderator, inline: true });
        await sendEmbed(title, fields, 'switch');
      }

      // 4) Server mute toggles
      if (oldState.serverMute !== newState.serverMute) {
        const title = newState.serverMute
          ? (LanguageManager.get(lang, 'events.voice.mute_micro.title_muted') || '🎤 Utilisateur mis en sourdine (micro)')
          : (LanguageManager.get(lang, 'events.voice.mute_micro.title_unmuted') || '🎤 Utilisateur retiré de sourdine (micro)');
        const stateText = newState.serverMute
          ? (LanguageManager.get(lang, 'common.muted') || 'Muted')
          : (LanguageManager.get(lang, 'common.unmuted') || 'Unmuted');
        const moderator = await findModerator(AuditLogEvent.MemberUpdate);
        const fields = [
          { name: userLabel, value: `${userTag}`, inline: true },
          { name: channelLabel, value: `${newChannel || oldChannel || '—'}`, inline: true },
          { name: stateLabel, value: stateText, inline: true }
        ];
        if (moderator) fields.push({ name: moderatorLabel, value: moderator, inline: true });
        await sendEmbed(title, fields, newState.serverMute ? 'serverMuteOn' : 'serverMuteOff');
      }

      // 5) Server deaf toggles
      if (oldState.serverDeaf !== newState.serverDeaf) {
        const title = newState.serverDeaf
          ? (LanguageManager.get(lang, 'events.voice.deaf.title_deafened') || '🎧 Utilisateur assourdi (casque)')
          : (LanguageManager.get(lang, 'events.voice.deaf.title_undeafened') || '🎧 Utilisateur non assourdi (casque)');
        const stateText = newState.serverDeaf
          ? (LanguageManager.get(lang, 'common.deafened') || 'Deafened')
          : (LanguageManager.get(lang, 'common.undeafened') || 'Undeafened');
        const moderator = await findModerator(AuditLogEvent.MemberUpdate);
        const fields = [
          { name: userLabel, value: `${userTag}`, inline: true },
          { name: channelLabel, value: `${newChannel || oldChannel || '—'}`, inline: true },
          { name: stateLabel, value: stateText, inline: true }
        ];
        if (moderator) fields.push({ name: moderatorLabel, value: moderator, inline: true });
        await sendEmbed(title, fields, newState.serverDeaf ? 'serverDeafOn' : 'serverDeafOff');
      }

      // 6) Self mute toggles
      if (oldState.selfMute !== newState.selfMute) {
        const title = newState.selfMute
          ? (LanguageManager.get(lang, 'events.voice.self_mute.title_on') || "🎤 Utilisateur s'est mis en sourdine")
          : (LanguageManager.get(lang, 'events.voice.self_mute.title_off') || "🎤 Utilisateur s'est retiré de sourdine");
        const action = newState.selfMute
          ? (LanguageManager.get(lang, 'events.voice.self_mute.action_on') || 'Sourdine activée')
          : (LanguageManager.get(lang, 'events.voice.self_mute.action_off') || 'Sourdine désactivée');
        await sendEmbed(title, [
          { name: userLabel, value: `${userTag}`, inline: true },
          { name: channelLabel, value: `${newChannel || oldChannel || '—'}`, inline: true },
          { name: actionLabel, value: action, inline: true }
        ], newState.selfMute ? 'selfMuteOn' : 'selfMuteOff');
      }

      // 7) Self deaf toggles
      if (oldState.selfDeaf !== newState.selfDeaf) {
        const title = newState.selfDeaf
          ? (LanguageManager.get(lang, 'events.voice.self_deaf.title_on') || "🎧 Utilisateur s'est assourdi")
          : (LanguageManager.get(lang, 'events.voice.self_deaf.title_off') || "🎧 Utilisateur n'est plus assourdi");
        const action = newState.selfDeaf
          ? (LanguageManager.get(lang, 'events.voice.self_deaf.action_on') || 'Assourdi')
          : (LanguageManager.get(lang, 'events.voice.self_deaf.action_off') || 'Non assourdi');
        await sendEmbed(title, [
          { name: userLabel, value: `${userTag}`, inline: true },
          { name: channelLabel, value: `${newChannel || oldChannel || '—'}`, inline: true },
          { name: actionLabel, value: action, inline: true }
        ], newState.selfDeaf ? 'selfDeafOn' : 'selfDeafOff');
      }
    } catch (error) {
      console.error('Erreur dans voiceStateUpdate:', error);
    }
  }
};