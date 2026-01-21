const { SlashCommandBuilder } = require('discord.js');
const EconomyManager = require('../../utils/economyManager');
const { ComponentsV3 } = require('../../utils/ComponentsV3');

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
        
        const response = await ComponentsV3.createEmbed({
            guildId: interaction.guild.id,
            titleKey: 'balance.title',
            titlePlaceholders: { user: target.username },
            contentKey: 'balance.content',
            contentPlaceholders: { amount: Math.floor(balance) },
            ephemeral: false
        });

        await interaction.reply(response);
    }
};
