const { SlashCommandBuilder } = require('discord.js');
const Guild = require('../../models/Guild');
const LanguageManager = require('../../utils/languageManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('vote')
        .setDescription(LanguageManager.get('fr', 'commands.vote.description') || 'Voter pour le bot sur Top.gg')
        .setDescriptionLocalizations({
            'en-US': LanguageManager.get('en', 'commands.vote.description') || 'Vote for the bot on Top.gg'
        }),

    async execute(interaction) {
        try {
            const guildData = await Guild.findOne({ guildId: interaction.guild.id });
            const lang = guildData?.language || 'fr';

            const title = LanguageManager.get(lang, 'commands.vote.title') || (lang === 'en' ? '🗳️ Vote for YAKO' : '🗳️ Vote pour YAKO');
            const content = LanguageManager.get(lang, 'commands.vote.content') || (lang === 'en'
                ? 'Thanks for your support! Click the button below to open the Top.gg voting page.'
                : 'Merci de soutenir le bot ! Clique sur le bouton ci-dessous pour ouvrir la page de vote sur Top.gg.');
            const buttonLabel = LanguageManager.get(lang, 'commands.vote.button') || (lang === 'en' ? 'Vote on Top.gg' : 'Voter sur Top.gg');

            const voteUrl = 'https://top.gg/fr/bot/1396411539648544809/vote';

            await interaction.reply({
                embeds: [{
                    title,
                    description: content
                }],
                components: [
                    {
                        type: 1,
                        components: [
                            {
                                type: 2,
                                style: 5,
                                label: buttonLabel,
                                url: voteUrl,
                                emoji: { name: '🗳️' }
                            }
                        ]
                    }
                ],
                ephemeral: true
            });
        } catch (error) {
            console.error('[Vote] Command failed:', error);
            try {
                await interaction.reply({
                    embeds: [{ title: '❌ Erreur', description: error.message || 'Une erreur est survenue.' }],
                    ephemeral: true
                });
            } catch (_) {}
        }
    }
};