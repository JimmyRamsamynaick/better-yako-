// commands/moderation/lock.js
const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const Guild = require('../../models/Guild');
const BotEmbeds = require('../../utils/embeds');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('lock')
        .setDescription('Verrouiller un salon')
        .addChannelOption(option =>
            option.setName('channel')
                .setDescription('Le salon à verrouiller')
                .addChannelTypes(ChannelType.GuildText, ChannelType.GuildVoice)
                .setRequired(false))
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('Raison du verrouillage')
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
                    SendMessages: false,
                    AddReactions: false,
                    CreatePublicThreads: false,
                    CreatePrivateThreads: false,
                    SendMessagesInThreads: false
                }, { reason });
            } else if (channel.type === ChannelType.GuildVoice) {
                await channel.permissionOverwrites.edit(everyone, {
                    Connect: false
                }, { reason });
            }

            const successEmbed = BotEmbeds.createLockSuccessEmbed(
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
            await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }
    }
};