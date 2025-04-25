const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const userSchema = new Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  isLoggedIn: { type: Boolean, default: false },
  lastLogin: {
    type: Date,
    default: Date.now
  }

}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);