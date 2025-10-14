// commands/moderation/warnlist.js
const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const Guild = require('../../models/Guild');
const LanguageManager = require('../../utils/languageManager');
const { ComponentsV3 } = require('../../utils/ComponentsV3');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('warnlist')
    .setDescription(LanguageManager.get('fr', 'commands.warnlist.description') || 'Lister les membres ayant des avertissements')
    .setDescriptionLocalizations({
      'en-US': LanguageManager.get('en', 'commands.warnlist.description') || 'List members with warnings'
    })
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async execute(interaction) {
    const lang = 'fr';
    if (!interaction.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
      const payload = await ComponentsV3.errorEmbed(interaction.guild.id, 'commands.warn.no_permission', {}, false, lang);
      return interaction.reply(payload);
    }

    try { await interaction.deferReply(); } catch (_) {}

    let guild = await Guild.findOne({ guildId: interaction.guild.id });
    if (!guild) { guild = new Guild({ guildId: interaction.guild.id }); await guild.save(); }

    const warnedUsers = (guild.users || []).filter(u => Array.isArray(u.warnings) && u.warnings.length > 0);

    if (warnedUsers.length === 0) {
      const payload = await ComponentsV3.infoEmbed(
        interaction.guild.id,
        'commands.warnlist.title',
        'commands.warnlist.empty',
        {},
        false,
        guild.language || lang
      );
      return interaction.editReply(payload);
    }

    // Construire la liste avec mention et nombre d’avertissements
    const lines = warnedUsers.map(u => {
      const count = u.warnings.length;
      const mention = `<@${u.userId}>`;
      const date = u.warnings[count - 1]?.date ? new Date(u.warnings[count - 1].date).toLocaleString() : '';
      return `${mention} — ${count} ${LanguageManager.get(guild.language || lang, 'commands.warnlist.warn_count_label', { count: String(count) })}${date ? ` • ${LanguageManager.get(guild.language || lang, 'common.date')}: ${date}` : ''}`;
    });

    const payload = await ComponentsV3.createEmbed({
      guildId: interaction.guild.id,
      titleKey: 'commands.warnlist.title',
      contentKey: 'commands.warnlist.header',
      contentPlaceholders: { total: String(warnedUsers.length) },
      additionalContent: lines,
      ephemeral: false,
      langOverride: guild.language || lang
    });

    return interaction.editReply(payload);
  }
};