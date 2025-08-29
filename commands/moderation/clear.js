// commands/moderation/clear.js
const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const Guild = require('../../models/Guild');
const BotEmbeds = require('../../utils/embeds');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('clear')
        .setDescription('Supprimer des messages')
        .addIntegerOption(option =>
            option.setName('amount')
                .setDescription('Nombre de messages à supprimer (1-100)')
                .setMinValue(1)
                .setMaxValue(100)
                .setRequired(true))
        .addUserOption(option =>
            option.setName('user')
                .setDescription('Supprimer seulement les messages de cet utilisateur')
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
    
    async execute(interaction) {
        const amount = interaction.options.getInteger('amount');
        const targetUser = interaction.options.getUser('user');

        // Récupérer la langue du serveur
        const guildData = await Guild.findOne({ guildId: interaction.guild.id });
        const lang = guildData?.language || 'fr';

        // Vérifier les permissions de l'utilisateur
        if (!interaction.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
            const errorEmbed = BotEmbeds.createNoPermissionEmbed(interaction.guild.id, lang);
            return interaction.reply({ ...errorEmbed, ephemeral: true });
        }

        // Vérifier les permissions du bot
        if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.ManageMessages)) {
            const errorEmbed = BotEmbeds.createBotNoPermissionEmbed(interaction.guild.id, lang);
            return interaction.reply({ ...errorEmbed, ephemeral: true });
        }

        await interaction.deferReply({ ephemeral: true });

        try {
            const messages = await interaction.channel.messages.fetch({ limit: targetUser ? 100 : amount });
            
            let messagesToDelete;
            if (targetUser) {
                messagesToDelete = messages.filter(msg => msg.author.id === targetUser.id).first(amount);
            } else {
                messagesToDelete = messages.first(amount);
            }

            const deleted = await interaction.channel.bulkDelete(messagesToDelete, true);

            const successEmbed = BotEmbeds.createClearSuccessEmbed(
                deleted.size,
                targetUser,
                interaction.guild.id,
                lang
            );
            
            await interaction.editReply(successEmbed);

        } catch (error) {
            console.error(error);
            const errorEmbed = ComponentsV3.errorEmbed(interaction.guild.id, 'commands.clear.error');
            await interaction.editReply(errorEmbed);
        }
    }
};