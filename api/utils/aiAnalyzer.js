const OpenAI = require('openai');

async function analyzeWithAI(domain, subdomains, sensitiveData) {
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
  });

  try {
    const prompt = `
    Analyze this reconnaissance data for ${domain}:
    
    Subdomains found: ${subdomains.length}
    Live subdomains: ${subdomains.filter(s => s.isLive).length}
    
    Top subdomains:
    ${subdomains.slice(0, 10).map(s => `- ${s.subdomain} (${s.technologies?.map(t => t.name).join(', ') || 'unknown'})`).join('\n')}
    
    Sensitive findings: ${sensitiveData.length}
    ${sensitiveData.slice(0, 10).map(f => `- ${f.type}: ${f.pattern} at ${f.subdomain}${f.path || ''}`).join('\n')}
    
    Based on this data, provide:
    1. Security risk assessment
    2. Potential vulnerabilities
    3. Recommended actions
    4. Priority findings
    5. Attack surface analysis
    `;

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { role: "system", content: "You are a security expert analyzing reconnaissance data. Provide detailed, actionable insights." },
        { role: "user", content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 2000
    });

    return {
      analysis: completion.choices[0].message.content,
      vulnerabilities: extractVulnerabilities(completion.choices[0].message.content),
      recommendations: extractRecommendations(completion.choices[0].message.content),
      riskScore: calculateRiskScore(subdomains, sensitiveData)
    };
  } catch (error) {
    console.error('AI analysis error:', error);
    return null;
  }
}

function extractVulnerabilities(analysis) {
  // Parse vulnerabilities from AI response
  const vulnerabilities = [];
  const lines = analysis.split('\n');
  
  lines.forEach(line => {
    if (line.toLowerCase().includes('vulnerab') || line.toLowerCase().includes('risk')) {
      vulnerabilities.push(line.trim());
    }
  });
  
  return vulnerabilities;
}

function extractRecommendations(analysis) {
  // Parse recommendations from AI response
  const recommendations = [];
  const lines = analysis.split('\n');
  
  lines.forEach(line => {
    if (line.toLowerCase().includes('recommend') || line.toLowerCase().includes('should')) {
      recommendations.push(line.trim());
    }
  });
  
  return recommendations;
}

function calculateRiskScore(subdomains, sensitiveData) {
  let score = 0;
  
  // Base score from subdomains
  score += subdomains.length * 2;
  
  // Live subdomains increase risk
  score += subdomains.filter(s => s.isLive).length * 5;
  
  // Sensitive data findings
  score += sensitiveData.length * 10;
  
  // High severity findings
  score += sensitiveData.filter(f => f.severity === 'high').length * 20;
  
  // Normalize to 0-100
  return Math.min(100, score);
}

module.exports = { analyzeWithAI };
