// commands/utility/setlang.js
const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { setLang, getAvailableLanguages } = require('../moderation/translation_system.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setlang')
        .setDescription('Change la langue du bot pour ce serveur')
        .addStringOption(option =>
            option.setName('langue')
                .setDescription('Langue à utiliser')
                .setRequired(true)
                .addChoices(
                    ...getAvailableLanguages().map(lang => ({
                        name: lang,
                        value: lang
                    }))
                )
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        const lang = interaction.options.getString('langue');
        const success = setLang(interaction.guild.id, lang);

        if (success) {
            await interaction.reply({ content: `✅ Langue changée pour \`${lang}\` !`, ephemeral: true });
        } else {
            await interaction.reply({ content: `❌ Langue invalide.`, ephemeral: true });
        }
    }
};