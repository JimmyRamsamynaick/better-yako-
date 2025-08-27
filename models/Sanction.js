const mongoose = require('mongoose');

const sanctionSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    index: true
  },
  guildId: {
    type: String,
    required: true,
    index: true
  },
  moderatorId: {
    type: String,
    required: true
  },
  type: {
    type: String,
    required: true,
    enum: ['ban', 'unban', 'kick', 'mute', 'unmute', 'warn', 'unwarn', 'clear', 'lock', 'unlock', 'setlang'],
    index: true
  },
  reason: {
    type: String,
    required: true,
    maxlength: 1000
  },
  duration: {
    type: Number, // en millisecondes
    default: null
  },
  expiresAt: {
    type: Date,
    default: null,
    index: true
  },
  active: {
    type: Boolean,
    default: true,
    index: true
  },
  channelId: {
    type: String,
    default: null // pour les sanctions de canal (lock/unlock/clear)
  },
  targetId: {
    type: String,
    default: null // ID de l'élément ciblé (utilisateur, canal, etc.)
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {} // données supplémentaires spécifiques à chaque type
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index composés pour optimiser les requêtes
sanctionSchema.index({ guildId: 1, type: 1, active: 1 });
sanctionSchema.index({ guildId: 1, userId: 1, type: 1 });
sanctionSchema.index({ guildId: 1, createdAt: -1 });
sanctionSchema.index({ expiresAt: 1, active: 1 }); // pour les sanctions temporaires

// Méthodes statiques
sanctionSchema.statics.getActiveSanctions = function(guildId, userId = null, type = null) {
  const query = {
    guildId,
    active: true
  };
  
  if (userId) query.userId = userId;
  if (type) query.type = type;
  
  return this.find(query).sort({ createdAt: -1 });
};

sanctionSchema.statics.getExpiredSanctions = function() {
  return this.find({
    active: true,
    expiresAt: { $lte: new Date() }
  });
};

sanctionSchema.statics.getUserHistory = function(guildId, userId, limit = 50) {
  return this.find({
    guildId,
    userId
  })
  .sort({ createdAt: -1 })
  .limit(limit);
};

sanctionSchema.statics.getGuildStats = function(guildId, days = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  return this.aggregate([
    {
      $match: {
        guildId,
        createdAt: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: '$type',
        count: { $sum: 1 }
      }
    }
  ]);
};

// Méthodes d'instance
sanctionSchema.methods.expire = function() {
  this.active = false;
  this.updatedAt = new Date();
  return this.save();
};

sanctionSchema.methods.extend = function(newDuration, newExpiresAt) {
  this.duration = newDuration;
  this.expiresAt = newExpiresAt;
  this.updatedAt = new Date();
  return this.save();
};

sanctionSchema.methods.updateMetadata = function(newMetadata) {
  this.metadata = { ...this.metadata, ...newMetadata };
  this.updatedAt = new Date();
  return this.save();
};

// Middleware pour mettre à jour updatedAt
sanctionSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('Sanction', sanctionSchema);