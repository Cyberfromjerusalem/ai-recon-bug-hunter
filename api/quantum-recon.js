const express = require('express');
const cors = require('cors');
const dns = require('dns').promises;
const https = require('https');
const http = require('http');

const app = express();
app.use(cors());
app.use(express.json());

// REAL subdomain wordlist - common prefixes
const SUBDOMAIN_WORDLIST = [
    'www', 'mail', 'remote', 'blog', 'webmail', 'server', 'ns1', 'ns2', 
    'smtp', 'secure', 'vpn', 'admin', 'portal', 'support', 'pop', 'pop3',
    'ftp', 'ssh', 'exchange', 'mail2', 'gw', 'proxy', 'test', 'dev',
    'staging', 'stage', 'beta', 'shop', 'store', 'api', 'app', 'demo',
    'media', 'cdn', 'static', 'assets', 'images', 'img', 'video',
    'download', 'downloads', 'files', 'file', 'upload', 'uploads',
    'forum', 'community', 'chat', 'help', 'docs', 'documentation',
    'wiki', 'kb', 'knowledge', 'faq', 'status', 'health', 'monitor',
    'monitoring', 'stats', 'statistics', 'analytics', 'metrics',
    'logs', 'log', 'debug', 'trace', 'internal', 'external',
    'public', 'private', 'auth', 'login', 'signin', 'signup',
    'register', 'account', 'accounts', 'user', 'users', 'profile',
    'profiles', 'member', 'members', 'customer', 'customers',
    'client', 'clients', 'partner', 'partners', 'vendor', 'vendors',
    'backup', 'backups', 'archive', 'archives', 'old', 'new',
    'temp', 'tmp', 'cache', 'cached', 'storage', 'staging',
    'preview', 'preprod', 'production', 'prod', 'development',
    'sandbox', 'playground', 'lab', 'labs', 'testlab',
    'jenkins', 'git', 'github', 'gitlab', 'bitbucket', 'jira',
    'confluence', 'wiki', 'redmine', 'trac', 'bugzilla',
    'phpmyadmin', 'adminer', 'mysql', 'phpadmin', 'pma',
    'webmin', 'cpanel', 'whm', 'plesk', 'vesta', 'ajenti',
    'mailcow', 'rainloop', 'roundcube', 'squirrelmail',
    'openwebmail', 'horde', 'trac', 'svn', 'cvs', 'gitweb',
    'kibana', 'elastic', 'logstash', 'grafana', 'prometheus',
    'zabbix', 'nagios', 'icinga', 'munin', 'cacti',
    'phpmyadmin', 'adminer', 'mysql', 'phpadmin', 'pma',
    'redis', 'memcache', 'memcached', 'mongodb', 'mongod',
    'rabbitmq', 'mq', 'activemq', 'kafka', 'zookeeper',
    'docker', 'k8s', 'kubernetes', 'swarm', 'rancher',
    'jenkins', 'travis', 'circleci', 'drone', 'gitlab-ci',
    'sonar', 'sonarqube', 'nexus', 'artifactory', 'harbor'
];

// Helper function to check if subdomain resolves
async function checkSubdomain(subdomain) {
    try {
        const addresses = await dns.resolve4(subdomain);
        return {
            exists: true,
            ips: addresses,
            type: 'A'
        };
    } catch (error) {
        try {
            const addresses = await dns.resolve6(subdomain);
            return {
                exists: true,
                ips: addresses,
                type: 'AAAA'
            };
        } catch (error) {
            return { exists: false };
        }
    }
}

// Helper function to check HTTP/HTTPS
async function checkHTTP(subdomain) {
    const results = { http: null, https: null };
    
    // Check HTTPS first
    try {
        const httpsResult = await new Promise((resolve) => {
            const req = https.get(`https://${subdomain}`, {
                timeout: 3000,
                headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ReconBot/1.0)' }
            }, (res) => {
                resolve({
                    statusCode: res.statusCode,
                    headers: res.headers,
                    responseTime: Date.now() - startTime
                });
            }).on('error', () => resolve(null));
            
            const startTime = Date.now();
            req.setTimeout(3000, () => {
                req.destroy();
                resolve(null);
            });
        });
        results.https = httpsResult;
    } catch (error) {
        results.https = null;
    }
    
    // Check HTTP if HTTPS failed or for comparison
    try {
        const httpResult = await new Promise((resolve) => {
            const req = http.get(`http://${subdomain}`, {
                timeout: 3000,
                headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ReconBot/1.0)' }
            }, (res) => {
                resolve({
                    statusCode: res.statusCode,
                    headers: res.headers,
                    responseTime: Date.now() - startTime
                });
            }).on('error', () => resolve(null));
            
            const startTime = Date.now();
            req.setTimeout(3000, () => {
                req.destroy();
                resolve(null);
            });
        });
        results.http = httpResult;
    } catch (error) {
        results.http = null;
    }
    
    return results;
}

