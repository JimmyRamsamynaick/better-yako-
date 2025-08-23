const mongoose = require('mongoose');

const warningSchema = new mongoose.Schema({
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
  reason: {
    type: String,
    required: true,
    maxlength: 1000
  },
  warningId: {
    type: String,
    required: true,
    unique: true
  },
  active: {
    type: Boolean,
    default: true,
    index: true
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  removedAt: {
    type: Date,
    default: null
  },
  removedBy: {
    type: String,
    default: null
  },
  removeReason: {
    type: String,
    default: null
  }
}, {
  timestamps: true
});

// Index composé pour optimiser les requêtes
warningSchema.index({ guildId: 1, userId: 1, active: 1 });
warningSchema.index({ guildId: 1, createdAt: -1 });

// Méthodes statiques
warningSchema.statics.getActiveWarnings = function(guildId, userId) {
  return this.find({
    guildId,
    userId,
    active: true
  }).sort({ createdAt: -1 });
};

warningSchema.statics.countActiveWarnings = function(guildId, userId) {
  return this.countDocuments({
    guildId,
    userId,
    active: true
  });
};

warningSchema.statics.generateWarningId = function() {
  return 'warn_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
};

// Méthodes d'instance
warningSchema.method('remove', function(moderatorId, reason = 'Avertissement retiré') {
  this.active = false;
  this.removedAt = new Date();
  this.removedBy = moderatorId;
  this.removeReason = reason;
  return this.save();
}, { suppressWarning: true });

module.exports = mongoose.model('Warning', warningSchema);