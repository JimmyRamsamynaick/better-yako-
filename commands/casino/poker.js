const { SlashCommandBuilder } = require('discord.js');
const CasinoManager = require('../../utils/casinoManager');
const EconomyManager = require('../../utils/economyManager');
const LanguageManager = require('../../utils/languageManager');
const { ComponentsV3 } = require('../../utils/ComponentsV3');

const SUITS = ['♠️', '♣️', '♥️', '♦️'];
const VALUES = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

function createDeck() {
    const deck = [];
    for (const suit of SUITS) {
        for (const value of VALUES) {
            deck.push({ value, suit, rank: VALUES.indexOf(value) });
        }
    }
    return deck.sort(() => Math.random() - 0.5);
}

function evaluateHand(hand) {
    const ranks = hand.map(c => c.rank).sort((a, b) => a - b);
    const suits = hand.map(c => c.suit);
    
    const counts = {};
    ranks.forEach(r => counts[r] = (counts[r] || 0) + 1);
    const countValues = Object.values(counts).sort((a, b) => b - a);
    
    const isFlush = new Set(suits).size === 1;
    const isStraight = ranks.every((r, i) => i === 0 || r === ranks[i-1] + 1);
    
    if (isFlush && isStraight) return { rank: 'Quinte Flush', multiplier: 50 };
    if (countValues[0] === 4) return { rank: 'Carré', multiplier: 25 };
    if (countValues[0] === 3 && countValues[1] === 2) return { rank: 'Full', multiplier: 15 };
    if (isFlush) return { rank: 'Couleur', multiplier: 10 };
    if (isStraight) return { rank: 'Suite', multiplier: 7 };
    if (countValues[0] === 3) return { rank: 'Brelan', multiplier: 5 };
    if (countValues[0] === 2 && countValues[1] === 2) return { rank: 'Double Paire', multiplier: 3 };
    if (countValues[0] === 2) return { rank: 'Paire', multiplier: 2 };
    
    return { rank: 'Rien', multiplier: 0 };
}

function formatHand(hand) {
    return hand.map(c => `${c.value}${c.suit}`).join(' ');
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('poker')
        .setDescription('Obtenez la meilleure main de poker !')
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

        const deck = createDeck();
        const hand = [deck.pop(), deck.pop(), deck.pop(), deck.pop(), deck.pop()];

        // Animation de distribution
        for (let i = 1; i <= 5; i++) {
            const partialHand = hand.slice(0, i).map(c => `${c.value}${c.suit}`).join(' ') + ' 🂠'.repeat(5 - i);
            await interaction.editReply({ content: `🃏 **${LanguageManager.get(lang, 'casino.poker.hand', { cards: partialHand })}**` });
            await new Promise(resolve => setTimeout(resolve, 600));
        }

        const result = evaluateHand(hand);
        const handText = formatHand(hand);

        if (result.multiplier > 0) {
            const winAmount = bet * result.multiplier;
            await EconomyManager.addCoins(guildId, userId, winAmount);
            await CasinoManager.recordGame(guildId, userId, bet, winAmount - bet, true);
            const response = await ComponentsV3.createEmbed({
                guildId,
                titleKey: 'casino.poker.win',
                titlePlaceholders: { amount: winAmount },
                content: `${LanguageManager.get(lang, 'casino.poker.hand', { cards: handText })}\n${LanguageManager.get(lang, 'casino.poker.result', { rank: result.rank })}`,
                color: '#00FF00',
                ephemeral: false
            });
            return interaction.editReply(response);
        } else {
            await CasinoManager.recordGame(guildId, userId, bet, 0, false);
            const response = await ComponentsV3.createEmbed({
                guildId,
                titleKey: 'casino.poker.loss',
                titlePlaceholders: { amount: bet },
                content: `${LanguageManager.get(lang, 'casino.poker.hand', { cards: handText })}\n${LanguageManager.get(lang, 'casino.poker.result', { rank: result.rank })}`,
                color: '#FF0000',
                ephemeral: false
            });
            return interaction.editReply(response);
        }
    }
};
