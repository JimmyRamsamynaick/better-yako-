const { EmbedBuilder } = require('discord.js');
const Guild = require('../models/Guild');

module.exports = {
    name: 'guildMemberUpdate',
    async execute(oldMember, newMember) {
        try {
            const guild = await Guild.findOne({ guildId: newMember.guild.id });
            if (!guild || !guild.logs.enabled || !guild.logs.types.roles) return;

            // Vérifier s'il y a un canal configuré pour les logs de rôles
            let logChannel = null;
            if (guild.logs.channels && guild.logs.channels.length > 0) {
                const roleLogChannel = guild.logs.channels.find(ch => ch.types.roles);
                if (roleLogChannel) {
                    logChannel = newMember.guild.channels.cache.get(roleLogChannel.channelId);
                }
            } else if (guild.logs.channelId) {
                logChannel = newMember.guild.channels.cache.get(guild.logs.channelId);
            }

            if (!logChannel) return;

            // Vérifier les changements de rôles
            const addedRoles = newMember.roles.cache.filter(role => !oldMember.roles.cache.has(role.id));
            const removedRoles = oldMember.roles.cache.filter(role => !newMember.roles.cache.has(role.id));

            if (addedRoles.size > 0) {
                const embed = new EmbedBuilder()
                    .setTitle('🎭 Rôle(s) ajouté(s)')
                    .setColor(0x00FF00)
                    .addFields(
                        { name: '👤 Utilisateur', value: `${newMember.user} (${newMember.user.tag})`, inline: true },
                        { name: '🎭 Rôle(s) ajouté(s)', value: addedRoles.map(role => `<@&${role.id}>`).join(', '), inline: false }
                    )
                    .setTimestamp()
                    .setFooter({ text: `ID: ${newMember.user.id}` });

                if (newMember.user.displayAvatarURL()) {
                    embed.setThumbnail(newMember.user.displayAvatarURL());
                }

                await logChannel.send({ embeds: [embed] });
            }

            if (removedRoles.size > 0) {
                const embed = new EmbedBuilder()
                    .setTitle('🎭 Rôle(s) retiré(s)')
                    .setColor(0xFF0000)
                    .addFields(
                        { name: '👤 Utilisateur', value: `${newMember.user} (${newMember.user.tag})`, inline: true },
                        { name: '🎭 Rôle(s) retiré(s)', value: removedRoles.map(role => `<@&${role.id}>`).join(', '), inline: false }
                    )
                    .setTimestamp()
                    .setFooter({ text: `ID: ${newMember.user.id}` });

                if (newMember.user.displayAvatarURL()) {
                    embed.setThumbnail(newMember.user.displayAvatarURL());
                }

                await logChannel.send({ embeds: [embed] });
            }

            // Vérifier les changements de pseudo
            if (oldMember.nickname !== newMember.nickname) {
                const embed = new EmbedBuilder()
                    .setTitle('📝 Pseudo modifié')
                    .setColor(0xFFA500)
                    .addFields(
                        { name: '👤 Utilisateur', value: `${newMember.user} (${newMember.user.tag})`, inline: true },
                        { name: '📜 Ancien pseudo', value: oldMember.nickname || '*Aucun pseudo*', inline: true },
                        { name: '📝 Nouveau pseudo', value: newMember.nickname || '*Aucun pseudo*', inline: true }
                    )
                    .setTimestamp()
                    .setFooter({ text: `ID: ${newMember.user.id}` });

                if (newMember.user.displayAvatarURL()) {
                    embed.setThumbnail(newMember.user.displayAvatarURL());
                }

                await logChannel.send({ embeds: [embed] });
            }

        } catch (error) {
            console.error('Erreur lors du log de mise à jour de membre:', error);
        }
    }
};