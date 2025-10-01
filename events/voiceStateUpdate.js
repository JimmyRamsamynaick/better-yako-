const { EmbedBuilder } = require('discord.js');
const Guild = require('../models/Guild');

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

            const member = newState.member || oldState.member;
            if (!member) return;

            // Rejoindre un canal vocal
            if (!oldState.channel && newState.channel) {
                const embed = new EmbedBuilder()
                    .setTitle('🔊 Utilisateur rejoint un canal vocal')
                    .setColor(0x00FF00)
                    .addFields(
                        { name: '👤 Utilisateur', value: `${member.user} (${member.user.tag})`, inline: true },
                        { name: '📍 Canal', value: `${newState.channel}`, inline: true }
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
                    .setTitle('🔇 Utilisateur quitte un canal vocal')
                    .setColor(0xFF0000)
                    .addFields(
                        { name: '👤 Utilisateur', value: `${member.user} (${member.user.tag})`, inline: true },
                        { name: '📍 Canal', value: `${oldState.channel}`, inline: true }
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
                    .setTitle('🔄 Utilisateur change de canal vocal')
                    .setColor(0xFFA500)
                    .addFields(
                        { name: '👤 Utilisateur', value: `${member.user} (${member.user.tag})`, inline: true },
                        { name: '📍 Ancien canal', value: `${oldState.channel}`, inline: true },
                        { name: '📍 Nouveau canal', value: `${newState.channel}`, inline: true }
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
                    .setTitle(newState.mute ? '🎤 Utilisateur muté (micro)' : '🎤 Utilisateur démuté (micro)')
                    .setColor(newState.mute ? 0xFF0000 : 0x00FF00)
                    .addFields(
                        { name: '👤 Utilisateur', value: `${member.user} (${member.user.tag})`, inline: true },
                        { name: '📍 Canal', value: `${newState.channel || oldState.channel}`, inline: true },
                        { name: '🎤 État', value: newState.mute ? 'Muté' : 'Démuté', inline: true }
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
                    .setTitle(newState.deaf ? '🎧 Utilisateur sourdé (casque)' : '🎧 Utilisateur désourdé (casque)')
                    .setColor(newState.deaf ? 0xFF0000 : 0x00FF00)
                    .addFields(
                        { name: '👤 Utilisateur', value: `${member.user} (${member.user.tag})`, inline: true },
                        { name: '📍 Canal', value: `${newState.channel || oldState.channel}`, inline: true },
                        { name: '🎧 État', value: newState.deaf ? 'Sourdé' : 'Désourdé', inline: true }
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
                    .setTitle(newState.selfMute ? '🎤 Utilisateur s\'est muté' : '🎤 Utilisateur s\'est démuté')
                    .setColor(newState.selfMute ? 0xFF0000 : 0x00FF00)
                    .addFields(
                        { name: '👤 Utilisateur', value: `${member.user} (${member.user.tag})`, inline: true },
                        { name: '📍 Canal', value: `${newState.channel || oldState.channel}`, inline: true },
                        { name: '🎤 Action', value: newState.selfMute ? 'S\'est muté' : 'S\'est démuté', inline: true }
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
                    .setTitle(newState.selfDeaf ? '🎧 Utilisateur s\'est sourdé' : '🎧 Utilisateur s\'est désourdé')
                    .setColor(newState.selfDeaf ? 0xFF0000 : 0x00FF00)
                    .addFields(
                        { name: '👤 Utilisateur', value: `${member.user} (${member.user.tag})`, inline: true },
                        { name: '📍 Canal', value: `${newState.channel || oldState.channel}`, inline: true },
                        { name: '🎧 Action', value: newState.selfDeaf ? 'S\'est sourdé' : 'S\'est désourdé', inline: true }
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