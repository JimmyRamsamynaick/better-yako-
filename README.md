# 🤖 Yako Bot - Discord Moderation & AI Assistant (BETA)

<div align="center">

![Yako Bot Banner](https://cdn.discordapp.com/attachments/1176977094908071979/1393225945439015006/helpLNTR-PSD.png?ex=68726646&is=687114c6&hm=5cad4cc3a7b7420ef85b5dcc84b52378dd347f97c12a7c1234d7658e8d1dc933&)

[![Discord.js](https://img.shields.io/badge/Discord.js-v14.22.1-blue.svg)](https://discord.js.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18.0.0+-green.svg)](https://nodejs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-6.19.0+-brightgreen.svg)](https://mongodb.com/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Status](https://img.shields.io/badge/Status-BETA-orange.svg)](https://github.com/votre-username/discord-bot-v14)

**🚧 Version BETA - En développement actif 🚧**

*Un bot Discord moderne et puissant avec modération avancée, intelligence artificielle intégrée et support multilingue*

[📖 Documentation](#-documentation) • [🚀 Installation](#-installation) • [⚡ Fonctionnalités](#-fonctionnalités) • [🤝 Contribuer](#-contribuer)

</div>

---

## ✨ Fonctionnalités

### 🛡️ **Modération Avancée**
- **Système de bannissement** - Ban/Unban avec raisons personnalisées
- **Gestion des kicks** - Expulsion de membres avec logs
- **Système de mute** - Configuration automatique des rôles et permissions
- **Nettoyage de messages** - Suppression en masse avec filtres
- **Verrouillage de salons** - Lock/Unlock temporaire ou permanent
- **Logs automatiques** - Traçabilité complète des actions

### 🤖 **Intelligence Artificielle**
- **Assistant IA intégré** - Powered by OpenAI GPT
- **Réponses contextuelles** - Comprend et répond aux questions complexes
- **Support multilingue** - Français et Anglais
- **Commandes premium** - Accès exclusif aux fonctionnalités IA

### 🌍 **Fonctionnalités Publiques**
- **Informations serveur** - Statistiques détaillées et analytics
- **Profils utilisateur** - Informations complètes des membres
- **Système d'avatars** - Affichage haute qualité
- **Latence en temps réel** - Monitoring des performances
- **Aide interactive** - Interface moderne avec menus déroulants

### 🎨 **Interface Moderne**
- **Components V3** - Interface Discord dernière génération
- **Embeds dynamiques** - Design responsive et élégant
- **Menus interactifs** - Navigation intuitive
- **Feedback visuel** - Indicateurs de statut en temps réel

---

## 🚀 Installation

### Prérequis
- **Node.js** 18.0.0 ou supérieur
- **MongoDB** 6.19.0 ou supérieur
- **Compte Discord Developer** avec bot token
- **Clé API OpenAI** (pour les fonctionnalités IA)

### Installation rapide

```bash
# Cloner le repository
git clone https://github.com/votre-username/discord-bot-v14.git
cd discord-bot-v14

# Installer les dépendances
npm install

# Copier et configurer l'environnement
cp .env.example .env
# Éditer .env avec vos tokens et configurations

# Déployer les commandes slash
node deploy-commands.js

# Lancer le bot
npm start
```

### Configuration `.env`

```env
# Discord Configuration
DISCORD_TOKEN=votre_token_discord
CLIENT_ID=votre_client_id

# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017/yakobot

# OpenAI Configuration (Premium)
OPENAI_API_KEY=votre_cle_openai

# Bot Configuration
BOT_PREFIX=!
DEFAULT_LANGUAGE=fr
DEBUG_MODE=false
```

---

## 📋 Commandes Disponibles

### 🛡️ Modération
| Commande | Description | Permissions |
|----------|-------------|-------------|
| `/ban` | Bannir un membre du serveur | Ban Members |
| `/unban` | Débannir un membre | Ban Members |
| `/kick` | Expulser un membre | Kick Members |
| `/mute` | Rendre muet un membre | Manage Roles |
| `/unmute` | Rendre la parole à un membre | Manage Roles |
| `/clear` | Supprimer des messages | Manage Messages |
| `/lock` | Verrouiller un salon | Manage Channels |
| `/unlock` | Déverrouiller un salon | Manage Channels |
| `/setupmute` | Configurer le système de mute | Manage Roles |
| `/setlogs` | Configurer les logs | Manage Guild |
| `/setlang` | Changer la langue du serveur | Manage Guild |

### 👥 Public
| Commande | Description | Permissions |
|----------|-------------|-------------|
| `/help` | Afficher l'aide interactive | Aucune |
| `/ping` | Vérifier la latence du bot | Aucune |
| `/serverinfo` | Informations détaillées du serveur | Aucune |
| `/userinfo` | Informations d'un utilisateur | Aucune |
| `/avatar` | Afficher l'avatar d'un utilisateur | Aucune |

### ⭐ Premium
| Commande | Description | Permissions |
|----------|-------------|-------------|
| `/ask` | Poser une question à l'IA | Premium Server |

---

## 🏗️ Architecture

```
yako/
├── 📁 commands/           # Commandes organisées par catégorie
│   ├── 🛡️ moderation/    # Commandes de modération
│   ├── ⭐ premium/        # Commandes premium
│   └── 👥 public/         # Commandes publiques
├── 📁 events/             # Gestionnaires d'événements Discord
├── 📁 languages/          # Fichiers de traduction (fr/en)
├── 📁 models/             # Modèles MongoDB (Mongoose)
├── 📁 utils/              # Utilitaires et helpers
│   ├── ComponentsV3.js    # Système d'interface moderne
│   ├── embeds.js          # Générateur d'embeds
│   ├── languageManager.js # Gestionnaire multilingue
│   └── aiService.js       # Service d'intelligence artificielle
├── 📄 index.js            # Point d'entrée principal
├── 📄 deploy-commands.js  # Déployeur de commandes slash
└── 📄 package.json        # Configuration du projet
```

---

## 🌟 Fonctionnalités Avancées

### 🔧 Système de Configuration
- **Base de données MongoDB** - Stockage persistant des configurations
- **Paramètres par serveur** - Personnalisation complète
- **Sauvegarde automatique** - Aucune perte de données
- **Migration facile** - Import/Export des configurations

### 🌐 Support Multilingue
- **Français** (par défaut)
- **Anglais** 
- **Traductions dynamiques** - Changement en temps réel
- **Localisation complète** - Interface et messages

### 📊 Système de Logs
- **Logs détaillés** - Toutes les actions de modération
- **Horodatage précis** - Traçabilité complète
- **Formatage élégant** - Embeds colorés et structurés
- **Filtrage avancé** - Par type d'action ou utilisateur

### 🔒 Sécurité
- **Validation des permissions** - Vérifications multiples
- **Protection contre le spam** - Cooldowns intelligents
- **Logs de sécurité** - Détection d'activités suspectes
- **Chiffrement des données** - Tokens et clés sécurisés

---

## 🛠️ Développement

### Scripts disponibles
```bash
npm start          # Lancer en production
npm run dev        # Lancer en développement (nodemon)
npm run install-clean  # Installation propre
npm run update-deps    # Mise à jour des dépendances
```

### Structure de développement
```javascript
// Exemple d'ajout d'une nouvelle commande
const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('exemple')
        .setDescription('Commande d\'exemple'),
    
    async execute(interaction) {
        // Logique de la commande
    }
};
```

### Tests et Débogage
- **Mode debug** - Logs détaillés pour le développement
- **Gestion d'erreurs** - Try/catch complets avec logs
- **Monitoring** - Surveillance des performances
- **Validation** - Vérification des entrées utilisateur

---

## 🤝 Contribuer

Nous accueillons toutes les contributions ! Voici comment participer :

### 🐛 Signaler un Bug
1. Vérifiez que le bug n'a pas déjà été signalé
2. Créez une issue avec le template bug
3. Incluez les logs et étapes de reproduction

### ✨ Proposer une Fonctionnalité
1. Ouvrez une issue avec le template feature
2. Décrivez clairement la fonctionnalité souhaitée
3. Expliquez pourquoi elle serait utile

### 🔧 Développer
1. Fork le projet
2. Créez une branche feature (`git checkout -b feature/AmazingFeature`)
3. Committez vos changements (`git commit -m 'Add AmazingFeature'`)
4. Push vers la branche (`git push origin feature/AmazingFeature`)
5. Ouvrez une Pull Request

---

## 📈 Roadmap

### Version 1.1 (Prochaine)
- [ ] 🎵 Commandes musicales
- [ ] 📊 Dashboard web
- [ ] 🔔 Système de notifications
- [ ] 🎮 Mini-jeux intégrés

### Version 1.2 (Future)
- [ ] 🤖 IA plus avancée
- [ ] 📱 Application mobile
- [ ] 🌍 Plus de langues
- [ ] ☁️ Déploiement cloud

---

## 📞 Support

### 🆘 Besoin d'aide ?
- **Documentation** : [Wiki du projet](https://github.com/votre-username/discord-bot-v14/wiki)
- **Issues** : [GitHub Issues](https://github.com/votre-username/discord-bot-v14/issues)
- **Discord** : [Serveur de support](https://discord.gg/votre-invite)
- **Email** : support@yakobot.com

### 🐛 Problèmes Connus
- Latence élevée avec de gros serveurs (>10k membres)
- Limitation API OpenAI en version gratuite
- Compatibilité partielle avec certains bots musicaux

---

## 📄 Licence

Ce projet est sous licence MIT. Voir le fichier [LICENSE](LICENSE) pour plus de détails.

---

## 🙏 Remerciements

- **Discord.js** - Framework Discord incroyable
- **OpenAI** - Intelligence artificielle de pointe  
- **MongoDB** - Base de données robuste
- **La communauté** - Feedback et contributions précieuses

---

<div align="center">

**⭐ Si ce projet vous plaît, n'hésitez pas à lui donner une étoile ! ⭐**

*Fait avec ❤️ par l'équipe Yako Bot*

**🚧 Version BETA - Vos retours sont précieux ! 🚧**

</div>