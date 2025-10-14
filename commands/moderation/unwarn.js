// commands/moderation/unwarn.js
const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const Guild = require('../../models/Guild');
const LanguageManager = require('../../utils/languageManager');
const { ComponentsV3 } = require('../../utils/ComponentsV3');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('unwarn')
        .setDescription(LanguageManager.get('fr', 'commands.unwarn.description') || 'Retirer un avertissement à un membre')
        .setDescriptionLocalizations({
            'en-US': LanguageManager.get('en', 'commands.unwarn.description') || 'Remove a warning from a member'
        })
        .addUserOption(opt => opt
            .setName('user')
            .setDescription(LanguageManager.get('fr', 'commands.unwarn.user_option') || "Utilisateur ciblé")
            .setDescriptionLocalizations({
                'en-US': LanguageManager.get('en', 'commands.unwarn.user_option') || 'Target user'
            })
            .setRequired(true)
        )
        .addIntegerOption(opt => opt
            .setName('index')
            .setDescription(LanguageManager.get('fr', 'commands.unwarn.index_option') || "Index de l'avertissement à retirer (dernier par défaut)")
            .setDescriptionLocalizations({
                'en-US': LanguageManager.get('en', 'commands.unwarn.index_option') || 'Index of warning to remove (latest by default)'
            })
            .setRequired(false)
            .setMinValue(1)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

    async execute(interaction) {
        const lang = 'fr';
        if (!interaction.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
            const payload = await ComponentsV3.errorEmbed(interaction.guild.id, 'commands.unwarn.no_permission', {}, false);
            return interaction.reply(payload);
        }

        const targetUser = interaction.options.getUser('user', true);
        const indexOpt = interaction.options.getInteger('index');

        try { await interaction.deferReply(); } catch (_) {}

        let guild = await Guild.findOne({ guildId: interaction.guild.id });
        if (!guild) { guild = new Guild({ guildId: interaction.guild.id }); }

        const userEntry = (guild.users || []).find(u => u.userId === targetUser.id);
        const warnings = userEntry?.warnings || [];
        if (warnings.length === 0) {
            const payload = await ComponentsV3.errorEmbed(interaction.guild.id, 'commands.unwarn.no_warnings', {}, false);
            return interaction.editReply(payload);
        }

        let removed;
        if (indexOpt && indexOpt >= 1 && indexOpt <= warnings.length) {
            removed = warnings.splice(indexOpt - 1, 1)[0];
        } else {
            removed = warnings.pop();
        }

        guild.users = (guild.users || []).map(u => {
            if (u.userId === targetUser.id) {
                const obj = u.toObject?.() ?? u;
                return { ...obj, warnings };
            }
            return u;
        });
        guild.markModified('users');
        await guild.save();

        const count = String(warnings.length);
        const msg = LanguageManager.get(guild.language || lang, 'commands.unwarn.success', {
            user: targetUser.toString(),
            count
        });

        const payload = await ComponentsV3.successEmbed(interaction.guild.id, 'commands.unwarn.success_title', msg, false);
        return interaction.editReply(payload);
    }
};