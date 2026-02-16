const express = require('express');
const cors = require('cors');
const dns = require('dns').promises;
const https = require('https');
const http = require('http');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

const app = express();
app.use(cors());
app.use(express.json());

// ==================== AI-POWERED SUBDOMAIN DISCOVERY ====================
class AISubdomainDiscovery {
    constructor() {
        this.commonPrefixes = [
            'api', 'dev', 'stage', 'prod', 'test', 'admin', 'portal', 'secure',
            'cloud', 'edge', 'cdn', 'assets', 'static', 'media', 'files', 'uploads',
            'auth', 'login', 'sso', 'identity', 'accounts', 'user', 'profile',
            'payment', 'billing', 'checkout', 'cart', 'orders', 'transactions',
            'dashboard', 'analytics', 'metrics', 'stats', 'monitoring', 'logs',
            'search', 'discovery', 'catalog', 'products', 'services', 'content',
            'graphql', 'rest', 'soap', 'rpc', 'websocket', 'mqtt', 'amqp',
            'database', 'mysql', 'postgres', 'mongodb', 'redis', 'elastic',
            'jenkins', 'gitlab', 'jira', 'confluence', 'wiki', 'docs',
            'mail', 'smtp', 'imap', 'pop3', 'exchange', 'outlook',
            'vpn', 'remote', 'access', 'gateway', 'proxy', 'tunnel',
            'backup', 'archive', 'storage', 'snapshot', 'recovery',
            'staging', 'sandbox', 'demo', 'beta', 'alpha', 'preview',
            'internal', 'corp', 'corporate', 'employee', 'staff',
            'partner', 'vendor', 'supplier', 'distributor', 'reseller',
            'legacy', 'old', 'deprecated', 'archived', 'migrated'
        ];

        this.aiGenerated = this.generateAIPatterns();
    }

    generateAIPatterns() {
        // AI-generated patterns based on real-world data
        return [
            // Developer patterns
            'dev-', 'test-', 'stage-', 'prod-', 'staging-', 'development-',
            // Number patterns
            'v1', 'v2', 'v3', 'api1', 'api2', 'api3',
            // Cloud patterns
            'aws-', 'azure-', 'gcp-', 'cloud-', 'k8s-', 'kubernetes-',
            // Security patterns
            'secure-', 'security-', 'auth-', 'identity-', 'sso-',
            // Data patterns
            'data-', 'db-', 'database-', 'cache-', 'redis-',
            // Random word combinations
            'secret-', 'hidden-', 'private-', 'internal-', 'corp-',
            // Year patterns
            '2023', '2024', '2025', '2026', '2027',
            // Common misspellings
            'admn', 'admim', 'dmin', 'admni', 'amdmin',
            'devl', 'devel', 'devop', 'devops',
            'stag', 'stge', 'stg', 'stagingg',
            'produ', 'prodct', 'product', 'production',
            // Hidden services
            'pma', 'phpmyadmin', 'adminer', 'mysql-admin',
            'webmin', 'cpanel', 'whm', 'plesk',
            'rabbitmq', 'kafka', 'zookeeper',
            'grafana', 'prometheus', 'kibana', 'elasticsearch',
            'jenkins', 'sonar', 'nexus', 'artifactory',
            'gitlab', 'github', 'bitbucket', 'gitea',
            'jira', 'confluence', 'wiki', 'redmine',
            'mailhog', 'mailcatcher', 'maildev',
            'swagger', 'api-docs', 'docs-api', 'apidocs',
            'graphql', 'graphiql', 'playground',
            'metrics', 'stats', 'monitor', 'status'
        ];
    }

    async discover(domain) {
        const discoveries = new Set();
        
        // Add main domain
        discoveries.add(domain);
        
        // Add common prefixes
        this.commonPrefixes.forEach(prefix => {
            discoveries.add(`${prefix}.${domain}`);
        });

        // Add AI-generated patterns
        this.aiGenerated.forEach(pattern => {
            if (pattern.includes('-')) {
                discoveries.add(`${pattern}${domain}`);
            } else {
                discoveries.add(`${pattern}.${domain}`);
            }
        });

        // Add combinations
        this.commonPrefixes.forEach(prefix => {
            this.aiGenerated.slice(0, 20).forEach(suffix => {
                if (!suffix.includes('-')) {
                    discoveries.add(`${prefix}-${suffix}.${domain}`);
                    discoveries.add(`${suffix}-${prefix}.${domain}`);
                }
            });
        });

        return Array.from(discoveries);
    }
}

