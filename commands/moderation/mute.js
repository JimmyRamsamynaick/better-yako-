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
                embeds: [BotEmbeds.createNoPermissionEmbed(interaction.guild.id, lang)],
                ephemeral: true
            });
        }

        // Vérifier les permissions du bot
        if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.ModerateMembers)) {
            return interaction.reply({
                embeds: [BotEmbeds.createBotNoPermissionEmbed(interaction.guild.id, lang)],
                ephemeral: true
            });
        }

        if (user.id === interaction.user.id) {
            return interaction.reply({
                embeds: [BotEmbeds.createGenericErrorEmbed('Vous ne pouvez pas vous mute vous-même', interaction.guild.id, lang)],
                ephemeral: true
            });
        }

        try {
            const member = await interaction.guild.members.fetch(user.id);

            if (!guildData?.muteRole) {
                return interaction.reply({
                    embeds: [BotEmbeds.createGenericErrorEmbed('Le système de mute n\'est pas configuré. Utilisez `/setupmute` d\'abord', interaction.guild.id, lang)],
                    ephemeral: true
                });
            }

            let muteRole = interaction.guild.roles.cache.get(guildData.muteRole);
            if (!muteRole) {
                // Créer automatiquement le rôle de mute
                try {
                    muteRole = await interaction.guild.roles.create({
                        name: 'Muted',
                        color: '#818386',
                        reason: 'Rôle de mute créé automatiquement'
                    });

                    // Mettre à jour la base de données avec le nouveau rôle
                    await Guild.findOneAndUpdate(
                        { guildId: interaction.guild.id },
                        { muteRole: muteRole.id },
                        { upsert: true }
                    );

                    // Configurer les permissions pour tous les salons
                    const channels = interaction.guild.channels.cache.filter(channel => 
                        channel.type === 0 || channel.type === 2 // Text and Voice channels
                    );

                    for (const [, channel] of channels) {
                        try {
                            await channel.permissionOverwrites.edit(muteRole, {
                                SendMessages: false,
                                Speak: false,
                                AddReactions: false
                            });
                        } catch (error) {
                            console.log(`Impossible de configurer les permissions pour ${channel.name}:`, error.message);
                        }
                    }
                } catch (error) {
                    console.error('Erreur lors de la création du rôle de mute:', error);
                    return interaction.reply({
                        embeds: [BotEmbeds.createGenericErrorEmbed('Impossible de créer le rôle de mute. Vérifiez mes permissions.', interaction.guild.id)],
                        ephemeral: true
                    });
                }
            }

            if (member.roles.cache.has(muteRole.id)) {
                return interaction.reply({
                    embeds: [BotEmbeds.createGenericErrorEmbed('Cet utilisateur est déjà muet', interaction.guild.id)],
                    ephemeral: true
                });
            }

            let muteUntil = null;
            let durationText = 'Permanent';

            if (duration) {
                const parsedDuration = ms(duration);
                if (!parsedDuration || parsedDuration > ms('28d')) {
                    return interaction.reply({
                        embeds: [BotEmbeds.createGenericErrorEmbed('Durée invalide. Utilisez un format comme 10m, 1h, 1d (maximum 28 jours)', interaction.guild.id)],
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

            console.log('=== About to create mute success embed ===');
            console.log('Parameters:', { user: user?.username, reason, durationText, guildId: interaction.guild.id, executor: interaction.user?.username, lang });
            
            const successEmbed = BotEmbeds.createMuteSuccessEmbed(
                user,
                reason,
                durationText,
                interaction.guild.id,
                interaction.user,
                lang
            );
            
            console.log('=== Success embed created ===');
            console.log('Embed:', JSON.stringify(successEmbed, null, 2));

            await interaction.reply({ embeds: [successEmbed], ephemeral: true });

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
            const errorEmbed = BotEmbeds.createGenericErrorEmbed(
                'Une erreur est survenue lors du mute',
                interaction.guild.id,
                lang
            );
            await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }
    }
};