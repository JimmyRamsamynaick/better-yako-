// commands/public/ping.js
const { SlashCommandBuilder } = require('discord.js');
const Guild = require('../../models/Guild');
const BotEmbeds = require('../../utils/embeds');
const LanguageManager = require('../../utils/languageManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ping')
        .setDescription(LanguageManager.get('en', 'commands.ping.description') || 'Shows bot latency')
        .setDescriptionLocalizations({
            'en-US': LanguageManager.get('en', 'commands.ping.description') || 'Shows bot latency',
            'fr': LanguageManager.get('fr', 'commands.ping.description') || 'Affiche la latence du bot'
        }),
    
    async execute(interaction) {
        try {
            // Récupérer la langue du serveur
            const guildData = await Guild.findOne({ guildId: interaction.guild.id });
            const lang = guildData?.language || 'fr';

            const sent = await interaction.reply({ 
                content: '⏳ Calculating ping...', 
                fetchReply: true 
            });
            
            const latency = sent.createdTimestamp - interaction.createdTimestamp;
            const apiLatency = interaction.client.ws.ping;
            
            const pingEmbed = BotEmbeds.createPingEmbed(
                latency,
                apiLatency,
                interaction.guild.id,
                lang
            );
            
            await interaction.editReply({ 
                content: null,
                ...pingEmbed
            });
        } catch (error) {
            console.error('Erreur dans la commande ping:', error);
            await interaction.editReply({ 
                content: '❌ Une erreur est survenue lors du calcul de la latence.',
                components: []
            });
        }
    }
};