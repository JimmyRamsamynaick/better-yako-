const { SlashCommandBuilder, StringSelectMenuBuilder, ComponentType } = require('discord.js');
const Guild = require('../../models/Guild');
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

// Function to format numbers with spaces (e.g., 1 000 000)
function formatNumber(num) {
    return Math.floor(num).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('leaderboard')
        .setDescription('Affiche le classement du serveur')
        .setDescriptionLocalizations({
            'fr': 'Affiche le classement du serveur',
            'en-US': 'Displays the server leaderboard',
            'en-GB': 'Displays the server leaderboard'
        }),
    async execute(interaction) {
        const guildData = await Guild.findOne({ guildId: interaction.guild.id });
        const lang = guildData ? (guildData.language || 'fr') : 'fr';

        if (!guildData || !guildData.users || guildData.users.length === 0) {
            return interaction.reply({ content: LanguageManager.get(lang, 'leveling.leaderboard.empty'), ephemeral: true });
        }

        // --- Helper function for generating Payload (Components V3) ---

        const getPayload = (selectedType) => {
            // Calculate Stats
            const totalXp = guildData.users.reduce((acc, u) => acc + (u.xp || 0), 0);
            const totalMessages = guildData.users.reduce((acc, u) => acc + (u.messageCount || 0), 0);
            const totalVoice = guildData.users.reduce((acc, u) => acc + (u.voiceTime || 0), 0);
            
            const currentUser = guildData.users.find(u => u.userId === interaction.user.id);
            const userLevel = currentUser ? (currentUser.level || 0) : 0;
            const userXp = currentUser ? (currentUser.xp || 0) : 0;
            const userMessages = currentUser ? (currentUser.messageCount || 0) : 0;
            const userVoice = currentUser ? (currentUser.voiceTime || 0) : 0;

            // 1. Stats Text Block
            const serverStatsTitle = LanguageManager.get(lang, 'leveling.leaderboard.embed.server_stats_title');
            const userStatsTitle = LanguageManager.get(lang, 'leveling.leaderboard.embed.user_stats_title').replace('Vos', interaction.user.username);
            
            const statsText = `### 🌙 • ${LanguageManager.get(lang, 'leveling.leaderboard.embed.title', { server: interaction.guild.name })}\n` +
                `${LanguageManager.get(lang, 'leveling.leaderboard.embed.description')}\n\n` +
                `### ${serverStatsTitle}\n` +
                `**${LanguageManager.get(lang, 'leveling.leaderboard.embed.total_xp')}:** \`${formatNumber(totalXp)}\`\n` +
                `**${LanguageManager.get(lang, 'leveling.leaderboard.embed.total_messages')}:** \`${formatNumber(totalMessages)}\`\n` +
                `**${LanguageManager.get(lang, 'leveling.leaderboard.embed.total_voice')}:** \`${formatVoiceTime(totalVoice)}\`\n\n` +
                `### ${userStatsTitle}\n` +
                `**${LanguageManager.get(lang, 'leveling.leaderboard.embed.level_xp', { level: userLevel, xp: formatNumber(Math.floor(userXp)) })}**\n` +
                `\`${formatNumber(userMessages)}\` **${LanguageManager.get(lang, 'leveling.leaderboard.embed.messages')}**\n` +
                `\`${formatVoiceTime(userVoice)}\` **${LanguageManager.get(lang, 'leveling.leaderboard.embed.voice')}**`;

            // 2. Leaderboard Text Block (if not home)
            let leaderboardText = '';
            if (selectedType !== 'home') {
                const medals = ['🥇', '🥈', '🥉'];
                let sortedUsers = [];
                let title = '';
                let formatLine = () => {};

                if (selectedType === 'messages') {
                    sortedUsers = [...guildData.users].sort((a, b) => (b.messageCount || 0) - (a.messageCount || 0));
                    title = `💬 ${LanguageManager.get(lang, 'leveling.leaderboard.types.messages')}`;
                    formatLine = (u, i) => {
                        const name = (interaction.guild.members.cache.get(u.userId)?.user.username || u.userId).padEnd(15, ' ');
                        return `${medals[i] || (i + 1).toString().padEnd(2, ' ')} ${name} - ${formatNumber(u.messageCount || 0)} messages`;
                    };
                } else if (selectedType === 'voice') {
                    sortedUsers = [...guildData.users].sort((a, b) => (b.voiceTime || 0) - (a.voiceTime || 0));
                    title = `🎤 ${LanguageManager.get(lang, 'leveling.leaderboard.types.voice')}`;
                    formatLine = (u, i) => {
                        const name = (interaction.guild.members.cache.get(u.userId)?.user.username || u.userId).padEnd(15, ' ');
                        return `${medals[i] || (i + 1).toString().padEnd(2, ' ')} ${name} - ${formatVoiceTime(u.voiceTime || 0)}`;
                    };
                } else if (selectedType === 'level') {
                    sortedUsers = [...guildData.users].sort((a, b) => (b.xp || 0) - (a.xp || 0));
                    title = `🏆 ${LanguageManager.get(lang, 'leveling.leaderboard.types.level')}`;
                    formatLine = (u, i) => {
                        const name = (interaction.guild.members.cache.get(u.userId)?.user.username || u.userId).padEnd(15, ' ');
                        return `${medals[i] || (i + 1).toString().padEnd(2, ' ')} ${name} - Niv. ${u.level || 0} (${formatNumber(Math.floor(u.xp || 0))} XP)`;
                    };
                }

                const top10 = sortedUsers.slice(0, 10);
                const list = top10.map((u, i) => formatLine(u, i)).join('\n') || LanguageManager.get(lang, 'leveling.leaderboard.empty');
                
                leaderboardText = `### ${title}\n\`\`\`js\n${list}\n\`\`\``;
            }

            // 3. Select Menu
            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('leaderboard_select')
                .setPlaceholder(LanguageManager.get(lang, 'leveling.leaderboard.embed.select_placeholder'))
                .addOptions([
                    { label: LanguageManager.get(lang, 'leveling.leaderboard.types.home'), value: 'home', emoji: '🏠', default: selectedType === 'home' },
                    { label: LanguageManager.get(lang, 'leveling.leaderboard.types.messages'), value: 'messages', emoji: '💬', default: selectedType === 'messages' },
                    { label: LanguageManager.get(lang, 'leveling.leaderboard.types.voice'), value: 'voice', emoji: '🎤', default: selectedType === 'voice' },
                    { label: LanguageManager.get(lang, 'leveling.leaderboard.types.level'), value: 'level', emoji: '⭐', default: selectedType === 'level' }
                ]);

            // 4. Build Inner Components (Layout)
            const innerComponents = [
                {
                    type: 10,
                    content: statsText
                },
                {
                    type: 14,
                    divider: true,
                    spacing: 2
                },
                {
                    type: 1, // ActionRow containing the menu
                    components: [selectMenu.toJSON()]
                }
            ];

            if (leaderboardText) {
                innerComponents.push({
                    type: 14,
                    divider: true,
                    spacing: 2
                });
                innerComponents.push({
                    type: 10,
                    content: leaderboardText
                });
            }

            // Footer
            innerComponents.push({
                type: 14,
                divider: true,
                spacing: 2
            });
            innerComponents.push({
                type: 10,
                content: `*${LanguageManager.get(lang, 'leveling.leaderboard.embed.footer')}*`
            });

            // Return V3 Payload
            return {
                content: '',
                components: [{
                    type: 17,
                    components: innerComponents
                }],
                flags: 32768
            };
        };

        // --- Initial Reply ---

        const initialPayload = getPayload('home');
        const response = await interaction.reply({ ...initialPayload, fetchReply: true });

        // --- Collector ---

        const collector = response.createMessageComponentCollector({ componentType: ComponentType.StringSelect, time: 300000 }); // 5 minutes

        collector.on('collect', async i => {
            if (i.user.id !== interaction.user.id) {
                return i.reply({ content: 'Ce n\'est pas votre menu !', ephemeral: true });
            }

            const selection = i.values[0];
            const newPayload = getPayload(selection);

            await i.update(newPayload);
        });
    },
};
