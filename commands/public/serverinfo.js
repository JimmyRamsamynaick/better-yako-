// commands/public/serverinfo.js
const { SlashCommandBuilder } = require('discord.js');
const Guild = require('../../models/Guild');
const BotEmbeds = require('../../utils/embeds');
const LanguageManager = require('../../utils/languageManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('serverinfo')
        .setDescription(LanguageManager.get('fr', 'commands.serverinfo.description') || 'Afficher les informations du serveur')
        .setDescriptionLocalizations({
            'en-US': LanguageManager.get('en', 'commands.serverinfo.description') || 'Show server information'
        }),
    
    async execute(interaction) {
        // Récupérer la langue du serveur
        const guildData = await Guild.findOne({ guildId: interaction.guild.id });
        const lang = guildData?.language || 'fr';

        const guild = interaction.guild;
        
        try {
            // Récupérer le propriétaire du serveur
            const owner = await guild.fetchOwner();
            
            const serverInfoEmbed = BotEmbeds.createServerInfoEmbed(
                guild,
                owner,
                guild.id,
                lang
            );
            
            await interaction.reply(serverInfoEmbed);
        } catch (error) {
            console.error('Erreur lors de la récupération des informations du serveur:', error);
            await interaction.reply({ 
                content: LanguageManager.get(lang, 'errors.command_error') || 'Une erreur est survenue lors de l\'exécution de cette commande.', 
                ephemeral: true 
            });
        }
    }
};