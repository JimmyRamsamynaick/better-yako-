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
        const reason = interaction.options.getString('reason') || 'Aucune raison fournie';

        // Vérifier les permissions de l'utilisateur
        if (!interaction.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
            return interaction.reply({
                embeds: [BotEmbeds.createNoPermissionEmbed(interaction.guild.id, lang)],
                ephemeral: true
            });
        }

        // Vérifier les permissions du bot
        if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.ManageChannels)) {
            return interaction.reply({
                embeds: [BotEmbeds.createBotNoPermissionEmbed(interaction.guild.id, lang)],
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
                lang
            );
            
            await interaction.reply({ embeds: [successEmbed] });

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