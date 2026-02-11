const { EmbedBuilder, AuditLogEvent } = require('discord.js');
const Guild = require('../models/Guild');
const LanguageManager = require('../utils/languageManager');

module.exports = {
    name: 'guildMemberRemove',
    async execute(member) {
        try {
            const ServerStats = require('../utils/serverStats');
            const guild = await Guild.findOne({ guildId: member.guild.id });
            if (!guild || !guild.logs.enabled || !guild.logs.types.server) return;

            const lang = guild.language || 'fr';

            // Vérifier s'il y a un canal configuré pour les logs de serveur
            let logChannel = null;
            if (guild.logs.channels && guild.logs.channels.length > 0) {
                const serverLogChannel = guild.logs.channels.find(ch => ch.types.server);
                if (serverLogChannel) {
                    logChannel = member.guild.channels.cache.get(serverLogChannel.channelId);
                }
            } else if (guild.logs.channelId) {
                logChannel = member.guild.channels.cache.get(guild.logs.channelId);
            }

            if (!logChannel) return;

            // Vérifier les logs d'audit pour déterminer si c'est un kick
            let isKick = false;
            let executor = null;
            let reason = null;

            try {
                const auditLogs = await member.guild.fetchAuditLogs({
                    type: AuditLogEvent.MemberKick,
                    limit: 1
                });

                const kickLog = auditLogs.entries.first();
                if (kickLog && kickLog.target.id === member.user.id && 
                    Date.now() - kickLog.createdTimestamp < 5000) {
                    isKick = true;
                    executor = kickLog.executor;
                    reason = kickLog.reason || (LanguageManager.get(lang, 'events.common.none') || 'Aucune raison fournie');
                }
            } catch (error) {
                console.error('Erreur lors de la récupération des logs d\'audit:', error);
            }

            const embed = new EmbedBuilder()
                .setTitle(isKick ? (LanguageManager.get(lang, 'events.members.kicked.title') || '👢 Membre expulsé') : (LanguageManager.get(lang, 'events.members.removed.title') || '📤 Membre parti'))
                .setColor(isKick ? 0xFF6B00 : 0xFF0000)
                .addFields(
                    { name: LanguageManager.get(lang, 'events.common.fields.user') || '👤 Utilisateur', value: `${member.user} (${member.user.tag})`, inline: true },
                    { name: LanguageManager.get(lang, 'events.common.fields.joined_at') || '📅 A rejoint', value: member.joinedAt ? `<t:${Math.floor(member.joinedAt.getTime() / 1000)}:F>` : (LanguageManager.get(lang, 'events.common.unknown') || 'Inconnu'), inline: true },
                    { name: LanguageManager.get(lang, 'events.common.fields.member_count') || '👥 Nombre de membres', value: `${member.guild.memberCount}`, inline: true }
                );

            if (isKick && executor) {
                embed.addFields(
                    { name: LanguageManager.get(lang, 'events.common.fields.moderator') || '👮 Modérateur', value: `${executor} (${executor.tag})`, inline: true },
                    { name: LanguageManager.get(lang, 'events.common.fields.reason') || '📝 Raison', value: reason, inline: false }
                );
            }

            embed.setTimestamp()
                .setFooter({ text: `ID: ${member.user.id}` });

            if (member.user.displayAvatarURL()) {
                embed.setThumbnail(member.user.displayAvatarURL());
            }

            await logChannel.send({ embeds: [embed] });

            try { await ServerStats.updateForGuild(member.guild); } catch (_) {}

        } catch (error) {
            console.error('Erreur dans guildMemberRemove:', error);
        }
    }
};
