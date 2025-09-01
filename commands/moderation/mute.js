// commands/moderation/mute.js
const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const Guild = require('../../models/Guild');
const BotEmbeds = require('../../utils/embeds');
const ms = require('ms');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('mute')
        .setDescription('Rendre muet un membre')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('Le membre à rendre muet')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('duration')
                .setDescription('Durée du mute (ex: 10m, 1h, 1d)')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('Raison du mute')
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
    
    async execute(interaction) {
        // Récupérer la langue du serveur
        const guildData = await Guild.findOne({ guildId: interaction.guild.id });
        const lang = guildData?.language || 'fr';

        const user = interaction.options.getUser('user');
        const duration = interaction.options.getString('duration');
        const reason = interaction.options.getString('reason') || 'Aucune raison fournie';

        // Vérifier les permissions de l'utilisateur
        if (!interaction.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
            return interaction.reply({
                embeds: [{
                    title: '❌ Permissions insuffisantes',
                    description: 'Vous n\'avez pas les permissions nécessaires pour utiliser cette commande.',
                    color: 0xFF0000
                }],
                ephemeral: true
            });
        }

        // Vérifier les permissions du bot
        if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.ModerateMembers)) {
            return interaction.reply({
                embeds: [{
                    title: '❌ Permissions du bot insuffisantes',
                    description: 'Je n\'ai pas les permissions nécessaires pour modérer les membres.',
                    color: 0xFF0000
                }],
                ephemeral: true
            });
        }

        if (user.id === interaction.user.id) {
            return interaction.reply({
                embeds: [{
                    title: '❌ Erreur',
                    description: 'Vous ne pouvez pas vous mute vous-même.',
                    color: 0xFF0000
                }],
                ephemeral: true
            });
        }

        try {
            const member = await interaction.guild.members.fetch(user.id);

            if (!guildData?.muteRole) {
                return interaction.reply({
                    embeds: [{
                        title: '❌ Configuration manquante',
                        description: 'Le système de mute n\'est pas configuré. Utilisez `/setupmute` d\'abord.',
                        color: 0xFF0000
                    }],
                    ephemeral: true
                });
            }

            const muteRole = interaction.guild.roles.cache.get(guildData.muteRole);
            if (!muteRole) {
                return interaction.reply({
                    embeds: [{
                        title: '❌ Rôle introuvable',
                        description: 'Le rôle de mute est introuvable. Reconfigurez avec `/setupmute`.',
                        color: 0xFF0000
                    }],
                    ephemeral: true
                });
            }

            if (member.roles.cache.has(muteRole.id)) {
                return interaction.reply({
                    embeds: [{
                        title: '❌ Déjà muet',
                        description: 'Ce membre est déjà rendu muet.',
                        color: 0xFF0000
                    }],
                    ephemeral: true
                });
            }

            let muteUntil = null;
            let durationText = 'Permanent';

            if (duration) {
                const parsedDuration = ms(duration);
                if (!parsedDuration || parsedDuration > ms('28d')) {
                    return interaction.reply({
                        embeds: [{
                            title: '❌ Durée invalide',
                            description: 'Utilisez un format comme `10m`, `1h`, `1d` (max 28 jours).',
                            color: 0xFF0000
                        }],
                        ephemeral: true
                    });
                }
                muteUntil = new Date(Date.now() + parsedDuration);
                durationText = duration;
            }

            await member.roles.add(muteRole, reason);

            // Sauvegarder en base dans Guild.users
            await Guild.findOneAndUpdate(
                { guildId: interaction.guild.id, 'users.userId': user.id },
                { 
                    $set: {
                        'users.$.muted': true,
                        'users.$.mutedUntil': muteUntil
                    }
                }
            ) || await Guild.findOneAndUpdate(
                { guildId: interaction.guild.id },
                { 
                    $push: {
                        users: {
                            userId: user.id,
                            warnings: 0,
                            muted: true,
                            mutedUntil: muteUntil
                        }
                    }
                },
                { upsert: true }
            );

            const successEmbed = {
                title: '🔇 Membre rendu muet',
                description: `**${user.username}** a été rendu muet avec succès.\n\n**Raison:** ${reason}\n**Durée:** ${durationText}\n**Modérateur:** ${interaction.user.username}`,
                color: 0x00FF00,
                timestamp: new Date().toISOString()
            };
            
            await interaction.reply({ embeds: [successEmbed] });

            // Auto-unmute si durée définie
            if (muteUntil) {
                setTimeout(async () => {
                    try {
                        const guildDoc = await Guild.findOne({ guildId: interaction.guild.id });
                        const userDoc = guildDoc?.users?.find(u => u.userId === user.id);
                        
                        if (userDoc?.muted && member.roles.cache.has(muteRole.id)) {
                            await member.roles.remove(muteRole, 'Fin du mute automatique');
                            await Guild.findOneAndUpdate(
                                { guildId: interaction.guild.id, 'users.userId': user.id },
                                { 
                                    $set: {
                                        'users.$.muted': false,
                                        'users.$.mutedUntil': null
                                    }
                                }
                            );
                        }
                    } catch (error) {
                        console.error('Erreur auto-unmute:', error);
                    }
                }, ms(duration));
            }

        } catch (error) {
            console.error(error);
            await interaction.reply({
                embeds: [{
                    title: '❌ Erreur',
                    description: 'Une erreur est survenue lors du mute.',
                    color: 0xFF0000
                }],
                ephemeral: true
            });
        }
    }
};