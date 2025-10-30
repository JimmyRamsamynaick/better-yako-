// commands/public/vote.js
const { SlashCommandBuilder } = require('discord.js');
const Guild = require('../../models/Guild');
const { ComponentsV3 } = require('../../utils/ComponentsV3');
const LanguageManager = require('../../utils/languageManager');

const TOPGG_URL = 'https://top.gg/fr/bot/1396411539648544809/vote';

module.exports = {
    data: new SlashCommandBuilder()
        .setName('vote')
        .setDescription(LanguageManager.get('fr', 'commands.vote.description') || 'Voter pour le bot sur Top.gg')
        .setDescriptionLocalizations({
            'en-US': LanguageManager.get('en', 'commands.vote.description') || 'Vote for the bot on Top.gg'
        }),

    async execute(interaction) {
        // Récupérer la langue du serveur
        const guildData = await Guild.findOne({ guildId: interaction.guild.id });
        const lang = guildData?.language || 'fr';

        // Créer un message d'information (éphémère) SANS bouton Top.gg
        const infoPayload = await ComponentsV3.infoEmbed(
            interaction.guild.id,
            'commands.vote.title',
            'commands.vote.content',
            { url: TOPGG_URL },
            true,
            lang
        );

        await interaction.reply(infoPayload);
    }
};