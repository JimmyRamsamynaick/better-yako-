require('dotenv').config();
const { Client, GatewayIntentBits, Collection, ActivityType, Partials } = require('discord.js');
const { connect } = require('mongoose');
const fs = require('fs');
const path = require('path');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildModeration,
        // Ajout de l'intent pour récupérer le statut et l'activité des membres
        GatewayIntentBits.GuildPresences,
        // Intent pour les réactions aux messages
        GatewayIntentBits.GuildMessageReactions
    ],
    // Partials pour gérer les réactions sur messages non mis en cache
    partials: [Partials.Message, Partials.Channel, Partials.Reaction]
});

// Collections
client.commands = new Collection();
client.cooldowns = new Collection();

// Chargement des commandes
const commandFolders = fs.readdirSync('./commands').filter(item => {
    const itemPath = path.join('./commands', item);
    return fs.statSync(itemPath).isDirectory();
});
for (const folder of commandFolders) {
    const commandFiles = fs.readdirSync(`./commands/${folder}`).filter(file => file.endsWith('.js'));
    for (const file of commandFiles) {
        const command = require(`./commands/${folder}/${file}`);
        client.commands.set(command.data.name, command);
    }
}

// Chargement des événements
const eventFiles = fs.readdirSync('./events').filter(file => file.endsWith('.js'));
for (const file of eventFiles) {
    const event = require(`./events/${file}`);
    if (event.once) {
        client.once(event.name, (...args) => event.execute(...args, client));
    } else {
        client.on(event.name, (...args) => event.execute(...args, client));
    }
}

// Connexion à MongoDB
connect(process.env.MONGODB_URI)
    .then(() => {
        console.log('✅ Connecté à MongoDB');
    })
    .catch(err => {
        console.error('❌ Erreur de connexion à MongoDB:', err);
    });

client.login(process.env.DISCORD_TOKEN);
