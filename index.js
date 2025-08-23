require('dotenv').config();
const { Client, GatewayIntentBits, Collection, REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');
const express = require('express');
const cors = require('cors');
const DatabaseManager = require('./utils/database');

// Configuration des intents Discord
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds
    ]
});

// Collections pour les commandes
client.commands = new Collection();
client.languages = new Collection();

// Chargement des langues
const loadLanguages = () => {
    const languageFiles = fs.readdirSync('./languages').filter(file => file.endsWith('.json'));
    
    for (const file of languageFiles) {
        const langCode = file.replace('.json', '').replace('lang_', '');
        const langData = require(`./languages/${file}`);
        client.languages.set(langCode, langData);
        console.log(`🌍 Langue chargée: ${langCode}`);
    }
};

// Chargement des commandes
const loadCommands = () => {
    const commandFolders = fs.readdirSync('./commands');
    
    for (const folder of commandFolders) {
        const commandFiles = fs.readdirSync(`./commands/${folder}`).filter(file => file.endsWith('.js'));
        
        for (const file of commandFiles) {
            const filePath = path.join(__dirname, 'commands', folder, file);
            const command = require(filePath);
            
            if ('data' in command && 'execute' in command) {
                client.commands.set(command.data.name, command);
                console.log(`✅ Commande chargée: ${command.data.name}`);
            } else {
                console.log(`⚠️ Commande manquante dans ${filePath}`);
            }
        }
    }
};

// Chargement des événements
const loadEvents = () => {
    const eventFiles = fs.readdirSync('./events').filter(file => file.endsWith('.js'));
    
    for (const file of eventFiles) {
        const filePath = path.join(__dirname, 'events', file);
        const event = require(filePath);
        
        if (event.once) {
            client.once(event.name, (...args) => event.execute(...args, client));
        } else {
            client.on(event.name, (...args) => event.execute(...args, client));
        }
        
        console.log(`🎯 Événement chargé: ${event.name}`);
    }
};

// Fonction pour obtenir la traduction
const getTranslation = (guildId, key, ...args) => {
    // Par défaut français, puis anglais, puis espagnol
    const guildLang = 'fr'; // TODO: Récupérer depuis la base de données
    const lang = client.languages.get(guildLang) || client.languages.get('fr');
    
    let translation = lang[key] || key;
    
    // Remplacer les placeholders {0}, {1}, etc.
    args.forEach((arg, index) => {
        translation = translation.replace(`{${index}}`, arg);
    });
    
    return translation;
};

// API Web
const app = express();
app.use(cors());
app.use(express.json());

// Routes API
app.get('/health', (req, res) => {
    res.json({ status: 'OK', uptime: process.uptime() });
});

app.get('/api/stats', (req, res) => {
    res.json({
        guilds: client.guilds.cache.size,
        users: client.users.cache.size,
        commands: client.commands.size,
        uptime: process.uptime()
    });
});

// Démarrage du bot
const startBot = async () => {
    try {
        console.log('🚀 Démarrage du bot Better Yako v2...');
        
        // Connexion à la base de données
        await DatabaseManager.connect();
        
        // Chargement des composants
        loadLanguages();
        loadCommands();
        loadEvents();
        
        // Connexion à Discord
        await client.login(process.env.DISCORD_TOKEN);
        
        // Démarrage de l'API
        const PORT = process.env.PORT || 3001;
        app.listen(PORT, () => {
            console.log(`🌐 API Web démarrée sur le port ${PORT}`);
        });
        
    } catch (error) {
        console.error('❌ Erreur lors du démarrage:', error);
        process.exit(1);
    }
};

// Gestion des erreurs
process.on('unhandledRejection', error => {
    console.error('❌ Erreur non gérée:', error);
});

process.on('uncaughtException', error => {
    console.error('❌ Exception non capturée:', error);
    process.exit(1);
});

// Démarrage
startBot();

// Export pour les modules
module.exports = { client, getTranslation };