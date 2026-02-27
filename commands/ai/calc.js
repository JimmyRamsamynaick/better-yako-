const { SlashCommandBuilder } = require('discord.js');
const AIS = require('../../utils/aiServiceGemini');
const Guild = require('../../models/Guild');
const BotEmbeds = require('../../utils/embeds');
const LanguageManager = require('../../utils/languageManager');

function safeEvaluate(input) {
  const allowedWords = new Set([
    'sin','cos','tan','asin','acos','atan',
    'sqrt','abs','floor','ceil','round','exp',
    'log','ln','log10','min','max','pow','pi','e'
  ]);
  let expr = String(input).toLowerCase().replace(/\s+/g, ' ');
  expr = expr.replace(/\^/g, '**');
  expr = expr.replace(/\bpi\b/g, 'PI').replace(/\be\b/g, 'E');
  const words = expr.match(/\b[a-z]+\b/g) || [];
  for (const w of words) {
    if (!allowedWords.has(w)) throw new Error('unsupported');
  }
  const map = {
    ln: 'log',
    log: 'log10'
  };
  expr = expr.replace(/\b([a-z]+)\b/gi, (m) => {
    const k = m.toLowerCase();
    if (k === 'pi') return 'Math.PI';
    if (k === 'e') return 'Math.E';
    const name = map[k] || k;
    return `Math.${name}`;
  });
  const fn = new Function('"use strict"; return (' + expr + ')');
  const val = fn();
  if (typeof val !== 'number' || !isFinite(val)) throw new Error('nan');
  return val;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('calc')
    .setDescription(LanguageManager.get('fr', 'calc.description'))
    .setDescriptionLocalizations({
        'en-US': LanguageManager.get('en', 'calc.description')
    })
    .addStringOption(o => 
        o.setName('expression')
        .setDescription(LanguageManager.get('fr', 'calc.expression_option'))
        .setDescriptionLocalizations({
            'en-US': LanguageManager.get('en', 'calc.expression_option')
        })
        .setRequired(true)),
  cooldown: 3,
  async execute(interaction) {
    const guildData = await Guild.findOne({ guildId: interaction.guild.id });
    const lang = guildData?.language || 'fr';
    const premiumValid = !!(
      guildData?.premium &&
      (!guildData.premiumUntil || new Date(guildData.premiumUntil) > new Date())
    );
    if (!premiumValid) {
      const embedPayload = BotEmbeds.createPremiumRequiredEmbed(interaction.guild.id, lang);
      return interaction.reply({ ...embedPayload, ephemeral: true });
    }
    const expression = interaction.options.getString('expression');
    await interaction.deferReply();
    try {
      const result = safeEvaluate(expression);
      return interaction.editReply(LanguageManager.get(lang, 'calc.result', { expression, result }));
    } catch (_) {
      try {
        const answer = await AIS.ask(LanguageManager.get(lang, 'calc.ai_prompt', { expression }));
        return interaction.editReply(LanguageManager.get(lang, 'calc.ai_result', { answer }));
      } catch (e2) {
        return interaction.editReply(LanguageManager.get(lang, 'calc.error'));
      }
    }
  }
};
