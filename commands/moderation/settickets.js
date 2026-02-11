const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const Guild = require('../../models/Guild');
const LanguageManager = require('../../utils/languageManager');
const { ComponentsV3 } = require('../../utils/ComponentsV3');

function safeLang(key, fallback, lang = 'fr') {
    const v = LanguageManager.get(lang, key);
    return (typeof v === 'string' && v.startsWith('[MISSING:')) ? fallback : v;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('settickets')
        .setDescription(safeLang('commands.settickets.description', 'Configurer le système de tickets'))
        .setDescriptionLocalizations({
            'en-US': LanguageManager.get('en', 'commands.settickets.description') || 'Configure the ticket system'
        })
        .addSubcommand(subcommand => 
            subcommand
                .setName('setcategory')
                .setDescription(safeLang('commands.settickets.setcategory_description', 'Définir la catégorie parente pour les tickets'))
                .setDescriptionLocalizations({
                    'en-US': LanguageManager.get('en', 'commands.settickets.setcategory_description') || 'Set parent category for tickets'
                })
                .addChannelOption(option => 
                    option.setName('category')
                        .setDescription(safeLang('commands.settickets.category_option', 'Catégorie qui contiendra les tickets'))
                        .setDescriptionLocalizations({
                            'en-US': LanguageManager.get('en', 'commands.settickets.category_option') || 'Category that will contain tickets'
                        })
                        .addChannelTypes(ChannelType.GuildCategory)
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('settranscript')
                .setDescription(safeLang('commands.settickets.settranscript_description', 'Définir le salon d\'envoi des transcripts'))
                .setDescriptionLocalizations({
                    'en-US': LanguageManager.get('en', 'commands.settickets.settranscript_description') || 'Set the channel for ticket transcripts'
                })
                .addChannelOption(option =>
                    option.setName('channel')
                        .setDescription(safeLang('commands.settickets.channel_option', 'Le salon où seront envoyés les transcripts'))
                        .setDescriptionLocalizations({
                            'en-US': LanguageManager.get('en', 'commands.settickets.channel_option') || 'The channel where transcripts will be sent'
                        })
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(true)
                )
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });
        const sub = interaction.options.getSubcommand();

        const guild = await Guild.findOne({ guildId: interaction.guild.id });
        if (!guild) {
            const err = await ComponentsV3.errorEmbed(interaction.guild.id, 'errors.bot_no_permission');
            return interaction.editReply(err);
        }

        if (sub === 'setcategory') {
            const category = interaction.options.getChannel('category');
            guild.tickets = guild.tickets || {};
            guild.tickets.categoryId = category.id;
            await guild.save();

            const lang = guild.language || 'fr';
            const titleKey = 'commands.settickets.success_title';
            const localized = LanguageManager.get(lang, 'commands.settickets.success', { category: category.toString() });
            const msg = (typeof localized === 'string' && !localized.startsWith('[MISSING:'))
                ? localized
                : `Catégorie de tickets définie sur ${category.toString()}`;
            const ok = await ComponentsV3.successEmbed(interaction.guild.id, titleKey, msg, true, lang);
            return interaction.editReply(ok);
        }

        if (sub === 'settranscript') {
            const channel = interaction.options.getChannel('channel');
            guild.tickets = guild.tickets || {};
            guild.tickets.transcriptChannelId = channel.id;
            await guild.save();

            const lang = guild.language || 'fr';
            const titleKey = 'commands.settickets.success_title';
            const localized = LanguageManager.get(lang, 'commands.settickets.transcript_success', { channel: channel.toString() });
            const msg = (typeof localized === 'string' && !localized.startsWith('[MISSING:'))
                ? localized
                : `Salon des transcripts défini sur ${channel.toString()}`;
            const ok = await ComponentsV3.successEmbed(interaction.guild.id, titleKey, msg, true, lang);
            return interaction.editReply(ok);
        }
    }
};