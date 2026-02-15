const express = require('express');
const cors = require('cors');
const { 
  advancedSubdomainDiscovery,
  aiPoweredRecon 
} = require('./utils/advancedTechniques');
const { findSensitiveData } = require('./utils/sensitiveDataFinder');
const { analyzeWithAI } = require('./utils/aiAnalyzer');

const app = express();
app.use(cors());
app.use(express.json());

// Queue system for handling multiple requests
const Queue = require('bull');
const redisConfig = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
const reconQueue = new Queue('recon', redisConfig);

app.post('/api/recon', async (req, res) => {
  try {
    const { domain, options = {} } = req.body;
    
    if (!domain) {
      return res.status(400).json({ error: 'Domain is required' });
    }

    // Start reconnaissance job
    const job = await reconQueue.add({
      domain,
      options: {
        deepScan: options.deepScan || true,
        useAI: options.useAI || true,
        aggressive: options.aggressive || false,
        maxSubdomains: options.maxSubdomains || 1000,
        timeout: options.timeout || 300000
      }
    });

    res.json({ 
      jobId: job.id,
      status: 'started',
      message: 'Reconnaissance job queued successfully'
    });

  } catch (error) {
    console.error('Recon error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/recon/:jobId', async (req, res) => {
  const job = await reconQueue.getJob(req.params.jobId);
  
  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }

  const state = await job.getState();
  const progress = job.progress();
  const result = job.returnvalue;

  res.json({
    jobId: job.id,
    state,
    progress,
    result
  });
});

// Process jobs
reconQueue.process(async (job) => {
  const { domain, options } = job.data;
  
  try {
    // Update progress
    job.progress(10);
    
    // Step 1: Advanced subdomain discovery
    const subdomains = await advancedSubdomainDiscovery(domain, options);
    job.progress(40);
    
    // Step 2: Find sensitive data
    const sensitiveData = await findSensitiveData(domain, subdomains);
    job.progress(70);
    
    // Step 3: AI analysis
    const aiAnalysis = options.useAI ? await analyzeWithAI(domain, subdomains, sensitiveData) : null;
    job.progress(90);
    
    // Step 4: Generate report
    const report = {
      domain,
      timestamp: new Date().toISOString(),
      stats: {
        totalSubdomains: subdomains.length,
        liveSubdomains: subdomains.filter(s => s.isLive).length,
        sensitiveFindings: sensitiveData.length,
        vulnerabilities: aiAnalysis?.vulnerabilities?.length || 0
      },
      subdomains,
      sensitiveData,
      aiAnalysis,
      recommendations: aiAnalysis?.recommendations || []
    };
    
    job.progress(100);
    return report;
    
  } catch (error) {
    console.error('Job processing error:', error);
    throw error;
  }
});

module.exports = app;
