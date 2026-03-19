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
        let bet = interaction.options.getInteger('mise');

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

        // Remove initial bet
        const removed = await EconomyManager.removeCoins(guildId, userId, bet);
        if (!removed) {
            return interaction.editReply({ content: LanguageManager.get(lang, 'casino.errors.insufficient_funds', { amount: bet }) });
        }

        await CasinoManager.setCooldown(userId, guildId);

        const deck = createDeck();
        let playerHands = [[deck.pop(), deck.pop()]];
        let currentHandIndex = 0;
        const dealerHand = [deck.pop(), deck.pop()];
        let dealerTotal = calculateHand(dealerHand);
        let isDouble = false;
        let bets = [bet];

        const getEmbed = () => {
            const fields = playerHands.map((hand, index) => ({
                name: (playerHands.length > 1 ? `✋ Main ${index + 1}${index === currentHandIndex ? ' (Active)' : ''}` : 'Votre main'),
                value: `${formatHand(hand)} (Total: **${calculateHand(hand)}**)${isDouble && playerHands.length === 1 ? ' [DOUBLE]' : ''}`,
                inline: false
            }));

            fields.push({
                name: 'Main du croupier',
                value: currentHandIndex < playerHands.length ? `${dealerHand[0].value}${dealerHand[0].suit} ? (Total: ?)` : `${formatHand(dealerHand)} (Total: **${dealerTotal}**)`,
                inline: false
            });

            return {
                title: LanguageManager.get(lang, 'casino.blackjack.description'),
                color: 0x2b2d31,
                fields: fields
            };
        };

        const getButtons = () => {
            const currentHand = playerHands[currentHandIndex];
            const currentTotal = calculateHand(currentHand);
            const canSplit = playerHands.length === 1 && currentHand.length === 2 && currentHand[0].value === currentHand[1].value;
            const canDouble = playerHands.length === 1 && currentHand.length === 2;

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('hit').setLabel(LanguageManager.get(lang, 'casino.blackjack.hit')).setStyle(ButtonStyle.Primary).setDisabled(currentTotal >= 21),
                new ButtonBuilder().setCustomId('stand').setLabel(LanguageManager.get(lang, 'casino.blackjack.stand')).setStyle(ButtonStyle.Secondary)
            );

            if (canDouble) {
                row.addComponents(new ButtonBuilder().setCustomId('double').setLabel(LanguageManager.get(lang, 'casino.blackjack.double')).setStyle(ButtonStyle.Success));
            }
            if (canSplit) {
                row.addComponents(new ButtonBuilder().setCustomId('split').setLabel(LanguageManager.get(lang, 'casino.blackjack.split')).setStyle(ButtonStyle.Danger));
            }

            return [row];
        };

        const msg = await interaction.editReply({ embeds: [getEmbed()], components: getButtons() });
        const collector = msg.createMessageComponentCollector({ componentType: ComponentType.Button, time: 60000 });

        collector.on('collect', async i => {
            if (i.user.id !== userId) return i.reply({ content: 'Pas votre jeu !', ephemeral: true });

            if (i.customId === 'hit') {
                playerHands[currentHandIndex].push(deck.pop());
                if (calculateHand(playerHands[currentHandIndex]) >= 21) {
                    if (currentHandIndex < playerHands.length - 1) {
                        currentHandIndex++;
                        await i.update({ embeds: [getEmbed()], components: getButtons() });
                    } else {
                        collector.stop('done');
                    }
                } else {
                    await i.update({ embeds: [getEmbed()], components: getButtons() });
                }
            } else if (i.customId === 'stand') {
                if (currentHandIndex < playerHands.length - 1) {
                    currentHandIndex++;
                    await i.update({ embeds: [getEmbed()], components: getButtons() });
                } else {
                    collector.stop('done');
                }
            } else if (i.customId === 'double') {
                const balance = await EconomyManager.getBalance(guildId, userId);
                if (balance < bet) return i.reply({ content: LanguageManager.get(lang, 'casino.errors.insufficient_funds', { amount: bet }), ephemeral: true });
                
                await EconomyManager.removeCoins(guildId, userId, bet);
                bets[0] *= 2;
                isDouble = true;
                playerHands[0].push(deck.pop());
                collector.stop('done');
            } else if (i.customId === 'split') {
                const balance = await EconomyManager.getBalance(guildId, userId);
                if (balance < bet) return i.reply({ content: LanguageManager.get(lang, 'casino.errors.insufficient_funds', { amount: bet }), ephemeral: true });

                await EconomyManager.removeCoins(guildId, userId, bet);
                const firstCard = playerHands[0].shift();
                const secondCard = playerHands[0].shift();
                playerHands = [[firstCard, deck.pop()], [secondCard, deck.pop()]];
                bets = [bet, bet];
                await i.update({ embeds: [getEmbed()], components: getButtons() });
            }
        });

        collector.on('end', async (collected, reason) => {
            // Dealer logic
            while (dealerTotal < 17) {
                dealerHand.push(deck.pop());
                dealerTotal = calculateHand(dealerHand);
            }

            let finalEmbed = getEmbed();
            let finalResults = [];
            let totalWin = 0;
            let totalLoss = 0;

            for (let i = 0; i < playerHands.length; i++) {
                const hand = playerHands[i];
                const total = calculateHand(hand);
                const currentBet = bets[i];
                let result = '';

                if (total > 21) {
                    result = LanguageManager.get(lang, 'casino.blackjack.bust');
                    totalLoss += currentBet;
                    await CasinoManager.recordGame(guildId, userId, currentBet, 0, false);
                    await Logger.log(interaction.guild, 'casino', '', { user: interaction.user, game: `Blackjack (Hand ${i+1})`, bet: currentBet, result: 'Bust', amount: currentBet });
                } else if (dealerTotal > 21 || total > dealerTotal) {
                    let winAmount = currentBet * 2;
                    if (total === 21 && hand.length === 2 && !isDouble && playerHands.length === 1) {
                        winAmount = Math.floor(currentBet * 2.5);
                        result = LanguageManager.get(lang, 'casino.blackjack.blackjack', { amount: winAmount });
                    } else {
                        result = LanguageManager.get(lang, 'casino.blackjack.win', { amount: winAmount });
                    }
                    totalWin += winAmount;
                    await EconomyManager.addCoins(guildId, userId, winAmount);
                    await CasinoManager.recordGame(guildId, userId, currentBet, winAmount - currentBet, true);
                    await Logger.log(interaction.guild, 'casino', '', { user: interaction.user, game: `Blackjack (Hand ${i+1})`, bet: currentBet, result: 'Win', amount: winAmount });
                } else if (total < dealerTotal) {
                    result = LanguageManager.get(lang, 'casino.blackjack.loss', { amount: currentBet });
                    totalLoss += currentBet;
                    await CasinoManager.recordGame(guildId, userId, currentBet, 0, false);
                    await Logger.log(interaction.guild, 'casino', '', { user: interaction.user, game: `Blackjack (Hand ${i+1})`, bet: currentBet, result: 'Loss', amount: currentBet });
                } else {
                    result = LanguageManager.get(lang, 'casino.blackjack.push');
                    await EconomyManager.addCoins(guildId, userId, currentBet);
                    await Logger.log(interaction.guild, 'casino', '', { user: interaction.user, game: `Blackjack (Hand ${i+1})`, bet: currentBet, result: 'Push', amount: 0 });
                }
                finalResults.push(`Main ${i + 1}: ${result}`);
            }

            finalEmbed.description = `**Résultats :**\n${finalResults.join('\n')}`;
            await interaction.editReply({ embeds: [finalEmbed], components: [] });
        });
    }
};
