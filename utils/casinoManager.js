const EconomyManager = require('./economyManager');
const Economy = require('../models/Economy');

class CasinoManager {
    static cooldowns = new Map();

    static async checkCooldown(userId, guildId) {
        const key = `${userId}-${guildId}`;
        const lastUsed = this.cooldowns.get(key);
        const cooldownTime = 5000; // 5 seconds default

        if (lastUsed && (Date.now() - lastUsed < cooldownTime)) {
            return Math.ceil((cooldownTime - (Date.now() - lastUsed)) / 1000);
        }
        return 0;
    }

    static setCooldown(userId, guildId) {
        const key = `${userId}-${guildId}`;
        this.cooldowns.set(key, Date.now());
    }

    static async validateBet(guildId, userId, bet) {
        const minBet = 100;
        const maxBet = 10000;

        if (bet < minBet) return { valid: false, reason: 'min_bet', amount: minBet };
        if (bet > maxBet) return { valid: false, reason: 'max_bet', amount: maxBet };

        const balance = await EconomyManager.getBalance(guildId, userId);
        if (balance < bet) return { valid: false, reason: 'insufficient_funds' };

        return { valid: true };
    }

    static async recordGame(guildId, userId, bet, winAmount, isWin) {
        // Update stats
        const updateField = isWin ? "users.$.casinoStats.totalGains" : "users.$.casinoStats.totalLosses";
        const amount = isWin ? winAmount : bet;

        await Economy.updateOne(
            { guildId, "users.userId": userId },
            { 
                $inc: { 
                    [updateField]: amount,
                    "users.$.casinoStats.gamesPlayed": 1
                }
            }
        );
    }

    static async getStats(guildId, userId) {
        const economy = await EconomyManager.getEconomy(guildId);
        const user = economy.users.find(u => u.userId === userId);
        return user ? (user.casinoStats || { totalGains: 0, totalLosses: 0, gamesPlayed: 0 }) : { totalGains: 0, totalLosses: 0, gamesPlayed: 0 };
    }
}

module.exports = CasinoManager;
