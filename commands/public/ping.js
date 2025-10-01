// commands/public/ping.js
const { SlashCommandBuilder } = require('discord.js');
const Guild = require('../../models/Guild');
const BotEmbeds = require('../../utils/embeds');
const LanguageManager = require('../../utils/languageManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ping')
        .setDescription(LanguageManager.get('fr', 'commands.ping.description') || 'Vérifier la latence du bot')
        .setDescriptionLocalizations({
            'en': LanguageManager.get('en', 'commands.ping.description') || 'Check bot latency'
        }),
    
    async execute(interaction) {
        // Récupérer la langue du serveur
        const guildData = await Guild.findOne({ guildId: interaction.guild.id });
        const lang = guildData?.language || 'fr';

        // On n'utilise plus la latence de l'API
        
        const sent = await interaction.reply({ 
            content: '⏳ Calculating ping...', 
            fetchReply: true 
        });
        
        const latency = sent.createdTimestamp - interaction.createdTimestamp;
        
        const pingEmbed = BotEmbeds.createPingEmbed(
            latency,
            null, // On n'utilise plus la latence de l'API
            interaction.guild.id,
            lang
        );
        
        await interaction.editReply({ 
            content: null, // Supprimer le contenu précédent
            ...pingEmbed 
        });
    }
};