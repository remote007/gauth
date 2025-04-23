const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const domainSchema = new Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastScrape: {
    type: Date
  }
}, { timestamps: true });

// Prevent duplicate domains for the same user
domainSchema.index({ name: 1, user: 1 }, { unique: true });

module.exports = mongoose.model('Domain', domainSchema);
