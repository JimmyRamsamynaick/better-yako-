const { ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require('discord.js');

/**
 * Système de composants modernes Discord v2
 * Support des messages >4000 caractères avec Container, Text Display, etc.
 */
class ModernComponents {
    
    /**
     * Crée un conteneur avec composants v2
     * @param {Object} options - Options du conteneur
     * @returns {Object} Composant conteneur
     */
    static createContainer(options = {}) {
        return {
            type: 17, // Container
            id: options.id || this.generateId(),
            components: options.components || []
        };
    }
    
    /**
     * Crée un composant Text Display (remplace les embeds)
     * @param {Object} options - Options du texte
     * @returns {Object} Composant Text Display
     */
    static createTextDisplay(options = {}) {
        const { title, description, color, fields, footer, thumbnail, author } = options;
        
        let content = '';
        
        // Construction du contenu markdown
        if (author) {
            content += `**${author.name}**\n`;
            if (author.icon_url) content += `![](${author.icon_url})\n`;
        }
        
        if (title) {
            content += `# ${title}\n\n`;
        }
        
        if (description) {
            content += `${description}\n\n`;
        }
        
        if (fields && fields.length > 0) {
            fields.forEach(field => {
                content += `**${field.name}**\n${field.value}\n\n`;
            });
        }
        
        if (footer) {
            content += `\n---\n*${footer.text}*`;
        }
        
        return {
            type: 10, // Text Display
            id: options.id || this.generateId(),
            content: content,
            style: {
                color: color || '#5865F2'
            }
        };
    }
    
    /**
     * Crée une section avec accessoire
     * @param {Object} options - Options de la section
     * @returns {Object} Composant Section
     */
    static createSection(options = {}) {
        return {
            type: 9, // Section
            id: options.id || this.generateId(),
            text: options.text || '',
            accessory: options.accessory || null
        };
    }
    
    /**
     * Crée une miniature
     * @param {Object} options - Options de la miniature
     * @returns {Object} Composant Thumbnail
     */
    static createThumbnail(options = {}) {
        return {
            type: 11, // Thumbnail
            id: options.id || this.generateId(),
            url: options.url,
            alt_text: options.alt || 'Image'
        };
    }
    
    /**
     * Crée une galerie média
     * @param {Object} options - Options de la galerie
     * @returns {Object} Composant Media Gallery
     */
    static createMediaGallery(options = {}) {
        return {
            type: 12, // Media Gallery
            id: options.id || this.generateId(),
            items: options.items || []
        };
    }
    
    /**
     * Crée un séparateur
     * @param {Object} options - Options du séparateur
     * @returns {Object} Composant Separator
     */
    static createSeparator(options = {}) {
        return {
            type: 14, // Separator
            id: options.id || this.generateId(),
            spacing: options.spacing || 'medium'
        };
    }
    
    /**
     * Crée un message d'information moderne
     * @param {Object} options - Options du message
     * @returns {Object} Message avec composants v2
     */
    static createInfoMessage(options = {}) {
        const { title, description, color = '#00D4AA', fields, buttons, thumbnail } = options;
        
        const components = [];
        
        // Container principal
        const mainContainer = this.createContainer({
            components: [
                this.createTextDisplay({
                    title: `ℹ️ ${title}`,
                    description,
                    color,
                    fields
                })
            ]
        });
        
        components.push(mainContainer);
        
        // Ajout de la miniature si fournie
        if (thumbnail) {
            components.push(this.createThumbnail({ url: thumbnail }));
        }
        
        // Ajout des boutons si fournis
        if (buttons && buttons.length > 0) {
            const actionRow = new ActionRowBuilder();
            buttons.forEach(btn => {
                const button = new ButtonBuilder()
                    .setCustomId(btn.customId)
                    .setLabel(btn.label)
                    .setStyle(btn.style || ButtonStyle.Primary);
                
                if (btn.emoji) {
                    button.setEmoji(btn.emoji);
                }
                
                actionRow.addComponents(button);
            });
            components.push(actionRow);
        }
        
        return {
            flags: 1 << 15, // IS_COMPONENTS_V2
            components
        };
    }
    
    /**
     * Crée un message d'erreur moderne
     * @param {Object} options - Options du message d'erreur
     * @returns {Object} Message d'erreur avec composants v2
     */
    static createErrorMessage(options = {}) {
        const { title, description, error, color = '#ED4245' } = options;
        
        let errorDescription = description;
        if (error) {
            errorDescription += `\n\n**Détails de l'erreur:**\n\`\`\`\n${error}\n\`\`\``;
        }
        
        return this.createInfoMessage({
            title: title || 'Erreur',
            description: errorDescription,
            color
        });
    }
    
    /**
     * Crée un message de succès moderne
     * @param {Object} options - Options du message de succès
     * @returns {Object} Message de succès avec composants v2
     */
    static createSuccessMessage(options = {}) {
        return this.createInfoMessage({
            ...options,
            color: '#57F287'
        });
    }
    
    /**
     * Crée un message d'avertissement moderne
     * @param {Object} options - Options du message d'avertissement
     * @returns {Object} Message d'avertissement avec composants v2
     */
    static createWarningMessage(options = {}) {
        return this.createInfoMessage({
            ...options,
            color: '#FEE75C'
        });
    }
    
    /**
     * Divise un long texte en plusieurs composants Text Display
     * @param {string} text - Texte à diviser
     * @param {number} maxLength - Longueur maximale par composant
     * @returns {Array} Tableau de composants Text Display
     */
    static splitLongText(text, maxLength = 4000) {
        const components = [];
        let currentText = text;
        let partNumber = 1;
        
        while (currentText.length > maxLength) {
            let splitIndex = maxLength;
            
            // Chercher un point de coupure naturel (ligne, phrase, mot)
            const lastNewline = currentText.lastIndexOf('\n', maxLength);
            const lastPeriod = currentText.lastIndexOf('.', maxLength);
            const lastSpace = currentText.lastIndexOf(' ', maxLength);
            
            if (lastNewline > maxLength * 0.8) {
                splitIndex = lastNewline + 1;
            } else if (lastPeriod > maxLength * 0.8) {
                splitIndex = lastPeriod + 1;
            } else if (lastSpace > maxLength * 0.8) {
                splitIndex = lastSpace + 1;
            }
            
            const part = currentText.substring(0, splitIndex).trim();
            components.push(this.createTextDisplay({
                title: `Partie ${partNumber}`,
                description: part
            }));
            
            currentText = currentText.substring(splitIndex).trim();
            partNumber++;
        }
        
        // Ajouter la dernière partie
        if (currentText.length > 0) {
            components.push(this.createTextDisplay({
                title: partNumber > 1 ? `Partie ${partNumber}` : null,
                description: currentText
            }));
        }
        
        return components;
    }
    
    /**
     * Génère un ID unique pour les composants
     * @returns {number} ID unique
     */
    static generateId() {
        return Math.floor(Math.random() * 1000000);
    }
    
    /**
     * Crée un menu de sélection moderne
     * @param {Object} options - Options du menu
     * @returns {ActionRowBuilder} Menu de sélection
     */
    static createSelectMenu(options = {}) {
        const { customId, placeholder, options: menuOptions, minValues = 1, maxValues = 1 } = options;
        
        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId(customId)
            .setPlaceholder(placeholder)
            .setMinValues(minValues)
            .setMaxValues(maxValues)
            .addOptions(menuOptions);
        
        return new ActionRowBuilder().addComponents(selectMenu);
    }
    
    /**
     * Crée un ensemble de boutons modernes
     * @param {Array} buttons - Tableau de boutons
     * @returns {ActionRowBuilder} Ligne d'action avec boutons
     */
    static createButtonRow(buttons) {
        const actionRow = new ActionRowBuilder();
        
        buttons.forEach(btn => {
            const button = new ButtonBuilder()
                .setCustomId(btn.customId)
                .setLabel(btn.label)
                .setStyle(btn.style || ButtonStyle.Primary);
            
            if (btn.emoji) button.setEmoji(btn.emoji);
            if (btn.disabled) button.setDisabled(btn.disabled);
            if (btn.url) {
                button.setURL(btn.url).setStyle(ButtonStyle.Link);
            }
            
            actionRow.addComponents(button);
        });
        
        return actionRow;
    }
}

module.exports = ModernComponents;