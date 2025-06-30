// translationManager.js - Système de traduction optionnel plus avancé
const fs = require('fs');
const path = require('path');

class TranslationManager {
    constructor() {
        this.translations = new Map();
        this.guildLanguages = new Map();
        this.defaultLanguage = 'fr';
        this.loadTranslations();
    }

    // Charger les traductions depuis des fichiers ou utiliser les traductions intégrées
    loadTranslations() {
        const translationsPath = path.join(__dirname, '../data/translations');
        
        // Traductions par défaut intégrées
        const defaultTranslations = {
            fr: {
                // Commandes Lock/Unlock
                error_permissions: "❌ Vous n'avez pas les permissions nécessaires pour utiliser cette commande.",
                lock_success: "Le salon a été verrouillé avec succès.",
                bot_no_permission: "❌ Je n'ai pas les permissions pour verrouiller ce salon.",
                already_locked: "❌ Ce salon est déjà verrouillé.",
                lock_error: "❌ Une erreur s'est produite lors du verrouillage du salon.",
                moderator: "Modérateur",
                channel: "Salon",
                reason: "Raison",
                default_reason: "Aucune raison fournie",
                footer_text: "Utilisez /unlock pour déverrouiller le salon",
                
                // Unlock spécifique
                no_permission_title: "Permission refusée",
                no_permission_desc: "Vous n'avez pas la permission de gérer les salons.",
                bot_no_permission_title: "Permission du bot manquante",
                bot_no_permission_desc: "Je n'ai pas la permission de gérer les salons.",
                already_unlocked_title: "Salon déjà déverrouillé",
                already_unlocked_desc: "Le salon {channel} n'est pas verrouillé.",
                success_title: "Salon déverrouillé",
                success_desc: "Le salon {channel} a été déverrouillé avec succès.",
                channel_unlocked_title: "Salon déverrouillé",
                channel_unlocked_desc: "Ce salon a été déverrouillé par un modérateur.",
                log_title: "Action de modération - Unlock",
                error_title: "Erreur",
                error_desc: "Une erreur s'est produite lors du déverrouillage du salon.",
                audit_reason: "Salon déverrouillé par"
            },
            en: {
                // Lock/Unlock commands
                error_permissions: "❌ You don't have the necessary permissions to use this command.",
                lock_success: "The channel has been locked successfully.",
                bot_no_permission: "❌ I don't have permissions to lock this channel.",
                already_locked: "❌ This channel is already locked.",
                lock_error: "❌ An error occurred while locking the channel.",
                moderator: "Moderator",
                channel: "Channel",
                reason: "Reason",
                default_reason: "No reason provided",
                footer_text: "Use /unlock to unlock the channel",
                
                // Unlock specific
                no_permission_title: "Permission Denied",
                no_permission_desc: "You don't have permission to manage channels.",
                bot_no_permission_title: "Bot Permission Missing",
                bot_no_permission_desc: "I don't have permission to manage channels.",
                already_unlocked_title: "Channel Already Unlocked",
                already_unlocked_desc: "The channel {channel} is not locked.",
                success_title: "Channel Unlocked",
                success_desc: "The channel {channel} has been unlocked successfully.",
                channel_unlocked_title: "Channel Unlocked",
                channel_unlocked_desc: "This channel has been unlocked by a moderator.",
                log_title: "Moderation Action - Unlock",
                error_title: "Error",
                error_desc: "An error occurred while unlocking the channel.",
                audit_reason: "Channel unlocked by"
            },
            es: {
                // Español - Comandos Lock/Unlock
                error_permissions: "❌ No tienes los permisos necesarios para usar este comando.",
                lock_success: "El canal ha sido bloqueado exitosamente.",
                bot_no_permission: "❌ No tengo permisos para bloquear este canal.",
                already_locked: "❌ Este canal ya está bloqueado.",
                lock_error: "❌ Ocurrió un error al bloquear el canal.",
                moderator: "Moderador",
                channel: "Canal",
                reason: "Razón",
                default_reason: "Ninguna razón proporcionada",
                footer_text: "Usa /unlock para desbloquear el canal",
                
                // Unlock específico
                no_permission_title: "Permiso denegado",
                no_permission_desc: "No tienes permiso para gestionar canales.",
                bot_no_permission_title: "Permiso del bot faltante",
                bot_no_permission_desc: "No tengo permiso para gestionar canales.",
                already_unlocked_title: "Canal ya desbloqueado",
                already_unlocked_desc: "El canal {channel} no está bloqueado.",
                success_title: "Canal desbloqueado",
                success_desc: "El canal {channel} ha sido desbloqueado exitosamente.",
                channel_unlocked_title: "Canal desbloqueado",
                channel_unlocked_desc: "Este canal ha sido desbloqueado por un moderador.",
                log_title: "Acción de moderación - Desbloquear",
                error_title: "Error",
                error_desc: "Ocurrió un error al desbloquear el canal.",
                audit_reason: "Canal desbloqueado por"
            }
        };

        // Charger les traductions par défaut
        for (const [lang, translations] of Object.entries(defaultTranslations)) {
            this.translations.set(lang, translations);
        }

        // Essayer de charger des traductions personnalisées si le dossier existe
        try {
            if (fs.existsSync(translationsPath)) {
                const files = fs.readdirSync(translationsPath);
                for (const file of files) {
                    if (file.endsWith('.json')) {
                        const lang = path.basename(file, '.json');
                        const filePath = path.join(translationsPath, file);
                        const fileTranslations = JSON.parse(fs.readFileSync(filePath, 'utf8'));
                        
                        // Fusionner avec les traductions par défaut
                        const existingTranslations = this.translations.get(lang) || {};
                        this.translations.set(lang, { ...existingTranslations, ...fileTranslations });
                    }
                }
            }
        } catch (error) {
            console.log('Pas de traductions personnalisées trouvées, utilisation des traductions par défaut');
        }

        // Charger les langues des serveurs si le fichier existe
        this.loadGuildLanguages();
    }

