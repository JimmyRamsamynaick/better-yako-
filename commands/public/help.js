// commands/public/help.js
const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const BotEmbeds = require('../../utils/embeds');
const Guild = require('../../models/Guild');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('Afficher la liste des commandes')
        .addStringOption(option =>
            option.setName('category')
                .setDescription('Catégorie de commandes')
                .addChoices(
                    { name: 'Modération', value: 'moderation' },
                    { name: 'Public', value: 'public' },
                    { name: 'Premium', value: 'premium' }
                )),
    
    async execute(interaction) {
        const category = interaction.options.getString('category');
        
        // Récupération de la langue du serveur
        const guildData = await Guild.findOne({ guildId: interaction.guild.id }) || { language: 'fr' };
        const lang = guildData.language || 'fr';
        
        const helpEmbed = BotEmbeds.createHelpEmbed(category, lang);
        
        await interaction.reply({ 
            ...helpEmbed,
            flags: MessageFlags.IsComponentsV2 
        });
    },

    async handleSelectMenuInteraction(interaction) {
        if (interaction.customId !== 'help_category_select') return;
        
        const selectedCategory = interaction.values[0];
        
        // Récupération de la langue du serveur
        const guildData = await Guild.findOne({ guildId: interaction.guild.id }) || { language: 'fr' };
        const lang = guildData.language || 'fr';
        
        const helpEmbed = BotEmbeds.createHelpEmbed(selectedCategory, lang);
        
        await interaction.update({ 
            ...helpEmbed,
            flags: MessageFlags.IsComponentsV2 
        });
    }
};