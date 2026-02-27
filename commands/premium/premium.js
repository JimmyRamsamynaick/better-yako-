const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const Guild = require('../../models/Guild');
const PremiumKey = require('../../models/PremiumKey');
const { createOrder } = require('../../utils/payments/paypal');
const LanguageManager = require('../../utils/languageManager');
const crypto = require('crypto');

function generateKey() {
  const part = () => crypto.randomBytes(4).toString('hex').toUpperCase();
  return `${part()}-${part()}-${part()}-${part()}`;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('premium')
    .setDescription(LanguageManager.get('fr', 'premium.description'))
    .setDescriptionLocalizations({
        'en-US': LanguageManager.get('en', 'premium.description')
    })
    .addSubcommand(sub =>
      sub.setName('buy')
        .setDescription(LanguageManager.get('fr', 'premium.buy.description'))
        .setDescriptionLocalizations({
            'en-US': LanguageManager.get('en', 'premium.buy.description')
        })
        .addStringOption(o => o.setName('email')
            .setDescription(LanguageManager.get('fr', 'premium.buy.email_option'))
            .setDescriptionLocalizations({
                'en-US': LanguageManager.get('en', 'premium.buy.email_option')
            })
            .setRequired(true))
        .addStringOption(o => o.setName('pseudo')
            .setDescription(LanguageManager.get('fr', 'premium.buy.pseudo_option'))
            .setDescriptionLocalizations({
                'en-US': LanguageManager.get('en', 'premium.buy.pseudo_option')
            })
            .setRequired(true))
    )
    .addSubcommand(sub =>
      sub.setName('generate')
        .setDescription(LanguageManager.get('fr', 'premium.generate.description'))
        .setDescriptionLocalizations({
            'en-US': LanguageManager.get('en', 'premium.generate.description')
        })
        .addIntegerOption(o => o.setName('count')
            .setDescription(LanguageManager.get('fr', 'premium.generate.count_option'))
            .setDescriptionLocalizations({
                'en-US': LanguageManager.get('en', 'premium.generate.count_option')
            })
            .setRequired(true))
        .addIntegerOption(o => o.setName('days')
            .setDescription(LanguageManager.get('fr', 'premium.generate.days_option'))
            .setDescriptionLocalizations({
                'en-US': LanguageManager.get('en', 'premium.generate.days_option')
            })
            .setRequired(false))
    )
    .addSubcommand(sub =>
      sub.setName('redeem')
        .setDescription(LanguageManager.get('fr', 'premium.redeem.description'))
        .setDescriptionLocalizations({
            'en-US': LanguageManager.get('en', 'premium.redeem.description')
        })
        .addStringOption(o => o.setName('key')
            .setDescription(LanguageManager.get('fr', 'premium.redeem.key_option'))
            .setDescriptionLocalizations({
                'en-US': LanguageManager.get('en', 'premium.redeem.key_option')
            })
            .setRequired(true))
    )
    .addSubcommand(sub =>
      sub.setName('info')
        .setDescription(LanguageManager.get('fr', 'premium.info.description'))
        .setDescriptionLocalizations({
            'en-US': LanguageManager.get('en', 'premium.info.description')
        })
    )
    .addSubcommand(sub =>
      sub.setName('revoke')
        .setDescription(LanguageManager.get('fr', 'premium.revoke.description'))
        .setDescriptionLocalizations({
            'en-US': LanguageManager.get('en', 'premium.revoke.description')
        })
        .addStringOption(o => o.setName('key')
            .setDescription(LanguageManager.get('fr', 'premium.revoke.key_option'))
            .setDescriptionLocalizations({
                'en-US': LanguageManager.get('en', 'premium.revoke.key_option')
            })
            .setRequired(true))
    ),

  cooldown: 5,

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const guildData = await Guild.findOne({ guildId: interaction.guild.id });
    const lang = guildData?.language || 'fr';

    if (sub === 'buy') {
      const email = interaction.options.getString('email');
      const pseudo = interaction.options.getString('pseudo');
      const paypalMe = process.env.PAYPAL_ME_URL;
      const price = process.env.PREMIUM_PRICE || '10';
      const currency = process.env.PREMIUM_CURRENCY || 'EUR';

      await interaction.deferReply({ ephemeral: true });
      const hasApiCreds = !!(process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET);
      if (hasApiCreds) {
        try {
          const { id, approveLink } = await createOrder({
            amount: price,
            currency
          });
          if (!approveLink) {
            return interaction.editReply(LanguageManager.get(lang, 'premium.buy.error_create'));
          }
          await PremiumKey.create({
            key: `PENDING-${id}`,
            status: 'unused',
            purchaserEmail: email,
            purchaserDiscord: pseudo,
            orderId: id,
            amount: price,
            currency
          });
          await interaction.editReply(LanguageManager.get(lang, 'premium.buy.success_create', { approveLink }));
        } catch (e) {
          console.error('[premium buy] PayPal error:', e);
          await interaction.editReply(LanguageManager.get(lang, 'premium.buy.error_general'));
        }
      } else if (paypalMe) {
        // Fallback PayPal.me
        const orderId = `PAYPALME-${Date.now()}`;
        await PremiumKey.create({
          key: `PENDING-${orderId}`,
          status: 'unused',
          purchaserEmail: email,
          purchaserDiscord: pseudo,
          orderId,
          amount: price,
          currency
        });
        const base = paypalMe.endsWith('/') ? paypalMe.slice(0, -1) : paypalMe;
        const link = `${base}/${price}`;
        await interaction.editReply(LanguageManager.get(lang, 'premium.buy.success_paypalme', { link, pseudo, email }));
      } else {
        await interaction.editReply(LanguageManager.get(lang, 'premium.buy.no_config'));
      }
      return;
    }

    if (sub === 'generate') {
      // Restreindre aux admins
      if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
        return interaction.reply({ content: LanguageManager.get(lang, 'premium.admin_required'), ephemeral: true });
      }
      const count = interaction.options.getInteger('count');
      const days = interaction.options.getInteger('days') || 30;
      const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

      const keys = [];
      for (let i = 0; i < count; i++) {
        const key = generateKey();
        keys.push(key);
        await PremiumKey.create({ key, expiresAt, status: 'unused' });
      }

      const list = keys.map(k => `• ${k}`).join('\n');
      return interaction.reply({ content: LanguageManager.get(lang, 'premium.generate.success', { days, list }), ephemeral: true });
    }

    if (sub === 'redeem') {
      const keyStr = interaction.options.getString('key');
      await interaction.deferReply({ ephemeral: true });
      const keyDoc = await PremiumKey.findOne({ key: keyStr });
      if (!keyDoc) {
        return interaction.editReply(LanguageManager.get(lang, 'premium.redeem.invalid'));
      }
      if (keyDoc.status !== 'unused') {
        return interaction.editReply(LanguageManager.get(lang, 'premium.redeem.used_or_revoked'));
      }
      if (keyDoc.expiresAt && new Date(keyDoc.expiresAt) < new Date()) {
        return interaction.editReply(LanguageManager.get(lang, 'premium.redeem.expired'));
      }
      keyDoc.status = 'redeemed';
      keyDoc.redeemedAt = new Date();
      keyDoc.assignedToGuildId = interaction.guild.id;
      await keyDoc.save();

      const until = keyDoc.expiresAt || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      await Guild.findOneAndUpdate(
        { guildId: interaction.guild.id },
        { $set: { premium: true, premiumUntil: until } },
        { upsert: true }
      );

      const date = until.toLocaleString(lang === 'fr' ? 'fr-FR' : 'en-US');
      return interaction.editReply(LanguageManager.get(lang, 'premium.redeem.success', { date }));
    }

    if (sub === 'info') {
      const now = new Date();
      const valid = !!(guildData?.premium && (!guildData.premiumUntil || new Date(guildData.premiumUntil) > now));
      const keyDoc = await PremiumKey.findOne({ assignedToGuildId: interaction.guild.id, status: 'redeemed' }).sort({ redeemedAt: -1 });
      const locale = lang === 'fr' ? 'fr-FR' : 'en-US';
      const untilText = guildData?.premiumUntil ? new Date(guildData.premiumUntil).toLocaleString(locale) : LanguageManager.get(lang, 'premium.info.not_defined');
      const keyText = keyDoc?.key ? keyDoc.key : LanguageManager.get(lang, 'premium.info.none');
      const statusText = valid ? LanguageManager.get(lang, 'premium.info.status_active') : LanguageManager.get(lang, 'premium.info.status_inactive');
      
      const lines = [
        LanguageManager.get(lang, 'premium.info.status_line', { status: statusText }),
        LanguageManager.get(lang, 'premium.info.expires_at', { date: untilText }),
        LanguageManager.get(lang, 'premium.info.linked_key', { key: keyText })
      ].join('\n');
      return interaction.reply({ content: `${LanguageManager.get(lang, 'premium.info.title')}\n\n${lines}`, ephemeral: true });
    }

    if (sub === 'revoke') {
      if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
        return interaction.reply({ content: LanguageManager.get(lang, 'premium.admin_required'), ephemeral: true });
      }
      const keyStr = interaction.options.getString('key');
      const keyDoc = await PremiumKey.findOne({ key: keyStr });
      if (!keyDoc) {
        return interaction.reply({ content: LanguageManager.get(lang, 'premium.revoke.not_found'), ephemeral: true });
      }
      if (keyDoc.status === 'revoked') {
        return interaction.reply({ content: LanguageManager.get(lang, 'premium.revoke.already_revoked'), ephemeral: true });
      }
      keyDoc.status = 'revoked';
      await keyDoc.save();
      if (keyDoc.assignedToGuildId) {
        await Guild.findOneAndUpdate(
          { guildId: keyDoc.assignedToGuildId },
          { $set: { premium: false, premiumUntil: null } }
        );
      }
      return interaction.reply({ content: LanguageManager.get(lang, 'premium.revoke.success'), ephemeral: true });
    }
  }
};
