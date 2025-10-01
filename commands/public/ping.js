// commands/public/ping.js
const { SlashCommandBuilder } = require('discord.js');
const Guild = require('../../models/Guild');
const BotEmbeds = require('../../utils/embeds');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Vérifier la latence du bot'),
    
    async execute(interaction) {
        // Récupérer la langue du serveur
        const guildData = await Guild.findOne({ guildId: interaction.guild.id });
        const lang = guildData?.language || 'fr';

        // Récupérer la latence de l'API avant de faire la réponse
        // S'assurer que la valeur de ping est valide (supérieure à 0)
        const apiLatency = Math.max(1, Math.round(interaction.client.ws.ping));
        
        const sent = await interaction.reply({ 
            content: '⏳ Calculating ping...', 
            fetchReply: true 
        });
        
        const latency = sent.createdTimestamp - interaction.createdTimestamp;
        
        const pingEmbed = BotEmbeds.createPingEmbed(
            latency,
            apiLatency,
            interaction.guild.id,
            lang
        );
        
        await interaction.editReply({ 
            content: null, // Supprimer le contenu précédent
            ...pingEmbed 
        });
    }
};