const mongoose = require('mongoose');

const leadSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    category: { type: String, required: true },
    date: { type: Date, required: true },
    phone: { type: String },
    email: { type: String, lowercase: true, trim: true },
    status: {
      type: String,
      enum: ['New', 'Converted'],
      default: 'New',
    },
    budget: { type: String },
    source: { type: String },
  },
  { timestamps: true } // Automatically add createdAt and updatedAt fields
);

// Optionally, we could add an index for performance
leadSchema.index({ name: 1, category: 1 }); // Example index for optimized queries

module.exports = mongoose.model('Lead', leadSchema);
