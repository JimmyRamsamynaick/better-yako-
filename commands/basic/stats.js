const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const os = require('os');

module.exports = {
    category: 'Basic',
    data: new SlashCommandBuilder()
        .setName('stats')
        .setDescription('📊 Affiche les statistiques du bot / Show bot statistics')
        .setDescriptionLocalizations({
            'en-US': '📊 Show bot statistics',
            'es-ES': '📊 Mostrar estadísticas del bot'
        }),
    
    async execute(interaction, client, getTranslation) {
        // Calculer les statistiques de base
        const totalGuilds = client.guilds.cache.size;
        const totalUsers = client.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0);
        const totalChannels = client.channels.cache.size;
        const totalCommands = client.commands.size;
        
        // Calculer l'uptime
        const uptime = process.uptime();
        const days = Math.floor(uptime / 86400);
        const hours = Math.floor((uptime % 86400) / 3600);
        const minutes = Math.floor((uptime % 3600) / 60);
        const seconds = Math.floor(uptime % 60);
        
        let uptimeString = '';
        if (days > 0) uptimeString += `${days}j `;
        if (hours > 0) uptimeString += `${hours}h `;
        if (minutes > 0) uptimeString += `${minutes}m `;
        uptimeString += `${seconds}s`;
        
        // Informations système
        const memoryUsage = process.memoryUsage();
        const totalMemory = os.totalmem();
        const freeMemory = os.freemem();
        const usedMemory = totalMemory - freeMemory;
        
        const formatBytes = (bytes) => {
            if (bytes === 0) return '0 B';
            const k = 1024;
            const sizes = ['B', 'KB', 'MB', 'GB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
        };
        
        // Calculer la latence
        const ping = client.ws.ping;
        let pingEmoji = '🔴';
        let pingQuality = 'Mauvaise';
        
        if (ping < 100) {
            pingEmoji = '🟢';
            pingQuality = 'Excellente';
        } else if (ping < 200) {
            pingEmoji = '🟡';
            pingQuality = 'Bonne';
        } else if (ping < 300) {
            pingEmoji = '🟠';
            pingQuality = 'Moyenne';
        }
        
        // Statistiques Discord.js
        const djsVersion = require('discord.js').version;
        const nodeVersion = process.version;
        
        // Calculer les statistiques des types de serveurs
        const smallGuilds = client.guilds.cache.filter(g => g.memberCount < 100).size;
        const mediumGuilds = client.guilds.cache.filter(g => g.memberCount >= 100 && g.memberCount < 1000).size;
        const largeGuilds = client.guilds.cache.filter(g => g.memberCount >= 1000).size;
        
        // Créer les champs d'information
        const fields = [
            {
                name: '🤖 Statistiques du Bot',
                value: `**Serveurs:** ${totalGuilds.toLocaleString()}\n**Utilisateurs:** ${totalUsers.toLocaleString()}\n**Salons:** ${totalChannels.toLocaleString()}\n**Commandes:** ${totalCommands}`
            },
            {
                name: '📊 Répartition des Serveurs',
                value: `**Petits (<100):** ${smallGuilds}\n**Moyens (100-999):** ${mediumGuilds}\n**Grands (1000+):** ${largeGuilds}`
            },
            {
                name: '⚡ Performance',
                value: `**Latence:** ${pingEmoji} ${ping}ms (${pingQuality})\n**Uptime:** ${uptimeString}\n**Mémoire utilisée:** ${formatBytes(memoryUsage.heapUsed)}\n**Mémoire totale:** ${formatBytes(memoryUsage.heapTotal)}`
            },
            {
                name: '💻 Système',
                value: `**OS:** ${os.type()} ${os.release()}\n**Architecture:** ${os.arch()}\n**CPU:** ${os.cpus()[0].model.split(' ')[0]} (${os.cpus().length} cœurs)\n**RAM Système:** ${formatBytes(usedMemory)} / ${formatBytes(totalMemory)}`
            },
            {
                name: '🔧 Versions',
                value: `**Node.js:** ${nodeVersion}\n**Discord.js:** v${djsVersion}\n**Plateforme:** ${process.platform}`
            }
        ];
        
        // Calculer le pourcentage d'utilisation mémoire
        const memoryPercent = Math.round((memoryUsage.heapUsed / memoryUsage.heapTotal) * 100);
        const systemMemoryPercent = Math.round((usedMemory / totalMemory) * 100);
        
        // Ajouter une barre de progression pour la mémoire
        const createProgressBar = (percent) => {
            const filled = Math.round(percent / 10);
            const empty = 10 - filled;
            return '█'.repeat(filled) + '░'.repeat(empty) + ` ${percent}%`;
        };
        
        fields.push({
            name: '📈 Utilisation des Ressources',
            value: `**Mémoire Bot:** ${createProgressBar(memoryPercent)}\n**Mémoire Système:** ${createProgressBar(systemMemoryPercent)}`
        });
        
        // Créer le message avec EmbedBuilder
        const statsMessage = new EmbedBuilder()
            .setTitle('📊 Statistiques du Bot')
            .setDescription(`Voici les statistiques détaillées de **${client.user.username}**`)
            .addFields(fields)
            .setColor(ping < 100 ? 0x00ff00 : ping < 200 ? 0xffff00 : ping < 300 ? 0xff8000 : 0xff0000)
            .setThumbnail(client.user.displayAvatarURL({ dynamic: true, size: 256 }))
            .setTimestamp();
        
        // Note: Boutons retirés temporairement
        await interaction.editReply({ embeds: [statsMessage] });
    }
};