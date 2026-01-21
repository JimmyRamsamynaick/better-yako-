const { SlashCommandBuilder } = require('discord.js');
const EconomyManager = require('../../utils/economyManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('balance')
        .setDescription('Affiche votre solde de coins')
        .addUserOption(option => 
            option.setName('user')
                .setDescription('L\'utilisateur dont vous voulez voir le solde')
                .setRequired(false)),
    async execute(interaction) {
        const target = interaction.options.getUser('user') || interaction.user;
        const balance = await EconomyManager.getBalance(interaction.guild.id, target.id);
        
        await interaction.reply({ 
            content: `💰 **Solde de ${target.username}** : ${Math.floor(balance)} coins`,
            ephemeral: false 
        });
    }
};