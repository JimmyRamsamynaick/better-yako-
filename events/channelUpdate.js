const { EmbedBuilder, ChannelType } = require('discord.js');
const Guild = require('../models/Guild');

module.exports = {
    name: 'channelUpdate',
    async execute(oldChannel, newChannel) {
        try {
            const guild = await Guild.findOne({ guildId: newChannel.guild.id });
            if (!guild || !guild.logs.enabled || !guild.logs.types.channels) return;

            // Vérifier s'il y a un canal configuré pour les logs de canaux
            let logChannel = null;
            if (guild.logs.channels && guild.logs.channels.length > 0) {
                const channelLogChannel = guild.logs.channels.find(ch => ch.types.channels);
                if (channelLogChannel) {
                    logChannel = newChannel.guild.channels.cache.get(channelLogChannel.channelId);
                }
            } else if (guild.logs.channelId) {
                logChannel = newChannel.guild.channels.cache.get(guild.logs.channelId);
            }

            if (!logChannel) return;

            const changes = [];

            // Vérifier le changement de nom
            if (oldChannel.name !== newChannel.name) {
                changes.push({
                    name: '📝 Nom',
                    value: `\`${oldChannel.name}\` → \`${newChannel.name}\``,
                    inline: false
                });
            }

            // Vérifier le changement de topic (pour les canaux texte)
            if (oldChannel.topic !== newChannel.topic) {
                const oldTopic = oldChannel.topic || '*Aucun sujet*';
                const newTopic = newChannel.topic || '*Aucun sujet*';
                changes.push({
                    name: '📋 Sujet',
                    value: `\`${oldTopic}\` → \`${newTopic}\``,
                    inline: false
                });
            }

            // Vérifier le changement de position
            if (oldChannel.position !== newChannel.position) {
                changes.push({
                    name: '📍 Position',
                    value: `\`${oldChannel.position}\` → \`${newChannel.position}\``,
                    inline: true
                });
            }

            // Vérifier le changement de catégorie
            if (oldChannel.parentId !== newChannel.parentId) {
                const oldParent = oldChannel.parent ? oldChannel.parent.name : '*Aucune catégorie*';
                const newParent = newChannel.parent ? newChannel.parent.name : '*Aucune catégorie*';
                changes.push({
                    name: '📁 Catégorie',
                    value: `\`${oldParent}\` → \`${newParent}\``,
                    inline: false
                });
            }

            // Vérifier les changements de permissions
            const oldPermissions = oldChannel.permissionOverwrites.cache;
            const newPermissions = newChannel.permissionOverwrites.cache;

            // Permissions ajoutées
            const addedPermissions = newPermissions.filter(perm => !oldPermissions.has(perm.id));
            if (addedPermissions.size > 0) {
                const permList = addedPermissions.map(perm => {
                    const target = perm.type === 0 ? `@${newChannel.guild.roles.cache.get(perm.id)?.name || 'Rôle inconnu'}` : `${newChannel.guild.members.cache.get(perm.id)?.user.tag || 'Utilisateur inconnu'}`;
                    return target;
                }).join(', ');
                changes.push({
                    name: '✅ Permissions ajoutées pour',
                    value: permList,
                    inline: false
                });
            }

            // Permissions supprimées
            const removedPermissions = oldPermissions.filter(perm => !newPermissions.has(perm.id));
            if (removedPermissions.size > 0) {
                const permList = removedPermissions.map(perm => {
                    const target = perm.type === 0 ? `@${newChannel.guild.roles.cache.get(perm.id)?.name || 'Rôle inconnu'}` : `${newChannel.guild.members.cache.get(perm.id)?.user.tag || 'Utilisateur inconnu'}`;
                    return target;
                }).join(', ');
                changes.push({
                    name: '❌ Permissions supprimées pour',
                    value: permList,
                    inline: false
                });
            }

            // Permissions modifiées
            const modifiedPermissions = newPermissions.filter(newPerm => {
                const oldPerm = oldPermissions.get(newPerm.id);
                return oldPerm && (oldPerm.allow.bitfield !== newPerm.allow.bitfield || oldPerm.deny.bitfield !== newPerm.deny.bitfield);
            });

            if (modifiedPermissions.size > 0) {
                const permList = modifiedPermissions.map(perm => {
                    const target = perm.type === 0 ? `@${newChannel.guild.roles.cache.get(perm.id)?.name || 'Rôle inconnu'}` : `${newChannel.guild.members.cache.get(perm.id)?.user.tag || 'Utilisateur inconnu'}`;
                    return target;
                }).join(', ');
                changes.push({
                    name: '🔄 Permissions modifiées pour',
                    value: permList,
                    inline: false
                });
            }

            // Vérifications spécifiques aux canaux vocaux
            if (newChannel.type === ChannelType.GuildVoice) {
                if (oldChannel.bitrate !== newChannel.bitrate) {
                    changes.push({
                        name: '🎵 Débit audio',
                        value: `\`${oldChannel.bitrate}kbps\` → \`${newChannel.bitrate}kbps\``,
                        inline: true
                    });
                }

                if (oldChannel.userLimit !== newChannel.userLimit) {
                    const oldLimit = oldChannel.userLimit === 0 ? 'Illimité' : oldChannel.userLimit;
                    const newLimit = newChannel.userLimit === 0 ? 'Illimité' : newChannel.userLimit;
                    changes.push({
                        name: '👥 Limite d\'utilisateurs',
                        value: `\`${oldLimit}\` → \`${newLimit}\``,
                        inline: true
                    });
                }
            }

            // Vérifications spécifiques aux canaux texte
            if (newChannel.type === ChannelType.GuildText) {
                if (oldChannel.nsfw !== newChannel.nsfw) {
                    changes.push({
                        name: '🔞 NSFW',
                        value: `\`${oldChannel.nsfw ? 'Activé' : 'Désactivé'}\` → \`${newChannel.nsfw ? 'Activé' : 'Désactivé'}\``,
                        inline: true
                    });
                }

                if (oldChannel.rateLimitPerUser !== newChannel.rateLimitPerUser) {
                    const oldLimit = oldChannel.rateLimitPerUser === 0 ? 'Aucune' : `${oldChannel.rateLimitPerUser}s`;
                    const newLimit = newChannel.rateLimitPerUser === 0 ? 'Aucune' : `${newChannel.rateLimitPerUser}s`;
                    changes.push({
                        name: '⏱️ Limite de débit',
                        value: `\`${oldLimit}\` → \`${newLimit}\``,
                        inline: true
                    });
                }
            }

            if (changes.length > 0) {
                const channelTypeEmoji = {
                    [ChannelType.GuildText]: '💬',
                    [ChannelType.GuildVoice]: '🔊',
                    [ChannelType.GuildCategory]: '📁',
                    [ChannelType.GuildNews]: '📢',
                    [ChannelType.GuildStageVoice]: '🎭',
                    [ChannelType.GuildForum]: '💭'
                };

                const embed = new EmbedBuilder()
                    .setTitle(`${channelTypeEmoji[newChannel.type] || '📝'} Canal modifié`)
                    .setColor(0xFFA500)
                    .addFields(
                        { name: '📍 Canal', value: `${newChannel} (\`${newChannel.name}\`)`, inline: false },
                        ...changes
                    )
                    .setTimestamp()
                    .setFooter({ text: `ID: ${newChannel.id}` });

                await logChannel.send({ embeds: [embed] });
            }

        } catch (error) {
            console.error('Erreur lors du log de modification de canal:', error);
        }
    }
};