// ==================== SENSITIVE DATA DETECTOR ====================
class SensitiveDataDetector {
    constructor() {
        this.patterns = {
            // API Keys & Tokens
            apiKey: /api[_-]?key[_-]?[:=]\s*['"]?([a-zA-Z0-9]{16,64})['"]?/gi,
            awsKey: /AKIA[0-9A-Z]{16}/g,
            googleApi: /AIza[0-9A-Za-z-_]{35}/g,
            facebookToken: /EAACEdEose0cBA[0-9A-Za-z]+/g,
            githubToken: /ghp_[a-zA-Z0-9]{36}/g,
            slackToken: /xox[baprs]-[0-9a-zA-Z]{10,48}/g,
            stripeKey: /sk_live_[0-9a-zA-Z]{24}/g,
            twilioKey: /SK[0-9a-f]{32}/g,
            
            // Authentication
            jwtToken: /eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/g,
            password: /password[=:]["']?([^"'\s]+)/gi,
            secret: /secret[=:]["']?([^"'\s]+)/gi,
            token: /token[=:]["']?([^"'\s]+)/gi,
            
            // Database
            dbConnection: /(mongodb|postgresql|mysql|redis):\/\/[^\s]+/g,
            mongoConnection: /mongodb(?:\+srv)?:\/\/[^\s]+/g,
            mysqlConnection: /mysql:\/\/[^\s]+/g,
            
            // Private Keys
            privateKey: /-----BEGIN (RSA|DSA|EC|OPENSSH) PRIVATE KEY-----/g,
            sshKey: /ssh-(rsa|dss|ed25519) [A-Za-z0-9+\/=]+/g,
            
            // Cloud
            s3Bucket: /[a-zA-Z0-9.-]+\.s3\.amazonaws\.com/g,
            azureStorage: /[a-zA-Z0-9]+\.blob\.core\.windows\.net/g,
            gcpBucket: /[a-zA-Z0-9.-]+\.storage\.googleapis\.com/g,
            
            // Personal Data
            email: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
            phone: /(\+\d{1,3}[-.]?)?\(?\d{3}\)?[-.]?\d{3}[-.]?\d{4}/g,
            ssn: /\d{3}-\d{2}-\d{4}/g,
            creditCard: /\b(?:\d[ -]*?){13,16}\b/g,
            
            // Internal Paths
            internalPath: /(\/var\/|\/etc\/|\/usr\/|\/home\/|\/root\/|\/opt\/)/g,
            windowsPath: /[A-Z]:\\(?:[^\\]+\\)*[^\\]+/g,
            
            // Configuration
            envVar: /([A-Z_]+)=['"]?([^'"]+)['"]?/g,
            xmlConfig: /<[^>]+>[^<]*<\/[^>]+>/g,
            jsonConfig: /{[^}]*"[^"]+"[^}]*}/g
        };

        this.sensitivePaths = [
            '/.env', '/.env.local', '/.env.production', '/.env.development',
            '/.git/config', '/.git/HEAD', '/.git/index',
            '/.aws/credentials', '/.aws/config',
            '/.npmrc', '/.yarnrc', '/.pypirc',
            '/.ssh/id_rsa', '/.ssh/id_dsa', '/.ssh/authorized_keys',
            '/composer.json', '/package.json', '/Gemfile', '/requirements.txt',
            '/wp-config.php', '/configuration.php', '/settings.py',
            '/database.yml', '/application.properties', '/secrets.yml',
            '/.htaccess', '/.htpasswd', '/web.config',
            '/robots.txt', '/sitemap.xml', '/crossdomain.xml',
            '/phpinfo.php', '/info.php', '/test.php', '/php.php',
            '/backup.sql', '/dump.sql', '/db.sql', '/database.sql',
            '/backup.zip', '/backup.tar.gz', '/backup.tgz',
            '/.DS_Store', '/Thumbs.db', '/.directory',
            '/swagger.json', '/swagger.yaml', '/openapi.json', '/api-docs',
            '/graphql', '/graphiql', '/playground', '/voyager',
            '/.well-known/security.txt', '/.well-known/openid-configuration',
            '/server-status', '/server-info', '/status', '/metrics',
            '/actuator', '/actuator/health', '/actuator/info', '/actuator/env',
            '/console', '/h2-console', '/h2', '/h2-console/login.jsp'
        ];
    }

    async scanUrl(url, content) {
        const findings = [];
        
        // Check each pattern
        for (const [type, pattern] of Object.entries(this.patterns)) {
            const matches = content.match(pattern);
            if (matches) {
                findings.push({
                    type: 'pattern_match',
                    pattern: type,
                    matches: matches.slice(0, 5), // Limit to 5 matches
                    confidence: this.calculateConfidence(type, matches),
                    severity: this.getSeverity(type)
                });
            }
        }
        
        return findings;
    }

    calculateConfidence(type, matches) {
        // Higher confidence for certain patterns
        const highConfidence = ['awsKey', 'privateKey', 'sshKey', 'creditCard'];
        const mediumConfidence = ['jwtToken', 'apiKey', 'dbConnection'];
        
        if (highConfidence.includes(type)) return 0.95;
        if (mediumConfidence.includes(type)) return 0.85;
        return 0.75;
    }

    getSeverity(type) {
        const critical = ['privateKey', 'sshKey', 'awsKey', 'creditCard'];
        const high = ['jwtToken', 'apiKey', 'password', 'dbConnection'];
        const medium = ['email', 'phone', 'ssn', 'token'];
        
        if (critical.includes(type)) return 'CRITICAL';
        if (high.includes(type)) return 'HIGH';
        if (medium.includes(type)) return 'MEDIUM';
        return 'LOW';
    }
}

// ==================== TECHNOLOGY DETECTOR ====================
class TechnologyDetector {
    async detect(headers, body, url) {
        const technologies = [];
        const headerTechs = this.detectFromHeaders(headers);
        const bodyTechs = this.detectFromBody(body);
        const urlTechs = this.detectFromUrl(url);
        
        return [...new Set([...headerTechs, ...bodyTechs, ...urlTechs])];
    }

    detectFromHeaders(headers) {
        const techs = [];
        
        // Server header
        if (headers.server) {
            techs.push({ name: headers.server, category: 'server', source: 'header' });
        }
        
        // X-Powered-By
        if (headers['x-powered-by']) {
            techs.push({ name: headers['x-powered-by'], category: 'framework', source: 'header' });
        }
        
        // CF-Ray (Cloudflare)
        if (headers['cf-ray']) {
            techs.push({ name: 'Cloudflare', category: 'cdn', source: 'header' });
        }
        
        // AWS
        if (headers['x-amz-request-id']) {
            techs.push({ name: 'AWS', category: 'cloud', source: 'header' });
        }
        
        // Azure
        if (headers['x-azure-ref']) {
            techs.push({ name: 'Azure', category: 'cloud', source: 'header' });
        }
        
        return techs;
    }

    detectFromBody(body) {
        const techs = [];
        
        // WordPress
        if (body.includes('wp-content') || body.includes('wp-includes')) {
            techs.push({ name: 'WordPress', category: 'cms', source: 'body' });
        }
        
        // Laravel
        if (body.includes('csrf-token') && body.includes('laravel')) {
            techs.push({ name: 'Laravel', category: 'framework', source: 'body' });
        }
        
        // Next.js
        if (body.includes('__next') || body.includes('next-data')) {
            techs.push({ name: 'Next.js', category: 'framework', source: 'body' });
        }
        
        // React
        if (body.includes('react-root') || body.includes('react-dom')) {
            techs.push({ name: 'React', category: 'library', source: 'body' });
        }
        
        // Vue.js
        if (body.includes('vue-app') || body.includes('vue-ssr')) {
            techs.push({ name: 'Vue.js', category: 'library', source: 'body' });
        }
        
        // Angular
        if (body.includes('angular-') || body.includes('ng-')) {
            techs.push({ name: 'Angular', category: 'framework', source: 'body' });
        }
        
        // jQuery
        if (body.includes('jquery') || body.includes('jQuery')) {
            techs.push({ name: 'jQuery', category: 'library', source: 'body' });
        }
        
        // Bootstrap
        if (body.includes('bootstrap') || body.includes('Bootstrap')) {
            techs.push({ name: 'Bootstrap', category: 'framework', source: 'body' });
        }
        
        return techs;
    }

    detectFromUrl(url) {
        const techs = [];
        
        if (url.includes('graphql')) {
            techs.push({ name: 'GraphQL', category: 'api', source: 'url' });
        }
        
        if (url.includes('swagger') || url.includes('api-docs')) {
            techs.push({ name: 'Swagger/OpenAPI', category: 'api', source: 'url' });
        }
        
        if (url.includes('wp-') || url.includes('wordpress')) {
            techs.push({ name: 'WordPress', category: 'cms', source: 'url' });
        }
        
        return techs;
    }
}

// ==================== MAIN SCANNER ====================
class AIReconScanner {
    constructor() {
        this.subdomainDiscovery = new AISubdomainDiscovery();
        this.sensitiveData = new SensitiveDataDetector();
        this.techDetector = new TechnologyDetector();
    }

    async checkSubdomain(subdomain) {
        try {
            const addresses = await dns.resolve4(subdomain).catch(() => []);
            const addresses6 = await dns.resolve6(subdomain).catch(() => []);
            const allAddresses = [...addresses, ...addresses6];
            
            if (allAddresses.length === 0) return null;
            
            return {
                exists: true,
                ips: allAddresses
            };
        } catch (error) {
            return null;
        }
    }

    async checkHTTP(subdomain, timeout = 5000) {
        const results = { https: null, http: null };
        
        // Check HTTPS
        try {
            const httpsResult = await this.makeRequest(`https://${subdomain}`, timeout);
            if (httpsResult) results.https = httpsResult;
        } catch (error) {}
        
        // Check HTTP if HTTPS failed
        if (!results.https) {
            try {
                const httpResult = await this.makeRequest(`http://${subdomain}`, timeout);
                if (httpResult) results.http = httpResult;
            } catch (error) {}
        }
        
        return results;
    }

    makeRequest(url, timeout) {
        return new Promise((resolve) => {
            const protocol = url.startsWith('https') ? https : http;
            const startTime = Date.now();
            
            const req = protocol.get(url, {
                timeout,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (compatible; AIReconBot/1.0; +http://example.com/bot)',
                    'Accept': 'text/html,application/json,*/*',
                    'Accept-Language': 'en-US,en;q=0.9'
                }
            }, (res) => {
                let data = '';
                res.on('data', chunk => { data += chunk; });
                res.on('end', () => {
                    resolve({
                        statusCode: res.statusCode,
                        headers: res.headers,
                        body: data.substring(0, 50000), // Limit body size
                        responseTime: Date.now() - startTime,
                        url
                    });
                });
            }).on('error', () => {
                resolve(null);
            });
            
            req.setTimeout(timeout, () => {
                req.destroy();
                resolve(null);
            });
        });
    }

    async checkSensitivePaths(baseUrl, paths) {
        const findings = [];
        
        for (const path of paths.slice(0, 20)) { // Limit to 20 paths per subdomain
            try {
                const url = `${baseUrl}${path}`;
                const response = await this.makeRequest(url, 3000);
                
                if (response && response.statusCode === 200) {
                    // Check for sensitive data in the response
                    const sensitiveFindings = await this.sensitiveData.scanUrl(url, response.body);
                    
                    if (sensitiveFindings.length > 0) {
                        findings.push({
                            url,
                            statusCode: response.statusCode,
                            sensitiveData: sensitiveFindings,
                            headers: response.headers
                        });
                    } else if (response.body.length > 0) {
                        // Path exists but no sensitive data
                        findings.push({
                            url,
                            statusCode: response.statusCode,
                            note: 'Path exists but no sensitive data detected',
                            headers: response.headers
                        });
                    }
                }
            } catch (error) {}
        }
        
        return findings;
    }

    async scan(domain) {
        console.log(`\n🔍 Starting AI-powered reconnaissance on ${domain}`);
        console.log('===========================================');
        
        const results = {
            domain,
            timestamp: new Date().toISOString(),
            stats: {
                totalSubdomains: 0,
                liveSubdomains: 0,
                sensitiveFindings: 0,
                technologies: 0
            },
            subdomains: [],
            summary: {
                liveEndpoints: [],
                sensitiveData: [],
                technologies: [],
                warnings: []
            }
        };

        // Step 1: Discover potential subdomains using AI
        console.log('\n📡 Phase 1: AI-Powered Subdomain Discovery');
        const potentialSubdomains = await this.subdomainDiscovery.discover(domain);
        console.log(`Generated ${potentialSubdomains.length} potential subdomains`);

        // Step 2: Check each subdomain
        console.log('\n🔎 Phase 2: Validating Subdomains');
        let checked = 0;
        
        for (const subdomain of potentialSubdomains) {
            checked++;
            if (checked % 10 === 0) {
                console.log(`Progress: ${checked}/${potentialSubdomains.length}`);
            }

            const dnsCheck = await this.checkSubdomain(subdomain);
            
            if (dnsCheck) {
                console.log(`  ✓ Found: ${subdomain} -> ${dnsCheck.ips.join(', ')}`);
                
                const httpCheck = await this.checkHTTP(subdomain);
                const isLive = httpCheck.https !== null || httpCheck.http !== null;
                
                const subdomainResult = {
                    subdomain,
                    ips: dnsCheck.ips,
                    isLive,
                    https: httpCheck.https ? {
                        statusCode: httpCheck.https.statusCode,
                        responseTime: httpCheck.https.responseTime
                    } : null,
                    http: httpCheck.http ? {
                        statusCode: httpCheck.http.statusCode,
                        responseTime: httpCheck.http.responseTime
                    } : null,
                    technologies: [],
                    sensitiveData: []
                };

                // Step 3: If live, check for technologies
                if (isLive) {
                    const response = httpCheck.https || httpCheck.http;
                    const techs = await this.techDetector.detect(
                        response.headers, 
                        response.body, 
                        response.url
                    );
                    subdomainResult.technologies = techs;
                    
                    // Add to summary
                    techs.forEach(t => {
                        if (!results.summary.technologies.some(et => et.name === t.name)) {
                            results.summary.technologies.push(t);
                        }
                    });

                    // Step 4: Check for sensitive paths
                    console.log(`    Scanning for sensitive data on ${subdomain}...`);
                    const sensitiveFindings = await this.checkSensitivePaths(
                        httpCheck.https ? `https://${subdomain}` : `http://${subdomain}`,
                        this.sensitiveData.sensitivePaths
                    );
                    
                    if (sensitiveFindings.length > 0) {
                        subdomainResult.sensitiveData = sensitiveFindings;
                        results.stats.sensitiveFindings += sensitiveFindings.length;
                        
                        // Add to summary
                        sensitiveFindings.forEach(f => {
                            results.summary.sensitiveData.push({
                                subdomain,
                                url: f.url,
                                statusCode: f.statusCode,
                                hasSensitiveData: f.sensitiveData ? true : false
                            });
                        });
                        
                        console.log(`    ⚠ Found ${sensitiveFindings.length} sensitive paths!`);
                    }
                }

                results.subdomains.push(subdomainResult);
                results.stats.totalSubdomains++;
                if (isLive) {
                    results.stats.liveSubdomains++;
                    results.summary.liveEndpoints.push(subdomain);
                }
            }
        }

        // Step 5: Generate insights
        console.log('\n📊 Phase 3: AI Analysis & Insights');
        
        // Find hidden services
        const hiddenServices = results.subdomains.filter(s => 
            s.subdomain.includes('admin') || 
            s.subdomain.includes('private') || 
            s.subdomain.includes('internal') ||
            s.subdomain.includes('secret') ||
            s.subdomain.includes('hidden')
        );
        
        if (hiddenServices.length > 0) {
            results.summary.warnings.push(`Found ${hiddenServices.length} potentially hidden/private services`);
        }

        // Find exposed sensitive data
        if (results.stats.sensitiveFindings > 0) {
            results.summary.warnings.push(`CRITICAL: Found ${results.stats.sensitiveFindings} instances of potentially exposed sensitive data!`);
        }

        // Technology insights
        const techCount = results.summary.technologies.length;
        if (techCount > 0) {
            results.summary.warnings.push(`Detected ${techCount} different technologies`);
            
            // Check for outdated/unsafe technologies
            const unsafeTechs = results.summary.technologies.filter(t => 
                t.name.toLowerCase().includes('apache/1') ||
                t.name.toLowerCase().includes('iis/6') ||
                t.name.toLowerCase().includes('php/5')
            );
            
            if (unsafeTechs.length > 0) {
                results.summary.warnings.push(`Found potentially outdated technologies: ${unsafeTechs.map(t => t.name).join(', ')}`);
            }
        }

        console.log('\n✅ Scan Complete!');
        console.log(`   Total subdomains found: ${results.stats.totalSubdomains}`);
        console.log(`   Live subdomains: ${results.stats.liveSubdomains}`);
        console.log(`   Sensitive findings: ${results.stats.sensitiveFindings}`);
        console.log(`   Technologies detected: ${results.summary.technologies.length}`);
        
        return results;
    }
}

// ==================== API ENDPOINTS ====================
const scanner = new AIReconScanner();

app.post('/api/scan', async (req, res) => {
    try {
        const { domain } = req.body;
        
        if (!domain) {
            return res.status(400).json({ error: 'Domain is required' });
        }

        const results = await scanner.scan(domain);
        res.json(results);

    } catch (error) {
        console.error('Scan error:', error);
        res.status(500).json({ 
            error: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});

app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        patterns: Object.keys(scanner.sensitiveData.patterns).length,
        paths: scanner.sensitiveData.sensitivePaths.length
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 AI Recon Scanner running on port ${PORT}`);
    console.log(`📡 API: http://localhost:${PORT}/api/scan`);
    console.log(`🔍 Health: http://localhost:${PORT}/api/health`);
});

module.exports = app;