    // Charger les langues des serveurs depuis un fichier
    loadGuildLanguages() {
        const guildLangPath = path.join(__dirname, '../data/guildLanguages.json');
        try {
            if (fs.existsSync(guildLangPath)) {
                const data = JSON.parse(fs.readFileSync(guildLangPath, 'utf8'));
                for (const [guildId, lang] of Object.entries(data)) {
                    this.guildLanguages.set(guildId, lang);
                }
            }
        } catch (error) {
            console.log('Pas de configuration de langue par serveur trouvée');
        }
    }

    // Sauvegarder les langues des serveurs
    saveGuildLanguages() {
        const guildLangPath = path.join(__dirname, '../data/guildLanguages.json');
        try {
            // Créer le dossier data s'il n'existe pas
            const dataDir = path.dirname(guildLangPath);
            if (!fs.existsSync(dataDir)) {
                fs.mkdirSync(dataDir, { recursive: true });
            }

            const guildLanguagesObj = Object.fromEntries(this.guildLanguages);
            fs.writeFileSync(guildLangPath, JSON.stringify(guildLanguagesObj, null, 2));
        } catch (error) {
            console.error('Erreur lors de la sauvegarde des langues:', error);
        }
    }

    // Définir la langue d'un serveur
    setGuildLanguage(guildId, language) {
        if (this.translations.has(language)) {
            this.guildLanguages.set(guildId, language);
            this.saveGuildLanguages();
            return true;
        }
        return false;
    }

    // Obtenir la langue d'un serveur
    getGuildLanguage(guildId) {
        return this.guildLanguages.get(guildId) || this.defaultLanguage;
    }

    // Obtenir une traduction
    getTranslation(guildId, key, replacements = {}) {
        const language = this.getGuildLanguage(guildId);
        const translations = this.translations.get(language) || this.translations.get(this.defaultLanguage);
        
        let translation = translations[key] || key;
        
        // Remplacer les variables dans la traduction
        for (const [placeholder, value] of Object.entries(replacements)) {
            translation = translation.replace(new RegExp(`{${placeholder}}`, 'g'), value);
        }
        
        return translation;
    }

    // Obtenir toutes les langues disponibles
    getAvailableLanguages() {
        return Array.from(this.translations.keys());
    }
}

// Créer une instance globale
const translationManager = new TranslationManager();

module.exports = {
    TranslationManager,
    translationManager,
    // Fonction helper pour une utilisation facile
    t: (guildId, key, replacements) => translationManager.getTranslation(guildId, key, replacements),
    setLang: (guildId, language) => translationManager.setGuildLanguage(guildId, language),
    getLang: (guildId) => translationManager.getGuildLanguage(guildId),
    getAvailableLanguages: () => translationManager.getAvailableLanguages()
};

// Exemple d'utilisation :
// const { t } = require('./translationManager');
// const message = t(interaction.guild.id, 'lock_success');
// const messageWithVar = t(interaction.guild.id, 'success_desc', { channel: targetChannel.toString() });