const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const commands = [];

// Fonction pour charger récursivement les commandes
function loadCommands(dir) {
    const files = fs.readdirSync(dir);
    
    for (const file of files) {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        
        if (stat.isDirectory()) {
            loadCommands(filePath);
        } else if (file.endsWith('.js')) {
            try {
                const command = require(filePath);
                if (command.data && command.execute) {
                    commands.push(command.data.toJSON());
                    console.log(`✅ Commande chargée: ${command.data.name}`);
                } else {
                    console.log(`⚠️  Commande ignorée (structure invalide): ${file}`);
                }
            } catch (error) {
                console.error(`❌ Erreur lors du chargement de ${file}:`, error.message);
            }
        }
    }
}

// Charger toutes les commandes
const commandsPath = path.join(__dirname, 'commands');
loadCommands(commandsPath);

console.log(`\n📊 Total des commandes trouvées: ${commands.length}`);

// Construire et préparer une instance du module REST
const rest = new REST().setToken(process.env.DISCORD_TOKEN);

// Déployer les commandes
(async () => {
    try {
        console.log(`\n🚀 Début du déploiement de ${commands.length} commandes d'application (slash).`);

        // Déploiement global (peut prendre jusqu'à 1 heure pour se propager)
        const data = await rest.put(
            Routes.applicationCommands(process.env.CLIENT_ID),
            { body: commands },
        );

        console.log(`✅ ${data.length} commandes d'application (slash) déployées avec succès globalement.`);
        
        // Afficher la liste des commandes déployées
        console.log('\n📋 Commandes déployées:');
        data.forEach((command, index) => {
            console.log(`${index + 1}. /${command.name} - ${command.description}`);
        });
        
        console.log('\n🎉 Déploiement terminé! Les commandes seront disponibles dans tous les serveurs dans un délai de 1 heure.');
        
    } catch (error) {
        console.error('❌ Erreur lors du déploiement des commandes:', error);
        
        if (error.code === 50001) {
            console.error('\n💡 Erreur: Accès manquant. Vérifiez que:');
            console.error('   - Le token du bot est correct');
            console.error('   - Le CLIENT_ID est correct');
            console.error('   - Le bot a les permissions nécessaires');
        } else if (error.code === 30034) {
            console.error('\n💡 Erreur: Limite de taux atteinte. Attendez quelques minutes avant de réessayer.');
        } else if (error.rawError?.message?.includes('Invalid Form Body')) {
            console.error('\n💡 Erreur: Structure de commande invalide. Vérifiez:');
            console.error('   - Les noms de commandes (lettres minuscules, tirets, underscores uniquement)');
            console.error('   - Les descriptions (1-100 caractères)');
            console.error('   - Les options et leurs types');
        }
    }
})();

// Fonction utilitaire pour déployer sur un serveur spécifique (développement)
if (process.argv.includes('--guild') && process.env.GUILD_ID) {
    (async () => {
        try {
            console.log(`\n🔧 Déploiement sur le serveur de développement (${process.env.GUILD_ID})...`);
            
            const data = await rest.put(
                Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
                { body: commands },
            );
            
            console.log(`✅ ${data.length} commandes déployées sur le serveur de développement.`);
            console.log('🚀 Les commandes sont immédiatement disponibles sur ce serveur!');
            
        } catch (error) {
            console.error('❌ Erreur lors du déploiement sur le serveur:', error);
        }
    })();
}

// Fonction pour supprimer toutes les commandes (utile pour le nettoyage)
if (process.argv.includes('--clear')) {
    (async () => {
        try {
            console.log('\n🧹 Suppression de toutes les commandes...');
            
            // Supprimer les commandes globales
            await rest.put(
                Routes.applicationCommands(process.env.CLIENT_ID),
                { body: [] },
            );
            
            // Supprimer les commandes du serveur de développement si spécifié
            if (process.env.GUILD_ID) {
                await rest.put(
                    Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
                    { body: [] },
                );
            }
            
            console.log('✅ Toutes les commandes ont été supprimées.');
            
        } catch (error) {
            console.error('❌ Erreur lors de la suppression des commandes:', error);
        }
    })();
}

// Afficher l'aide si demandé
if (process.argv.includes('--help') || process.argv.includes('-h')) {
    console.log(`
📖 Utilisation du script deploy-commands.js:

🌍 Déploiement global (recommandé pour la production):
   node deploy-commands.js

🔧 Déploiement sur serveur de développement (instantané):
   node deploy-commands.js --guild
   (Nécessite GUILD_ID dans .env)

🧹 Supprimer toutes les commandes:
   node deploy-commands.js --clear

❓ Afficher cette aide:
   node deploy-commands.js --help

📝 Notes:
   - Le déploiement global peut prendre jusqu'à 1 heure
   - Le déploiement sur serveur est instantané mais limité à ce serveur
   - Assurez-vous que DISCORD_TOKEN et CLIENT_ID sont dans votre .env
`);
}