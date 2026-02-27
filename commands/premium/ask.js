// commands/premium/ask.js
const { SlashCommandBuilder } = require('discord.js');
const Guild = require('../../models/Guild');
const useGemini = !!(process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY);
const AIService = useGemini ? require('../../utils/aiServiceGemini') : require('../../utils/aiService');
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
        const premiumValid = !!(guildData?.premium && (!guildData.premiumUntil || new Date(guildData.premiumUntil) > new Date()));
        if (!premiumValid) {
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
            const payload = BotEmbeds.createAskResponseEmbed(
                message,
                response,
                interaction.guild.id,
                lang
            );
            await interaction.editReply(payload);
            
        } catch (error) {
            console.error('Erreur lors de la génération de la réponse IA:', error);
            
            const errorPayload = BotEmbeds.createAskErrorEmbed(
                interaction.guild.id,
                lang
            );
            
            await interaction.editReply(errorPayload);
        }
    }
};
