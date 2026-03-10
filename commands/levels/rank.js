const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const Guild = require('../../models/Guild');
const LevelingManager = require('../../utils/levelingManager');
const EconomyManager = require('../../utils/economyManager');
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
        .setDescription(LanguageManager.get('fr', 'leveling.rank.description'))
        .setDescriptionLocalizations({
            'en-US': LanguageManager.get('en', 'leveling.rank.description'),
            'en-GB': LanguageManager.get('en', 'leveling.rank.description')
        })
        .addUserOption(option => 
            option.setName('target')
                .setDescription(LanguageManager.get('fr', 'leveling.rank.target_option'))
                .setDescriptionLocalizations({
                    'en-US': LanguageManager.get('en', 'leveling.rank.target_option'),
                    'en-GB': LanguageManager.get('en', 'leveling.rank.target_option')
                })
                .setRequired(false)),
    async execute(interaction) {
        await interaction.deferReply({ ephemeral: false });

        try {
            const target = interaction.options.getUser('target') || interaction.user;
            const guildId = interaction.guild.id;

            const guildData = await Guild.findOne({ guildId });
            const lang = guildData ? (guildData.language || 'fr') : 'fr';

            if (!guildData || !guildData.leveling || !guildData.leveling.enabled) {
                const disabledText = LanguageManager.get(lang, 'leveling.rank.disabled') || 'Le système de niveaux est désactivé.';
                return interaction.editReply({ content: disabledText });
            }

            const guildUsers = Array.isArray(guildData.users) ? guildData.users : [];
            const user = guildUsers.find(u => u.userId === target.id);

            const level = user ? (user.level || 0) : 0;
            const xp = user ? (user.xp || 0) : 0;
            const messageCount = user ? (user.messageCount || 0) : 0;
            const voiceTime = user ? (user.voiceTime || 0) : 0;

            const coins = await EconomyManager.getBalance(guildId, target.id);
            const rank = await LevelingManager.getUserRank(guildId, target.id);

            const xpForNextLevel = LevelingManager.calculateXpForLevel(level + 1);
            const xpForCurrentLevel = LevelingManager.calculateXpForLevel(level);

            const xpCurrent = xp - xpForCurrentLevel;
            const xpNeededTotal = xpForNextLevel - xpForCurrentLevel;
            const xpRemaining = xpForNextLevel - xp;

            const progressRaw = xpNeededTotal > 0 ? (xpCurrent / xpNeededTotal) : 0;
            const progress = Math.min(Math.max(progressRaw, 0), 1);
            const barSize = 15;
            const filled = Math.round(progress * barSize);
            const empty = barSize - filled;
            const progressBar = '█'.repeat(filled) + '░'.repeat(empty);

            const embed = new EmbedBuilder()
                .setColor('#ff47bf')
                .setAuthor({ name: LanguageManager.get(lang, 'leveling.rank.embed.title', { user: target.username }) || `Rank de ${target.username}`, iconURL: target.displayAvatarURL({ dynamic: true }) })
                .setThumbnail(target.displayAvatarURL({ dynamic: true, size: 512 }))
                .setDescription(`${progressBar} **${Math.floor(progress * 100)}%**`)
                .addFields(
                    { name: LanguageManager.get(lang, 'leveling.rank.embed.level') || 'Niveau', value: `${level}`, inline: true },
                    { name: LanguageManager.get(lang, 'leveling.rank.embed.xp') || 'XP', value: `${Math.floor(xp)}`, inline: true },
                    { name: LanguageManager.get(lang, 'leveling.rank.embed.rank') || 'Rang', value: `#${rank}`, inline: true },

                    { name: LanguageManager.get(lang, 'leveling.rank.embed.progress') || 'Progression', value: `${Math.floor(xpCurrent)}/${Math.floor(xpNeededTotal)}`, inline: true },
                    { name: LanguageManager.get(lang, 'leveling.rank.embed.xp_required') || 'XP requis', value: `${Math.floor(xpRemaining)} XP`, inline: true },
                    { name: LanguageManager.get(lang, 'leveling.rank.embed.messages') || 'Messages', value: `${messageCount}`, inline: true },

                    { name: LanguageManager.get(lang, 'leveling.rank.embed.voice_time') || 'Temps vocal', value: formatVoiceTime(voiceTime), inline: true },
                    { name: LanguageManager.get(lang, 'leveling.rank.embed.coins') || 'Coins', value: `${Math.floor(coins)} 🪙`, inline: true }
                )
                .setFooter({ text: LanguageManager.get(lang, 'leveling.rank.embed.footer') || 'Statistiques' })
                .setTimestamp();

            return interaction.editReply({ embeds: [embed] });
        } catch (error) {
            console.error('[rank] erreur:', error);
            return interaction.editReply({ content: '❌ Erreur lors de la récupération du rank.' });
        }
    },
};
