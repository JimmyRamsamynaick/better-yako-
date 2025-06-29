// Command to change the bot's language using slash commands
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { REST, Routes } = require('discord.js');

const clientId = process.env.CLIENT_ID;
const token = process.env.TOKEN;
const devMode = false; // false = global, true = guild uniquement

const commands = [];

const commandsFolderPath = path.join(__dirname, 'commands');
if (!fs.existsSync(commandsFolderPath)) {
    console.error(`❌ Le dossier 'commands' est introuvable à l'emplacement : ${commandsFolderPath}`);
    process.exit(1);
}

const commandFolders = fs.readdirSync(commandsFolderPath);

for (const folder of commandFolders) {
    const folderPath = path.join(commandsFolderPath, folder);
    if (!fs.statSync(folderPath).isDirectory()) continue;

    const commandFiles = fs
        .readdirSync(folderPath)
        .filter(file => file.endsWith('.js'));

    for (const file of commandFiles) {
        const filePath = path.join(folderPath, file);
        const command = require(filePath);

        if ('data' in command && 'execute' in command) {
            commands.push(command.data.toJSON());
        } else {
            console.warn(`[⚠️] La commande "${file}" dans "${folder}" est invalide (data/execute manquant).`);
        }
    }
}

const rest = new REST({ version: '10' }).setToken(token);

(async () => {
    try {
        console.log(`📡 Déploiement des slash commands (${devMode ? 'guild' : 'global'})...`);

        const route = devMode
            ? Routes.applicationGuildCommands(clientId, process.env.GUILD_ID)
            : Routes.applicationCommands(clientId);

        await rest.put(route, { body: commands });

        console.log(`✅ ${commands.length} commande(s) déployée(s) avec succès.`);
    } catch (error) {
        console.error('❌ Erreur lors du déploiement :', error);
    }
})();