const axios = require('axios');
const cheerio = require('cheerio');

async function findSensitiveData(domain, subdomains) {
  const findings = [];
  const patterns = {
    email: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
    phone: /(\+\d{1,3}[-.]?)?\(?\d{3}\)?[-.]?\d{3}[-.]?\d{4}/g,
    ssn: /\d{3}-\d{2}-\d{4}/g,
    creditCard: /\b(?:\d[ -]*?){13,16}\b/g,
    apiKey: /api[_-]?key[_-]?[:=]\s*['"]?([a-zA-Z0-9]{16,64})['"]?/gi,
    awsKey: /AKIA[0-9A-Z]{16}/g,
    googleApi: /AIza[0-9A-Za-z-_]{35}/g,
    facebookToken: /EAACEdEose0cBA[0-9A-Za-z]+/g,
    githubToken: /ghp_[a-zA-Z0-9]{36}/g,
    jwtToken: /eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/g,
    password: /password[=:]["']?([^"'\s]+)/gi,
    secret: /secret[=:]["']?([^"'\s]+)/gi,
    token: /token[=:]["']?([^"'\s]+)/gi,
    dbConnection: /(mongodb|postgresql|mysql|redis):\/\/[^\s]+/g,
    privateKey: /-----BEGIN (RSA|DSA|EC|OPENSSH) PRIVATE KEY-----/g,
    slackToken: /xox[baprs]-[0-9a-zA-Z]{10,48}/g,
    stripeKey: /sk_live_[0-9a-zA-Z]{24}/g,
    twilioKey: /SK[0-9a-f]{32}/g
  };

  const sensitivePaths = [
    '/.env', '/.git/config', '/.aws/credentials', '/.npmrc',
    '/.ssh/id_rsa', '/config.json', '/credentials.json',
    '/wp-config.php', '/configuration.php', '/settings.py',
    '/database.yml', '/application.properties', '/secrets.yml',
    '/.htaccess', '/.htpasswd', '/web.config', '/robots.txt',
    '/sitemap.xml', '/crossdomain.xml', '/clientaccesspolicy.xml',
    '/phpinfo.php', '/info.php', '/test.php', '/backup.sql',
    '/dump.sql', '/db.sql', '/database.sql', '/backup.tar.gz',
    '/backup.zip', '/.DS_Store', '/Thumbs.db', '/.log', '/logs/',
    '/swagger.json', '/swagger.yaml', '/openapi.json', '/api-docs',
    '/graphql', '/graphiql', '/playground', '/voyager',
    '/.well-known/security.txt', '/.well-known/openid-configuration'
  ];

  // Scan each subdomain
  for (const sub of subdomains) {
    if (!sub.isLive) continue;
    
    try {
      // Check sensitive paths
      for (const path of sensitivePaths) {
        try {
          const url = `https://${sub.subdomain}${path}`;
          const response = await axios.get(url, {
            timeout: 3000,
            validateStatus: false
          });
          
          if (response.status === 200 && response.data) {
            // Check for sensitive patterns in response
            for (const [type, pattern] of Object.entries(patterns)) {
              const matches = JSON.stringify(response.data).match(pattern);
              if (matches) {
                findings.push({
                  type: 'sensitive_file',
                  subdomain: sub.subdomain,
                  path,
                  pattern: type,
                  matches: matches.slice(0, 5),
                  url,
                  severity: 'high'
                });
              }
            }
          }
        } catch (error) {}
      }
      
      // Scan HTML content
      const response = await axios.get(`https://${sub.subdomain}`, {
        timeout: 5000,
        validateStatus: false,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      
      const $ = cheerio.load(response.data);
      
      // Check comments
      $('*').contents().each((i, el) => {
        if (el.type === 'comment') {
          const comment = el.data;
          for (const [type, pattern] of Object.entries(patterns)) {
            const matches = comment.match(pattern);
            if (matches) {
              findings.push({
                type: 'html_comment',
                subdomain: sub.subdomain,
                pattern: type,
                matches: matches.slice(0, 3),
                context: comment.substring(0, 200),
                severity: 'medium'
              });
            }
          }
        }
      });
      
      // Check script tags for API keys
      $('script').each((i, el) => {
        const content = $(el).html();
        if (content) {
          for (const [type, pattern] of Object.entries(patterns)) {
            const matches = content.match(pattern);
            if (matches) {
              findings.push({
                type: 'javascript',
                subdomain: sub.subdomain,
                pattern: type,
                matches: matches.slice(0, 3),
                severity: 'high'
              });
            }
          }
        }
      });
      
      // Check meta tags
      $('meta').each((i, el) => {
        const content = $(el).attr('content');
        if (content) {
          for (const [type, pattern] of Object.entries(patterns)) {
            const matches = content.match(pattern);
            if (matches) {
              findings.push({
                type: 'meta_tag',
                subdomain: sub.subdomain,
                pattern: type,
                matches: matches.slice(0, 3),
                severity: 'medium'
              });
            }
          }
        }
      });
      
    } catch (error) {}
  }
  
  return findings;
}

module.exports = { findSensitiveData };
