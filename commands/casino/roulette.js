const { SlashCommandBuilder } = require('discord.js');
const CasinoManager = require('../../utils/casinoManager');
const EconomyManager = require('../../utils/economyManager');
const LanguageManager = require('../../utils/languageManager');
const { ComponentsV3 } = require('../../utils/ComponentsV3');

const ROULETTE_NUMBERS = [
    { num: 0, color: 'green' },
    { num: 1, color: 'red' }, { num: 2, color: 'black' }, { num: 3, color: 'red' }, { num: 4, color: 'black' }, { num: 5, color: 'red' }, { num: 6, color: 'black' },
    { num: 7, color: 'red' }, { num: 8, color: 'black' }, { num: 9, color: 'red' }, { num: 10, color: 'black' }, { num: 11, color: 'black' }, { num: 12, color: 'red' },
    { num: 13, color: 'black' }, { num: 14, color: 'red' }, { num: 15, color: 'black' }, { num: 16, color: 'red' }, { num: 17, color: 'black' }, { num: 18, color: 'red' },
    { num: 19, color: 'red' }, { num: 20, color: 'black' }, { num: 21, color: 'red' }, { num: 22, color: 'black' }, { num: 23, color: 'red' }, { num: 24, color: 'black' },
    { num: 25, color: 'red' }, { num: 26, color: 'black' }, { num: 27, color: 'red' }, { num: 28, color: 'black' }, { num: 29, color: 'black' }, { num: 30, color: 'red' },
    { num: 31, color: 'black' }, { num: 32, color: 'red' }, { num: 33, color: 'black' }, { num: 34, color: 'red' }, { num: 35, color: 'black' }, { num: 36, color: 'red' }
];

module.exports = {
    data: new SlashCommandBuilder()
        .setName('roulette')
        .setDescription('Pariez sur la roue de la fortune !')
        .addIntegerOption(option =>
            option.setName('mise')
                .setDescription('Le montant à parier')
                .setRequired(true)
                .setMinValue(100)
                .setMaxValue(10000))
        .addStringOption(option =>
            option.setName('choix')
                .setDescription('Votre pari (couleur, nombre, pair/impair)')
                .setRequired(true)),
    async execute(interaction) {
        await interaction.deferReply();

        const guildId = interaction.guild.id;
        const userId = interaction.user.id;
        const bet = interaction.options.getInteger('mise');
        const choice = interaction.options.getString('choix').toLowerCase();

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

        const spinningEmojis = ['🎡', '🔴', '⚫', '🟢', '⚪'];
        let animationMessage = `🎡 **${LanguageManager.get(lang, 'casino.roulette.spinning')}**\n`;
        
        // Animation de rotation (plusieurs étapes)
        for (let i = 0; i < 4; i++) {
            const emoji = spinningEmojis[i % spinningEmojis.length];
            const progress = '⬛'.repeat(i) + '⚪' + '⬛'.repeat(3 - i);
            await interaction.editReply({ 
                content: `${animationMessage}\n\`[ ${progress} ]\` ${emoji}` 
            });
            await new Promise(resolve => setTimeout(resolve, 800));
        }

        const winningNumberObj = ROULETTE_NUMBERS[Math.floor(Math.random() * ROULETTE_NUMBERS.length)];
        const { num, color } = winningNumberObj;

        let isWin = false;
        let multiplier = 0;

        if (choice === color) {
            isWin = true;
            multiplier = 2;
        } else if (choice === 'pair' || choice === 'even') {
            if (num !== 0 && num % 2 === 0) {
                isWin = true;
                multiplier = 2;
            }
        } else if (choice === 'impair' || choice === 'odd') {
            if (num % 2 !== 0) {
                isWin = true;
                multiplier = 2;
            }
        } else if (!isNaN(parseInt(choice)) && parseInt(choice) === num) {
            isWin = true;
            multiplier = 35;
        }

        const colorEmoji = color === 'red' ? '🔴' : (color === 'black' ? '⚫' : '🟢');
        const resultText = `**${num}** ${colorEmoji} (${color})`;
        
        // Message final de résultat
        const resultDisplay = LanguageManager.get(lang, 'casino.roulette.result', { result: num, color: `${colorEmoji} ${color}` });

        if (isWin) {
            const winAmount = bet * multiplier;
            await EconomyManager.addCoins(guildId, userId, winAmount);
            await CasinoManager.recordGame(guildId, userId, bet, winAmount - bet, true);
            const response = await ComponentsV3.createEmbed({
                guildId,
                titleKey: 'casino.roulette.win',
                titlePlaceholders: { amount: winAmount },
                additionalContent: [
                    { type: 'text', content: `\n🎯 **${resultDisplay}**\n` },
                    { type: 'divider' },
                    { type: 'text', content: `💰 **Gains :** +${winAmount} coins` }
                ],
                color: '#00FF00',
                ephemeral: false
            });
            return interaction.editReply({ content: '', ...response });
        } else {
            await CasinoManager.recordGame(guildId, userId, bet, 0, false);
            const response = await ComponentsV3.createEmbed({
                guildId,
                titleKey: 'casino.roulette.loss',
                titlePlaceholders: { amount: bet },
                additionalContent: [
                    { type: 'text', content: `\n🎯 **${resultDisplay}**\n` },
                    { type: 'divider' },
                    { type: 'text', content: `💸 **Pertes :** -${bet} coins` }
                ],
                color: '#FF0000',
                ephemeral: false
            });
            return interaction.editReply({ content: '', ...response });
        }
    }
};
