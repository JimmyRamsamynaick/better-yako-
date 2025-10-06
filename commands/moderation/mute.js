// commands/moderation/mute.js
const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const Guild = require('../../models/Guild');
const BotEmbeds = require('../../utils/embeds');
const LanguageManager = require('../../utils/languageManager');
const { ComponentsV3 } = require('../../utils/ComponentsV3');
const ms = require('ms');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('mute')
        .setDescription(LanguageManager.get('fr', 'commands.mute.description') || 'Rendre muet un membre')
        .setDescriptionLocalizations({
            'en-US': LanguageManager.get('en', 'commands.mute.description') || 'Mute a member'
        })
        .addUserOption(option =>
            option.setName('user')
                .setDescription(LanguageManager.get('fr', 'commands.mute.user_option') || 'Le membre à rendre muet')
                .setDescriptionLocalizations({
                    'en-US': LanguageManager.get('en', 'commands.mute.user_option') || 'The member to mute'
                })
                .setRequired(true))
        .addStringOption(option =>
            option.setName('duration')
                .setDescription(LanguageManager.get('fr', 'commands.mute.duration_option') || 'Durée du mute (ex: 10m, 1h, 1d)')
                .setDescriptionLocalizations({
                    'en-US': LanguageManager.get('en', 'commands.mute.duration_option') || 'Duration of the mute (ex: 10m, 1h, 1d)'
                })
                .setRequired(false))
        .addStringOption(option =>
            option.setName('reason')
                .setDescription(LanguageManager.get('fr', 'commands.mute.reason_option') || 'Raison du mute')
                .setDescriptionLocalizations({
                    'en-US': LanguageManager.get('en', 'commands.mute.reason_option') || 'Reason for the mute'
                })
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
    
    async execute(interaction) {
        // Récupérer la langue du serveur
        const guildData = await Guild.findOne({ guildId: interaction.guild.id });
        const lang = guildData?.language || 'fr';

        const user = interaction.options.getUser('user');
        const duration = interaction.options.getString('duration');
        const reason = interaction.options.getString('reason') || require('../../utils/languageManager').get(lang, 'common.no_reason');

        // Vérifier les permissions de l'utilisateur avec overrides de rôles
        const hasModerate = interaction.member.permissions.has(PermissionFlagsBits.ModerateMembers);
        const hasManageRoles = interaction.member.permissions.has(PermissionFlagsBits.ManageRoles);
        const hasRoleOverride = interaction.member.roles.cache.some(r => {
            const n = r.name?.toLowerCase?.() || '';
            return n === 'perm-mute' || n === 'staff';
        });
        if (!hasModerate && !hasManageRoles && !hasRoleOverride) {
            const noPermMessage = LanguageManager.get(lang, 'errors.no_permission') || '❌ Vous n\'avez pas la permission d\'utiliser cette commande.';
            return await interaction.reply({ content: noPermMessage, ephemeral: true });
        }

        // Vérifier les permissions du bot
        if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.ModerateMembers)) {
            const botNoPermMessage = LanguageManager.get(lang, 'errors.bot_no_permission') || '❌ Le bot n\'a pas les permissions nécessaires.';
            return await interaction.reply({ content: botNoPermMessage, ephemeral: true });
        }

        if (user.id === interaction.user.id) {
            const selfMuteMessage = LanguageManager.get(lang, 'commands.mute.error_self') || 'Vous ne pouvez pas vous mute vous-même.';
            return await interaction.reply({ content: `❌ ${selfMuteMessage}`, ephemeral: true });
        }

        try {
            const member = await interaction.guild.members.fetch(user.id);

            if (!guildData?.muteRole) {
                const noSetupMessage = LanguageManager.get(lang, 'commands.mute.error_no_setup') || 'Le système de mute n\'est pas configuré. Utilisez `/setupmute` d\'abord.';
                return await interaction.reply({ content: `❌ ${noSetupMessage}`, ephemeral: true });
            }

            const muteRole = interaction.guild.roles.cache.get(guildData.muteRole);
            if (!muteRole) {
                const noRoleMessage = LanguageManager.get(lang, 'commands.mute.error_role_not_found') || 'Le rôle de mute est introuvable. Reconfigurez avec `/setupmute`.';
                return await interaction.reply({ content: `❌ ${noRoleMessage}`, ephemeral: true });
            }

            if (member.roles.cache.has(muteRole.id)) {
                const alreadyMutedMessage = LanguageManager.get(lang, 'commands.mute.error_already_muted') || 'Ce membre est déjà rendu muet.';
                return await interaction.reply({ content: `❌ ${alreadyMutedMessage}`, ephemeral: true });
            }

            let muteUntil = null;
            let durationText = 'Permanent';

            if (duration) {
                const parsedDuration = ms(duration);
                if (!parsedDuration || parsedDuration > ms('28d')) {
                    const invalidDurationMessage = LanguageManager.get(lang, 'commands.mute.error_invalid_duration') || 'Utilisez un format comme `10m`, `1h`, `1d` (max 28 jours).';
                    return await interaction.reply({ content: `❌ ${invalidDurationMessage}`, ephemeral: true });
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

            const successMessage = LanguageManager.get(lang, 'commands.mute.success', {
                executor: interaction.user.toString(),
                user: user.toString(),
                reason: reason,
                duration: durationText
            }) || `${interaction.user.toString()} a mute ${user.toString()} pour ${reason} (durée: ${durationText})`;

            await interaction.reply({ content: successMessage, ephemeral: true });

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

                            // Envoyer notification directe à l'utilisateur
                            try {
                                const languageManager = require('../../utils/languageManager');
                                const guildLang = guildDoc?.language || 'fr';
                                const userNotificationEmbed = BotEmbeds.createUserUnmuteNotificationEmbed(interaction.guild.name, guildLang);
                                await user.send(userNotificationEmbed);
                            } catch (error) {
                                console.log('Impossible d\'envoyer un MP à l\'utilisateur:', error.message);
                            }

                            // Envoyer notification dans les logs
                            const logChannels = guildDoc?.logChannels || {};
                            const logChannel = logChannels.message || guildDoc?.logChannel;
                            
                            if (logChannel) {
                                const channel = interaction.guild.channels.cache.get(logChannel);
                                if (channel) {
                                    const languageManager = require('../../utils/languageManager');
                                    const guildLang = guildDoc?.language || 'fr';
                                    const unmuteEmbed = BotEmbeds.createAutoUnmuteEmbed(user, guildLang);
                                    await channel.send(unmuteEmbed);
                                }
                            }
                        }
                    } catch (error) {
                        console.error('Erreur auto-unmute:', error);
                    }
                }, ms(duration));
            }

        } catch (error) {
            console.error(error);
            if (!interaction.replied && !interaction.deferred) {
                const errorMessage = LanguageManager.get(lang, 'commands.mute.error') || 'Une erreur est survenue lors du mute.';
                await interaction.reply({ content: `❌ ${errorMessage}`, ephemeral: true });
            }
        }
    }
};