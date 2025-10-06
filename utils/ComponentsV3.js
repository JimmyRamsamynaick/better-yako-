const LanguageManager = require('./languageManager');
const Guild = require('../models/Guild');

class ComponentsV3 {
    /**
     * Crée un embed avec le nouveau format components
     * @param {Object} options - Options pour l'embed
     * @param {string} options.guildId - ID du serveur pour la langue
     * @param {string} options.imageUrl - URL de l'image d'en-tête (optionnel)
     * @param {string} options.titleKey - Clé de traduction pour le titre
     * @param {Object} options.titlePlaceholders - Variables pour le titre (optionnel)
     * @param {string} options.contentKey - Clé de traduction pour le contenu principal
     * @param {Object} options.contentPlaceholders - Variables pour le contenu (optionnel)
     * @param {Array} options.additionalContent - Contenu supplémentaire (optionnel)
     * @param {Array} options.buttons - Boutons à ajouter (optionnel)
     * @param {Array} options.selectMenus - Menus déroulants à ajouter (optionnel)
     * @param {string} options.footerKey - Clé de traduction pour le footer (optionnel)
     * @param {Object} options.footerPlaceholders - Variables pour le footer (optionnel)
     * @param {boolean} options.addDividers - Ajouter des séparateurs (défaut: true)
     * @returns {Object} Embed au format components
     */
    static async createEmbed(options) {
        const {
            guildId,
            imageUrl,
            titleKey,
            titlePlaceholders = {},
            contentKey,
            contentPlaceholders = {},
            additionalContent = [],
            buttons = [],
            selectMenus = [],
            footerKey,
            footerPlaceholders = {},
            addDividers = true
        } = options;

        // Déterminer la langue du serveur si possible
        let lang = 'fr';
        if (guildId) {
            try {
                const guildData = await Guild.findOne({ guildId });
                if (guildData && guildData.language) {
                    lang = guildData.language;
                }
            } catch (_) {
                // garder 'fr' par défaut en cas d'erreur
            }
        }

        const components = [];

        // Ajouter l'image d'en-tête si fournie
        if (imageUrl) {
            components.push({
                type: 12,
                items: [{
                    media: {
                        url: imageUrl
                    }
                }]
            });
        }

        // Ajouter le titre si fourni
        if (titleKey) {
            const title = LanguageManager.get(lang, titleKey, titlePlaceholders);
            components.push({
                type: 10,
                content: title
            });
        }

        // Ajouter un séparateur après le titre
        if (addDividers && (imageUrl || titleKey)) {
            components.push({
                type: 14,
                divider: true,
                spacing: 2
            });
        }

        // Ajouter le contenu principal si fourni
        if (contentKey) {
            const content = LanguageManager.get(lang, contentKey, contentPlaceholders);
            components.push({
                type: 10,
                content: content
            });
        }

        // Ajouter le contenu supplémentaire
        additionalContent.forEach(item => {
            if (typeof item === 'string') {
                components.push({
                    type: 10,
                    content: item
                });
            } else if (item.type === 'text') {
                const text = item.key ? 
                    LanguageManager.get(lang, item.key, item.placeholders || {}) : 
                    item.content;
                components.push({
                    type: 10,
                    content: text
                });
            } else if (item.type === 'divider') {
                components.push({
                    type: 14,
                    divider: true,
                    spacing: item.spacing || 2
                });
            }
        });

        // Ajouter les menus déroulants
        selectMenus.forEach(menu => {
            components.push({
                type: 1,
                components: [{
                    type: 3,
                    custom_id: menu.customId,
                    placeholder: menu.placeholderKey ? 
                        LanguageManager.get(lang, menu.placeholderKey) : 
                        menu.placeholder,
                    min_values: menu.minValues || 0,
                    max_values: menu.maxValues || 1,
                    options: menu.options.map(option => ({
                        label: option.labelKey ? 
                            LanguageManager.get(lang, option.labelKey) : 
                            option.label,
                        value: option.value,
                        description: option.descriptionKey ? 
                            LanguageManager.get(lang, option.descriptionKey) : 
                            option.description,
                        emoji: option.emoji
                    }))
                }]
            });
        });

        // Ajouter les boutons
        if (buttons.length > 0) {
            const buttonRows = [];
            for (let i = 0; i < buttons.length; i += 5) {
                const rowButtons = buttons.slice(i, i + 5).map(button => ({
                    type: 2,
                    label: button.labelKey ? 
                        LanguageManager.get(lang, button.labelKey) : 
                        button.label,
                    style: button.style || 1,
                    custom_id: button.customId,
                    emoji: button.emoji,
                    disabled: button.disabled || false
                }));
                
                buttonRows.push({
                    type: 1,
                    components: rowButtons
                });
            }
            components.push(...buttonRows);
        }

        // Ajouter un séparateur avant le footer
        if (addDividers && footerKey) {
            components.push({
                type: 14,
                divider: true,
                spacing: 2
            });
        }

        // Ajouter le footer si fourni
        if (footerKey) {
            const footer = LanguageManager.get(lang, footerKey, footerPlaceholders);
            components.push({
                type: 10,
                content: `-# ${footer}`
            });
        }

        return {
            flags: 32768,
            components: [{
                type: 17,
                components: components
            }]
        };
    }

