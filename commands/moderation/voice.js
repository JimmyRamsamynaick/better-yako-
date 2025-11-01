// commands/moderation/voice.js
const { SlashCommandBuilder, ChannelType, PermissionFlagsBits } = require('discord.js');
const Guild = require('../../models/Guild');
const LanguageManager = require('../../utils/languageManager');
const { ComponentsV3 } = require('../../utils/ComponentsV3');

// Rôles considérés comme "staff" (bypass d'utilisation de la commande même sans perms)
const STAFF_HINTS = ['staff', 'moderator', 'modérateur', 'modo'];

function hasStaffBypass(member) {
  try {
    return member.roles?.cache?.some(r => {
      const name = (r.name || '').toLowerCase();
      return STAFF_HINTS.some(h => name.includes(h));
    }) || false;
  } catch (_) {
    return false;
  }
}

function canUse(member) {
  return member.permissions.has(PermissionFlagsBits.MoveMembers) || hasStaffBypass(member);
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('voice')
    .setDescription('Commandes de modération vocale')
    .addSubcommand(subcommand =>
      subcommand
        .setName('kick')
        .setDescription('Expulser un membre d\'un salon vocal')
        .addUserOption(option =>
          option.setName('user')
            .setDescription('Le membre à expulser du vocal')
            .setRequired(true)
        )
        .addStringOption(option =>
          option.setName('reason')
            .setDescription('Raison de l\'expulsion')
            .setRequired(false)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('ban')
        .setDescription('Bannir un membre des salons vocaux')
        .addUserOption(option =>
          option.setName('user')
            .setDescription('Le membre à bannir des vocaux')
            .setRequired(true)
        )
        .addStringOption(option =>
          option.setName('reason')
            .setDescription('Raison du bannissement')
            .setRequired(false)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('unban')
        .setDescription('Débannir un membre des salons vocaux')
        .addUserOption(option =>
          option.setName('user')
            .setDescription('Le membre à débannir des vocaux')
            .setRequired(true)
        )
        .addStringOption(option =>
          option.setName('reason')
            .setDescription('Raison du débannissement')
            .setRequired(false)
        )
    ),

  async execute(interaction) {
    try {
      // Différer la réponse immédiatement pour éviter l'erreur "Unknown interaction"
      await interaction.deferReply();
      
      // Langue
      const guildDoc = await Guild.findOne({ guildId: interaction.guild.id });
      const lang = guildDoc?.language || 'fr';

      const sub = interaction.options.getSubcommand();

      // Vérification d'usage (MoveMembers OU rôle staff)
      if (!canUse(interaction.member)) {
        const err = await ComponentsV3.errorEmbed(interaction.guild.id, 'errors.no_permission', {}, false, lang);
        return await interaction.editReply(err);
      }

      // Sous-commande: KICK
      if (sub === 'kick') {
        const target = interaction.options.getMember('user');
        const reason = interaction.options.getString('reason') || LanguageManager.get(lang, 'common.no_reason') || 'Aucune raison fournie';

        if (!target) {
          const payload = await ComponentsV3.errorEmbed(interaction.guild.id, 'commands.kick.error_not_found', {}, false, lang);
          return await interaction.editReply(payload);
        }

        const voice = target.voice;
        if (!voice || !voice.channel) {
          const payload = await ComponentsV3.errorEmbed(
            interaction.guild.id,
            'commands.voice.not_in_voice',
            {},
            false,
            lang
          );
          return await interaction.editReply(payload);
        }

        // Permissions bot
        if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.MoveMembers)) {
          const payload = await ComponentsV3.errorEmbed(interaction.guild.id, 'errors.bot_no_permission', {}, false, lang);
          return await interaction.editReply(payload);
        }

        try {
          // Préférer disconnect(), fallback setChannel(null)
          if (typeof voice.disconnect === 'function') {
            await voice.disconnect(reason);
          } else {
            await voice.setChannel(null, reason);
          }

          const successMessage = LanguageManager.get(lang, 'commands.voice.kick_success', {
            executor: interaction.user.toString(),
            user: target.toString(),
            reason
          });
          
          const successPayload = await ComponentsV3.successEmbed(
            interaction.guild.id,
            'commands.voice.kick_success_title',
            successMessage,
            false,
            lang
          );
          
          return await interaction.editReply(successPayload);
        } catch (error) {
          console.error("Erreur kick vocal:", error);
          const payload = await ComponentsV3.errorEmbed(interaction.guild.id, 'commands.voice.kick_error', {}, false, lang);
          return await interaction.editReply(payload);
        }
      }

      // Sous-commande: BAN
      if (sub === 'ban') {
        const target = interaction.options.getMember('user');
        // Force ban vocal à l'échelle serveur (toutes les vocals)
        let scope = 'server';
        let channel = null;
        const reason = interaction.options.getString('reason') || LanguageManager.get(lang, 'common.no_reason') || 'Aucune raison fournie';

        if (!target) {
          const payload = await ComponentsV3.errorEmbed(interaction.guild.id, 'commands.kick.error_not_found', {}, false, lang);
          return await interaction.editReply(payload);
        }

        // Permissions bot pour modifier overwrites
        if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.ManageChannels)) {
          const payload = await ComponentsV3.errorEmbed(interaction.guild.id, 'errors.bot_no_permission', {}, false, lang);
          return await interaction.editReply(payload);
        }

        try {
          if (scope === 'server') {
            const targets = interaction.guild.channels.cache.filter(c => c.type === ChannelType.GuildVoice || c.type === ChannelType.GuildStageVoice);
            for (const [_, ch] of targets) {
              await ch.permissionOverwrites.edit(target.id, { Connect: false }, { reason });
            }
          } else {
            await channel?.permissionOverwrites.edit(target.id, { Connect: false }, { reason });
          }

          const successMessage = LanguageManager.get(lang, 'commands.voice.ban_success', {
            executor: interaction.user.toString(),
            user: target.toString(),
            reason
          });
          
          const successPayload = await ComponentsV3.successEmbed(
            interaction.guild.id,
            'commands.voice.ban_success_title',
            successMessage,
            false,
            lang
          );
          
          return await interaction.editReply(successPayload);
        } catch (error) {
          console.error("Erreur ban vocal:", error);
          const payload = await ComponentsV3.errorEmbed(interaction.guild.id, 'commands.voice.ban_error', {}, false, lang);
          return await interaction.editReply(payload);
        }
      }

      // Sous-commande: UNBAN
      if (sub === 'unban') {
        const target = interaction.options.getMember('user');
        const reason = interaction.options.getString('reason') || LanguageManager.get(lang, 'common.no_reason') || 'Aucune raison fournie';

        if (!target) {
          const payload = await ComponentsV3.errorEmbed(interaction.guild.id, 'commands.kick.error_not_found', {}, false, lang);
          return await interaction.editReply(payload);
        }

        if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.ManageChannels)) {
          const payload = await ComponentsV3.errorEmbed(interaction.guild.id, 'errors.bot_no_permission', {}, false, lang);
          return await interaction.editReply(payload);
        }

        try {
          // Unban vocal à l'échelle serveur: retirer Connect deny sur tous les salons vocaux
          const targets = interaction.guild.channels.cache.filter(c => c.type === ChannelType.GuildVoice || c.type === ChannelType.GuildStageVoice);
          for (const [_, ch] of targets) {
            const ov = ch.permissionOverwrites.resolve(target.id);
            if (ov) {
              await ch.permissionOverwrites.edit(target.id, { Connect: null }, { reason });
            }
          }

          const successMessage = LanguageManager.get(lang, 'commands.voice.unban_success', {
            executor: interaction.user.toString(),
            user: target.toString(),
            reason
          });
          
          const successPayload = await ComponentsV3.successEmbed(
            interaction.guild.id,
            'commands.voice.unban_success_title',
            successMessage,
            false,
            lang
          );
          
          return await interaction.editReply(successPayload);
        } catch (error) {
          console.error("Erreur unban vocal:", error);
          const payload = await ComponentsV3.errorEmbed(interaction.guild.id, 'commands.voice.unban_error', {}, false, lang);
          return await interaction.editReply(payload);
        }
      }
    } catch (error) {
      console.error("Erreur dans la commande voice:", error);
      try {
        if (interaction.deferred) {
          await interaction.editReply({ content: "Une erreur est survenue lors de l'exécution de la commande." });
        } else {
          await interaction.reply({ content: "Une erreur est survenue lors de l'exécution de la commande." });
        }
      } catch (e) {
        // Ignorer les erreurs supplémentaires
      }
    }
  }
};