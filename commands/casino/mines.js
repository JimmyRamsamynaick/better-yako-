const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const CasinoManager = require('../../utils/casinoManager');
const EconomyManager = require('../../utils/economyManager');
const LanguageManager = require('../../utils/languageManager');
const { ComponentsV3 } = require('../../utils/ComponentsV3');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('mines')
        .setDescription('Évitez les bombes pour multiplier vos gains !')
        .addIntegerOption(option =>
            option.setName('mise')
                .setDescription('Le montant à parier')
                .setRequired(true)
                .setMinValue(100)
                .setMaxValue(10000))
        .addIntegerOption(option =>
            option.setName('mines')
                .setDescription('Nombre de mines (1-24)')
                .setRequired(false)
                .setMinValue(1)
                .setMaxValue(24)),
    async execute(interaction) {
        await interaction.deferReply();

        const guildId = interaction.guild.id;
        const userId = interaction.user.id;
        const bet = interaction.options.getInteger('mise');
        const mineCount = interaction.options.getInteger('mines') || 3;

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

        const grid = Array(25).fill(false);
        let minesPlaced = 0;
        while (minesPlaced < mineCount) {
            const index = Math.floor(Math.random() * 25);
            if (!grid[index]) {
                grid[index] = true;
                minesPlaced++;
            }
        }

        let revealed = Array(25).fill(false);
        let currentMultiplier = 1;
        let hits = 0;

        function getMultiplier(h, m) {
            // Formula for multiplier
            let mult = 1;
            for (let i = 0; i < h; i++) {
                mult *= (25 - i) / (25 - m - i);
            }
            return mult * 0.95; // House edge
        }

        function createGrid(showMines = false) {
            const rows = [];
            // Group the 25 buttons into 5 rows (ActionRows)
            for (let i = 0; i < 5; i++) {
                const row = new ActionRowBuilder();
                for (let j = 0; j < 5; j++) {
                    const index = i * 5 + j;
                    let label = '?';
                    let style = ButtonStyle.Secondary;
                    let disabled = false;

                    if (revealed[index]) {
                        label = '💎';
                        style = ButtonStyle.Success;
                        disabled = true;
                    } else if (showMines && grid[index]) {
                        label = '💣';
                        style = ButtonStyle.Danger;
                        disabled = true;
                    } else if (showMines) {
                        disabled = true;
                    }

                    const btn = new ButtonBuilder()
                        .setCustomId(`mine_${index}`)
                        .setLabel(label)
                        .setStyle(style)
                        .setDisabled(disabled);
                    row.addComponents(btn);
                }
                rows.push(row);
            }
            
            const cashoutBtn = new ButtonBuilder()
                .setCustomId('cashout')
                .setLabel(`💰 ${Math.floor(bet * currentMultiplier)}`)
                .setStyle(ButtonStyle.Primary)
                .setDisabled(showMines);
            
            // Replace the last component of the last row
            rows[4].components[4] = cashoutBtn;
            
            return rows;
        }

        const response = await interaction.editReply({ 
            content: `💣 **${LanguageManager.get(lang, 'casino.mines.grid')}** (Mines: ${mineCount})`,
            components: createGrid() 
        });

        const collector = response.createMessageComponentCollector({ componentType: ComponentType.Button, time: 300000 });

        let explodedIndex = -1;

        collector.on('collect', async i => {
            if (i.user.id !== userId) return i.reply({ content: 'Pas votre jeu !', ephemeral: true });

            if (i.customId === 'cashout') {
                await i.deferUpdate();
                collector.stop('cashout');
            } else if (i.customId.startsWith('mine_')) {
                const index = parseInt(i.customId.split('_')[1]);
                if (grid[index]) {
                    explodedIndex = index;
                    await i.deferUpdate();
                    collector.stop('boom');
                } else {
                    revealed[index] = true;
                    hits++;
                    currentMultiplier = getMultiplier(hits, mineCount);
                    await i.update({ components: createGrid() });
                }
            }
        });

        collector.on('end', async (collected, reason) => {
            if (reason === 'boom') {
                await CasinoManager.recordGame(guildId, userId, bet, 0, false);
                await interaction.editReply({ 
                    content: LanguageManager.get(lang, 'casino.mines.hit_mine', { amount: bet }),
                    components: createGrid(true) 
                });
            } else if (reason === 'cashout' || reason === 'time') {
                const winAmount = Math.floor(bet * currentMultiplier);
                await EconomyManager.addCoins(guildId, userId, winAmount);
                await CasinoManager.recordGame(guildId, userId, bet, winAmount - bet, true);
                await interaction.editReply({ 
                    content: LanguageManager.get(lang, 'casino.mines.cashout', { amount: winAmount }),
                    components: createGrid(true)
                });
            }
        });
    }
};
