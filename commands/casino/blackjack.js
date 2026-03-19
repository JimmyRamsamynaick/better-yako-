const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const CasinoManager = require('../../utils/casinoManager');
const EconomyManager = require('../../utils/economyManager');
const LanguageManager = require('../../utils/languageManager');
const { ComponentsV3 } = require('../../utils/ComponentsV3');
const Logger = require('../../utils/logger');

const SUITS = ['♠️', '♣️', '♥️', '♦️'];
const VALUES = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

function createDeck() {
    const deck = [];
    for (const suit of SUITS) {
        for (const value of VALUES) {
            deck.push({ value, suit });
        }
    }
    return deck.sort(() => Math.random() - 0.5);
}

function calculateHand(hand) {
    let total = 0;
    let aces = 0;
    for (const card of hand) {
        if (['J', 'Q', 'K'].includes(card.value)) total += 10;
        else if (card.value === 'A') {
            total += 11;
            aces++;
        } else total += parseInt(card.value);
    }
    while (total > 21 && aces > 0) {
        total -= 10;
        aces--;
    }
    return total;
}

function formatHand(hand) {
    return hand.map(c => `${c.value}${c.suit}`).join(' ');
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('blackjack')
        .setDescription('Battez le croupier sans dépasser 21 !')
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

        // Remove Bet first
        const removed = await EconomyManager.removeCoins(guildId, userId, bet);
        if (!removed) {
            return interaction.editReply({ content: LanguageManager.get(lang, 'casino.errors.insufficient_funds', { amount: bet }) });
        }

        await CasinoManager.setCooldown(userId, guildId);

        const deck = createDeck();
        const playerHand = [deck.pop(), deck.pop()];
        const dealerHand = [deck.pop(), deck.pop()];

        let playerTotal = calculateHand(playerHand);
        let dealerTotal = calculateHand(dealerHand);

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder().setCustomId('hit').setLabel(LanguageManager.get(lang, 'casino.blackjack.hit')).setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId('stand').setLabel(LanguageManager.get(lang, 'casino.blackjack.stand')).setStyle(ButtonStyle.Secondary)
            );

        const embedData = {
            title: LanguageManager.get(lang, 'casino.blackjack.description'),
            color: 0x2b2d31,
            fields: [
                { name: LanguageManager.get(lang, 'casino.blackjack.player_hand', { cards: formatHand(playerHand), total: playerTotal }), value: '\u200b' },
                { name: LanguageManager.get(lang, 'casino.blackjack.dealer_hand', { cards: `${dealerHand[0].value}${dealerHand[0].suit} ?`, total: '?' }), value: '\u200b' }
            ]
        };

        const response = await interaction.editReply({ embeds: [embedData], components: [row] });

        const collector = response.createMessageComponentCollector({ componentType: ComponentType.Button, time: 60000 });

        collector.on('collect', async i => {
            if (i.user.id !== userId) return i.reply({ content: 'Pas votre jeu !', ephemeral: true });

            if (i.customId === 'hit') {
                playerHand.push(deck.pop());
                playerTotal = calculateHand(playerHand);

                if (playerTotal > 21) {
                    collector.stop('bust');
                } else {
                    embedData.fields[0].name = LanguageManager.get(lang, 'casino.blackjack.player_hand', { cards: formatHand(playerHand), total: playerTotal });
                    await i.update({ embeds: [embedData] });
                }
            } else if (i.customId === 'stand') {
                collector.stop('stand');
            }
        });

        collector.on('end', async (collected, reason) => {
            // Dealer logic
            while (dealerTotal < 17) {
                dealerHand.push(deck.pop());
                dealerTotal = calculateHand(dealerHand);
            }

            let resultMsg = '';
            let winAmount = 0;
            let isWin = false;
            let isPush = false;

            if (reason === 'bust') {
                resultMsg = LanguageManager.get(lang, 'casino.blackjack.bust');
                await CasinoManager.recordGame(guildId, userId, bet, 0, false);
                await Logger.log(interaction.guild, 'casino', '', { user: interaction.user, game: 'Blackjack', bet, result: 'Bust', amount: bet });
            } else if (playerTotal > 21) {
                resultMsg = LanguageManager.get(lang, 'casino.blackjack.bust');
                await CasinoManager.recordGame(guildId, userId, bet, 0, false);
                await Logger.log(interaction.guild, 'casino', '', { user: interaction.user, game: 'Blackjack', bet, result: 'Bust', amount: bet });
            } else if (dealerTotal > 21 || playerTotal > dealerTotal) {
                // Check for Blackjack
                if (playerTotal === 21 && playerHand.length === 2) {
                    winAmount = Math.floor(bet * 2.5);
                    resultMsg = LanguageManager.get(lang, 'casino.blackjack.blackjack', { amount: winAmount });
                } else {
                    winAmount = bet * 2;
                    resultMsg = LanguageManager.get(lang, 'casino.blackjack.win', { amount: winAmount });
                }
                isWin = true;
                await EconomyManager.addCoins(guildId, userId, winAmount);
                await CasinoManager.recordGame(guildId, userId, bet, winAmount - bet, true);
                await Logger.log(interaction.guild, 'casino', '', { user: interaction.user, game: 'Blackjack', bet, result: 'Win', amount: winAmount });
            } else if (playerTotal < dealerTotal) {
                resultMsg = LanguageManager.get(lang, 'casino.blackjack.loss', { amount: bet });
                await CasinoManager.recordGame(guildId, userId, bet, 0, false);
                await Logger.log(interaction.guild, 'casino', '', { user: interaction.user, game: 'Blackjack', bet, result: 'Loss', amount: bet });
            } else {
                resultMsg = LanguageManager.get(lang, 'casino.blackjack.push');
                isPush = true;
                await EconomyManager.addCoins(guildId, userId, bet); // Return bet
                await Logger.log(interaction.guild, 'casino', '', { user: interaction.user, game: 'Blackjack', bet, result: 'Push', amount: 0 });
            }

            embedData.fields[0].name = LanguageManager.get(lang, 'casino.blackjack.player_hand', { cards: formatHand(playerHand), total: playerTotal });
            embedData.fields[1].name = LanguageManager.get(lang, 'casino.blackjack.dealer_hand', { cards: formatHand(dealerHand), total: dealerTotal });
            embedData.description = `**${resultMsg}**`;
            
            await interaction.editReply({ embeds: [embedData], components: [] });
        });
    }
};
