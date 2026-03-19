const { SlashCommandBuilder } = require('discord.js');
const CasinoManager = require('../../utils/casinoManager');
const LanguageManager = require('../../utils/languageManager');
const { ComponentsV3 } = require('../../utils/ComponentsV3');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('stats_casino')
        .setDescription('Affiche vos statistiques au casino')
        .addUserOption(option => 
            option.setName('user')
                .setDescription('L\'utilisateur dont vous voulez voir les stats')
                .setRequired(false)),
    async execute(interaction) {
        await interaction.deferReply();

        const guildId = interaction.guild.id;
        const target = interaction.options.getUser('user') || interaction.user;
        const stats = await CasinoManager.getStats(guildId, target.id);
        const lang = (await require('../../models/Guild').findOne({ guildId }))?.language || 'fr';

        const profit = stats.totalGains - stats.totalLosses;
        const profitSign = profit >= 0 ? '📈' : '📉';

        const content = `**${LanguageManager.get(lang, 'casino.stats.games_played')}:** \`${stats.gamesPlayed}\`\n` +
                        `**${LanguageManager.get(lang, 'casino.stats.total_gains')}:** \`${stats.totalGains}\` 🪙\n` +
                        `**${LanguageManager.get(lang, 'casino.stats.total_losses')}:** \`${stats.totalLosses}\` 🪙\n` +
                        `**${LanguageManager.get(lang, 'casino.stats.net_profit')}:** \`${profitSign} ${profit}\` 🪙`;

        const response = await ComponentsV3.createEmbed({
            guildId,
            titleKey: 'casino.stats.title',
            titlePlaceholders: { user: target.username },
            additionalContent: [
                { type: 'text', content: content },
                { type: 'divider' }
            ],
            color: profit >= 0 ? '#00FF00' : '#FF0000',
            ephemeral: false
        });

        return interaction.editReply(response);
    }
};
