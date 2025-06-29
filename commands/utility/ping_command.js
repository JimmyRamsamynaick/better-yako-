// commands/utility/ping.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Vérifie la latence du bot'),

    async execute(interaction, client, getTranslation) {
        const sent = await interaction.reply({ content: '🏓 Calcul du ping...', fetchReply: true });

        const botLatency = sent.createdTimestamp - interaction.createdTimestamp;
        const apiLatency = Math.round(client.ws.ping);

        const embed = new EmbedBuilder()
            .setColor('#00ff00')
            .setTitle('🏓 Pong!')
            .setDescription(`**Latence du bot:** ${botLatency}ms\n**Latence API:** ${apiLatency}ms`)
            .setTimestamp()
            .setFooter({ text: 'Yako Bot', iconURL: client.user.displayAvatarURL() });

        await interaction.editReply({ content: '', embeds: [embed] });
    }
};
