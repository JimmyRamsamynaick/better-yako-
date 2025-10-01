const { EmbedBuilder } = require('discord.js');
const Guild = require('../models/Guild');

module.exports = {
    name: 'guildMemberAdd',
    async execute(member) {
        try {
            const guild = await Guild.findOne({ guildId: member.guild.id });
            if (!guild || !guild.logs.enabled || !guild.logs.types.server) return;

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

            const embed = new EmbedBuilder()
                .setTitle('📥 Membre rejoint')
                .setColor(0x00FF00)
                .addFields(
                    { name: '👤 Utilisateur', value: `${member.user} (${member.user.tag})`, inline: true },
                    { name: '📅 Compte créé', value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:F>`, inline: true },
                    { name: '👥 Nombre de membres', value: `${member.guild.memberCount}`, inline: true }
                )
                .setTimestamp()
                .setFooter({ text: `ID: ${member.user.id}` });

            if (member.user.displayAvatarURL()) {
                embed.setThumbnail(member.user.displayAvatarURL());
            }

            await logChannel.send({ embeds: [embed] });

        } catch (error) {
            console.error('Erreur dans guildMemberAdd:', error);
        }
    }
};