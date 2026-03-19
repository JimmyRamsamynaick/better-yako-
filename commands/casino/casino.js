const { SlashCommandBuilder } = require('discord.js');
const LanguageManager = require('../../utils/languageManager');
const { ComponentsV3 } = require('../../utils/ComponentsV3');
const EconomyManager = require('../../utils/economyManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('casino')
        .setDescription('Affiche les jeux de casino disponibles'),
    async execute(interaction) {
        await interaction.deferReply();

        const guildId = interaction.guild.id;
        const lang = (await require('../../models/Guild').findOne({ guildId }))?.language || 'fr';
        const balance = await EconomyManager.getBalance(guildId, interaction.user.id);

        const games = [
            { name: '🪙 Coin Flip', description: LanguageManager.get(lang, 'casino.coinflip.description'), cmd: '`/coinflip`' },
            { name: '🃏 Blackjack', description: LanguageManager.get(lang, 'casino.blackjack.description'), cmd: '`/blackjack`' },
            { name: '♠️ Poker', description: LanguageManager.get(lang, 'casino.poker.description'), cmd: '`/poker`' },
            { name: '🎡 Roulette', description: LanguageManager.get(lang, 'casino.roulette.description'), cmd: '`/roulette`' },
            { name: '🎰 Slots', description: LanguageManager.get(lang, 'casino.slots.description'), cmd: '`/slots`' },
            { name: '💣 Mines', description: LanguageManager.get(lang, 'casino.mines.description'), cmd: '`/mines`' },
            { name: '🎯 Dice', description: LanguageManager.get(lang, 'casino.dice.description'), cmd: '`/dice`' }
        ];

        const response = await ComponentsV3.createEmbed({
            guildId,
            titleKey: 'casino.title',
            contentKey: 'casino.description',
            additionalContent: [
                { type: 'text', content: `\n${LanguageManager.get(lang, 'casino.balance', { balance })}\n` },
                { type: 'divider' },
                ...games.map(game => ({
                    type: 'text',
                    content: `**${game.name}**\n${game.description}\n👉 ${game.cmd}\n`
                }))
            ],
            color: '#FFD700',
            ephemeral: false
        });

        return interaction.editReply(response);
    }
};
