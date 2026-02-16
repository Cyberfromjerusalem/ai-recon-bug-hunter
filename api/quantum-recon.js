const express = require('express');
const cors = require('cors');
const path = require('path');
const crypto = require('crypto');

const app = express();
app.use(cors());
app.use(express.json());

// Simple in-memory storage
const scanResults = new Map();

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Main scan endpoint
app.post('/api/quantum-recon', async (req, res) => {
  try {
    const { domain } = req.body;
    
    if (!domain) {
      return res.status(400).json({ error: 'Domain is required' });
    }

    console.log(`Scanning domain: ${domain}`);
    
    // Generate mock data for demonstration
    const subdomains = [];
    const technologies = ['nginx', 'apache', 'node.js', 'react', 'python'];
    const statusCodes = [200, 301, 302, 403, 404];
    
    // Generate 15-30 random subdomains
    const count = Math.floor(Math.random() * 15) + 15;
    
    for (let i = 0; i < count; i++) {
      const isLive = Math.random() > 0.3;
      const techCount = Math.floor(Math.random() * 3);
      const subTechs = [];
      
      for (let j = 0; j < techCount; j++) {
        subTechs.push({
          name: technologies[Math.floor(Math.random() * technologies.length)],
          category: ['server', 'framework'][Math.floor(Math.random() * 2)]
        });
      }
      
      subdomains.push({
        subdomain: `${generateSubdomain()}.${domain}`,
        isLive: isLive,
        ips: isLive ? [generateIP()] : [],
        statusCode: isLive ? statusCodes[Math.floor(Math.random() * statusCodes.length)] : null,
        server: isLive ? technologies[Math.floor(Math.random() * technologies.length)] : null,
        technologies: subTechs,
        responseTime: isLive ? Math.floor(Math.random() * 300) + 50 : null
      });
    }
    
    // Generate some sensitive data findings
    const sensitiveData = [];
    const sensitiveTypes = ['api_key', 'password', 'email'];
    const severities = ['low', 'medium', 'high'];
    
    for (let i = 0; i < Math.floor(Math.random() * 5); i++) {
      sensitiveData.push({
        type: 'sensitive_file',
        subdomain: subdomains[Math.floor(Math.random() * subdomains.length)].subdomain,
        path: `/${generateRandomString(6)}.env`,
        pattern: sensitiveTypes[Math.floor(Math.random() * sensitiveTypes.length)],
        matches: [crypto.randomBytes(8).toString('hex')],
        severity: severities[Math.floor(Math.random() * severities.length)]
      });
    }
    
    const results = {
      domain,
      timestamp: new Date().toISOString(),
      stats: {
        totalSubdomains: subdomains.length,
        liveSubdomains: subdomains.filter(s => s.isLive).length,
        sensitiveFindings: sensitiveData.length
      },
      subdomains,
      sensitiveData,
      measurements: Array(10).fill().map(() => ({
        value: Math.random(),
        certainty: Math.random()
      }))
    };
    
    // Store results
    const jobId = crypto.randomBytes(8).toString('hex');
    scanResults.set(jobId, results);
    
    res.json(results);
    
  } catch (error) {
    console.error('Scan error:', error);
    res.status(500).json({ 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Helper functions
function generateSubdomain() {
  const prefixes = ['api', 'dev', 'stage', 'test', 'admin', 'mail', 'blog', 'shop', 'app'];
  const random = Math.floor(Math.random() * 100);
  return `${prefixes[Math.floor(Math.random() * prefixes.length)]}${random}`;
}

function generateIP() {
  return `${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}`;
}

function generateRandomString(length) {
  return crypto.randomBytes(length).toString('hex').substring(0, length);
}

// Serve static frontend files
app.use(express.static(path.join(__dirname, '../frontend')));

// Catch-all route to serve frontend
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/holodeck.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
});

module.exports = app;
