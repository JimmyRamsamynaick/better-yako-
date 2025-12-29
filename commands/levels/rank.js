const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const Guild = require('../../models/Guild');
const LevelingManager = require('../../utils/levelingManager');
const LanguageManager = require('../../utils/languageManager');

function formatVoiceTime(minutes) {
    if (!minutes) return '0m 0s';
    const totalSeconds = Math.floor(minutes * 60);
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = Math.floor(totalSeconds % 60);

    if (h > 0) {
        return `${h}h ${m}m ${s}s`;
    }
    return `${m}m ${s}s`;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('rank')
        .setDescription('Affiche votre niveau ou celui d\'un autre utilisateur')
        .setDescriptionLocalizations({
            'fr': 'Affiche votre niveau ou celui d\'un autre utilisateur',
            'en-US': 'Displays your level or another user\'s level',
            'en-GB': 'Displays your level or another user\'s level'
        })
        .addUserOption(option => 
            option.setName('target')
                .setDescription('L\'utilisateur dont vous voulez voir le niveau')
                .setDescriptionLocalizations({
                    'fr': 'L\'utilisateur dont vous voulez voir le niveau',
                    'en-US': 'The user whose level you want to see',
                    'en-GB': 'The user whose level you want to see'
                })
                .setRequired(false)),
    async execute(interaction) {
        const target = interaction.options.getUser('target') || interaction.user;
        const guildId = interaction.guild.id;

        const guildData = await Guild.findOne({ guildId });
        const lang = guildData ? (guildData.language || 'fr') : 'fr';

        if (!guildData || !guildData.leveling || !guildData.leveling.enabled) {
            return interaction.reply({ content: LanguageManager.get(lang, 'leveling.rank.disabled'), ephemeral: true });
        }

        const user = guildData.users.find(u => u.userId === target.id);
        
        const level = user ? (user.level || 0) : 0;
        const xp = user ? (user.xp || 0) : 0;
        const messageCount = user ? (user.messageCount || 0) : 0;
        const voiceTime = user ? (user.voiceTime || 0) : 0;

        const rank = await LevelingManager.getUserRank(guildId, target.id);
        
        const xpForNextLevel = LevelingManager.calculateXpForLevel(level + 1);
        const xpForCurrentLevel = LevelingManager.calculateXpForLevel(level);
        
        const xpCurrent = xp - xpForCurrentLevel;
        const xpNeededTotal = xpForNextLevel - xpForCurrentLevel;
        const xpRemaining = xpForNextLevel - xp;
        
        // Progress bar logic
        const progress = Math.min(Math.max(xpCurrent / xpNeededTotal, 0), 1);
        const barSize = 15; // Slightly smaller to fit description
        const filled = Math.round(progress * barSize);
        const empty = barSize - filled;
        const progressBar = '█'.repeat(filled) + '░'.repeat(empty);

        const embed = new EmbedBuilder()
            .setColor('#ff47bf') // Pink color like the image
            .setAuthor({ name: LanguageManager.get(lang, 'leveling.rank.embed.title', { user: target.username }), iconURL: target.displayAvatarURL({ dynamic: true }) })
            .setThumbnail(target.displayAvatarURL({ dynamic: true, size: 512 }))
            .setDescription(`${progressBar} **${Math.floor(progress * 100)}%**`)
            .addFields(
                { name: LanguageManager.get(lang, 'leveling.rank.embed.level'), value: `${level}`, inline: true },
                { name: LanguageManager.get(lang, 'leveling.rank.embed.xp'), value: `${Math.floor(xp)}`, inline: true },
                { name: LanguageManager.get(lang, 'leveling.rank.embed.rank'), value: `#${rank}`, inline: true },
                
                { name: LanguageManager.get(lang, 'leveling.rank.embed.progress'), value: `${Math.floor(xpCurrent)}/${Math.floor(xpNeededTotal)}`, inline: true },
                { name: LanguageManager.get(lang, 'leveling.rank.embed.xp_required'), value: `${Math.floor(xpRemaining)} XP`, inline: true },
                { name: LanguageManager.get(lang, 'leveling.rank.embed.messages'), value: `${messageCount}`, inline: true },
                
                { name: LanguageManager.get(lang, 'leveling.rank.embed.voice_time'), value: formatVoiceTime(voiceTime), inline: true }
            )
            .setFooter({ text: LanguageManager.get(lang, 'leveling.rank.embed.footer') })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    },
};
