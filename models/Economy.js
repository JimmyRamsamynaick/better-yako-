const { Schema, model } = require('mongoose');

const shopItemSchema = new Schema({
    id: { type: Number, required: true },
    name: { type: String, required: true },
    type: { type: String, enum: ['role_color', 'role_custom'], required: true },
    price: { type: Number, required: true },
    stock: { type: Number, default: -1 }, // -1 = infini
    roleId: { type: String, default: null }, // Pour les rôles existants (couleurs)
    color: { type: String, default: null }, // Pour créer le rôle (hex)
    description: { type: String, default: '' }
});

const economySchema = new Schema({
    guildId: { type: String, required: true, unique: true },
    users: [{
        userId: { type: String, required: true },
        balance: { type: Number, default: 0 },
        inventory: [{
            itemId: { type: Number },
            purchasedAt: { type: Date, default: Date.now },
            customRoleId: { type: String, default: null } // Si c'est un rôle custom créé
        }]
    }],
    shopItems: [shopItemSchema]
});

module.exports = model('Economy', economySchema);