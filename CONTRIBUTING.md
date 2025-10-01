# 🤝 Guide de Contribution - Yako Bot

Merci de votre intérêt pour contribuer à Yako Bot ! Ce guide vous aidera à comprendre comment participer efficacement au développement du projet.

## 📋 Table des Matières

- [Code de Conduite](#-code-de-conduite)
- [Comment Contribuer](#-comment-contribuer)
- [Signaler un Bug](#-signaler-un-bug)
- [Proposer une Fonctionnalité](#-proposer-une-fonctionnalité)
- [Développement](#-développement)
- [Standards de Code](#-standards-de-code)
- [Process de Review](#-process-de-review)

## 🤝 Code de Conduite

En participant à ce projet, vous acceptez de respecter notre [Code de Conduite](CODE_OF_CONDUCT.md). Nous nous engageons à maintenir un environnement accueillant et inclusif pour tous.

## 🚀 Comment Contribuer

Il existe plusieurs façons de contribuer au projet :

### 🐛 Signaler des Bugs
- Utilisez le template d'issue "Bug Report"
- Fournissez des informations détaillées
- Incluez les étapes de reproduction

### ✨ Proposer des Fonctionnalités
- Utilisez le template d'issue "Feature Request"
- Expliquez clairement le besoin
- Décrivez la solution proposée

### 📝 Améliorer la Documentation
- Corriger les fautes de frappe
- Ajouter des exemples
- Clarifier les instructions

### 💻 Développer du Code
- Corriger des bugs
- Implémenter de nouvelles fonctionnalités
- Optimiser les performances

## 🐛 Signaler un Bug

### Avant de Signaler
1. **Vérifiez les issues existantes** - Le bug a peut-être déjà été signalé
2. **Testez avec la dernière version** - Le bug a peut-être été corrigé
3. **Reproduisez le bug** - Assurez-vous qu'il est reproductible

### Template de Bug Report
```markdown
**Description du Bug**
Description claire et concise du problème.

**Étapes de Reproduction**
1. Aller à '...'
2. Cliquer sur '...'
3. Faire défiler jusqu'à '...'
4. Voir l'erreur

**Comportement Attendu**
Description de ce qui devrait se passer.

**Captures d'Écran**
Si applicable, ajoutez des captures d'écran.

**Environnement**
- OS: [ex. Windows 10]
- Node.js: [ex. 18.17.0]
- Version du Bot: [ex. 1.0.0-beta]

**Logs**
```
Coller les logs d'erreur ici
```

**Contexte Additionnel**
Toute autre information pertinente.
```

## ✨ Proposer une Fonctionnalité

### Template de Feature Request
```markdown
**Problème à Résoudre**
Description claire du problème que cette fonctionnalité résoudrait.

**Solution Proposée**
Description claire de ce que vous aimeriez voir implémenté.

**Alternatives Considérées**
Description des solutions alternatives que vous avez considérées.

**Contexte Additionnel**
Toute autre information ou capture d'écran pertinente.
```

## 💻 Développement

### Configuration de l'Environnement

1. **Fork le repository**
```bash
git clone https://github.com/votre-username/discord-bot-v14.git
cd discord-bot-v14
```

2. **Installer les dépendances**
```bash
npm install
```

3. **Configurer l'environnement**
```bash
cp .env.example .env
# Éditer .env avec vos configurations
```

4. **Créer une branche**
```bash
git checkout -b feature/nom-de-votre-fonctionnalite
```

### Structure du Projet

```
yako/
├── commands/           # Commandes Discord
│   ├── moderation/    # Commandes de modération
│   ├── premium/       # Commandes premium
│   └── public/        # Commandes publiques
├── events/            # Gestionnaires d'événements
├── languages/         # Fichiers de traduction
├── models/           # Modèles de base de données
├── utils/            # Utilitaires
└── tests/            # Tests (à venir)
```

### Ajouter une Nouvelle Commande

1. **Créer le fichier de commande**
```javascript
// commands/categorie/ma-commande.js
const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ma-commande')
        .setDescription('Description de ma commande'),
    
    async execute(interaction) {
        // Logique de la commande
        await interaction.reply('Réponse de la commande');
    }
};
```

2. **Ajouter les traductions**
```json
// languages/fr.json
{
    "commands": {
        "ma-commande": {
            "description": "Description en français",
            "success": "Message de succès"
        }
    }
}
```

3. **Tester la commande**
```bash
node deploy-commands.js
npm run dev
```

## 📏 Standards de Code

### Style de Code
- **Indentation** : 4 espaces
- **Quotes** : Simple quotes pour les strings
- **Semicolons** : Toujours utiliser
- **Naming** : camelCase pour les variables et fonctions

### Exemple de Code Bien Formaté
```javascript
const { SlashCommandBuilder } = require('discord.js');
const { ComponentsV3 } = require('../../utils/ComponentsV3');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('exemple')
        .setDescription('Commande d\'exemple')
        .addStringOption(option =>
            option.setName('parametre')
                .setDescription('Description du paramètre')
                .setRequired(true)
        ),
    
    async execute(interaction) {
        try {
            const parametre = interaction.options.getString('parametre');
            
            // Logique de la commande
            const response = await ComponentsV3.successEmbed(
                interaction.guild.id,
                'commands.exemple.success',
                { parametre }
            );
            
            await interaction.reply(response);
        } catch (error) {
            console.error('Erreur dans la commande exemple:', error);
            
            const errorResponse = await ComponentsV3.errorEmbed(
                interaction.guild.id,
                'commands.exemple.error'
            );
            
            await interaction.reply(errorResponse);
        }
    }
};
```

### Gestion d'Erreurs
- Toujours utiliser try/catch
- Logger les erreurs avec console.error
- Fournir des messages d'erreur utilisateur-friendly
- Ne jamais exposer d'informations sensibles

### Documentation
- Commenter le code complexe
- Utiliser JSDoc pour les fonctions importantes
- Maintenir le README à jour

## 🔍 Process de Review

### Avant de Soumettre
1. **Testez votre code** - Assurez-vous qu'il fonctionne
2. **Vérifiez le style** - Respectez les standards
3. **Mettez à jour la documentation** - Si nécessaire
4. **Écrivez des messages de commit clairs**

### Messages de Commit
Utilisez le format suivant :
```
type(scope): description courte

Description plus détaillée si nécessaire

Fixes #123
```

Types :
- `feat`: nouvelle fonctionnalité
- `fix`: correction de bug
- `docs`: documentation
- `style`: formatage, pas de changement de code
- `refactor`: refactoring de code
- `test`: ajout de tests
- `chore`: maintenance

### Pull Request
1. **Titre descriptif** - Résumez les changements
2. **Description détaillée** - Expliquez ce qui a été fait
3. **Liens vers les issues** - Référencez les issues liées
4. **Captures d'écran** - Si applicable

### Template de Pull Request
```markdown
## Description
Brève description des changements apportés.

## Type de Changement
- [ ] Bug fix (changement non-breaking qui corrige un problème)
- [ ] Nouvelle fonctionnalité (changement non-breaking qui ajoute une fonctionnalité)
- [ ] Breaking change (correction ou fonctionnalité qui casserait la fonctionnalité existante)
- [ ] Documentation (changements de documentation uniquement)

## Tests
- [ ] J'ai testé mes changements localement
- [ ] J'ai ajouté des tests pour couvrir mes changements
- [ ] Tous les tests existants passent

## Checklist
- [ ] Mon code suit les standards du projet
- [ ] J'ai effectué une auto-review de mon code
- [ ] J'ai commenté mon code, particulièrement dans les zones difficiles à comprendre
- [ ] J'ai fait les changements correspondants à la documentation
- [ ] Mes changements ne génèrent pas de nouveaux warnings

## Captures d'Écran (si applicable)
Ajoutez des captures d'écran pour aider à expliquer vos changements.
```

## 🎯 Priorités de Développement

### High Priority
- Corrections de bugs critiques
- Problèmes de sécurité
- Améliorations de performance

### Medium Priority
- Nouvelles fonctionnalités demandées
- Améliorations UX/UI
- Optimisations

### Low Priority
- Refactoring de code
- Documentation
- Tests additionnels

## 🏆 Reconnaissance

Les contributeurs seront reconnus de plusieurs façons :
- Mention dans le CHANGELOG
- Badge de contributeur sur Discord
- Accès anticipé aux nouvelles fonctionnalités
- Mention dans les crédits du bot

## 📞 Besoin d'Aide ?

Si vous avez des questions :
- **Discord** : [Serveur de développement](https://discord.gg/dev-server)
- **Issues** : [GitHub Issues](https://github.com/votre-username/discord-bot-v14/issues)
- **Email** : dev@yakobot.com

---

**Merci de contribuer à Yako Bot ! 🚀**