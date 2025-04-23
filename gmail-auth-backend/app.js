const express = require('express');
const mongoose = require('mongoose');
require('dotenv').config();
const cors = require('cors');
const { google } = require('googleapis');
const Lead = require('./models/Lead');

const UserDomainSchema = new mongoose.Schema({
  userEmail: { type: String, required: true, index: true },
  domains: [{
    domain: { type: String, required: true },
    addedAt: { type: Date, default: Date.now }
  }],
});

const UserDomain = mongoose.model('UserDomain', UserDomainSchema);

const app = express();
app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

app.post('/user/domains', async (req, res) => {
  try {
    const { email, domain } = req.body;
    console.log("req.body")
    if (!email || !domain) {
      return res.status(400).json({ 
        message: 'Email and domain are required',
        success: false 
      });
    }

    let userDomain = await UserDomain.findOne({ userEmail: email });

    if (!userDomain) {
      userDomain = new UserDomain({
        userEmail: email,
        domains: [{ domain }]
      });
    } else {
      if (!userDomain.domains.some(d => d.domain === domain)) {
        userDomain.domains.push({ domain });
      }
    }

    console.log(req.body)

    await userDomain.save();

    res.status(201).json({ 
      message: 'Domain saved successfully', 
      domains: userDomain.domains.map(d => d.domain),
      success: true
    });
  } catch (err) {
    console.error('Error saving domain:', err);
    res.status(500).json({ 
      message: 'Server error while saving domain', 
      success: false 
    });
  }
});

app.get('/user/domains/:email', async (req, res) => {
  try {
    const { email } = req.params;
    
    if (!email) {
      return res.status(400).json({ 
        message: 'Email parameter is required', 
        success: false 
      });
    }
    
    const userDomain = await UserDomain.findOne({ userEmail: email });

    res.status(200).json({ 
      domains: userDomain?.domains.map(d => d.domain) || [],
      success: true
    });
  } catch (err) {
    console.error('Error fetching domains:', err);
    res.status(500).json({ 
      message: 'Server error while fetching domains', 
      success: false 
    });
  }
});

app.delete('/user/domains/:email/:domain', async (req, res) => {
  try {
    const { email, domain } = req.params;

    if (!email || !domain) {
      return res.status(400).json({ 
        message: 'Email and domain parameters are required', 
        success: false 
      });
    }
    
    const userDomain = await UserDomain.findOne({ userEmail: email });
    
    if (!userDomain) {
      return res.status(404).json({ 
        message: 'User not found', 
        success: false 
      });
    }

    const domainExists = userDomain.domains.some(d => d.domain === domain);
    
    if (!domainExists) {
      return res.status(404).json({ 
        message: 'Domain not found for this user', 
        success: false 
      });
    }

    userDomain.domains = userDomain.domains.filter(d => d.domain !== domain);
    await userDomain.save();

    res.status(200).json({ 
      message: 'Domain removed successfully', 
      domains: userDomain.domains.map(d => d.domain),
      success: true
    });
  } catch (err) {
    console.error('Error deleting domain:', err);
    res.status(500).json({ 
      message: 'Server error while deleting domain', 
      success: false 
    });
  }
});

app.put('/user/domains/:email/:oldDomain', async (req, res) => {
  try {
    const { email, oldDomain } = req.params;
    const { newDomain } = req.body;

    if (!email || !oldDomain || !newDomain) {
      return res.status(400).json({ 
        message: 'Email, old domain, and new domain are required', 
        success: false 
      });
    }
    
    const userDomainDoc = await UserDomain.findOne({ userEmail: email });
    
    if (!userDomainDoc) {
      return res.status(404).json({ 
        message: 'User not found', 
        success: false 
      });
    }

    const domainIndex = userDomainDoc.domains.findIndex(d => d.domain === oldDomain);
    
    if (domainIndex === -1) {
      return res.status(404).json({ 
        message: 'Domain not found for this user', 
        success: false 
      });
    }

    if (userDomainDoc.domains.some(d => d.domain === newDomain)) {
      return res.status(400).json({ 
        message: 'New domain already exists for this user', 
        success: false 
      });
    }

    userDomainDoc.domains[domainIndex].domain = newDomain;
    userDomainDoc.domains[domainIndex].addedAt = new Date();
    
    await userDomainDoc.save();

    res.status(200).json({ 
      message: 'Domain updated successfully', 
      domains: userDomainDoc.domains.map(d => d.domain),
      success: true
    });
  } catch (err) {
    console.error('Error updating domain:', err);
    res.status(500).json({ 
      message: 'Server error while updating domain', 
      success: false 
    });
  }
});

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
    status: "New",
  };
};

