// commands/public/serverinfo.js
const { SlashCommandBuilder } = require('discord.js');
const Guild = require('../../models/Guild');
const BotEmbeds = require('../../utils/embeds');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('serverinfo')
        .setDescription('Afficher les informations du serveur'),
    
    async execute(interaction) {
        // Récupérer la langue du serveur
        const guildData = await Guild.findOne({ guildId: interaction.guild.id });
        const lang = guildData?.language || 'fr';

        const guild = interaction.guild;
        
        const serverInfoEmbed = BotEmbeds.createServerInfoEmbed(
            guild,
            lang
        );
        
        await interaction.reply(serverInfoEmbed);
    }
};