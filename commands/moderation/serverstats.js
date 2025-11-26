const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const Guild = require('../../models/Guild');
const { ComponentsV3 } = require('../../utils/ComponentsV3');
const LanguageManager = require('../../utils/languageManager');
const ServerStats = require('../../utils/serverStats');

function safeLang(key, fallback, lang = 'fr') {
  const v = LanguageManager.get(lang, key);
  return (typeof v === 'string' && v.startsWith('[MISSING:')) ? fallback : v;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('serverstats')
    .setDescription('Configurer les salons de statistiques du serveur')
    .addSubcommand(sub =>
      sub
        .setName('setup')
        .setDescription('Créer la catégorie et les salons de stats')
        .addStringOption(o =>
          o.setName('type')
           .setDescription('Type de salons')
           .addChoices({ name: 'Vocaux', value: 'voice' }, { name: 'Textes', value: 'text' })
           .setRequired(true))
        .addBooleanOption(o => o.setName('total').setDescription('Afficher le total').setRequired(true))
        .addBooleanOption(o => o.setName('humains').setDescription('Afficher les humains').setRequired(true))
        .addBooleanOption(o => o.setName('bots').setDescription('Afficher les bots').setRequired(true))
        .addStringOption(o => o.setName('nomcategorie').setDescription('Nom de la catégorie').setRequired(false))
    )
    .addSubcommand(sub =>
      sub
        .setName('disable')
        .setDescription('Supprimer les salons de stats'))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction) {
    try {
      if (!interaction.deferred && !interaction.replied) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      }
    } catch (_) {
      try { await interaction.reply({ flags: MessageFlags.Ephemeral }); } catch (_) {}
    }
    const guildDoc = await Guild.findOne({ guildId: interaction.guild.id }) || { language: 'fr' };
    const lang = guildDoc.language || 'fr';

    if (!interaction.memberPermissions || !interaction.memberPermissions.has(PermissionFlagsBits.ManageGuild)) {
      const payload = await ComponentsV3.errorEmbed(interaction.guild.id, 'common.no_permission', {}, true, lang);
      return interaction.editReply(payload);
    }

    const sub = interaction.options.getSubcommand();
    if (sub === 'setup') {
      const type = interaction.options.getString('type');
      const showTotal = interaction.options.getBoolean('total');
      const showHumans = interaction.options.getBoolean('humains');
      const showBots = interaction.options.getBoolean('bots');
      const categoryName = interaction.options.getString('nomcategorie') || safeLang('commands.serverstats.default_category_name', 'SERVER STATS', lang);

      if (!showTotal && !showHumans && !showBots) {
        const err = await ComponentsV3.errorEmbed(interaction.guild.id, 'commands.serverstats.error_no_counter', {}, true, lang);
        return interaction.editReply(err);
      }

      const created = await ServerStats.setup(interaction, { type, showTotal, showHumans, showBots, categoryName });
      const msg = LanguageManager.get(lang, 'commands.serverstats.setup_success', { category: `<#${created.parentId}>` });
      const ok = await ComponentsV3.successEmbed(interaction.guild.id, 'commands.serverstats.success_title', msg, true, lang);
      return interaction.editReply(ok);
    }

    if (sub === 'disable') {
      const removed = await ServerStats.disable(interaction);
      if (!removed) {
        const err = await ComponentsV3.errorEmbed(interaction.guild.id, 'commands.serverstats.error_not_configured', {}, true, lang);
        return interaction.editReply(err);
      }
      const msg = LanguageManager.get(lang, 'commands.serverstats.disabled_success');
      const ok = await ComponentsV3.successEmbed(interaction.guild.id, 'commands.serverstats.success_title', msg, true, lang);
      return interaction.editReply(ok);
    }
  }
};
