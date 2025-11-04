// commands/moderation/setlang.js
const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const Guild = require('../../models/Guild');
const BotEmbeds = require('../../utils/embeds');
const LanguageManager = require('../../utils/languageManager');

// Fournit un texte de secours si la clé est manquante
function safeLang(lang, key, fallback) {
    const v = LanguageManager.get(lang, key);
    if (!v || (typeof v === 'string' && v.startsWith('[MISSING'))) return fallback;
    return v;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setlang')
        .setDescription(safeLang('fr', 'commands.setlang.description', 'Changer la langue du bot'))
        .setDescriptionLocalizations({
            'en-US': safeLang('en', 'commands.setlang.description', 'Change bot language')
        })
        .addStringOption(option =>
            option.setName('language')
                .setDescription(safeLang('fr', 'commands.setlang.language_option', 'Langue à utiliser'))
                .setDescriptionLocalizations({
                    'en-US': safeLang('en', 'commands.setlang.language_option', 'Language to use')
                })
                .addChoices(
                    { name: 'Français', value: 'fr' },
                    { name: 'English', value: 'en' }
                )
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
    
    async execute(interaction) {
        await interaction.deferReply();
        
        const language = interaction.options.getString('language');
        const normalizedLang = LanguageManager.normalizeLanguageCode(language);

        // Récupérer la langue actuelle du serveur
        let guildData = await Guild.findOne({ guildId: interaction.guild.id });
        const currentLang = guildData?.language || 'fr';

        if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
            const errorResponse = BotEmbeds.createNoPermissionEmbed(interaction.guild.id, currentLang);
            return interaction.editReply({ ...errorResponse, flags: MessageFlags.IsComponentsV2 });
        }

        try {
            await Guild.findOneAndUpdate(
                { guildId: interaction.guild.id },
                { language: normalizedLang },
                { upsert: true }
            );

            await interaction.editReply({ 
                components : [BotEmbeds.createSetlangSuccessEmbed(normalizedLang, interaction.guild.id, normalizedLang)],
                flags: MessageFlags.IsComponentsV2 });

        } catch (error) {
            console.error(error);
            const errorResponse = BotEmbeds.createSetlangErrorEmbed(error, interaction.guild.id, currentLang);
            await interaction.editReply({ ...errorResponse, flags: MessageFlags.IsComponentsV2 });
        }
    }
};