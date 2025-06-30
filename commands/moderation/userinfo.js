// commands/moderation/userinfo.js
const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('userinfo')
        .setDescription('Affiche les informations détaillées d\'un utilisateur')
        .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
        .addUserOption(option =>
            option.setName('utilisateur')
                .setDescription('Utilisateur dont afficher les informations')
                .setRequired(false)),

    async execute(interaction, client, getTranslation) {
        const targetUser = interaction.options.getUser('utilisateur') || interaction.user;
        const targetMember = interaction.guild.members.cache.get(targetUser.id);

        try {
            await interaction.deferReply();

            // Informations de base
            const embed = new EmbedBuilder()
                .setColor(targetMember?.displayHexColor || '#0099ff')
                .setTitle('👤 Informations utilisateur')
                .setThumbnail(targetUser.displayAvatarURL({ dynamic: true, size: 256 }))
                .setTimestamp();

            // Informations générales
            embed.addFields([
                {
                    name: '📝 Informations générales',
                    value: [
                        `**Nom d'utilisateur:** ${targetUser.username}`,
                        `**Tag complet:** ${targetUser.tag}`,
                        `**ID:** \`${targetUser.id}\``,
                        `**Bot:** ${targetUser.bot ? 'Oui' : 'Non'}`,
                        `**Compte créé:** <t:${Math.floor(targetUser.createdTimestamp / 1000)}:F>`,
                        `**Compte créé:** <t:${Math.floor(targetUser.createdTimestamp / 1000)}:R>`
                    ].join('\n'),
                    inline: false
                }
            ]);

            if (targetMember) {
                // Informations du serveur
                const roles = targetMember.roles.cache
                    .filter(role => role.id !== interaction.guild.id)
                    .sort((a, b) => b.position - a.position)
                    .map(role => role.toString())
                    .slice(0, 10); // Limiter à 10 rôles

                embed.addFields([
                    {
                        name: '🏠 Informations serveur',
                        value: [
                            `**Surnom:** ${targetMember.nickname || 'Aucun'}`,
                            `**Rejoint le:** <t:${Math.floor(targetMember.joinedTimestamp / 1000)}:F>`,
                            `**Rejoint:** <t:${Math.floor(targetMember.joinedTimestamp / 1000)}:R>`,
                            `**Rôle le plus haut:** ${targetMember.roles.highest}`,
                            `**Couleur:** ${targetMember.displayHexColor}`,
                            `**Boosteur:** ${targetMember.premiumSince ? `Oui (depuis <t:${Math.floor(targetMember.premiumSinceTimestamp / 1000)}:R>)` : 'Non'}`
                        ].join('\n'),
                        inline: false
                    }
                ]);

                if (roles.length > 0) {
                    embed.addFields([
                        {
                            name: `👑 Rôles (${targetMember.roles.cache.size - 1})`,
                            value: roles.join(' ') + (targetMember.roles.cache.size > 11 ? ` et ${targetMember.roles.cache.size - 11} autre(s)...` : ''),
                            inline: false
                        }
                    ]);
                }

                // Permissions importantes
                const importantPerms = [
                    { name: 'Administrateur', flag: PermissionFlagsBits.Administrator },
                    { name: 'Gérer le serveur', flag: PermissionFlagsBits.ManageGuild },
                    { name: 'Gérer les salons', flag: PermissionFlagsBits.ManageChannels },
                    { name: 'Gérer les rôles', flag: PermissionFlagsBits.ManageRoles },
                    { name: 'Bannir des membres', flag: PermissionFlagsBits.BanMembers },
                    { name: 'Expulser des membres', flag: PermissionFlagsBits.KickMembers },
                    { name: 'Gérer les messages', flag: PermissionFlagsBits.ManageMessages },
                    { name: 'Modérer les membres', flag: PermissionFlagsBits.ModerateMembers }
                ];

                const userPerms = importantPerms
                    .filter(perm => targetMember.permissions.has(perm.flag))
                    .map(perm => perm.name);

                if (userPerms.length > 0) {
                    embed.addFields([
                        {
                            name: '🔑 Permissions importantes',
                            value: userPerms.join(', '),
                            inline: false
                        }
                    ]);
                }

                // Statut
                const presence = targetMember.presence;
                if (presence) {
                    const statusEmoji = {
                        online: '🟢',
                        idle: '🟡',
                        dnd: '🔴',
                        offline: '⚫'
                    };

                    const statusText = {
                        online: 'En ligne',
                        idle: 'Absent',
                        dnd: 'Ne pas déranger',
                        offline: 'Hors ligne'
                    };

                    embed.addFields([
                        {
                            name: '📱 Statut',
                            value: `${statusEmoji[presence.status]} ${statusText[presence.status]}`,
                            inline: true
                        }
                    ]);

                    // Activités
                    if (presence.activities && presence.activities.length > 0) {
                        const activities = presence.activities
                            .filter(activity => activity.type !== 4) // Exclure les statuts personnalisés
                            .map(activity => {
                                let activityText = '';
                                switch (activity.type) {
                                    case 0: // PLAYING
                                        activityText = `🎮 Joue à **${activity.name}**`;
                                        break;
                                    case 1: // STREAMING
                                        activityText = `📺 Stream **${activity.name}**`;
                                        break;
                                    case 2: // LISTENING
                                        activityText = `🎵 Écoute **${activity.name}**`;
                                        break;
                                    case 3: // WATCHING
                                        activityText = `📺 Regarde **${activity.name}**`;
                                        break;
                                    case 5: // COMPETING
                                        activityText = `🏆 Participe à **${activity.name}**`;
                                        break;
                                    default:
                                        activityText = `${activity.name}`;
                                }
                                return activityText;
                            });

                        if (activities.length > 0) {
                            embed.addFields([
                                {
                                    name: '🎯 Activités',
                                    value: activities.join('\n'),
                                    inline: true
                                }
                            ]);
                        }
                    }
                }

                // Informations supplémentaires
                const joinPosition = interaction.guild.members.cache
                    .filter(member => member.joinedTimestamp < targetMember.joinedTimestamp)
                    .size + 1;

                embed.addFields([
                    {
                        name: '📊 Statistiques',
                        value: [
                            `**Position d'arrivée:** ${joinPosition}/${interaction.guild.memberCount}`,
                            `**Temps sur le serveur:** <t:${Math.floor(targetMember.joinedTimestamp / 1000)}:R>`,
                            `**Âge du compte:** <t:${Math.floor(targetUser.createdTimestamp / 1000)}:R>`
                        ].join('\n'),
                        inline: false
                    }
                ]);
            } else {
                // L'utilisateur n'est pas sur le serveur
                embed.addFields([
                    {
                        name: '⚠️ Utilisateur introuvable',
                        value: 'Cet utilisateur n\'est pas membre de ce serveur.',
                        inline: false
                    }
                ]);
            }

            // Footer avec l'avatar en grand
            embed.setFooter({
                text: 'Yako Bot • Informations utilisateur',
                iconURL: client.user.displayAvatarURL()
            });

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('Erreur lors de la récupération des informations utilisateur:', error);

            const errorEmbed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('❌ Erreur')
                .setDescription('Une erreur s\'est produite lors de la récupération des informations utilisateur.')
                .setTimestamp();

            if (interaction.deferred) {
                await interaction.editReply({ embeds: [errorEmbed] });
            } else {
                await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
            }
        }
    },

    category: 'Modération'
};