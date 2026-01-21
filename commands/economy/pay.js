const { SlashCommandBuilder } = require('discord.js');
const EconomyManager = require('../../utils/economyManager');
const { ComponentsV3 } = require('../../utils/ComponentsV3');
const LanguageManager = require('../../utils/languageManager');
const Guild = require('../../models/Guild');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('pay')
        .setDescription('Transférer des coins à un autre utilisateur')
        .addUserOption(option => 
            option.setName('user')
                .setDescription('L\'utilisateur à qui donner des coins')
                .setRequired(true))
        .addIntegerOption(option => 
            option.setName('amount')
                .setDescription('Le montant à transférer')
                .setMinValue(1)
                .setRequired(true)),
    
    async execute(interaction) {
        const target = interaction.options.getUser('user');
        const amount = interaction.options.getInteger('amount');
        const guildId = interaction.guild.id;

        // Récupérer la langue
        const guildData = await Guild.findOne({ guildId });
        const lang = guildData?.language || 'fr';

        // Vérifications de base
        if (target.id === interaction.user.id) {
            return interaction.reply(await ComponentsV3.errorEmbed(guildId, 'pay.error.self_transfer'));
        }

        if (target.bot) {
            return interaction.reply(await ComponentsV3.errorEmbed(guildId, 'pay.error.bot_transfer'));
        }

        const senderBalance = await EconomyManager.getBalance(guildId, interaction.user.id);
        if (senderBalance < amount) {
            return interaction.reply(await ComponentsV3.errorEmbed(guildId, 'pay.error.insufficient_funds', { balance: Math.floor(senderBalance), amount }));
        }

        // Effectuer le transfert
        // 1. Retirer au sender
        const removeResult = await EconomyManager.removeCoins(guildId, interaction.user.id, amount);
        if (!removeResult) {
            return interaction.reply(await ComponentsV3.errorEmbed(guildId, 'pay.error.transaction_failed'));
        }

        // 2. Ajouter au receiver
        await EconomyManager.addCoins(guildId, target.id, amount);

        // Confirmation
        const successMsg = LanguageManager.get(lang, 'pay.success.desc', { 
            sender: interaction.user.toString(),
            target: target.toString(),
            amount: amount
        });

        return interaction.reply(await ComponentsV3.successEmbed(guildId, 'pay.success.title', successMsg, false));
    }
};
