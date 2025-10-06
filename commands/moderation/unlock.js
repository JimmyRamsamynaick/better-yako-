// commands/moderation/unlock.js
const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const Guild = require('../../models/Guild');
const BotEmbeds = require('../../utils/embeds');
const LanguageManager = require('../../utils/languageManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('unlock')
        .setDescription(LanguageManager.get('fr', 'commands.unlock.description') || 'Déverrouiller un salon')
        .setDescriptionLocalizations({
            'en-US': LanguageManager.get('en', 'commands.unlock.description') || 'Unlock a channel'
        })
        .addChannelOption(option =>
            option.setName('channel')
                .setDescription(LanguageManager.get('fr', 'commands.unlock.channel_option') || 'Le salon à déverrouiller')
                .setDescriptionLocalizations({
                    'en-US': LanguageManager.get('en', 'commands.unlock.channel_option') || 'The channel to unlock'
                })
                .addChannelTypes(ChannelType.GuildText, ChannelType.GuildVoice)
                .setRequired(false))
        .addStringOption(option =>
            option.setName('reason')
                .setDescription(LanguageManager.get('fr', 'commands.unlock.reason_option') || 'Raison du déverrouillage')
                .setDescriptionLocalizations({
                    'en-US': LanguageManager.get('en', 'commands.unlock.reason_option') || 'Reason for the unlock'
                })
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),
    
    async execute(interaction) {
        // Récupérer la langue du serveur
        const guildData = await Guild.findOne({ guildId: interaction.guild.id });
        const lang = guildData?.language || 'fr';

        const channel = interaction.options.getChannel('channel') || interaction.channel;
        const reason = interaction.options.getString('reason') || require('../../utils/languageManager').get(lang, 'common.no_reason');

        // Vérifier les permissions de l'utilisateur
        if (!interaction.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
            const noPermEmbed = BotEmbeds.createNoPermissionEmbed(interaction.guild.id, lang);
            return interaction.reply({
                ...noPermEmbed,
                ephemeral: true
            });
        }

        // Vérifier les permissions du bot
        if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.ManageChannels)) {
            const botNoPermEmbed = BotEmbeds.createBotNoPermissionEmbed(interaction.guild.id, lang);
            return interaction.reply({
                ...botNoPermEmbed,
                ephemeral: true
            });
        }

        try {
            const everyone = interaction.guild.roles.everyone;

            if (channel.type === ChannelType.GuildText) {
                await channel.permissionOverwrites.edit(everyone, {
                    SendMessages: null,
                    AddReactions: null,
                    CreatePublicThreads: null,
                    CreatePrivateThreads: null,
                    SendMessagesInThreads: null
                }, { reason });
            } else if (channel.type === ChannelType.GuildVoice) {
                await channel.permissionOverwrites.edit(everyone, {
                    Connect: null
                }, { reason });
            }

            const successEmbed = BotEmbeds.createUnlockSuccessEmbed(
                channel,
                reason,
                interaction.guild.id,
                interaction.user,
                lang
            );
            
            await interaction.reply(successEmbed);

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
                        .setTitle('🔓 Salon déverrouillé')
                        .setColor(0x00FF00)
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
                        console.error('Erreur lors de l\'envoi du log de déverrouillage:', logError);
                    }
                }
            }

        } catch (error) {
            console.error(error);
            const errorEmbed = BotEmbeds.createGenericErrorEmbed(
                'Une erreur est survenue lors du déverrouillage du salon',
                interaction.guild.id,
                lang
            );
            await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }
    }
};