// Main scan endpoint
app.post('/api/quantum-recon', async (req, res) => {
    const startTime = Date.now();
    
    try {
        let { domain } = req.body;
        
        if (!domain) {
            return res.status(400).json({ error: 'Domain is required' });
        }
        
        // Clean domain
        domain = domain.toLowerCase().trim();
        console.log(`\n🔍 Scanning domain: ${domain}`);
        
        const results = {
            domain,
            timestamp: new Date().toISOString(),
            scanTime: 0,
            stats: {
                total: 0,
                live: 0,
                dead: 0,
                withHttp: 0,
                withHttps: 0
            },
            subdomains: []
        };
        
        // Check main domain first
        console.log(`Checking main domain: ${domain}`);
        const mainCheck = await checkSubdomain(domain);
        if (mainCheck.exists) {
            const httpCheck = await checkHTTP(domain);
            const isLive = httpCheck.https !== null || httpCheck.http !== null;
            
            results.subdomains.push({
                subdomain: domain,
                isLive,
                ips: mainCheck.ips,
                dnsType: mainCheck.type,
                https: httpCheck.https ? {
                    statusCode: httpCheck.https.statusCode,
                    responseTime: httpCheck.https.responseTime
                } : null,
                http: httpCheck.http ? {
                    statusCode: httpCheck.http.statusCode,
                    responseTime: httpCheck.http.responseTime
                } : null,
                technologies: [] // Could add tech detection later
            });
            
            results.stats.total++;
            if (isLive) results.stats.live++;
            else results.stats.dead++;
            if (httpCheck.https) results.stats.withHttps++;
            if (httpCheck.http) results.stats.withHttp++;
            
            console.log(`✅ Main domain resolved: ${domain} -> ${mainCheck.ips.join(', ')}`);
        }
        
        // Check common subdomains
        console.log(`\nChecking ${SUBDOMAIN_WORDLIST.length} common subdomains...`);
        
        for (let i = 0; i < SUBDOMAIN_WORDLIST.length; i++) {
            const sub = SUBDOMAIN_WORDLIST[i];
            const subdomain = `${sub}.${domain}`;
            
            // Show progress every 10 checks
            if (i % 10 === 0) {
                console.log(`Progress: ${i}/${SUBDOMAIN_WORDLIST.length} (${Math.round(i/SUBDOMAIN_WORDLIST.length*100)}%)`);
            }
            
            try {
                const dnsCheck = await checkSubdomain(subdomain);
                
                if (dnsCheck.exists) {
                    const httpCheck = await checkHTTP(subdomain);
                    const isLive = httpCheck.https !== null || httpCheck.http !== null;
                    
                    results.subdomains.push({
                        subdomain,
                        isLive,
                        ips: dnsCheck.ips,
                        dnsType: dnsCheck.type,
                        https: httpCheck.https ? {
                            statusCode: httpCheck.https.statusCode,
                            responseTime: httpCheck.https.responseTime
                        } : null,
                        http: httpCheck.http ? {
                            statusCode: httpCheck.http.statusCode,
                            responseTime: httpCheck.http.responseTime
                        } : null,
                        technologies: []
                    });
                    
                    results.stats.total++;
                    if (isLive) results.stats.live++;
                    else results.stats.dead++;
                    if (httpCheck.https) results.stats.withHttps++;
                    if (httpCheck.http) results.stats.withHttp++;
                    
                    console.log(`✅ Found: ${subdomain} -> ${dnsCheck.ips.join(', ')} ${isLive ? '(LIVE)' : '(DNS only)'}`);
                }
            } catch (error) {
                // Individual subdomain errors are ignored
                continue;
            }
        }
        
        results.scanTime = Date.now() - startTime;
        
        console.log(`\n✨ Scan complete! Found ${results.stats.total} subdomains (${results.stats.live} live) in ${results.scanTime}ms`);
        
        res.json(results);
        
    } catch (error) {
        console.error('Scan error:', error);
        res.status(500).json({ 
            error: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        wordlistSize: SUBDOMAIN_WORDLIST.length
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 REAL Subdomain Scanner running on port ${PORT}`);
    console.log(`📡 Testing with: http://localhost:${PORT}/api/health`);
    console.log(`🔍 Wordlist size: ${SUBDOMAIN_WORDLIST.length} subdomains`);
});

module.exports = app;
