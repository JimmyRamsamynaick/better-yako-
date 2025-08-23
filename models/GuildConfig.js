const mongoose = require('mongoose');

const guildConfigSchema = new mongoose.Schema({
    guildId: {
        type: String,
        required: true,
        unique: true
    },
    language: {
        type: String,
        enum: ['fr', 'en', 'es'],
        default: 'fr'
    },
    logChannelId: {
        type: String,
        default: null
    },
    muteRoleId: {
        type: String,
        default: null
    },
    adminRoles: {
        type: [String],
        default: []
    },
    moderatorRoles: {
        type: [String],
        default: []
    },
    welcomeChannelId: {
        type: String,
        default: null
    },
    welcomeMessage: {
        type: String,
        default: null
    },
    autoDetectLanguage: {
        type: Boolean,
        default: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

guildConfigSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

module.exports = mongoose.model('GuildConfig', guildConfigSchema);