    /**
     * Crée un message d'information simple
     * @param {string} guildId - ID du serveur
     * @param {string} titleKey - Clé de traduction pour le titre
     * @param {string} contentKey - Clé de traduction pour le contenu
     * @param {Object} placeholders - Variables pour les traductions
     * @returns {Object} Message au format components
     */
    static async infoEmbed(guildId, titleKey, contentKey, placeholders = {}) {
        // Récupérer la langue du serveur
        const guildData = await Guild.findOne({ guildId: guildId });
        const lang = guildData?.language || 'fr';
        
        const title = LanguageManager.get(lang, titleKey, placeholders);
        const content = LanguageManager.get(lang, contentKey, placeholders);
        
        return {
            flags: 32768,
            components: [{
                type: 17,
                components: [
                    {
                        type: 10,
                        content: `## ℹ️ ${title}\n\n${content}`
                    }
                ]
            }]
        };
    }

    /**
     * Crée un message d'erreur
     * @param {string} guildId - ID du serveur
     * @param {string} errorKey - Clé de traduction pour l'erreur
     * @param {Object} placeholders - Variables pour les traductions
     * @returns {Object} Message au format components
     */
    static async errorEmbed(guildId, errorKey, placeholders = {}) {
        // Récupérer la langue du serveur
        const guildData = await Guild.findOne({ guildId: guildId });
        const lang = guildData?.language || 'fr';
        
        const errorMessage = LanguageManager.get(lang, errorKey, placeholders);
        const errorLabel = lang === 'en' ? 'Error' : 'Erreur';

        return {
            flags: 32768,
            components: [{
                type: 17,
                components: [
                    {
                        type: 10,
                        content: `## ❌ ${errorLabel}\n\n${errorMessage}`
                    }
                ]
            }]
        };
    }

    /**
     * Créer un embed de succès avec titre personnalisé
     * @param {string} guildId - ID du serveur
     * @param {string} titleKey - Clé de traduction pour le titre
     * @param {string} message - Message de succès déjà formaté
     * @returns {Object} Message au format components
     */
    static async successEmbed(guildId, titleKey, message) {
        // Récupérer la langue du serveur
        const guildData = await Guild.findOne({ guildId: guildId });
        const lang = guildData?.language || 'fr';
        
        const rawTitle = LanguageManager.get(lang, titleKey);
        const fallbackTitle = lang === 'en' ? '✅ Success' : '✅ Succès';
        const title = (typeof rawTitle === 'string' && !rawTitle.startsWith('[MISSING:')) ? rawTitle : fallbackTitle;
        
        return {
            flags: 32768,
            components: [{
                type: 17,
                components: [
                    {
                        type: 10,
                        content: `## ${title}\n\n${message}`
                    }
                ]
            }]
        };
    }

    /**
     * Crée un message d'avertissement
     * @param {string} guildId - ID du serveur
     * @param {string} warningKey - Clé de traduction pour l'avertissement
     * @param {Object} placeholders - Variables pour les traductions
     * @returns {Object} Message au format components
     */
    static async warningEmbed(guildId, warningKey, placeholders = {}) {
        // Récupérer la langue du serveur
        const guildData = await Guild.findOne({ guildId: guildId });
        const lang = guildData?.language || 'fr';
        
        const warningMessage = LanguageManager.get(lang, warningKey, placeholders);
        const warningLabel = lang === 'en' ? 'Warning' : 'Avertissement';
        
        return {
            flags: 32768,
            components: [{
                type: 17,
                components: [
                    {
                        type: 10,
                        content: `## ⚠️ ${warningLabel}\n\n${warningMessage}`
                    }
                ]
            }]
        };
    }
}

module.exports = { ComponentsV3 };