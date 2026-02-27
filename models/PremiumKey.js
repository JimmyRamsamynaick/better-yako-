const { Schema, model } = require('mongoose');

const premiumKeySchema = new Schema({
  key: { type: String, unique: true, required: true },
  status: { type: String, enum: ['unused', 'redeemed', 'revoked'], default: 'unused' },
  createdAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, default: null },
  redeemedAt: { type: Date, default: null },
  assignedToGuildId: { type: String, default: null },
  purchaserEmail: { type: String, default: null },
  purchaserDiscord: { type: String, default: null },
  orderId: { type: String, default: null },
  amount: { type: String, default: '4.99' },
  currency: { type: String, default: 'EUR' }
});

module.exports = model('PremiumKey', premiumKeySchema);

