const { Client, GatewayIntentBits, Collection, REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
require('dotenv').config();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildModeration
    ]
});

// Collections pour stocker les commandes
client.commands = new Collection();
client.warnings = new Map();

// Fonction pour charger les traductions
function loadTranslations() {
    const translations = {};
    const languagesPath = path.join(__dirname, 'languages');

    if (fs.existsSync(languagesPath)) {
        const langFiles = fs.readdirSync(languagesPath).filter(file => file.endsWith('.json'));

        langFiles.forEach(file => {
            const langName = file.replace('.json', '').replace('lang_', '');
            const langPath = path.join(languagesPath, file);
            translations[langName] = JSON.parse(fs.readFileSync(langPath, 'utf8'));
        });
    }

    return translations;
}

// Charger les traductions
const translations = loadTranslations();

// Fonction pour obtenir une traduction
function getTranslation(guildId, key, ...args) {
    // Charger la langue du serveur (par défaut français)
    let guildLang = 'fr';
    const guildLangPath = path.join(__dirname, 'data', 'guildLang.json');

    if (fs.existsSync(guildLangPath)) {
        try {
            const guildLangData = JSON.parse(fs.readFileSync(guildLangPath, 'utf8'));
            guildLang = guildLangData[guildId] || 'fr';
        } catch (error) {
            console.error('Erreur lors du chargement des langues:', error);
        }
    }

    const langData = translations[guildLang] || translations['fr'] || {};

    // Naviguer dans l'objet de traduction
    const keys = key.split('.');
    let translation = langData;

    for (const k of keys) {
        if (translation && typeof translation === 'object') {
            translation = translation[k];
        } else {
            translation = key; // Retourner la clé si pas de traduction trouvée
            break;
        }
    }

    // Remplacer les paramètres si fournis
    if (typeof translation === 'string' && args.length > 0) {
        args.forEach((arg, index) => {
            translation = translation.replace(`{${index}}`, arg);
        });
    }

    return translation || key;
}

// Fonction pour charger les commandes récursivement
function loadCommands(dir) {
    const commands = [];
    const files = fs.readdirSync(dir);

    for (const file of files) {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);

        if (stat.isDirectory()) {
            // Récursion pour les sous-dossiers
            commands.push(...loadCommands(filePath));
        } else if (file.endsWith('.js')) {
            try {
                // Supprimer du cache pour permettre le rechargement à chaud
                delete require.cache[require.resolve(filePath)];
                const command = require(filePath);

                // Vérifier si c'est une commande valide
                if (command.data && command.execute) {
                    // Slash command moderne
                    client.commands.set(command.data.name, command);
                    commands.push(command.data.toJSON());
                    console.log(`✅ Slash command chargée: ${command.data.name}`);
                } else if (command.name && command.execute) {
                    // Commande legacy - on va la convertir automatiquement
                    console.log(`⚠️  Commande legacy détectée: ${command.name} - Conversion nécessaire`);
                }
            } catch (error) {
                console.error(`❌ Erreur lors du chargement de ${filePath}:`, error);
            }
        }
    }

    return commands;
}

// Déployer les commandes automatiquement à chaque démarrage
async function deployCommands() {
    try {
        // Charger toutes les commandes
        const commandsPath = path.join(__dirname, 'commands');
        const commands = loadCommands(commandsPath);

        console.log('🔄 Rechargement automatique des slash commands...');
        console.log(`📊 Nombre de commandes à déployer: ${commands.length}`);

        const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

        // Déploiement global pour tous les serveurs - FORCÉ à chaque démarrage
        await rest.put(
            Routes.applicationCommands(process.env.CLIENT_ID),
            { body: commands }
        );

        console.log(`✅ ${commands.length} slash commands rechargées et disponibles immédiatement!`);
        console.log('🎯 Les commandes sont maintenant visibles avec "/" dans tous les serveurs.');

        // Afficher la liste des commandes déployées
        console.log('📋 Commandes disponibles:');
        commands.forEach(cmd => {
            console.log(`   - /${cmd.name}: ${cmd.description}`);
        });

    } catch (error) {
        console.error('❌ Erreur lors du déploiement des commandes:', error);

        // En cas d'erreur, essayer de nettoyer les commandes
        if (error.code === 50035) {
            console.log('🧹 Tentative de nettoyage des commandes corrompues...');
            try {
                const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

                await rest.put(
                    Routes.applicationCommands(process.env.CLIENT_ID),
                    { body: [] }
                );

                console.log('✅ Commandes globales nettoyées, redémarrez le bot pour redéployer.');
            } catch (cleanError) {
                console.error('❌ Impossible de nettoyer les commandes:', cleanError);
            }
        }
    }
}

// Événement de connexion
client.once('ready', async () => {
    console.log(`🚀 ${client.user.tag} est en ligne!`);
    console.log(`📊 Connecté sur ${client.guilds.cache.size} serveur(s)`);
    console.log(`👥 Servant ${client.users.cache.size} utilisateur(s)`);

    // Créer le dossier data s'il n'existe pas
    const dataPath = path.join(__dirname, 'data');
    if (!fs.existsSync(dataPath)) {
        fs.mkdirSync(dataPath, { recursive: true });
    }

    // RECHARGEMENT AUTOMATIQUE FORCÉ à chaque démarrage
    await deployCommands();

    // Définir le statut du bot
    client.user.setActivity(`Yako Bot | ${client.commands.size} commandes`, { type: 'WATCHING' });
});

// Gestionnaire d'interactions (slash commands)
client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    const command = client.commands.get(interaction.commandName);

    if (!command) {
        console.error(`❌ Commande ${interaction.commandName} introuvable.`);
        return interaction.reply({
            content: '❌ Cette commande n\'existe plus ou n\'est pas disponible.',
            ephemeral: true
        });
    }

    try {
        await command.execute(interaction, client, getTranslation);
    } catch (error) {
        console.error(`❌ Erreur lors de l'exécution de ${interaction.commandName}:`, error);

        const errorMessage = {
            content: '❌ Une erreur s\'est produite lors de l\'exécution de cette commande.',
            ephemeral: true
        };

        if (interaction.replied || interaction.deferred) {
            await interaction.followUp(errorMessage);
        } else {
            await interaction.reply(errorMessage);
        }
    }
});

// Gestionnaire d'erreurs
client.on('error', error => {
    console.error('❌ Erreur Discord.js:', error);
});

client.on('warn', warning => {
    console.warn('⚠️ Avertissement Discord.js:', warning);
});

// Connexion du bot
client.login(process.env.TOKEN);

// Export des fonctions utiles pour d'autres modules
module.exports = {
    client,
    getTranslation
};