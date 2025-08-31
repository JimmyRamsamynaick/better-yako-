const { REST, Routes } = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');
require('dotenv').config();

const commands = [];

// Fonction pour charger les commandes récursivement
function loadCommands(dir) {
    const files = fs.readdirSync(dir);
    
    for (const file of files) {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        
        if (stat.isDirectory()) {
            // Si c'est un dossier, on explore récursivement
            loadCommands(filePath);
        } else if (file.endsWith('.js')) {
            // Si c'est un fichier .js, on charge la commande
            const command = require(filePath);
            if ('data' in command && 'execute' in command) {
                commands.push(command.data.toJSON());
                console.log(`✅ Commande chargée: ${command.data.name}`);
            } else {
                console.log(`⚠️ Commande ignorée (structure invalide): ${filePath}`);
            }
        }
    }
}

// Charger toutes les commandes depuis le dossier commands
const commandsPath = path.join(__dirname, 'commands');
loadCommands(commandsPath);

// Construire et préparer une instance du module REST
const rest = new REST().setToken(process.env.DISCORD_TOKEN);

// Déployer les commandes
(async () => {
    try {
        console.log(`🚀 Déploiement de ${commands.length} commandes slash...`);

        // Supprimer toutes les anciennes commandes globales
        console.log('🗑️ Suppression des anciennes commandes globales...');
        await rest.put(
            Routes.applicationCommands(process.env.CLIENT_ID),
            { body: [] }
        );
        console.log('✅ Anciennes commandes globales supprimées.');

        // Déployer les nouvelles commandes globalement
        const data = await rest.put(
            Routes.applicationCommands(process.env.CLIENT_ID),
            { body: commands }
        );

        console.log(`✅ ${data.length} commandes slash déployées avec succès globalement!`);
        console.log('📋 Commandes déployées:');
        data.forEach(cmd => {
            console.log(`   - /${cmd.name}: ${cmd.description}`);
        });
        
        console.log('\n🎉 Déploiement terminé! Les commandes seront disponibles sur tous les serveurs dans quelques minutes.');
        
    } catch (error) {
        console.error('❌ Erreur lors du déploiement des commandes:', error);
    }
})();