app.get('/user/domains/:email/count', async (req, res) => {
  try {
    const { email } = req.params;
    
    if (!email) {
      return res.status(400).json({ 
        message: 'Email parameter is required', 
        success: false 
      });
    }
    
    const userDomain = await UserDomain.findOne({ userEmail: email });
    const count = userDomain ? userDomain.domains.length : 0;

    res.status(200).json({ 
      count, 
      success: true 
    });
  } catch (err) {
    console.error('Error fetching domain count:', err);
    res.status(500).json({ 
      message: 'Server error while fetching domain count', 
      success: false 
    });
  }
});

app.post('/user/domains/test', async (req, res) => {
  try {
    const { email, domain } = req.body;
    
    if (!email || !domain) {
      return res.status(400).json({ 
        message: 'Email and domain are required', 
        success: false 
      });
    }

    res.status(200).json({ 
      message: 'Domain test successful', 
      isValid: true,
      success: true
    });
  } catch (err) {
    console.error('Error testing domain:', err);
    res.status(500).json({ 
      message: 'Server error while testing domain', 
      success: false 
    });
  }
});

app.post('/leads', async (req, res) => {
  try {
    const { name, category, date, phone, email, status, budget, source } = req.body;

    if (!name || !category || !date) {
      return res.status(400).json({ message: 'Name, category, and date are required', success: false });
    }

    const lead = new Lead({ name, category, date, phone, email, status, budget, source });
    await lead.save();

    res.status(201).json({ message: 'Lead created successfully', lead, success: true });
  } catch (err) {
    console.error('Error creating lead:', err);
    res.status(500).json({ message: 'Server error while creating lead', success: false });
  }
});

// app.get('/leads', async (req, res) => {
//   try {
//     const leads = await Lead.find().sort({ createdAt: -1 });
//     res.json({
//       leads,
//       count: leads.length,
//       success: true
//     });
//   } catch (err) {
//     console.error('Error fetching leads:', err);
//     res.status(500).json({ 
//       message: 'Failed to fetch leads', 
//       success: false 
//     });
//   }
// });

app.get('/leads', async (req, res) => {
  try {
    const leads = await Lead.find().sort({ createdAt: -1 });
    
    // Return the leads and count
    res.json({
      leads, // The array of leads
      count: leads.length, // The count of the leads
      success: true // Indicating success
    });
  } catch (err) {
    console.error('Error fetching leads:', err);
    res.status(500).json({ 
      message: 'Failed to fetch leads', 
      success: false 
    });
  }
});


app.put('/leads/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    
    if (!status || !['New', 'Converted', 'Dropped'].includes(status)) {
      return res.status(400).json({ 
        message: 'Invalid status. Must be one of: New, Converted, Dropped.', 
        success: false 
      });
    }

    const lead = await Lead.findByIdAndUpdate(
      req.params.id, 
      { status }, 
      { new: true }
    );
    
    if (!lead) {
      return res.status(404).json({ 
        message: 'Lead not found.', 
        success: false 
      });
    }

    res.json({ 
      message: 'Status updated successfully', 
      lead,
      success: true
    });
  } catch (err) {
    console.error('Error updating lead status:', err);
    res.status(500).json({ 
      message: 'Failed to update status', 
      success: false 
    });
  }
});

app.put('/leads/:id/date', async (req, res) => {
  try {
    const { date } = req.body;
    
    if (!date) {
      return res.status(400).json({ 
        message: 'Invalid date.', 
        success: false 
      });
    }

    const lead = await Lead.findByIdAndUpdate(
      req.params.id, 
      { date }, 
      { new: true }
    );
    
    if (!lead) {
      return res.status(404).json({ 
        message: 'Lead not found.', 
        success: false 
      });
    }

    res.json({ 
      message: 'Date updated successfully', 
      lead,
      success: true
    });
  } catch (err) {
    console.error('Error updating lead date:', err);
    res.status(500).json({ 
      message: 'Failed to update date', 
      success: false 
    });
  }
});

app.delete('/leads/:id', async (req, res) => {
  try {
    const lead = await Lead.findByIdAndDelete(req.params.id);
    
    if (!lead) {
      return res.status(404).json({ 
        message: 'Lead not found.', 
        success: false 
      });
    }

    res.json({ 
      message: 'Lead deleted successfully',
      success: true
    });
  } catch (err) {
    console.error('Error deleting lead:', err);
    res.status(500).json({ 
      message: 'Failed to delete lead', 
      success: false 
    });
  }
});

app.get('/', (req, res) => res.json({ 
  status: 'Server running', 
  version: '1.1.0',
  success: true 
}));

const PORT = process.env.PORT || 8087;
app.listen(PORT, () => console.log(`🚀 Running at http://localhost:${PORT}`));