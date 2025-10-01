const { EmbedBuilder, AuditLogEvent } = require('discord.js');
const Guild = require('../models/Guild');

module.exports = {
    name: 'guildBanAdd',
    async execute(ban) {
        try {
            const guild = await Guild.findOne({ guildId: ban.guild.id });
            if (!guild || !guild.logs.enabled || !guild.logs.types.server) return;

            // Vérifier s'il y a un canal configuré pour les logs de serveur
            let logChannel = null;
            if (guild.logs.channels && guild.logs.channels.length > 0) {
                const serverLogChannel = guild.logs.channels.find(ch => ch.types.server);
                if (serverLogChannel) {
                    logChannel = ban.guild.channels.cache.get(serverLogChannel.channelId);
                }
            } else if (guild.logs.channelId) {
                logChannel = ban.guild.channels.cache.get(guild.logs.channelId);
            }

            if (!logChannel) return;

            // Vérifier les logs d'audit pour obtenir plus d'informations
            let executor = null;
            let reason = ban.reason || 'Aucune raison fournie';

            try {
                const auditLogs = await ban.guild.fetchAuditLogs({
                    type: AuditLogEvent.MemberBanAdd,
                    limit: 1
                });

                const banLog = auditLogs.entries.first();
                if (banLog && banLog.target.id === ban.user.id && 
                    Date.now() - banLog.createdTimestamp < 5000) {
                    executor = banLog.executor;
                    if (banLog.reason) {
                        reason = banLog.reason;
                    }
                }
            } catch (error) {
                console.error('Erreur lors de la récupération des logs d\'audit:', error);
            }

            const embed = new EmbedBuilder()
                .setTitle('🔨 Membre banni')
                .setColor(0x8B0000)
                .addFields(
                    { name: '👤 Utilisateur', value: `${ban.user} (${ban.user.tag})`, inline: true },
                    { name: '📝 Raison', value: reason, inline: false }
                );

            if (executor) {
                embed.addFields(
                    { name: '👮 Modérateur', value: `${executor} (${executor.tag})`, inline: true }
                );
            }

            embed.setTimestamp()
                .setFooter({ text: `ID: ${ban.user.id}` });

            if (ban.user.displayAvatarURL()) {
                embed.setThumbnail(ban.user.displayAvatarURL());
            }

            await logChannel.send({ embeds: [embed] });

        } catch (error) {
            console.error('Erreur dans guildBanAdd:', error);
        }
    }
};