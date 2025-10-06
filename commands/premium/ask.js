// commands/premium/ask.js
const { SlashCommandBuilder } = require('discord.js');
const Guild = require('../../models/Guild');
const AIService = require('../../utils/aiService');
const BotEmbeds = require('../../utils/embeds');
const LanguageManager = require('../../utils/languageManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ask')
        .setDescription(LanguageManager.get('fr', 'commands.ask.description') || 'Poser une question à l\'IA')
        .setDescriptionLocalizations({
            'en-US': LanguageManager.get('en', 'commands.ask.description') || 'Ask a question to the AI'
        })
        .addStringOption(option =>
            option.setName('message')
                .setDescription(LanguageManager.get('fr', 'commands.ask.message_option') || 'Votre question')
                .setDescriptionLocalizations({
                    'en-US': LanguageManager.get('en', 'commands.ask.message_option') || 'Your question'
                })
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
            const premiumRequiredEmbed = BotEmbeds.createPremiumRequiredEmbed(interaction.guild.id, lang);
            return interaction.reply({
                ...premiumRequiredEmbed,
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