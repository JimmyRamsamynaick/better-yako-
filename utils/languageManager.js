// utils/languageManager.js
const fs = require('fs');
const path = require('path');

class LanguageManager {
    constructor() {
        this.languages = new Map();
        this.loadLanguages();
    }

    loadLanguages() {
        const languagesDir = path.join(__dirname, '..', 'languages');
        
        try {
            const files = fs.readdirSync(languagesDir);
            
            for (const file of files) {
                if (file.endsWith('.json')) {
                    const langCode = file.replace('.json', '');
                    const langPath = path.join(languagesDir, file);
                    const langData = JSON.parse(fs.readFileSync(langPath, 'utf8'));
                    this.languages.set(langCode, langData);
                }
            }
            
            console.log(`✅ Langues chargées: ${Array.from(this.languages.keys()).join(', ')}`);
        } catch (error) {
            console.error('❌ Erreur lors du chargement des langues:', error);
        }
    }

    get(langCode, key, replacements = {}) {
        const lang = this.languages.get(langCode) || this.languages.get('fr');
        
        if (!lang) {
            return `[LANG_ERROR: ${key}]`;
        }

        const keys = key.split('.');
        let value = lang;
        
        for (const k of keys) {
            if (value && typeof value === 'object' && k in value) {
                value = value[k];
            } else {
                return `[MISSING: ${key}]`;
            }
        }

        if (typeof value === 'string') {
            // Remplacer les placeholders
            for (const [placeholder, replacement] of Object.entries(replacements)) {
                // Vérifier que le placeholder n'est pas vide ou ne contient que des chiffres
                if (placeholder && typeof placeholder === 'string' && placeholder.length > 0) {
                    // Utiliser une approche plus simple sans regex pour éviter les erreurs
                    const placeholderPattern = `{${placeholder}}`;
                    while (value.includes(placeholderPattern)) {
                        value = value.replace(placeholderPattern, replacement);
                    }
                }
            }
        }

        return value;
    }

    getAvailableLanguages() {
        return Array.from(this.languages.keys());
    }

    isLanguageSupported(langCode) {
        return this.languages.has(langCode);
    }
}

module.exports = new LanguageManager();