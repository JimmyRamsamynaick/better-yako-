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
        // Ne pas différer tout de suite: répondre immédiatement aux validations rapides

        // Récupérer la langue du serveur
        const guildData = await Guild.findOne({ guildId: interaction.guild.id });
        const lang = guildData?.language || 'fr';

        const user = interaction.options.getUser('user');
        const duration = interaction.options.getString('duration');
        const reason = interaction.options.getString('reason') || require('../../utils/languageManager').get(lang, 'common.no_reason');

        // deferReply déjà effectué plus haut

        // Vérifier les permissions de l'utilisateur avec overrides de rôles
        const hasModerate = interaction.member.permissions.has(PermissionFlagsBits.ModerateMembers);
        const hasManageRoles = interaction.member.permissions.has(PermissionFlagsBits.ManageRoles);
        const hasRoleOverride = interaction.member.roles.cache.some(r => {
            const n = r.name?.toLowerCase?.() || '';
            return n === 'perm-mute' || n === 'staff';
        });
        if (!hasModerate && !hasManageRoles && !hasRoleOverride) {
            const payload = await ComponentsV3.errorEmbed(
                interaction.guild.id,
                'errors.no_permission',
                {},
                false
            );
            return interaction.reply(payload);
        }

        // Vérifier les permissions du bot
        if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.ModerateMembers)) {
            const payload = await ComponentsV3.errorEmbed(
                interaction.guild.id,
                'errors.bot_no_permission',
                {},
                false
            );
            return interaction.reply(payload);
        }

        if (user.id === interaction.user.id) {
            const payload = await ComponentsV3.errorEmbed(
                interaction.guild.id,
                'commands.mute.error_self',
                {},
                false
            );
            return interaction.reply(payload);
        }

        try {
            const member = await interaction.guild.members.fetch(user.id);

            if (!guildData?.muteRole) {
                const payload = await ComponentsV3.errorEmbed(
                    interaction.guild.id,
                    'commands.mute.error_no_setup',
                    {},
                    false
                );
                return interaction.reply(payload);
            }

            const muteRole = interaction.guild.roles.cache.get(guildData.muteRole);
            if (!muteRole) {
                const payload = await ComponentsV3.errorEmbed(
                    interaction.guild.id,
                    'commands.mute.error_role_not_found',
                    {},
                    false
                );
                return interaction.reply(payload);
            }

            // Vérifier état role + DB pour éviter contradictions
            const memberHasMutedRole = member.roles.cache.has(muteRole.id);
            const userDoc = guildData?.users?.find?.(u => u.userId === user.id);
            const dbMuted = Boolean(userDoc?.muted);
            console.log('[Mute Diagnostic]', { userId: user.id, muteRoleId: muteRole.id, memberHasMutedRole, dbMuted });

            if (memberHasMutedRole || dbMuted) {
                const payload = await ComponentsV3.errorEmbed(
                    interaction.guild.id,
                    'commands.mute.error_already_muted',
                    {},
                    false
                );
                return interaction.reply(payload);
            }

            // À partir d'ici, on peut différer pour exécuter les actions (rôle + DB)
            if (!interaction.deferred && !interaction.replied) {
                await interaction.deferReply({ ephemeral: false });
            }

            let muteUntil = null;
            let durationText = 'Permanent';

            if (duration) {
                const parsedDuration = ms(duration);
                if (!parsedDuration || parsedDuration > ms('28d')) {
                    const payload = await ComponentsV3.errorEmbed(
                        interaction.guild.id,
                        'commands.mute.error_invalid_duration',
                        {},
                        false
                    );
                    return await interaction.editReply(payload);
                }
                muteUntil = new Date(Date.now() + parsedDuration);
                durationText = duration;

                // Utiliser le timeout Discord pour bloquer écriture/voix sans dépendre des overrides
                try {
                    await member.timeout(parsedDuration, reason || 'Mute via commande');
                } catch (e) {
                    console.warn('Échec du timeout, on bascule sur le rôle Muted:', e?.message);
                    await member.roles.add(muteRole, reason);
                }
            } else {
                // Permanent: rôle Muted
                await member.roles.add(muteRole, reason);

                // Si l'utilisateur peut encore écrire ici, appliquer un deny ciblé sur le salon courant
                try {
                    const canStillSend = interaction.channel?.permissionsFor(member)?.has(PermissionFlagsBits.SendMessages);
                    const hasAdmin = member.permissions.has(PermissionFlagsBits.Administrator);
                    const botHasModerate = interaction.guild.members.me.permissions.has(PermissionFlagsBits.ModerateMembers);
                    if (canStillSend) {
                        await interaction.channel.permissionOverwrites.edit(muteRole, {
                            SendMessages: false,
                            AddReactions: false,
                            SendMessagesInThreads: false
                        });
                    }
                    // Si admin ou encore permissif, basculer sur un timeout long (28j)
                    if (hasAdmin || interaction.channel?.permissionsFor(member)?.has(PermissionFlagsBits.SendMessages)) {
                        try {
                            await member.timeout(ms('28d'), reason || 'Mute (fallback timeout)');
                        } catch (e) {
                            console.warn('Échec du fallback timeout:', e?.message);
                            // Message explicite si admin et que le bot ne peut pas timeout
                            if (hasAdmin && !botHasModerate) {
                                const payload = await ComponentsV3.errorEmbed(
                                    interaction.guild.id,
                                    'commands.mute.error_bot_missing_moderate',
                                    {},
                                    false
                                );
                                try { await interaction.followUp(payload); } catch (_) {}
                            }
                        }
                    }
                } catch (e) {
                    console.warn('Impossible d\'appliquer le deny sur le salon courant:', e?.message);
                }
            }

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
                            warnings: [],
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
            const successPayload = await ComponentsV3.successEmbed(
                interaction.guild.id,
                'commands.mute.success_title',
                successMessage,
                false
            );
            await interaction.editReply(successPayload);

            // Auto-unmute si durée définie (retire timeout et rôle si présent)
            if (muteUntil) {
                setTimeout(async () => {
                    try {
                        const guildDoc = await Guild.findOne({ guildId: interaction.guild.id });
                        const userDoc = guildDoc?.users?.find(u => u.userId === user.id);

                        if (userDoc?.muted) {
                            try {
                                await member.timeout(null, 'Fin du mute automatique');
                            } catch (_) {}
                            if (member.roles.cache.has(muteRole.id)) {
                                await member.roles.remove(muteRole, 'Fin du mute automatique');
                            }

                            await Guild.findOneAndUpdate(
                                { guildId: interaction.guild.id, 'users.userId': user.id },
                                { 
                                    $set: {
                                        'users.$.muted': false,
                                        'users.$.mutedUntil': null
                                    }
                                }
                            );

                            // Notifications
                            try {
                                const languageManager = require('../../utils/languageManager');
                                const guildLang = guildDoc?.language || 'fr';
                                const userNotificationEmbed = BotEmbeds.createUserUnmuteNotificationEmbed(interaction.guild.name, guildLang);
                                await user.send(userNotificationEmbed);
                            } catch (error) {
                                console.log('Impossible d\'envoyer un MP à l\'utilisateur:', error.message);
                            }

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
            try {
                const payload = await ComponentsV3.errorEmbed(
                    interaction.guild.id,
                    'commands.mute.error',
                    {},
                    false
                );
                if (interaction.deferred || interaction.replied) {
                    await interaction.editReply(payload);
                } else {
                    await interaction.reply(payload);
                }
            } catch (_) {}
        }
    }
};