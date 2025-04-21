const express = require('express');
const mongoose = require('mongoose');
require('dotenv').config();
const cors = require('cors');
const Lead = require('./models/Lead');

const app = express();
app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

// Parse structured snippet
const parseSnippet = (snippet) => {
  const obj = {};
  const parts = snippet.split(',');

  parts.forEach(part => {
    const [key, value] = part.split(':');
    if (key && value) {
      obj[key.trim().toLowerCase()] = value.trim();
    }
  });

  if (!obj.name || !obj.category || !obj.date) return null;

  const [d, m, y] = obj.date.split('/');
  const formattedDate = new Date(`20${y}-${m}-${d}`);

  return {
    name: obj.name,
    category: obj.category,
    date: formattedDate,
    phone: obj.phone || '',
    email: obj.email || '',
    budget: obj.budget || '',
    source: obj.source || '',
    status: "New", // Default status for new leads
  };
};

// POST leads
app.post('/emails', async (req, res) => {
  try {
    const { emails } = req.body;
    if (!Array.isArray(emails)) return res.status(400).json({ message: 'Invalid format.' });

    const parsed = emails.map(e => parseSnippet(e.snippet)).filter(Boolean);
    if (parsed.length === 0) return res.status(400).json({ message: 'No valid leads.' });

    const saved = await Lead.insertMany(parsed);
    res.status(201).json({ message: 'Leads saved', count: saved.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET leads
app.get('/leads', async (req, res) => {
  try {
    const leads = await Lead.find().sort({ createdAt: -1 });
    res.json(leads);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch leads' });
  }
});

// PUT update lead status
app.put('/leads/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    if (!status || !['New', 'Converted', 'Dropped'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status.' });
    }

    const lead = await Lead.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );

    if (!lead) {
      return res.status(404).json({ message: 'Lead not found.' });
    }

    res.json({ message: 'Status updated successfully', lead });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to update status' });
  }
});

// PUT update lead date
app.put('/leads/:id/date', async (req, res) => {
  try {
    const { date } = req.body;
    if (!date) return res.status(400).json({ message: 'Invalid date.' });

    const lead = await Lead.findByIdAndUpdate(
      req.params.id,
      { date },
      { new: true }
    );

    if (!lead) {
      return res.status(404).json({ message: 'Lead not found.' });
    }

    res.json({ message: 'Date updated successfully', lead });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to update date' });
  }
});

// DELETE lead
app.delete('/leads/:id', async (req, res) => {
  try {
    const lead = await Lead.findByIdAndDelete(req.params.id);
    if (!lead) {
      return res.status(404).json({ message: 'Lead not found.' });
    }

    res.json({ message: 'Lead deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to delete lead' });
  }
});

app.get('/', (req, res) => res.json({ status: 'Server running' }));

const PORT = process.env.PORT || 8087;
app.listen(PORT, () => console.log(`🚀 Running at http://localhost:${PORT}`));
