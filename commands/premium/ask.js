// commands/premium/ask.js
const { SlashCommandBuilder } = require('discord.js');
const Guild = require('../../models/Guild');
const AIService = require('../../utils/aiService');
const BotEmbeds = require('../../utils/embeds');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ask')
        .setDescription('Poser une question à l\'IA')
        .addStringOption(option =>
            option.setName('message')
                .setDescription('Votre question')
                .setRequired(true)
                .setMaxLength(500)),
    
    cooldown: 10,
    
    async execute(interaction) {
        // Vérifier le statut premium
        const guildData = await Guild.findOne({ guildId: interaction.guild.id });
        
        // Récupérer la langue du serveur
        const lang = guildData?.language || 'fr';

        // Vérifier si le serveur a le premium
        if (!guildData.isPremium) {
            return interaction.reply({
                components: [BotEmbeds.createPremiumRequiredEmbed(interaction.guild.id, lang)],
                ephemeral: true
            });
        }

        const message = interaction.options.getString('message');
        
        await interaction.deferReply();

        try {
            const response = await AIService.generateResponse(message, interaction.user.id);
            
            const responseEmbed = BotEmbeds.createAskResponseEmbed(
                response,
                interaction.guild.id,
                lang
            );
            
            await interaction.editReply({ embeds: [responseEmbed] });
            
        } catch (error) {
            console.error('Erreur lors de la génération de la réponse IA:', error);
            
            const errorEmbed = BotEmbeds.createAskErrorEmbed(
                interaction.guild.id,
                lang
            );
            
            await interaction.editReply({ embeds: [errorEmbed] });
        }
    }
};