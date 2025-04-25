const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const WebSocket = require('ws');
const cron = require('node-cron');
const { google } = require('googleapis');
require('dotenv').config();

// Import models
const User = require('./models/User');
const Domain = require('./models/Domain');
const Lead = require('./models/Lead');

const app = express();
const server = http.createServer(app);

// Create WebSocket server
const wss = new WebSocket.Server({ server });

// Middleware
app.use(cors());
app.use(express.json());

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

// Store active WebSocket connections by user email
const activeConnections = new Map();

// WebSocket connection handler
wss.on('connection', (ws) => {
  console.log('New WebSocket connection established');
  let userEmail = null;
  
  // Handle messages from clients
  ws.on('message', async (message) => {
    try {
      const data = JSON.parse(message);
      console.log('Received WebSocket message:', data);
      
      switch (data.type) {
        case 'login':
          userEmail = data.email;
          console.log(`User logged in via WebSocket: ${userEmail}`);
          
          // Store connection with user email as key
          activeConnections.set(userEmail, ws);
          
          // Update user login status in DB
          const user = await User.findOneAndUpdate(
            { email: userEmail },
            { 
              lastLogin: new Date(),
              isLoggedIn: true 
            },
            { upsert: true, new: true }
          );
          
          // Send success response
          ws.send(JSON.stringify({ 
            type: 'login_success', 
            userId: user._id,
            message: 'Login successful' 
          }));
          break;
          
        case 'logout':
          console.log(`User logged out via WebSocket: ${data.email}`);
          if (data.email) {
            // Update user logged in status
            await User.findOneAndUpdate(
              { email: data.email },
              { isLoggedIn: false }
            );
            
            // Remove from active connections
            activeConnections.delete(data.email);
          }
          break;
          
        case 'scraping_results':
          console.log(`Email scraping results for ${data.email}: ${data.matchingEmails} matching emails from ${data.totalEmails} total`);
          // Here you could log these results to the database if needed
          break;
          
        case 'scraping_error':
          console.error(`Email scraping error for ${data.email}: ${data.error}`);
          // Here you could log the error to the database
          break;
      }
    } catch (error) {
      console.error('Error processing WebSocket message:', error);
    }
  });
  
  // Handle disconnection
  ws.on('close', async () => {
    if (userEmail) {
      console.log(`User disconnected: ${userEmail}`);
      
      // Update user logged in status
      await User.findOneAndUpdate(
        { email: userEmail },
        { isLoggedIn: false }
      ).catch(err => {
        console.error('Error updating user logout status:', err);
      });
      
      // Remove from active connections
      activeConnections.delete(userEmail);
    }
  });
});

// Initialize and start the cron job for email scraping
const initializeEmailScrapingCron = () => {
  console.log('Starting email scraping cron job - runs every 15 minutes');
  
  // Schedule job to run every 15 minutes
  cron.schedule('*/1 * * * *', async () => {
    console.log('Running cron job - fetching active users and domains');
    
    try {
      // Find all logged-in users
      const activeUsers = await User.find({ isLoggedIn: true });
      console.log(`Found ${activeUsers.length} active users`);
      
      for (const user of activeUsers) {
        // Find active domains for this user
        const domains = await Domain.find({
          user: user._id,
          isActive: true
        });
        
        if (domains.length > 0) {
          console.log(`Processing ${domains.length} domains for user: ${user.email}`);
          
          // Prepare data to send via WebSocket
          const data = {
            type: 'email_scrape_trigger',
            email: user.email,
            domains: domains.map(d => d.name)
          };
          
          // Send WebSocket message if user is connected
          const ws = activeConnections.get(user.email);
          if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify(data));
            console.log(`WebSocket message sent to ${user.email}`);
            
            // Update lastScrape timestamp for each domain
            for (const domain of domains) {
              domain.lastScrape = new Date();
              await domain.save();
            }
          } else {
            console.log(`User ${user.email} not connected, skipping WebSocket message`);
          }
        } else {
          console.log(`No active domains found for user: ${user.email}`);
        }
      }
    } catch (error) {
      console.error('Error in email scraping cron job:', error);
    }
  });
};

// API Routes for User management
app.post('/user/login', async (req, res) => {
  try {
    const { email, name, picture } = req.body;
    
    if (!email) {
      return res.status(400).json({ 
        message: 'Email is required',
        success: false 
      });
    }
    
    const user = await User.findOneAndUpdate(
      { email },
      { 
        name, 
        picture,
        lastLogin: new Date(),
        isLoggedIn: true 
      },
      { upsert: true, new: true }
    );
    
    res.status(200).json({
      message: 'Login successful',
      user,
      success: true
    });
  } catch (err) {
    console.error('Error during login:', err);
    res.status(500).json({
      message: 'Server error during login',
      success: false
    });
  }
});

