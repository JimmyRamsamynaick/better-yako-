const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const Guild = require('../../models/Guild');
const LanguageManager = require('../../utils/languageManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('leveling')
        .setDescription('Configurer le système de niveaux (Admin)')
        .setDescriptionLocalizations({
            'fr': 'Configurer le système de niveaux (Admin)',
            'en-US': 'Configure the leveling system (Admin)',
            'en-GB': 'Configure the leveling system (Admin)'
        })
        .addSubcommand(subcommand =>
            subcommand
                .setName('toggle')
                .setDescription('Activer ou désactiver le système de niveaux')
                .setDescriptionLocalizations({
                    'fr': 'Activer ou désactiver le système de niveaux',
                    'en-US': 'Enable or disable the leveling system',
                    'en-GB': 'Enable or disable the leveling system'
                })
                .addBooleanOption(option => 
                    option.setName('enabled')
                        .setDescription('Activer ?')
                        .setDescriptionLocalizations({
                            'fr': 'Activer ?',
                            'en-US': 'Enable?',
                            'en-GB': 'Enable?'
                        })
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('config')
                .setDescription('Configurer les gains d\'XP')
                .setDescriptionLocalizations({
                    'fr': 'Configurer les gains d\'XP',
                    'en-US': 'Configure XP gains',
                    'en-GB': 'Configure XP gains'
                })
                .addIntegerOption(option => 
                    option.setName('message_xp')
                        .setDescription('XP par message (défaut: 15)')
                        .setDescriptionLocalizations({
                            'fr': 'XP par message (défaut: 15)',
                            'en-US': 'XP per message (default: 15)',
                            'en-GB': 'XP per message (default: 15)'
                        }))
                .addIntegerOption(option => 
                    option.setName('voice_xp')
                        .setDescription('XP par minute en vocal (défaut: 10)')
                        .setDescriptionLocalizations({
                            'fr': 'XP par minute en vocal (défaut: 10)',
                            'en-US': 'XP per voice minute (default: 10)',
                            'en-GB': 'XP per voice minute (default: 10)'
                        }))
                .addChannelOption(option => 
                    option.setName('levelup_channel')
                        .setDescription('Salon pour les messages de niveau (Vide = salon actuel)')
                        .setDescriptionLocalizations({
                            'fr': 'Salon pour les messages de niveau (Vide = salon actuel)',
                            'en-US': 'Channel for level up messages (Empty = current channel)',
                            'en-GB': 'Channel for level up messages (Empty = current channel)'
                        })))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    async execute(interaction) {
        const guildData = await Guild.findOne({ guildId: interaction.guild.id });
        if (!guildData) return interaction.reply({ content: '❌ Erreur base de données.', ephemeral: true });

        const lang = guildData.language || 'fr';

        // Initialize leveling object if missing
        if (!guildData.leveling) {
            guildData.leveling = {
                enabled: false,
                xpPerMessage: 15,
                xpPerVoiceMinute: 10,
                cooldown: 60000,
                levelUpChannelId: null
            };
        }

        if (interaction.options.getSubcommand() === 'toggle') {
            const enabled = interaction.options.getBoolean('enabled');
            guildData.leveling.enabled = enabled;
            await guildData.save();
            
            const status = enabled ? LanguageManager.get(lang, 'common.enabled') : LanguageManager.get(lang, 'common.disabled');
            return interaction.reply({ 
                content: LanguageManager.get(lang, 'leveling.toggle.success', { status: `**${status}**` })
            });
        } else if (interaction.options.getSubcommand() === 'config') {
            const messageXp = interaction.options.getInteger('message_xp');
            const voiceXp = interaction.options.getInteger('voice_xp');
            const channel = interaction.options.getChannel('levelup_channel');

            if (messageXp !== null) guildData.leveling.xpPerMessage = messageXp;
            if (voiceXp !== null) guildData.leveling.xpPerVoiceMinute = voiceXp;
            if (channel) guildData.leveling.levelUpChannelId = channel.id;

            await guildData.save();

            const channelText = guildData.leveling.levelUpChannelId ? `<#${guildData.leveling.levelUpChannelId}>` : LanguageManager.get(lang, 'common.channel');

            return interaction.reply({ 
                content: LanguageManager.get(lang, 'leveling.config.success', {
                    messageXp: guildData.leveling.xpPerMessage,
                    voiceXp: guildData.leveling.xpPerVoiceMinute,
                    channel: channelText
                })
            });
        }
    },
};
