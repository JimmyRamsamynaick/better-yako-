const { Events, ActivityType } = require('discord.js');

module.exports = {
    name: Events.ClientReady,
    once: true,
    async execute(client) {
        console.log(`🚀 ${client.user.tag} est maintenant en ligne !`);
        console.log(`📊 Connecté à ${client.guilds.cache.size} serveur(s)`);
        console.log(`👥 ${client.users.cache.size} utilisateur(s) dans le cache`);
        
        // Définir le statut du bot
        client.user.setPresence({
            activities: [{
                name: 'Better Yako v2 | /help',
                type: ActivityType.Playing
            }],
            status: 'online'
        });
        
        // Afficher les statistiques détaillées
        console.log('\n📋 Statistiques détaillées:');
        console.log(`   🏰 Serveurs: ${client.guilds.cache.size}`);
        console.log(`   👥 Utilisateurs: ${client.users.cache.size}`);
        console.log(`   🎯 Commandes: ${client.commands.size}`);
        console.log(`   🌍 Langues: ${client.languages.size}`);
        
        // Afficher les commandes chargées par catégorie
        const commandsByCategory = {};
        client.commands.forEach(command => {
            const category = command.category || 'Autre';
            if (!commandsByCategory[category]) {
                commandsByCategory[category] = [];
            }
            commandsByCategory[category].push(command.data.name);
        });
        
        console.log('\n📚 Commandes par catégorie:');
        Object.entries(commandsByCategory).forEach(([category, commands]) => {
            console.log(`   ${category}: ${commands.join(', ')}`);
        });
        
        console.log('\n✅ Bot prêt à fonctionner !\n');
    }
};