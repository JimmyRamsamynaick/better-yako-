// Script de déploiement des commandes slash pour Discord
// Réécrit pour être robuste, configurable et simple à utiliser

require('dotenv').config();
const { REST, Routes } = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');

// Chargement et validation des variables d'environnement
const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_IDS = (process.env.GUILD_IDS || '')
  .split(',')
  .map(id => id.trim())
  .filter(Boolean);
const DEPLOY_TARGET = (process.env.DEPLOY_TARGET || 'both').toLowerCase(); // 'global' | 'guild' | 'both'

// Options CLI facultatives:
// --global-only       => force déploiement global uniquement
// --guild-only        => force déploiement guild uniquement
// --guild <id>        => ajoute une guilde ciblée (peut être répété)
const argv = process.argv.slice(2);
let overrideTarget = null;
const extraGuilds = [];
for (let i = 0; i < argv.length; i++) {
  const arg = argv[i];
  if (arg === '--global-only') overrideTarget = 'global';
  else if (arg === '--guild-only') overrideTarget = 'guild';
  else if (arg === '--guild' && argv[i + 1]) {
    extraGuilds.push(argv[i + 1]);
    i++;
  }
}

const target = overrideTarget || DEPLOY_TARGET;
const guildList = [...GUILD_IDS, ...extraGuilds]
  .map(id => id.trim())
  .filter((id, idx, arr) => id && arr.indexOf(id) === idx);

function fail(message) {
  console.error(`❌ ${message}`);
  process.exit(1);
}

// Validation de base
if (!TOKEN) fail("Variable d'environnement manquante: DISCORD_TOKEN");
if (!CLIENT_ID) fail("Variable d'environnement manquante: CLIENT_ID");
if (target === 'guild' && guildList.length === 0) {
  console.warn('⚠️ Aucun ID de guilde fourni. Ajoutez `GUILD_IDS` dans .env ou utilisez `--guild <id>`.');
}

// Chargement récursif des commandes depuis ./commands
const commands = [];
function loadCommands(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      loadCommands(fullPath);
    } else if (entry.isFile() && entry.name.endsWith('.js')) {
      try {
        const command = require(fullPath);
        if (command && command.data && typeof command.data.toJSON === 'function') {
          commands.push(command.data.toJSON());
          console.log(`✅ Chargé: /${command.data.name}`);
        } else {
          console.log(`⚠️ Ignoré (structure invalide): ${fullPath}`);
        }
      } catch (err) {
        console.log(`⚠️ Impossible de charger ${fullPath}:`, err.message);
      }
    }
  }
}

const commandsPath = path.join(__dirname, 'commands');
if (!fs.existsSync(commandsPath)) fail(`Dossier des commandes introuvable: ${commandsPath}`);
loadCommands(commandsPath);

if (commands.length === 0) {
  console.warn('⚠️ Aucune commande détectée. Rien à déployer.');
}

// Instance REST
const rest = new REST().setToken(TOKEN);

async function deployGlobal() {
  console.log('⬆️ Déploiement des commandes globales...');
  const data = await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
  console.log(`✅ ${data.length} commande(s) globale(s) déployée(s).`);
}

async function deployGuilds(ids) {
  for (const guildId of ids) {
    try {
      console.log(`⬆️ Déploiement des commandes pour la guilde ${guildId}...`);
      const data = await rest.put(
        Routes.applicationGuildCommands(CLIENT_ID, guildId),
        { body: commands }
      );
      console.log(`✅ ${data.length} commande(s) déployée(s) pour ${guildId}.`);
    } catch (err) {
      console.error(`❌ Erreur de déploiement pour ${guildId}:`, err);
    }
  }
}

(async () => {
  try {
    console.log(`🚀 Déploiement lancé (cibles: ${target})`);
    console.log(`📦 Total des commandes à déployer: ${commands.length}`);
    if (target !== 'global' && guildList.length > 0) {
      console.log(`🏷️ Guildes ciblées: ${guildList.join(', ')}`);
      await deployGuilds(guildList);
    }
    if (target !== 'guild') {
      await deployGlobal();
    }
    console.log('🎉 Terminé. Les commandes peuvent prendre quelques minutes à apparaître.');
  } catch (error) {
    console.error('❌ Erreur lors du déploiement:', error);
    process.exit(1);
  }
})();