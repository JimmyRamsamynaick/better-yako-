const cooldowns = new Map();

class CooldownManager {
    /**
     * Vérifie si un utilisateur est en cooldown pour une commande
     * @param {string} userId - ID de l'utilisateur
     * @param {string} commandName - Nom de la commande
     * @param {number} cooldownTime - Temps de cooldown en millisecondes
     * @returns {Object} - { isOnCooldown: boolean, timeLeft: number }
     */
    static checkCooldown(userId, commandName, cooldownTime) {
        const key = `${userId}-${commandName}`;
        const now = Date.now();
        
        if (cooldowns.has(key)) {
            const expirationTime = cooldowns.get(key) + cooldownTime;
            
            if (now < expirationTime) {
                const timeLeft = expirationTime - now;
                return {
                    isOnCooldown: true,
                    timeLeft: Math.ceil(timeLeft / 1000) // en secondes
                };
            }
        }
        
        // Définir le nouveau cooldown
        cooldowns.set(key, now);
        
        return {
            isOnCooldown: false,
            timeLeft: 0
        };
    }

    /**
     * Supprime le cooldown d'un utilisateur pour une commande
     * @param {string} userId - ID de l'utilisateur
     * @param {string} commandName - Nom de la commande
     */
    static removeCooldown(userId, commandName) {
        const key = `${userId}-${commandName}`;
        cooldowns.delete(key);
    }

    /**
     * Nettoie les cooldowns expirés (à appeler périodiquement)
     */
    static cleanupExpiredCooldowns() {
        const now = Date.now();
        const maxAge = 24 * 60 * 60 * 1000; // 24 heures
        
        for (const [key, timestamp] of cooldowns.entries()) {
            if (now - timestamp > maxAge) {
                cooldowns.delete(key);
            }
        }
    }

    /**
     * Formate le temps restant en texte lisible
     * @param {number} seconds - Temps en secondes
     * @returns {string} - Temps formaté
     */
    static formatTimeLeft(seconds) {
        if (seconds < 60) {
            return `${seconds} seconde${seconds > 1 ? 's' : ''}`;
        }
        
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        
        if (minutes < 60) {
            return remainingSeconds > 0 
                ? `${minutes} minute${minutes > 1 ? 's' : ''} et ${remainingSeconds} seconde${remainingSeconds > 1 ? 's' : ''}`
                : `${minutes} minute${minutes > 1 ? 's' : ''}`;
        }
        
        const hours = Math.floor(minutes / 60);
        const remainingMinutes = minutes % 60;
        
        return remainingMinutes > 0
            ? `${hours} heure${hours > 1 ? 's' : ''} et ${remainingMinutes} minute${remainingMinutes > 1 ? 's' : ''}`
            : `${hours} heure${hours > 1 ? 's' : ''}`;
    }

    /**
     * Obtient les statistiques des cooldowns
     * @returns {Object} - Statistiques
     */
    static getStats() {
        return {
            totalCooldowns: cooldowns.size,
            activeCooldowns: Array.from(cooldowns.values()).filter(timestamp => {
                return Date.now() - timestamp < 24 * 60 * 60 * 1000;
            }).length
        };
    }
}

// Nettoyer les cooldowns expirés toutes les heures
setInterval(() => {
    CooldownManager.cleanupExpiredCooldowns();
}, 60 * 60 * 1000);

module.exports = CooldownManager;