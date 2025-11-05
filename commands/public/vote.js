// commands/public/vote.js
const { SlashCommandBuilder } = require('discord.js');
const Guild = require('../../models/Guild');
const LanguageManager = require('../../utils/languageManager');
const { ComponentsV3 } = require('../../utils/ComponentsV3');

const TOPGG_URL = 'https://top.gg/fr/bot/1396411539648544809/vote';

module.exports = {
  data: new SlashCommandBuilder()
    .setName('vote')
    .setDescription(
      LanguageManager.get('fr', 'commands.vote.description') || 'Voter pour le bot sur Top.gg'
    )
    .setDescriptionLocalizations({
      'en-US':
        LanguageManager.get('en', 'commands.vote.description') || 'Vote for the bot on Top.gg',
    }),

  async execute(interaction) {
    // Acquittement (message public)
    try {
      await interaction.deferReply();
    } catch (_) {}

    // Déterminer la langue du serveur (fallback fr)
    let lang = 'fr';
    try {
      const guildData = await Guild.findOne({ guildId: interaction.guild.id }).lean();
      lang = guildData?.language || 'fr';
    } catch (_) {}

    // Construire l'embed public (non éphémère)
    const payload = await ComponentsV3.createEmbed({
      guildId: interaction.guild.id,
      langOverride: lang,
      titleKey: 'commands.vote.title',
      contentKey: 'commands.vote.content',
      contentPlaceholders: { url: TOPGG_URL },
      ephemeral: false,
    });

    // Bouton lien Top.gg (public)
    const buttonLabel =
      LanguageManager.get(lang, 'commands.vote.button_label') ||
      (lang === 'en' ? 'Vote on Top.gg' : 'Voter sur Top.gg');
    const buttonRow = {
      type: 1,
      components: [
        {
          type: 2,
          label: buttonLabel,
          style: 5,
          url: TOPGG_URL,
          emoji: { name: '🗳️' },
        },
      ],
    };

    // Répondre avec embed public + bouton
    try {
      await interaction.editReply({ ...payload, components: [buttonRow] });
    } catch (err) {
      // Fallback compact si l’édition échoue
      try {
        await interaction.followUp({ ...payload, components: [buttonRow] });
      } catch (_) {}
    }
  },
};