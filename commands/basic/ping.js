const { SlashCommandBuilder } = require('discord.js');
const ModernComponents = require('../../utils/modernComponents.js');

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
        
        // Créer le message avec les composants modernes
        const pingMessage = ModernComponents.createInfoMessage({
            title: '🏓 Pong!',
            description: `**Latence du bot:** ${botLatency}ms\n**Latence API Discord:** ${apiLatency}ms\n**Qualité de connexion:** ${connectionQuality}`,
            color: color,
            fields: [
                {
                    name: '📊 Statistiques',
                    value: `**Serveurs:** ${client.guilds.cache.size}\n**Utilisateurs:** ${client.users.cache.size}\n**Temps de fonctionnement:** ${Math.floor(process.uptime() / 60)} minutes`
                },
                {
                    name: '🔧 Informations techniques',
                    value: `**Version Node.js:** ${process.version}\n**Mémoire utilisée:** ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)} MB\n**Plateforme:** ${process.platform}`
                }
            ],
            buttons: [
                {
                    customId: 'ping_refresh',
                    label: '🔄 Actualiser',
                    style: 1 // Primary
                },
                {
                    customId: 'ping_stats',
                    label: '📊 Plus de stats',
                    style: 2 // Secondary
                }
            ]
        });
        
        await interaction.editReply(pingMessage);
    }
};