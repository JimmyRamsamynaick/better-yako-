const mongoose = require('mongoose');
const GuildConfig = require('../models/GuildConfig');
const Warning = require('../models/Warning');
const Sanction = require('../models/Sanction');

class DatabaseManager {
    static async connect() {
        try {
            await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/better-yako');
            console.log('✅ Connexion à MongoDB établie');
        } catch (error) {
            console.error('❌ Erreur de connexion à MongoDB:', error);
            process.exit(1);
        }
    }

    static async getGuildConfig(guildId) {
        try {
            let config = await GuildConfig.findOne({ guildId });
            if (!config) {
                config = new GuildConfig({ guildId });
                await config.save();
            }
            return config;
        } catch (error) {
            console.error('Erreur lors de la récupération de la configuration:', error);
            return null;
        }
    }

    static async updateGuildConfig(guildId, updates) {
        try {
            return await GuildConfig.findOneAndUpdate(
                { guildId },
                { ...updates, updatedAt: Date.now() },
                { new: true, upsert: true }
            );
        } catch (error) {
            console.error('Erreur lors de la mise à jour de la configuration:', error);
            return null;
        }
    }

    static async addWarning(userId, guildId, moderatorId, reason) {
        try {
            const warning = new Warning({
                userId,
                guildId,
                moderatorId,
                reason
            });
            await warning.save();
            return warning;
        } catch (error) {
            console.error('Erreur lors de l\'ajout de l\'avertissement:', error);
            return null;
        }
    }

    static async removeWarning(warningId) {
        try {
            return await Warning.findByIdAndUpdate(
                warningId,
                { active: false },
                { new: true }
            );
        } catch (error) {
            console.error('Erreur lors de la suppression de l\'avertissement:', error);
            return null;
        }
    }

    static async getUserWarnings(userId, guildId) {
        try {
            return await Warning.find({
                userId,
                guildId,
                active: true
            }).sort({ createdAt: -1 });
        } catch (error) {
            console.error('Erreur lors de la récupération des avertissements:', error);
            return [];
        }
    }

    static async addSanction(userId, guildId, moderatorId, type, reason, duration = null) {
        try {
            const sanction = new Sanction({
                userId,
                guildId,
                moderatorId,
                type,
                reason,
                duration,
                expiresAt: duration ? new Date(Date.now() + duration) : null
            });
            await sanction.save();
            return sanction;
        } catch (error) {
            console.error('Erreur lors de l\'ajout de la sanction:', error);
            return null;
        }
    }

    static async getActiveMutes(guildId) {
        try {
            return await Sanction.find({
                guildId,
                type: 'mute',
                active: true,
                $or: [
                    { expiresAt: null },
                    { expiresAt: { $gt: new Date() } }
                ]
            });
        } catch (error) {
            console.error('Erreur lors de la récupération des mutes actifs:', error);
            return [];
        }
    }

    static async expireMute(sanctionId) {
        try {
            return await Sanction.findByIdAndUpdate(
                sanctionId,
                { active: false },
                { new: true }
            );
        } catch (error) {
            console.error('Erreur lors de l\'expiration du mute:', error);
            return null;
        }
    }
}

module.exports = DatabaseManager;