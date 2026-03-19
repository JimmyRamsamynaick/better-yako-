const { SlashCommandBuilder } = require('discord.js');
const CasinoManager = require('../../utils/casinoManager');
const EconomyManager = require('../../utils/economyManager');
const LanguageManager = require('../../utils/languageManager');
const { ComponentsV3 } = require('../../utils/ComponentsV3');
const Logger = require('../../utils/logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('coinflip')
        .setDescription('Jouez à pile ou face et doublez votre mise !')
        .setDescriptionLocalizations({
            'en-US': 'Play heads or tails and double your bet!',
            'en-GB': 'Play heads or tails and double your bet!'
        })
        .addIntegerOption(option =>
            option.setName('mise')
                .setDescription('Le montant à parier')
                .setRequired(true)
                .setMinValue(100)
                .setMaxValue(10000))
        .addStringOption(option =>
            option.setName('choix')
                .setDescription('Pile ou Face')
                .setRequired(true)
                .addChoices(
                    { name: 'Pile', value: 'heads' },
                    { name: 'Face', value: 'tails' }
                )),
    async execute(interaction) {
        await interaction.deferReply();

        const guildId = interaction.guild.id;
        const userId = interaction.user.id;
        const bet = interaction.options.getInteger('mise');
        const choice = interaction.options.getString('choix');

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

        // Remove Bet first
        const removed = await EconomyManager.removeCoins(guildId, userId, bet);
        if (!removed) {
            return interaction.editReply({ content: LanguageManager.get(lang, 'casino.errors.insufficient_funds', { amount: bet }) });
        }

        // Animation
        await interaction.editReply({ content: `**${LanguageManager.get(lang, 'casino.coinflip.flipping')}**` });
        
        await new Promise(resolve => setTimeout(resolve, 2000));

        // RNG (48/52 for house edge)
        const isWin = Math.random() < 0.48;
        const result = isWin ? choice : (choice === 'heads' ? 'tails' : 'heads');

        const resultLabel = LanguageManager.get(lang, `casino.coinflip.${result}`);
        
        if (isWin) {
            const winAmount = bet * 2;
            await EconomyManager.addCoins(guildId, userId, winAmount);
            await CasinoManager.recordGame(guildId, userId, bet, winAmount - bet, true);
            await Logger.log(interaction.guild, 'casino', '', { user: interaction.user, game: 'Coinflip', bet, result: 'Win', amount: winAmount });
            const response = await ComponentsV3.createEmbed({
                guildId,
                titleKey: 'casino.coinflip.win',
                titlePlaceholders: { result: resultLabel, amount: winAmount },
                color: '#00FF00',
                ephemeral: false
            });
            return interaction.editReply(response);
        } else {
            await CasinoManager.recordGame(guildId, userId, bet, 0, false);
            await Logger.log(interaction.guild, 'casino', '', { user: interaction.user, game: 'Coinflip', bet, result: 'Loss', amount: bet });
            const response = await ComponentsV3.createEmbed({
                guildId,
                titleKey: 'casino.coinflip.loss',
                titlePlaceholders: { result: resultLabel, amount: bet },
                color: '#FF0000',
                ephemeral: false
            });
            return interaction.editReply(response);
        }
    }
};
