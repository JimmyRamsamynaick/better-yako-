const Guild = require('../models/Guild');
const EconomyManager = require('./economyManager');

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
        // 1. Essayer de mettre à jour l'utilisateur existant (opération atomique)
        let updatedGuild = await Guild.findOneAndUpdate(
            { guildId: guildId, 'users.userId': userId },
            { 
                $inc: { 
                    'users.$.xp': amount,
                    'users.$.voiceTime': stats.voice || 0,
                    'users.$.messageCount': stats.messages || 0
                }
            },
            { new: true }
        );

        // 2. Si l'utilisateur n'existe pas, on l'ajoute
        if (!updatedGuild) {
            const newUser = { 
                userId, 
                xp: amount, 
                level: 0, 
                messageCount: stats.messages || 0, 
                voiceTime: stats.voice || 0,
                warnings: [] 
            };
            
            updatedGuild = await Guild.findOneAndUpdate(
                { guildId: guildId },
                { $push: { users: newUser } },
                { new: true }
            );
        }

        if (!updatedGuild) return null;

        // 3. Vérifier le Level Up
        const user = updatedGuild.users.find(u => u.userId === userId);
        if (!user) return null; // Should not happen

        const oldLevel = user.level || 0;
        const currentXp = user.xp || 0;
        const newLevel = this.calculateLevel(currentXp);

        let leveledUp = false;
        let reward = 0;

        // On ne notifie et récompense que si le niveau a réellement augmenté
        if (newLevel > oldLevel) {
            // Mise à jour du niveau si changement
            await Guild.findOneAndUpdate(
                { guildId: guildId, 'users.userId': userId },
                { $set: { 'users.$.level': newLevel } }
            );
            user.level = newLevel; // Update local object for return
            leveledUp = true;

            // Récompense en coins : Niveau * 10
            reward = newLevel * 10;
            await EconomyManager.addCoins(guildId, userId, reward);
        }

        return {
            user,
            oldLevel,
            newLevel,
            leveledUp,
            reward
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
