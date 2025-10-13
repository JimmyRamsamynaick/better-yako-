const { Schema, model } = require('mongoose');

// Schéma pour les utilisateurs du serveur
const warningSchema = new Schema({
    reason: String,
    moderator: String,
    date: { type: Date, default: Date.now }
});

const userSchema = new Schema({
    userId: {
        type: String,
        required: true
    },
    warnings: [warningSchema],
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
        channels: [{
            channelId: {
                type: String,
                required: true
            },
            types: {
                voice: { type: Boolean, default: false },
                message: { type: Boolean, default: false },
                channels: { type: Boolean, default: false },
                roles: { type: Boolean, default: false },
                server: { type: Boolean, default: false }
            }
        }],
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
    welcome: {
        enabled: {
            type: Boolean,
            default: true
        },
        channelId: {
            type: String,
            default: null
        }
    },
    // tempVoice supprimé
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