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
    tickets: {
        categoryId: {
            type: String,
            default: null
        },
        staffRoleId: {
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

// Sanitize legacy data: ensure users[*].warnings is always an array of objects
guildSchema.pre('validate', function(next) {
    try {
        if (Array.isArray(this.users)) {
            this.users.forEach((u) => {
                if (!u) return;
                const w = u.warnings;
                // If warnings is a number or missing, coerce to empty array
                if (typeof w === 'number' || (!Array.isArray(w) && w != null)) {
                    u.warnings = [];
                    return;
                }
                if (!Array.isArray(w)) {
                    u.warnings = [];
                    return;
                }
                // Filter out invalid entries to keep only plain objects
                u.warnings = w.filter((entry) => entry && typeof entry === 'object');
            });
        }
        next();
    } catch (err) {
        // Do not block validation because of sanitation error
        console.error('Guild warnings sanitation error:', err);
        next();
    }
});

module.exports = model('Guild', guildSchema);