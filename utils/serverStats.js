const { ChannelType, PermissionsBitField } = require('discord.js');
const GuildModel = require('../models/Guild');
const LanguageManager = require('./languageManager');

async function computeCounts(guild) {
  try { await guild.fetch(); } catch (_) {}
  try { await guild.members.fetch(); } catch (_) {}
  let total = guild.approximateMemberCount ?? guild.memberCount ?? guild.members.cache.size ?? 0;
  if (!total || total === 0) {
    try {
      const { REST, Routes } = require('discord.js');
      const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
      const data = await rest.get(`${Routes.guild(guild.id)}?with_counts=true`);
      total = data?.approximate_member_count ?? total;
    } catch (_) {}
  }
  const botsCached = guild.members.cache.filter(m => m.user.bot).size;
  const bots = Math.min(botsCached || 0, total);
  const humans = Math.max(0, total - bots);
  return { total, humans, bots };
}

async function updateForGuild(guild) {
  const doc = await GuildModel.findOne({ guildId: guild.id });
  if (!doc || !doc.serverStats || !doc.serverStats.enabled) return;
  const settings = doc.serverStats;
  const { total, humans, bots } = await computeCounts(guild);
  const lang = doc.language || 'fr';
  const labelMembers = LanguageManager.get(lang, 'commands.serverstats.labels.members') || 'Members';
  const labelHumans = LanguageManager.get(lang, 'commands.serverstats.labels.humans') || 'Humans';
  const labelBots = LanguageManager.get(lang, 'commands.serverstats.labels.bots') || 'Bots';

  const rename = async (id, name) => {
    if (!id) return;
    let ch = guild.channels.cache.get(id);
    if (!ch) {
      try { ch = await guild.channels.fetch(id); } catch (_) { return; }
    }
    const final = `${name}: ${name === labelMembers ? total : name === labelHumans ? humans : bots}`;
    if (ch?.name !== final) {
      try { await ch.setName(final); } catch (_) {}
    }
  };

  if (settings.showTotal) await rename(settings.channels?.totalId, labelMembers);
  if (settings.showHumans) await rename(settings.channels?.humansId, labelHumans);
  if (settings.showBots) await rename(settings.channels?.botsId, labelBots);
}

async function setup(interaction, { type, showTotal, showHumans, showBots, categoryName }) {
  const guild = interaction.guild;
  let doc = await GuildModel.findOne({ guildId: guild.id });
  if (!doc) doc = new GuildModel({ guildId: guild.id });

  const parent = await guild.channels.create({ name: categoryName, type: ChannelType.GuildCategory });
  const everyoneId = guild.id;

  const permsVoice = [{ id: everyoneId, deny: [PermissionsBitField.Flags.Connect] }];
  const permsText = [{ id: everyoneId, deny: [PermissionsBitField.Flags.ViewChannel] }];

  const createCh = async (baseName) => {
    const name = `${baseName}: 0`;
    if (type === 'voice') {
      const ch = await guild.channels.create({ name, type: ChannelType.GuildVoice, parent: parent.id, permissionOverwrites: permsVoice });
      return ch.id;
    } else {
      const ch = await guild.channels.create({ name, type: ChannelType.GuildText, parent: parent.id, permissionOverwrites: permsText });
      return ch.id;
    }
  };

  const lang = doc.language || 'fr';
  const labelMembers = LanguageManager.get(lang, 'commands.serverstats.labels.members') || 'Members';
  const labelHumans = LanguageManager.get(lang, 'commands.serverstats.labels.humans') || 'Humans';
  const labelBots = LanguageManager.get(lang, 'commands.serverstats.labels.bots') || 'Bots';

  const channels = { totalId: null, humansId: null, botsId: null };
  if (showTotal) channels.totalId = await createCh(labelMembers);
  if (showHumans) channels.humansId = await createCh(labelHumans);
  if (showBots) channels.botsId = await createCh(labelBots);

  doc.serverStats = {
    enabled: true,
    categoryId: parent.id,
    type,
    showTotal,
    showHumans,
    showBots,
    channels
  };
  await doc.save();
  await updateForGuild(guild);
  return { parentId: parent.id, channels };
}

async function disable(interaction) {
  const guild = interaction.guild;
  const doc = await GuildModel.findOne({ guildId: guild.id });
  if (!doc || !doc.serverStats || !doc.serverStats.enabled) return false;
  const ids = [doc.serverStats.channels?.totalId, doc.serverStats.channels?.humansId, doc.serverStats.channels?.botsId].filter(Boolean);
  for (const id of ids) {
    const ch = guild.channels.cache.get(id);
    try { await ch?.delete(); } catch (_) {}
  }
  const parent = guild.channels.cache.get(doc.serverStats.categoryId);
  try { await parent?.delete(); } catch (_) {}
  doc.serverStats = { enabled: false, categoryId: null, type: doc.serverStats.type, showTotal: false, showHumans: false, showBots: false, channels: { totalId: null, humansId: null, botsId: null } };
  await doc.save();
  return true;
}

module.exports = { updateForGuild, setup, disable };
