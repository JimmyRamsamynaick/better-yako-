// commands/moderation/reloadlangs.js
const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const { ComponentsV3 } = require('../../utils/ComponentsV3');
const LanguageManager = require('../../utils/languageManager');
const Guild = require('../../models/Guild');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('reloadlangs')
        .setDescription(LanguageManager.get('fr', 'commands.reloadlangs.description') || 'Recharger les fichiers de langue')
        .setDescriptionLocalizations({
            'en-US': LanguageManager.get('en', 'commands.reloadlangs.description') || 'Reload language files'
        })
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        await interaction.deferReply();

        const guildData = await Guild.findOne({ guildId: interaction.guild.id });
        const lang = guildData?.language || 'fr';

        try {
            // Recharge les fichiers de langue depuis disk
            LanguageManager.loadLanguages();

            const titleKey = 'commands.reloadlangs.success_title';
            const message = LanguageManager.get(lang, 'commands.reloadlangs.success') || (lang === 'en' ? 'Languages reloaded from disk.' : 'Langues rechargées depuis le disque.');

            const payload = await ComponentsV3.successEmbed(interaction.guild.id, titleKey, message, true, lang);
            await interaction.editReply({ ...payload, flags: MessageFlags.IsComponentsV2 });
        } catch (err) {
            console.error('Reload langs error:', err);
            const payload = await ComponentsV3.errorEmbed(
                interaction.guild.id,
                'commands.reloadlangs.error',
                {},
                true,
                lang
            );
            await interaction.editReply({ ...payload, flags: MessageFlags.IsComponentsV2 });
        }
    }
};