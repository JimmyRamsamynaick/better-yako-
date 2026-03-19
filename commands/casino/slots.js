const { SlashCommandBuilder } = require('discord.js');
const CasinoManager = require('../../utils/casinoManager');
const EconomyManager = require('../../utils/economyManager');
const LanguageManager = require('../../utils/languageManager');
const { ComponentsV3 } = require('../../utils/ComponentsV3');

const SYMBOLS = ['🍒', '🍋', '💎', '🔔', '⭐'];

module.exports = {
    data: new SlashCommandBuilder()
        .setName('slots')
        .setDescription('Tentez votre chance à la machine à sous !')
        .addIntegerOption(option =>
            option.setName('mise')
                .setDescription('Le montant à parier')
                .setRequired(true)
                .setMinValue(100)
                .setMaxValue(10000)),
    async execute(interaction) {
        await interaction.deferReply();

        const guildId = interaction.guild.id;
        const userId = interaction.user.id;
        const bet = interaction.options.getInteger('mise');

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

        const s1 = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
        const s2 = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
        const s3 = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];

        await interaction.editReply({ content: LanguageManager.get(lang, 'casino.slots.spinning', { s1: '🌀', s2: '🌀', s3: '🌀' }) });
        await new Promise(resolve => setTimeout(resolve, 1000));
        await interaction.editReply({ content: LanguageManager.get(lang, 'casino.slots.spinning', { s1, s2: '🌀', s3: '🌀' }) });
        await new Promise(resolve => setTimeout(resolve, 1000));
        await interaction.editReply({ content: LanguageManager.get(lang, 'casino.slots.spinning', { s1, s2, s3: '🌀' }) });
        await new Promise(resolve => setTimeout(resolve, 1000));
        await interaction.editReply({ content: LanguageManager.get(lang, 'casino.slots.spinning', { s1, s2, s3 }) });

        let isWin = false;
        let multiplier = 0;
        let winKey = 'casino.slots.loss';

        if (s1 === s2 && s2 === s3) {
            isWin = true;
            // Différents multiplicateurs selon le symbole
            const multipliers = { '🍒': 10, '🍋': 15, '🔔': 20, '⭐': 30, '💎': 50 };
            multiplier = multipliers[s1] || 10;
            winKey = 'casino.slots.win';
        } else if (s1 === s2 || s2 === s3 || s1 === s3) {
            isWin = true;
            // Petit gain si 2 symboles identiques
            multiplier = 2;
            winKey = 'casino.slots.small_win';
        }

        if (isWin) {
            const winAmount = bet * multiplier;
            await EconomyManager.addCoins(guildId, userId, winAmount);
            await CasinoManager.recordGame(guildId, userId, bet, winAmount - bet, true);
            const response = await ComponentsV3.createEmbed({
                guildId,
                titleKey: winKey,
                titlePlaceholders: { amount: winAmount },
                color: '#00FF00',
                ephemeral: false
            });
            return interaction.followUp(response);
        } else {
            await CasinoManager.recordGame(guildId, userId, bet, 0, false);
            const response = await ComponentsV3.createEmbed({
                guildId,
                titleKey: winKey,
                titlePlaceholders: { amount: bet },
                color: '#FF0000',
                ephemeral: false
            });
            return interaction.followUp(response);
        }
    }
};