// Domain management routes
app.post('/user/domains', async (req, res) => {
  try {
    const { email, domain } = req.body;
    
    if (!email || !domain) {
      return res.status(400).json({ 
        message: 'Email and domain are required',
        success: false 
      });
    }
    
    // Find user by email
    let user = await User.findOne({ email });
    
    if (!user) {
      // Create new user if not found
      user = new User({
        email,
        lastLogin: new Date(),
        isLoggedIn: true
      });
      await user.save();
    }
    
    // Check if domain already exists for this user
    let domainDoc = await Domain.findOne({
      user: user._id,
      name: domain
    });
    
    if (!domainDoc) {
      // Create new domain
      domainDoc = new Domain({
        name: domain,
        user: user._id,
        isActive: true
      });
      await domainDoc.save();
    } else if (!domainDoc.isActive) {
      // Reactivate if it exists but is inactive
      domainDoc.isActive = true;
      await domainDoc.save();
    }
    
    // Get all active domains for this user
    const domains = await Domain.find({
      user: user._id,
      isActive: true
    });
    
    res.status(201).json({ 
      message: 'Domain saved successfully', 
      domains: domains.map(d => d.name),
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
    
    // Find user by email
    const user = await User.findOne({ email });
    
    if (!user) {
      return res.status(200).json({ 
        domains: [],
        success: true
      });
    }
    
    // Get all active domains for this user
    const domains = await Domain.find({
      user: user._id,
      isActive: true
    });

    res.status(200).json({ 
      domains: domains.map(d => d.name),
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
    
    // Find user by email
    const user = await User.findOne({ email });
    
    if (!user) {
      return res.status(404).json({ 
        message: 'User not found', 
        success: false 
      });
    }

    // Find the domain and mark it as inactive (soft delete)
    await Domain.findOneAndUpdate(
      {
        user: user._id,
        name: domain
      },
      { isActive: false }
    );
    
    // Get all remaining active domains for this user
    const domains = await Domain.find({
      user: user._id,
      isActive: true
    });

    res.status(200).json({ 
      message: 'Domain deleted successfully', 
      domains: domains.map(d => d.name),
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

// Add route for updating domain (PUT)
app.put('/user/domains/:email/:domain', async (req, res) => {
  try {
    const { email, domain } = req.params;
    const { newDomain } = req.body;

    if (!email || !domain || !newDomain) {
      return res.status(400).json({ 
        message: 'Email, domain and newDomain are required', 
        success: false 
      });
    }
    
    // Find user by email
    const user = await User.findOne({ email });
    
    if (!user) {
      return res.status(404).json({ 
        message: 'User not found', 
        success: false 
      });
    }

    // Check if newDomain already exists for this user
    const existingDomain = await Domain.findOne({
      user: user._id,
      name: newDomain,
      isActive: true
    });

    if (existingDomain) {
      return res.status(400).json({ 
        message: 'Domain already exists', 
        success: false 
      });
    }

    // Update domain name
    await Domain.findOneAndUpdate(
      {
        user: user._id,
        name: domain
      },
      { name: newDomain }
    );
    
    // Get all active domains for this user
    const domains = await Domain.find({
      user: user._id,
      isActive: true
    });

    res.status(200).json({ 
      message: 'Domain updated successfully', 
      domains: domains.map(d => d.name),
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

// Domain test route for validation
app.post('/user/domains/test', async (req, res) => {
  try {
    const { domain } = req.body;
    
    if (!domain) {
      return res.status(400).json({ 
        message: 'Domain is required', 
        success: false 
      });
    }

    // Simple domain validation
    const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}$/;
    const isValid = domainRegex.test(domain);
    
    res.status(200).json({ 
      isValid,
      message: isValid ? 'Domain is valid' : 'Invalid domain format',
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

// Route for handling leads
// app.post('/leads', async (req, res) => {
//   try {
//     const { emails } = req.body;
    
//     if (!emails || !Array.isArray(emails)) {
//       return res.status(400).json({ 
//         message: 'Emails array is required', 
//         success: false 
//       });
//     }
    
//     const savedLeads = [];
    
//     // Process each email
//     for (const email of emails) {
//       if (email.subject && email.snippet) {
//         const lead = new Lead({
//           subject: email.subject,
//           content: email.snippet,
//           processedAt: new Date()
//         });
        
//         await lead.save();
//         savedLeads.push(lead);
//       }
//     }
    
//     res.status(201).json({
//       message: `Successfully processed ${savedLeads.length} leads`,
//       count: savedLeads.length,
//       success: true
//     });
//   } catch (err) {
//     console.error('Error processing leads:', err);
//     res.status(500).json({ 
//       message: 'Server error while processing leads', 
//       success: false 
//     });
//   }
// });

function extractLeadDetails(snippet) {
  const nameMatch = snippet.match(/name:\s*([^,]+)/i);
  const categoryMatch = snippet.match(/category:\s*([^,]+)/i);
  const dateMatch = snippet.match(/date:\s*([^,]+)/i);
  const phoneMatch = snippet.match(/phone:\s*([^,]+)/i);
  const emailMatch = snippet.match(/email:\s*([^,]+)/i);
  const budgetMatch = snippet.match(/budget:\s*([^,]+)/i);
  const sourceMatch = snippet.match(/source:\s*([^,]+)/i);

  let parsedDate = null;
  if (dateMatch && dateMatch[1]) {
    const [day, month, year] = dateMatch[1].trim().split('/');
    const fullYear = parseInt(year.length === 2 ? '20' + year : year);
    parsedDate = new Date(fullYear, parseInt(month) - 1, parseInt(day));
  }

  return {
    name: nameMatch?.[1]?.trim(),
    category: categoryMatch?.[1]?.trim(),
    date: parsedDate,
    phone: phoneMatch?.[1]?.trim(),
    email: emailMatch?.[1]?.trim(),
    budget: budgetMatch?.[1]?.trim(),
    source: sourceMatch?.[1]?.trim()
  };
}

app.post('/leads', async (req, res) => {
  try {
    const { emails } = req.body;

    if (!emails || !Array.isArray(emails)) {
      return res.status(400).json({
        message: 'Emails array is required',
        success: false
      });
    }

    const savedLeads = [];

    for (const email of emails) {
      if (email.subject && email.snippet) {
        console.log('Parsing snippet:', email.snippet);

        const leadData = extractLeadDetails(email.snippet);
        console.log('Parsed lead data:', leadData);

        if (!leadData.name || !leadData.category || !leadData.date) {
          console.warn('Skipping lead due to missing required fields.');
          continue;
        }

        // Find if this lead already exists
        const existingLead = await Lead.findOne({
          name: leadData.name,
          category: leadData.category,
          date: leadData.date
        });

        if (existingLead) {
          console.log(`Duplicate lead found, skipping: ${leadData.name} - ${leadData.category} - ${leadData.date}`);
          continue; // Skip this lead if it's a duplicate
        }

        // If no duplicate, insert into DB
        const lead = new Lead({
          name: leadData.name,
          category: leadData.category,
          date: leadData.date,
          phone: leadData.phone,
          email: leadData.email,
          budget: leadData.budget,
          source: leadData.source
        });

        await lead.save();
        savedLeads.push(lead);
      }
    }

    res.status(201).json({
      message: `Successfully processed ${savedLeads.length} leads`,
      count: savedLeads.length,
      success: true
    });
  } catch (err) {
    console.error('Error processing leads:', err);
    res.status(500).json({
      message: 'Server error while processing leads',
      success: false
    });
  }
});

// Get leads
app.get('/leads', async (req, res) => {
  try {
    const leads = await Lead.find()
      .sort({ processedAt: -1 })
      .limit(50);
    
    res.status(200).json({
      leads,
      success: true
    });
  } catch (err) {
    console.error('Error fetching leads:', err);
    res.status(500).json({ 
      message: 'Server error while fetching leads', 
      success: false 
    });
  }
});

app.post('/user/login', async (req, res) => {
  const { email } = req.body;
  try {
    await User.updateOne({ email }, { $set: { isLoggedIn: true } });
    res.json({ success: true });
  } catch (err) {
    console.error('Error updating login status:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

app.post('/user/logout', async (req, res) => {
  const { email } = req.body;
  try {
    await User.updateOne({ email }, { $set: { isLoggedIn: false } });
    res.json({ success: true });
  } catch (err) {
    console.error('Error updating logout status:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

app.delete('/leads/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const deletedLead = await Lead.findByIdAndDelete(id);

    if (!deletedLead) {
      return res.status(404).json({
        message: 'Lead not found',
        success: false
      });
    }

    res.status(200).json({
      message: 'Lead deleted successfully',
      success: true
    });
  } catch (err) {
    console.error('Error deleting lead:', err);
    res.status(500).json({
      message: 'Server error while deleting lead',
      success: false
    });
  }
});

// Health check route
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date() });
});

// Initialize the cron job
initializeEmailScrapingCron();

// Start the server
const PORT = process.env.PORT || 8083;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;