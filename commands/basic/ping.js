const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
    category: 'Basic',
    data: new SlashCommandBuilder()
        .setName('ping')
        .setDescription('🏓 Vérifie la latence du bot / Check bot latency')
        .setDescriptionLocalizations({
            'en-US': '🏓 Check bot latency',
            'es-ES': '🏓 Verificar latencia del bot'
        }),
    
    async execute(interaction, client, getTranslation) {
        const startTime = Date.now();
        
        // Calculer la latence
        const botLatency = Date.now() - startTime;
        const apiLatency = Math.round(client.ws.ping);
        
        // Déterminer la qualité de la connexion
        let connectionQuality = '🟢 Excellente';
        let color = '#57F287';
        
        if (apiLatency > 200) {
            connectionQuality = '🟡 Moyenne';
            color = '#FEE75C';
        }
        if (apiLatency > 500) {
            connectionQuality = '🔴 Mauvaise';
            color = '#ED4245';
        }
        
        // Créer l'embed avec les informations de ping
        const pingEmbed = new EmbedBuilder()
            .setTitle('🏓 Pong!')
            .setDescription(`**Latence du bot:** ${botLatency}ms\n**Latence API Discord:** ${apiLatency}ms\n**Qualité de connexion:** ${connectionQuality}`)
            .setColor(parseInt(color.replace('#', ''), 16))
            .addFields(
                {
                    name: '📊 Statistiques',
                    value: `**Serveurs:** ${client.guilds.cache.size}\n**Utilisateurs:** ${client.users.cache.size}\n**Temps de fonctionnement:** ${Math.floor(process.uptime() / 60)} minutes`,
                    inline: false
                },
                {
                    name: '🔧 Informations techniques',
                    value: `**Version Node.js:** ${process.version}\n**Mémoire utilisée:** ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)} MB\n**Plateforme:** ${process.platform}`,
                    inline: false
                }
            )
            .setTimestamp();

        // Créer les boutons
        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('ping_refresh')
                    .setLabel('🔄 Actualiser')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('ping_stats')
                    .setLabel('📊 Plus de stats')
                    .setStyle(ButtonStyle.Secondary)
            );
        
        await interaction.editReply({ embeds: [pingEmbed], components: [row] });
    }
};