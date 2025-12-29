const Guild = require('../models/Guild');

class LevelingManager {
    static calculateLevel(xp) {
        // Courbe ajustée : 
        // Niveau 1-25 : Facile (coefficient 35)
        // Niveau 25+ : Difficile (coefficient 100)
        
        // XP au niveau 25 = 35 * 25^2 = 21875
        const limitXp = 21875;
        
        if (xp <= limitXp) {
            // Inverse de XP = 35 * level^2  => level = sqrt(XP / 35)
            return Math.floor(Math.sqrt(xp / 35));
        } else {
            // Inverse de XP = 100 * level^2 - 40625
            // level = sqrt((XP + 40625) / 100)
            return Math.floor(Math.sqrt((xp + 40625) / 100));
        }
    }

    static calculateXpForLevel(level) {
        if (level <= 25) {
            return Math.floor(35 * Math.pow(level, 2));
        }
        // Pour level > 25, la courbe devient plus raide
        // On assure la continuité avec level 25 (21875 XP)
        // Offset calculé pour que 100 * 25^2 - offset = 21875
        // 62500 - offset = 21875 => offset = 40625
        return Math.floor(100 * Math.pow(level, 2) - 40625);
    }

    static async addXp(guildId, userId, amount, stats = {}) {
        const guildData = await Guild.findOne({ guildId });
        if (!guildData) return null;

        let user = guildData.users.find(u => u.userId === userId);
        if (!user) {
            user = { userId, warnings: [], xp: 0, level: 0, messageCount: 0, voiceTime: 0 };
            guildData.users.push(user);
        }

        const oldLevel = user.level || 0;
        user.xp = (user.xp || 0) + amount;
        
        // Update stats
        if (stats.messages) {
            user.messageCount = (user.messageCount || 0) + stats.messages;
        }
        if (stats.voice) {
            user.voiceTime = (user.voiceTime || 0) + stats.voice;
        }

        const newLevel = this.calculateLevel(user.xp);

        let leveledUp = false;
        if (newLevel > oldLevel) {
            user.level = newLevel;
            leveledUp = true;
        }

        await guildData.save();

        return {
            user,
            oldLevel,
            newLevel,
            leveledUp
        };
    }

    static async getUserRank(guildId, userId) {
        const guildData = await Guild.findOne({ guildId });
        if (!guildData) return 0;

        // Sort users by XP descending
        const sortedUsers = guildData.users
            .sort((a, b) => b.xp - a.xp);
        
        const rank = sortedUsers.findIndex(u => u.userId === userId) + 1;
        return rank;
    }
}

module.exports = LevelingManager;
