// commands/moderation/warn.js
const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const Guild = require('../../models/Guild');
const LanguageManager = require('../../utils/languageManager');
const { ComponentsV3 } = require('../../utils/ComponentsV3');
const ms = require('ms');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('warn')
        .setDescription(LanguageManager.get('fr', 'commands.warn.description') || 'Ajouter un avertissement à un membre')
        .setDescriptionLocalizations({
            'en-US': LanguageManager.get('en', 'commands.warn.description') || 'Add a warning to a member'
        })
        .addUserOption(opt => opt
            .setName('user')
            .setDescription(LanguageManager.get('fr', 'commands.warn.user_option') || 'Utilisateur à avertir')
            .setDescriptionLocalizations({
                'en-US': LanguageManager.get('en', 'commands.warn.user_option') || 'User to warn'
            })
            .setRequired(true)
        )
        .addStringOption(opt => opt
            .setName('reason')
            .setDescription(LanguageManager.get('fr', 'commands.warn.reason_option') || 'Raison de l’avertissement')
            .setDescriptionLocalizations({
                'en-US': LanguageManager.get('en', 'commands.warn.reason_option') || 'Warning reason'
            })
            .setRequired(false)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

    async execute(interaction) {
        const lang = 'fr';
        if (!interaction.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
            const payload = await ComponentsV3.errorEmbed(interaction.guild.id, 'commands.warn.no_permission', {}, false);
            return interaction.reply(payload);
        }

        const targetUser = interaction.options.getUser('user', true);
        const reason = interaction.options.getString('reason') || LanguageManager.get(lang, 'common.no_reason');

        try { await interaction.deferReply(); } catch (_) {}

        let guild = await Guild.findOne({ guildId: interaction.guild.id });
        if (!guild) { guild = new Guild({ guildId: interaction.guild.id }); }

        // S’assurer de l’entrée utilisateur dans guild.users
        const existing = guild.users?.find(u => u.userId === targetUser.id);
        if (!existing) {
            guild.users = guild.users || [];
            guild.users.push({ userId: targetUser.id, warnings: [], muted: false, mutedUntil: null });
        }

        const warn = { reason, moderator: interaction.user.id, date: new Date() };
        guild.users = (guild.users || []).map(u => {
            if (u.userId === targetUser.id) {
                const warnings = Array.isArray(u.warnings) ? u.warnings : [];
                warnings.push(warn);
                return { ...u.toObject?.() ?? u, warnings };
            }
            return u;
        });

        guild.markModified('users');
        await guild.save();

        // Vérifier l’auto-timeout selon la config
        const warnCount = (guild.users.find(u => u.userId === targetUser.id)?.warnings || []).length;
        const cfg = guild.antiRaid?.warnConfig || { timeoutAfter: 3, timeoutDurationMinutes: 60 };

        let autoActionPerformed = false;
        let actionMessage = '';
        try {
            const member = await interaction.guild.members.fetch(targetUser.id);
            const canTimeout = interaction.guild.members.me.permissions.has(PermissionFlagsBits.ModerateMembers);
            if (canTimeout && warnCount >= (cfg.timeoutAfter || 3)) {
                await member.timeout(ms(`${cfg.timeoutDurationMinutes || 60}m`), `Auto-timeout après ${warnCount} avertissements`);
                autoActionPerformed = true;
                actionMessage = LanguageManager.get(guild.language || 'fr', 'commands.warn.auto_timeout', { minutes: String(cfg.timeoutDurationMinutes || 60) });
            }
        } catch (e) {
            // Ignorer l’échec du timeout, on répondra tout de même
        }

        const successMsg = LanguageManager.get(guild.language || 'fr', 'commands.warn.success', {
            user: targetUser.toString(),
            count: String(warnCount),
            reason
        });

        const parts = [];
        parts.push(successMsg);
        if (autoActionPerformed && actionMessage) parts.push(actionMessage);

        const payload = await ComponentsV3.successEmbed(interaction.guild.id, 'commands.warn.success_title', parts.join('\n'), false);
        return interaction.editReply(payload);
    }
};