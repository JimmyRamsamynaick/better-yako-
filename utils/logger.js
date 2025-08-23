const { EmbedBuilder, Colors } = require('discord.js');
const DatabaseManager = require('./database');

class Logger {
    /**
     * Types de logs disponibles
     */
    static LogTypes = {
        MODERATION: 'moderation',
        ADMIN: 'admin',
        USER: 'user',
        SYSTEM: 'system',
        ERROR: 'error',
        WARNING: 'warning',
        INFO: 'info'
    };

    /**
     * Couleurs pour chaque type de log
     */
    static LogColors = {
        [this.LogTypes.MODERATION]: Colors.Red,
        [this.LogTypes.ADMIN]: Colors.Orange,
        [this.LogTypes.USER]: Colors.Blue,
        [this.LogTypes.SYSTEM]: Colors.Green,
        [this.LogTypes.ERROR]: Colors.DarkRed,
        [this.LogTypes.WARNING]: Colors.Yellow,
        [this.LogTypes.INFO]: Colors.Blurple
    };

    /**
     * Icônes pour chaque type de log
     */
    static LogIcons = {
        [this.LogTypes.MODERATION]: '🔨',
        [this.LogTypes.ADMIN]: '⚙️',
        [this.LogTypes.USER]: '👤',
        [this.LogTypes.SYSTEM]: '🤖',
        [this.LogTypes.ERROR]: '❌',
        [this.LogTypes.WARNING]: '⚠️',
        [this.LogTypes.INFO]: 'ℹ️'
    };

    /**
     * Envoie un log dans le canal de logs configuré
     * @param {Guild} guild - Le serveur Discord
     * @param {string} type - Type de log (voir LogTypes)
     * @param {string} title - Titre du log
     * @param {string} description - Description du log
     * @param {Object} options - Options supplémentaires
     * @param {User} options.user - Utilisateur concerné
     * @param {User} options.moderator - Modérateur qui a effectué l'action
     * @param {string} options.reason - Raison de l'action
     * @param {string} options.duration - Durée (pour les sanctions temporaires)
     * @param {Object} options.fields - Champs supplémentaires
     * @param {string} options.footer - Texte du footer
     * @param {string} options.thumbnail - URL de la miniature
     * @param {string} options.image - URL de l'image
     */
    static async log(guild, type, title, description, options = {}) {
        try {
            // Récupérer la configuration du serveur
            const guildConfig = await DatabaseManager.getGuildConfig(guild.id);
            if (!guildConfig || !guildConfig.logChannelId) {
                return; // Pas de canal de logs configuré
            }

            // Récupérer le canal de logs
            const logChannel = guild.channels.cache.get(guildConfig.logChannelId);
            if (!logChannel) {
                console.warn(`Canal de logs introuvable pour le serveur ${guild.name} (${guild.id})`);
                return;
            }

            // Créer l'embed
            const embed = new EmbedBuilder()
                .setColor(this.LogColors[type] || Colors.Blurple)
                .setTitle(`${this.LogIcons[type] || '📝'} ${title}`)
                .setDescription(description)
                .setTimestamp();

            // Ajouter les champs standard
            if (options.user) {
                embed.addFields({
                    name: '👤 Utilisateur',
                    value: `${options.user.tag} (${options.user.id})`,
                    inline: true
                });
            }

            if (options.moderator) {
                embed.addFields({
                    name: '🛡️ Modérateur',
                    value: `${options.moderator.tag} (${options.moderator.id})`,
                    inline: true
                });
            }

            if (options.reason) {
                embed.addFields({
                    name: '📝 Raison',
                    value: options.reason,
                    inline: false
                });
            }

            if (options.duration) {
                embed.addFields({
                    name: '⏱️ Durée',
                    value: options.duration,
                    inline: true
                });
            }

            // Ajouter les champs personnalisés
            if (options.fields && Array.isArray(options.fields)) {
                embed.addFields(...options.fields);
            }

            // Ajouter footer, thumbnail, image
            if (options.footer) {
                embed.setFooter({ text: options.footer });
            }

            if (options.thumbnail) {
                embed.setThumbnail(options.thumbnail);
            }

            if (options.image) {
                embed.setImage(options.image);
            }

            // Envoyer le log
            await logChannel.send({ embeds: [embed] });

        } catch (error) {
            console.error('Erreur lors de l\'envoi du log:', error);
        }
    }

