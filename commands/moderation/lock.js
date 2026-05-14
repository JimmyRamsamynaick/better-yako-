// commands/moderation/lock.js
const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const Guild = require('../../models/Guild');
const BotEmbeds = require('../../utils/embeds');
const LanguageManager = require('../../utils/languageManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('lock')
        .setDescription(LanguageManager.get('fr', 'commands.lock.description') || 'Verrouiller un salon')
        .setDescriptionLocalizations({
            'en-US': LanguageManager.get('en', 'commands.lock.description') || 'Lock a channel'
        })
        .addChannelOption(option =>
            option.setName('channel')
                .setDescription(LanguageManager.get('fr', 'commands.lock.channel_option') || 'Le salon à verrouiller')
                .setDescriptionLocalizations({
                    'en-US': LanguageManager.get('en', 'commands.lock.channel_option') || 'The channel to lock'
                })
                .addChannelTypes(
                    ChannelType.GuildText,
                    ChannelType.GuildVoice,
                    ChannelType.GuildAnnouncement,
                    ChannelType.GuildForum,
                    ChannelType.GuildMedia
                )
                .setRequired(false))
        .addStringOption(option =>
            option.setName('reason')
                .setDescription(LanguageManager.get('fr', 'commands.lock.reason_option') || 'Raison du verrouillage')
                .setDescriptionLocalizations({
                    'en-US': LanguageManager.get('en', 'commands.lock.reason_option') || 'Reason for the lock'
                })
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),
    
    async execute(interaction) {
        await interaction.deferReply();
        
        // Récupérer la langue du serveur
        const guildData = await Guild.findOne({ guildId: interaction.guild.id });
        const lang = guildData?.language || 'fr';

        const channel = interaction.options.getChannel('channel') || interaction.channel;
        const reason = interaction.options.getString('reason') || LanguageManager.get(lang, 'common.no_reason');

        // Vérifier les permissions de l'utilisateur
        if (!interaction.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
            const noPermEmbed = BotEmbeds.createNoPermissionEmbed(interaction.guild.id, lang);
            return interaction.editReply({
                ...noPermEmbed,
                ephemeral: true
            });
        }

        // Vérifier les permissions du bot
        if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.ManageChannels)) {
            const botNoPermEmbed = BotEmbeds.createBotNoPermissionEmbed(interaction.guild.id, lang);
            return interaction.editReply({
                ...botNoPermEmbed,
                ephemeral: true
            });
        }

        try {
            const textChannelTypes = [
                ChannelType.GuildText,
                ChannelType.GuildAnnouncement,
                ChannelType.GuildForum,
                ChannelType.GuildMedia
            ];

            const textPermissions = {
                SendMessages: false,
                AddReactions: false,
                CreatePublicThreads: false,
                CreatePrivateThreads: false,
                SendMessagesInThreads: false
            };

            const voicePermissions = {
                Connect: false,
                Speak: false
            };

            // Save original permissions
            const originalPermissions = {};
            for (const overwrite of channel.permissionOverwrites.cache.values()) {
                originalPermissions[overwrite.id] = {
                    allow: overwrite.allow.bitfield.toString(),
                    deny: overwrite.deny.bitfield.toString()
                };
            }

            // Apply lock permissions
            const permissionPromises = [];
            for (const overwrite of channel.permissionOverwrites.cache.values()) {
                if (textChannelTypes.includes(channel.type)) {
                    permissionPromises.push(
                        channel.permissionOverwrites.edit(overwrite.id, textPermissions, { reason })
                    );
                } else if (channel.type === ChannelType.GuildVoice) {
                    permissionPromises.push(
                        channel.permissionOverwrites.edit(overwrite.id, voicePermissions, { reason })
                    );
                }
            }

            // Also apply to @everyone
            if (textChannelTypes.includes(channel.type)) {
                permissionPromises.push(
                    channel.permissionOverwrites.edit(interaction.guild.roles.everyone, textPermissions, { reason })
                );
            } else if (channel.type === ChannelType.GuildVoice) {
                permissionPromises.push(
                    channel.permissionOverwrites.edit(interaction.guild.roles.everyone, voicePermissions, { reason })
                );
            }

            await Promise.all(permissionPromises);

            // Save to database
            await Guild.updateOne(
                { guildId: interaction.guild.id },
                { 
                    $push: { 
                        lockedChannels: { 
                            channelId: channel.id, 
                            originalPermissions: originalPermissions 
                        } 
                    } 
                },
                { upsert: true }
            );

            const successEmbed = BotEmbeds.createLockSuccessEmbed(
                channel,
                reason,
                interaction.guild.id,
                interaction.user,
                lang
            );
            
            await interaction.editReply(successEmbed);

            // Envoyer dans les logs si configuré
            if (guildData && guildData.logs.enabled && guildData.logs.types.channels) {
                let logChannel = null;
                if (guildData.logs.channels && guildData.logs.channels.length > 0) {
                    const channelLogChannel = guildData.logs.channels.find(ch => ch.types.channels);
                    if (channelLogChannel) {
                        logChannel = interaction.guild.channels.cache.get(channelLogChannel.channelId);
                    }
                } else if (guildData.logs.channelId) {
                    logChannel = interaction.guild.channels.cache.get(guildData.logs.channelId);
                }

                if (logChannel) {
                    const { EmbedBuilder } = require('discord.js');
                    const logEmbed = new EmbedBuilder()
                        .setTitle('🔒 Salon verrouillé')
                        .setColor(0xFF6B00)
                        .addFields(
                            { name: '📁 Salon', value: `${channel} (${channel.name})`, inline: true },
                            { name: '👮 Modérateur', value: `${interaction.user} (${interaction.user.tag})`, inline: true },
                            { name: '📝 Raison', value: reason, inline: false }
                        )
                        .setTimestamp()
                        .setFooter({ text: `ID du salon: ${channel.id}` });

                    try {
                        await logChannel.send({ embeds: [logEmbed] });
                    } catch (logError) {
                        console.error('Erreur lors de l\'envoi du log de verrouillage:', logError);
                    }
                }
            }

        } catch (error) {
            console.error(error);
            const errorEmbed = BotEmbeds.createGenericErrorEmbed(
                'Une erreur est survenue lors du verrouillage du salon',
                interaction.guild.id,
                lang
            );
            await interaction.editReply({ embeds: [errorEmbed], ephemeral: true });
        }
    }
};