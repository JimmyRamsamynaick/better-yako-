const Economy = require('../models/Economy');

class EconomyManager {
    static async getEconomy(guildId) {
        let economy = await Economy.findOne({ guildId });
        if (!economy) {
            try {
                economy = new Economy({ guildId, users: [], shopItems: [] });
                await this.seedDefaultItems(economy);
                await economy.save();
            } catch (err) {
                if (err.code === 11000) {
                    // Si déjà créé par un autre processus, on le récupère
                    economy = await Economy.findOne({ guildId });
                } else {
                    throw err;
                }
            }
        }
        return economy;
    }

    static async seedDefaultItems(economy) {
        if (economy.shopItems.length > 0) return;

        const defaultItems = [
            // Couleurs
            { id: 1, name: 'Jaune', type: 'role_color', price: 1000, color: '#FFFF00', description: 'Pseudo en jaune' },
            { id: 2, name: 'Rouge', type: 'role_color', price: 1000, color: '#FF0000', description: 'Pseudo en rouge' },
            { id: 3, name: 'Vert', type: 'role_color', price: 1000, color: '#00FF00', description: 'Pseudo en vert' },
            { id: 4, name: 'Cyan', type: 'role_color', price: 1000, color: '#00FFFF', description: 'Pseudo en cyan' },
            { id: 5, name: 'Noir', type: 'role_color', price: 1000, color: '#000000', description: 'Pseudo en noir' },
            { id: 6, name: 'Blanc', type: 'role_color', price: 1000, color: '#FFFFFF', description: 'Pseudo en blanc' },
            { id: 7, name: 'Orange', type: 'role_color', price: 1000, color: '#FFA500', description: 'Pseudo en orange' },
            { id: 8, name: 'Bleu', type: 'role_color', price: 1000, color: '#0000FF', description: 'Pseudo en bleu' },
            { id: 9, name: 'Rose', type: 'role_color', price: 1000, color: '#FFC0CB', description: 'Pseudo en rose' },
            { id: 10, name: 'Violet', type: 'role_color', price: 1000, color: '#800080', description: 'Pseudo en violet' },
            // Rôles personnalisés
            { id: 11, name: 'Rôle Perso (Simple)', type: 'role_custom', price: 10000, description: 'Nom au choix, couleur par défaut' },
            { id: 12, name: 'Rôle Perso (Gold)', type: 'role_custom', price: 15000, description: 'Nom au choix, couleur simple' },
            { id: 13, name: 'Rôle Perso (Diamant)', type: 'role_custom', price: 30000, description: 'Nom au choix, couleur dégradée' }
        ];

        economy.shopItems = defaultItems;
    }

    static async addCoins(guildId, userId, amount) {
        // S'assurer que le document économie existe
        await this.getEconomy(guildId);

        // Tentative de mise à jour atomique (si l'utilisateur existe)
        const result = await Economy.updateOne(
            { guildId, "users.userId": userId },
            { $inc: { "users.$.balance": amount } }
        );

        // Si l'utilisateur n'a pas été trouvé dans le tableau, on l'ajoute
        if (result.matchedCount === 0) {
            // On essaie d'ajouter l'utilisateur seulement s'il n'existe pas déjà
            const pushResult = await Economy.updateOne(
                { guildId, "users.userId": { $ne: userId } },
                { $push: { users: { userId, balance: amount } } }
            );

            // Si le push a échoué, c'est que l'utilisateur a été ajouté entre temps, on réessaie l'incrément
            if (pushResult.matchedCount === 0) {
                await Economy.updateOne(
                    { guildId, "users.userId": userId },
                    { $inc: { "users.$.balance": amount } }
                );
            }
        }
        
        return true;
    }

    static async removeCoins(guildId, userId, amount) {
        // Mise à jour atomique seulement si le solde est suffisant
        const result = await Economy.updateOne(
            { 
                guildId, 
                "users.userId": userId, 
                "users.balance": { $gte: amount } 
            },
            { $inc: { "users.$.balance": -amount } }
        );

        return result.modifiedCount > 0;
    }

    static async getBalance(guildId, userId) {
        const economy = await this.getEconomy(guildId);
        const user = economy.users.find(u => u.userId === userId);
        return user ? user.balance : 0;
    }
}

module.exports = EconomyManager;