const { SlashCommandBuilder } = require('discord.js');
const CasinoManager = require('../../utils/casinoManager');
const EconomyManager = require('../../utils/economyManager');
const LanguageManager = require('../../utils/languageManager');
const { ComponentsV3 } = require('../../utils/ComponentsV3');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('dice')
        .setDescription('Devinez le résultat du dé (1-6) !')
        .addIntegerOption(option =>
            option.setName('mise')
                .setDescription('Le montant à parier')
                .setRequired(true)
                .setMinValue(100)
                .setMaxValue(10000))
        .addIntegerOption(option =>
            option.setName('pronostic')
                .setDescription('Le nombre que vous devinez (1-6)')
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(6)),
    async execute(interaction) {
        await interaction.deferReply();

        const guildId = interaction.guild.id;
        const userId = interaction.user.id;
        const bet = interaction.options.getInteger('mise');
        const guess = interaction.options.getInteger('pronostic');

        const lang = (await require('../../models/Guild').findOne({ guildId }))?.language || 'fr';

        // Check Cooldown
        const cooldown = await CasinoManager.checkCooldown(userId, guildId);
        if (cooldown > 0) {
            return interaction.editReply({ 
                content: LanguageManager.get(lang, 'casino.cooldown', { time: cooldown }) 
            });
        }

        // Validate Bet
        const validation = await CasinoManager.validateBet(guildId, userId, bet);
        if (!validation.valid) {
            let errorMsg = '';
            if (validation.reason === 'insufficient_funds') {
                errorMsg = LanguageManager.get(lang, 'casino.errors.insufficient_funds', { amount: bet });
            } else if (validation.reason === 'min_bet') {
                errorMsg = LanguageManager.get(lang, 'casino.errors.min_bet', { amount: validation.amount });
            } else if (validation.reason === 'max_bet') {
                errorMsg = LanguageManager.get(lang, 'casino.errors.max_bet', { amount: validation.amount });
            }
            return interaction.editReply({ content: errorMsg });
        }

        CasinoManager.setCooldown(userId, guildId);

        // Remove Bet
        const removed = await EconomyManager.removeCoins(guildId, userId, bet);
        if (!removed) {
            return interaction.editReply({ content: LanguageManager.get(lang, 'casino.errors.insufficient_funds', { amount: bet }) });
        }

        // Animation
        await interaction.editReply({ content: `**${LanguageManager.get(lang, 'casino.dice.rolling')}**` });
        
        await new Promise(resolve => setTimeout(resolve, 2000));

        const result = Math.floor(Math.random() * 6) + 1;
        const isWin = result === guess;

        if (isWin) {
            const winAmount = bet * 6;
            await EconomyManager.addCoins(guildId, userId, winAmount);
            await CasinoManager.recordGame(guildId, userId, bet, winAmount - bet, true);
            const response = await ComponentsV3.createEmbed({
                guildId,
                titleKey: 'casino.dice.win',
                titlePlaceholders: { result, amount: winAmount },
                color: '#00FF00',
                ephemeral: false
            });
            return interaction.editReply(response);
        } else {
            await CasinoManager.recordGame(guildId, userId, bet, 0, false);
            const response = await ComponentsV3.createEmbed({
                guildId,
                titleKey: 'casino.dice.loss',
                titlePlaceholders: { result, amount: bet },
                color: '#FF0000',
                ephemeral: false
            });
            return interaction.editReply(response);
        }
    }
};
