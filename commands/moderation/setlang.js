// commands/moderation/setlang.js
const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const Guild = require('../../models/Guild');
const BotEmbeds = require('../../utils/embeds');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setlang')
        .setDescription('Changer la langue du bot')
        .addStringOption(option =>
            option.setName('language')
                .setDescription('Langue à utiliser')
                .addChoices(
                    { name: 'Français', value: 'fr' },
                    { name: 'English', value: 'en' }
                )
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
    
    async execute(interaction) {
        const language = interaction.options.getString('language');

        // Récupérer la langue actuelle du serveur
        let guildData = await Guild.findOne({ guildId: interaction.guild.id });
        const currentLang = guildData?.language || 'fr';

        if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
            const errorResponse = BotEmbeds.createNoPermissionEmbed(interaction.guild.id, currentLang);
            return interaction.reply({ ...errorResponse, ephemeral: true, flags: MessageFlags.IsComponentsV2 });
        }

        try {
            await Guild.findOneAndUpdate(
                { guildId: interaction.guild.id },
                { language: language },
                { upsert: true }
            );

            await interaction.reply({ 
                components : [BotEmbeds.createSetlangSuccessEmbed(language, interaction.guild.id, language)],
                flags: MessageFlags.IsComponentsV2 });

        } catch (error) {
            console.error(error);
            const errorResponse = BotEmbeds.createSetlangErrorEmbed(error, interaction.guild.id, currentLang);
            await interaction.reply({ ...errorResponse, ephemeral: true, flags: MessageFlags.IsComponentsV2 });
        }
    }
};