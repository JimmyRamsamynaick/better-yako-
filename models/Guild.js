const { Schema, model } = require('mongoose');

// Schéma pour les utilisateurs du serveur
const userSchema = new Schema({
    userId: {
        type: String,
        required: true
    },
    warnings: [{
        reason: String,
        moderator: String,
        date: { type: Date, default: Date.now }
    }],
    muted: {
        type: Boolean,
        default: false
    },
    mutedUntil: {
        type: Date,
        default: null
    }
});

const guildSchema = new Schema({
    guildId: {
        type: String,
        required: true,
        unique: true
    },
    language: {
        type: String,
        default: 'fr'
    },
    muteRole: {
        type: String,
        default: null
    },
    logs: {
        enabled: {
            type: Boolean,
            default: false
        },
        channelId: {
            type: String,
            default: null
        },
        types: {
            voice: { type: Boolean, default: true },
            message: { type: Boolean, default: true },
            server: { type: Boolean, default: true },
            roles: { type: Boolean, default: true },
            channels: { type: Boolean, default: true }
        }
    },
    users: [userSchema],
    premium: {
        type: Boolean,
        default: false
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = model('Guild', guildSchema);