    /**
     * Log pour les actions de modération
     */
    static async logModeration(guild, action, user, moderator, reason, duration = null) {
        const actionNames = {
            ban: 'Bannissement',
            kick: 'Expulsion',
            mute: 'Mise en sourdine',
            unmute: 'Retrait de sourdine',
            warn: 'Avertissement',
            unwarn: 'Retrait d\'avertissement',
            clear: 'Suppression de messages'
        };

        const actionName = actionNames[action] || action;
        const description = `Action de modération effectuée: **${actionName}**`;

        await this.log(guild, this.LogTypes.MODERATION, actionName, description, {
            user,
            moderator,
            reason,
            duration,
            thumbnail: user.displayAvatarURL()
        });
    }

    /**
     * Log pour les actions administratives
     */
    static async logAdmin(guild, action, moderator, details) {
        const description = `Action administrative effectuée: **${action}**`;

        await this.log(guild, this.LogTypes.ADMIN, action, description, {
            moderator,
            fields: details ? [{ name: 'Détails', value: details, inline: false }] : undefined
        });
    }

    /**
     * Log pour les erreurs système
     */
    static async logError(guild, error, context = '') {
        const description = `Une erreur système s'est produite${context ? ` dans ${context}` : ''}`;

        await this.log(guild, this.LogTypes.ERROR, 'Erreur Système', description, {
            fields: [
                { name: 'Erreur', value: error.message || error, inline: false },
                { name: 'Contexte', value: context || 'Non spécifié', inline: true }
            ],
            footer: 'Vérifiez les logs du serveur pour plus de détails'
        });
    }

    /**
     * Log pour les événements utilisateur
     */
    static async logUser(guild, event, user, details = '') {
        const eventNames = {
            join: 'Arrivée',
            leave: 'Départ',
            update: 'Mise à jour du profil',
            role_add: 'Rôle ajouté',
            role_remove: 'Rôle retiré'
        };

        const eventName = eventNames[event] || event;
        const description = `Événement utilisateur: **${eventName}**`;

        await this.log(guild, this.LogTypes.USER, eventName, description, {
            user,
            fields: details ? [{ name: 'Détails', value: details, inline: false }] : undefined,
            thumbnail: user.displayAvatarURL()
        });
    }

    /**
     * Log pour les informations système
     */
    static async logInfo(guild, title, message, fields = []) {
        await this.log(guild, this.LogTypes.INFO, title, message, {
            fields
        });
    }

    /**
     * Log pour les avertissements
     */
    static async logWarning(guild, title, message, details = '') {
        await this.log(guild, this.LogTypes.WARNING, title, message, {
            fields: details ? [{ name: 'Détails', value: details, inline: false }] : undefined
        });
    }

    /**
     * Formate une durée en texte lisible
     * @param {number} milliseconds - Durée en millisecondes
     * @returns {string} - Durée formatée
     */
    static formatDuration(milliseconds) {
        if (!milliseconds) return 'Permanent';

        const seconds = Math.floor(milliseconds / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (days > 0) {
            return `${days} jour${days > 1 ? 's' : ''}`;
        } else if (hours > 0) {
            return `${hours} heure${hours > 1 ? 's' : ''}`;
        } else if (minutes > 0) {
            return `${minutes} minute${minutes > 1 ? 's' : ''}`;
        } else {
            return `${seconds} seconde${seconds > 1 ? 's' : ''}`;
        }
    }

    /**
     * Vérifie si le canal de logs est configuré et accessible
     * @param {Guild} guild - Le serveur Discord
     * @returns {boolean} - True si le canal est accessible
     */
    static async isLogChannelAccessible(guild) {
        try {
            const guildConfig = await DatabaseManager.getGuildConfig(guild.id);
            if (!guildConfig || !guildConfig.logChannelId) {
                return false;
            }

            const logChannel = guild.channels.cache.get(guildConfig.logChannelId);
            return logChannel && logChannel.isTextBased();
        } catch (error) {
            return false;
        }
    }
}

module.exports = Logger;