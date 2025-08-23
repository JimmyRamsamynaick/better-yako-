# Better Yako v2 🤖

Bot Discord moderne avec système d'administration complet, support multilingue et fonctionnalités avancées.

## 🚀 Fonctionnalités

### 🛡️ Administration & Modération
- **Commandes de modération** : `/ban`, `/kick`, `/mute`, `/unmute`
- **Système d'avertissements** : `/warn`, `/unwarn` avec historique complet
- **Gestion des messages** : `/clear` pour supprimer des messages en masse
- **Contrôle des canaux** : `/lock`, `/unlock` pour verrouiller/déverrouiller
- **Configuration** : `/setlang` pour changer la langue du serveur

### 🌍 Support Multilingue
- **3 langues supportées** : Français, Anglais, Espagnol
- **Traductions complètes** pour toutes les commandes et messages
- **Configuration par serveur** avec persistance en base de données

### 📊 Base de Données
- **MongoDB avec Mongoose** pour la persistance des données
- **Modèles optimisés** : Avertissements, Sanctions, Configuration serveur
- **Historique complet** des actions de modération
- **Index de performance** pour des requêtes rapides

### 🔐 Système de Permissions
- **Vérifications de rôles** : Admin, Modérateur
- **Permissions Discord natives** intégrées
- **Hiérarchie respectée** pour éviter les abus
- **Configuration flexible** par serveur

### 📝 Journalisation
- **Logs automatiques** dans un canal dédié
- **Embeds colorés** selon le type d'action
- **Détails complets** : utilisateur, modérateur, raison, durée
- **Catégories** : Modération, Admin, Système, Erreurs

### 🎉 Système de Bienvenue
- **Messages personnalisables** pour les arrivées/départs
- **Embeds riches** avec informations du membre
- **Attribution automatique de rôles**
- **Messages privés** de bienvenue optionnels

### ⏱️ Cooldowns
- **Protection anti-spam** sur les commandes
- **Cooldowns configurables** par commande
- **Messages informatifs** avec temps restant
- **Nettoyage automatique** des cooldowns expirés

## 📋 Prérequis

- **Node.js** v16.9.0 ou supérieur
- **MongoDB** (local ou cloud)
- **Bot Discord** avec token et permissions appropriées

## 🛠️ Installation

### 1. Cloner le projet
```bash
git clone <repository-url>
cd better-yako-v2
```

### 2. Installer les dépendances
```bash
npm install
```

### 3. Configuration
Créer un fichier `.env` à la racine :
```env
DISCORD_TOKEN=votre_token_discord
CLIENT_ID=id_de_votre_bot
MONGODB_URI=mongodb://localhost:27017/better-yako

# Optionnel pour le développement
GUILD_ID=id_de_votre_serveur_de_test
```

### 4. Déployer les commandes
```bash
# Déploiement global (recommandé pour la production)
npm run deploy

# Ou déploiement sur serveur de test (instantané)
node deploy-commands.js --guild
```

### 5. Lancer le bot
```bash
# Production
npm start

# Développement avec auto-reload
npm run dev
```

## 🎯 Configuration du Bot

### Permissions Discord Requises
- **Gérer les messages** (pour `/clear`)
- **Expulser des membres** (pour `/kick`)
- **Bannir des membres** (pour `/ban`)
- **Gérer les rôles** (pour `/mute`, rôles auto)
- **Gérer les canaux** (pour `/lock`, `/unlock`)
- **Envoyer des messages** et **Utiliser les embeds**
- **Voir l'historique des messages**

### Configuration Serveur
1. **Canal de logs** : Créer un canal `#logs` et noter son ID
2. **Canal de bienvenue** : Créer un canal `#bienvenue` (optionnel)
3. **Rôle de mute** : Créer un rôle `Muted` avec permissions appropriées
4. **Rôles admin/modo** : Configurer les rôles avec les bonnes permissions

## 📚 Utilisation

### Commandes d'Administration

#### Modération
```
/ban @utilisateur [raison] [durée] - Bannir un membre
/kick @utilisateur [raison] - Expulser un membre
/mute @utilisateur [raison] [durée] - Mettre en sourdine
/unmute @utilisateur [raison] - Retirer la sourdine
```

#### Avertissements
```
/warn @utilisateur [raison] - Donner un avertissement
/unwarn @utilisateur [id_avertissement] - Retirer un avertissement
```

#### Gestion
```
/clear [nombre] [utilisateur] - Supprimer des messages
/lock [canal] [raison] - Verrouiller un canal
/unlock [canal] [raison] - Déverrouiller un canal
/setlang [langue] - Changer la langue (fr/en/es)
```

### Base de Données

Le bot utilise MongoDB avec les collections suivantes :
- **guildconfigs** : Configuration par serveur
- **warnings** : Avertissements des utilisateurs
- **sanctions** : Historique des sanctions

## 🔧 Développement

### Structure du Projet
```
better-yako-v2/
├── commands/           # Commandes slash
│   ├── admin/         # Commandes d'administration
│   └── basic/         # Commandes de base
├── events/            # Événements Discord
├── languages/         # Fichiers de traduction
├── models/           # Modèles MongoDB
├── utils/            # Utilitaires
│   ├── database.js   # Gestionnaire de base de données
│   ├── permissions.js # Système de permissions
│   ├── logger.js     # Système de logs
│   ├── cooldown.js   # Gestion des cooldowns
│   └── language.js   # Système multilingue
├── deploy-commands.js # Script de déploiement
└── index.js          # Point d'entrée
```

### Ajouter une Nouvelle Commande
1. Créer le fichier dans `commands/[catégorie]/`
2. Suivre la structure des commandes existantes
3. Ajouter les traductions dans `languages/`
4. Redéployer les commandes

### Ajouter une Nouvelle Langue
1. Créer `languages/lang_[code].json`
2. Copier la structure d'un fichier existant
3. Traduire toutes les clés
4. Mettre à jour `utils/language.js`

## 🐛 Dépannage

### Problèmes Courants

**Les commandes n'apparaissent pas :**
- Vérifier que le bot a les permissions `applications.commands`
- Redéployer les commandes avec `npm run deploy`
- Attendre jusqu'à 1 heure pour le déploiement global

**Erreurs de base de données :**
- Vérifier que MongoDB est démarré
- Contrôler l'URI de connexion dans `.env`
- Vérifier les permissions de lecture/écriture

**Permissions insuffisantes :**
- S'assurer que le bot a tous les rôles nécessaires
- Vérifier la hiérarchie des rôles
- Contrôler les permissions de canal

## 📄 Licence

MIT License - Voir le fichier LICENSE pour plus de détails.

## 🤝 Contribution

Les contributions sont les bienvenues ! N'hésitez pas à :
- Signaler des bugs
- Proposer de nouvelles fonctionnalités
- Améliorer la documentation
- Ajouter des traductions

## 📞 Support

Pour toute question ou problème :
- Créer une issue sur GitHub
- Consulter la documentation
- Vérifier les logs du bot

---

**Better Yako v2** - Bot Discord moderne et complet pour l'administration de serveurs 🚀