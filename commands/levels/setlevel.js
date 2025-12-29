const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const Guild = require('../../models/Guild');
const LevelingManager = require('../../utils/levelingManager');
const LanguageManager = require('../../utils/languageManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setlevel')
        .setDescription('Modifier le niveau ou l\'XP d\'un utilisateur (Admin)')
        .setDescriptionLocalizations({
            'fr': 'Modifier le niveau ou l\'XP d\'un utilisateur (Admin)',
            'en-US': 'Modify a user\'s level or XP (Admin)',
            'en-GB': 'Modify a user\'s level or XP (Admin)'
        })
        .addUserOption(option => 
            option.setName('target')
                .setDescription('L\'utilisateur à modifier')
                .setDescriptionLocalizations({
                    'fr': 'L\'utilisateur à modifier',
                    'en-US': 'The user to modify',
                    'en-GB': 'The user to modify'
                })
                .setRequired(true))
        .addStringOption(option =>
            option.setName('type')
                .setDescription('Ce que vous voulez modifier')
                .setDescriptionLocalizations({
                    'fr': 'Ce que vous voulez modifier',
                    'en-US': 'What you want to modify',
                    'en-GB': 'What you want to modify'
                })
                .setRequired(true)
                .addChoices(
                    { name: 'Niveau', name_localizations: { 'fr': 'Niveau', 'en-US': 'Level', 'en-GB': 'Level' }, value: 'level' },
                    { name: 'XP', name_localizations: { 'fr': 'XP', 'en-US': 'XP', 'en-GB': 'XP' }, value: 'xp' }
                ))
        .addIntegerOption(option =>
            option.setName('amount')
                .setDescription('Le nouveau montant')
                .setDescriptionLocalizations({
                    'fr': 'Le nouveau montant',
                    'en-US': 'The new amount',
                    'en-GB': 'The new amount'
                })
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    async execute(interaction) {
        const target = interaction.options.getUser('target');
        const type = interaction.options.getString('type');
        const amount = interaction.options.getInteger('amount');
        const guildId = interaction.guild.id;

        const guildData = await Guild.findOne({ guildId });
        if (!guildData) return interaction.reply({ content: '❌ Erreur base de données.', ephemeral: true });

        const lang = guildData.language || 'fr';

        let user = guildData.users.find(u => u.userId === target.id);
        if (!user) {
            user = { userId: target.id, warnings: [], xp: 0, level: 0 };
            guildData.users.push(user);
        }

        if (type === 'level') {
            user.level = amount;
            // Recalculate XP base for this level to be consistent
            user.xp = LevelingManager.calculateXpForLevel(amount);
        } else {
            user.xp = amount;
            // Recalculate level based on new XP
            user.level = LevelingManager.calculateLevel(amount);
        }

        await guildData.save();

        const typeMap = {
            'level': { 'fr': 'Niveau', 'en': 'Level' },
            'xp': { 'fr': 'XP', 'en': 'XP' }
        };
        const typeText = typeMap[type][lang] || type;

        await interaction.reply({ 
            content: LanguageManager.get(lang, 'leveling.setlevel.success', {
                user: target.toString(),
                type: typeText,
                amount: amount,
                level: user.level,
                xp: Math.floor(user.xp)
            })
        });
    },
};
