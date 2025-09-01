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
                components: [BotEmbeds.createNoPermissionEmbed(lang)],
                ephemeral: true
            });
        }

        // Vérifier les permissions du bot
        if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.ModerateMembers)) {
            return interaction.reply({
                components: [BotEmbeds.createBotNoPermissionEmbed(lang)],
                ephemeral: true
            });
        }

        if (user.id === interaction.user.id) {
            return interaction.reply({
                components: [BotEmbeds.createErrorEmbed(lang, 'Vous ne pouvez pas vous mute vous-même.')],
                ephemeral: true
            });
        }

        try {
            const member = await interaction.guild.members.fetch(user.id);

            if (!guildData?.muteRole) {
                return interaction.reply({
                    components: [BotEmbeds.createErrorEmbed(lang, 'Le système de mute n\'est pas configuré. Utilisez `/setupmute` d\'abord.')],
                    ephemeral: true
                });
            }

            const muteRole = interaction.guild.roles.cache.get(guildData.muteRole);
            if (!muteRole) {
                return interaction.reply({
                    components: [BotEmbeds.createErrorEmbed(lang, 'Le rôle de mute est introuvable. Reconfigurez avec `/setupmute`.')],
                    ephemeral: true
                });
            }

            if (member.roles.cache.has(muteRole.id)) {
                return interaction.reply({
                    components: [BotEmbeds.createErrorEmbed(lang, 'Ce membre est déjà rendu muet.')],
                    ephemeral: true
                });
            }

            let muteUntil = null;
            let durationText = 'Permanent';

            if (duration) {
                const parsedDuration = ms(duration);
                if (!parsedDuration || parsedDuration > ms('28d')) {
                    return interaction.reply({
                        components: [BotEmbeds.createErrorEmbed(lang, 'Utilisez un format comme `10m`, `1h`, `1d` (max 28 jours).')],
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

            await interaction.reply({ components: [BotEmbeds.createMuteSuccessEmbed(user, reason, durationText, interaction.guild.id, interaction.user, lang)] });

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
                components: [BotEmbeds.createErrorEmbed(lang, 'Une erreur est survenue lors du mute.')],
                ephemeral: true
            });
        }
    }
};