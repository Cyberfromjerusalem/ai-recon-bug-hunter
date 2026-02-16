const express = require('express');
const cors = require('cors');
const { exec } = require('child_process');
const util = require('util');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

const app = express();
app.use(cors());
app.use(express.json());

const execPromise = util.promisify(exec);

class SmartReconEngine {
    constructor() {
        this.tempDir = path.join(__dirname, '../temp');
        this.resultsDir = path.join(__dirname, '../results');
        this.initDirectories();
    }

    async initDirectories() {
        await fs.mkdir(this.tempDir, { recursive: true });
        await fs.mkdir(this.resultsDir, { recursive: true });
    }

    async runCommand(command, options = {}) {
        try {
            console.log(`Running: ${command}`);
            const { stdout, stderr } = await execPromise(command, {
                timeout: 300000, // 5 minutes
                maxBuffer: 1024 * 1024 * 50, // 50MB
                ...options
            });
            if (stderr) console.warn(`Warning: ${stderr}`);
            return stdout;
        } catch (error) {
            if (error.killed) {
                throw new Error(`Command timed out: ${command}`);
            }
            return error.stdout || ''; // Return partial results on error
        }
    }

    // ==================== PHASE 1: SUBDOMAIN ENUMERATION ====================
    async enumerateSubdomains(domain) {
        console.log(`\n🔍 Phase 1: Subdomain Enumeration for ${domain}`);
        const results = new Set();

        // 1. Certificate Transparency Logs
        console.log('   Checking Certificate Transparency logs...');
        try {
            const crtSh = await this.runCommand(
                `curl -s "https://crt.sh/?q=%.${domain}&output=json" | jq -r '.[].name_value' | sort -u`
            );
            crtSh.split('\n').forEach(line => {
                if (line.includes(domain)) results.add(line.trim());
            });
        } catch (e) {}

        // 2. SecurityTrails API (if available)
        if (process.env.SECURITYTRAILS_API_KEY) {
            console.log('   Querying SecurityTrails...');
            try {
                const st = await this.runCommand(
                    `curl -s --request GET --url "https://api.securitytrails.com/v1/domain/${domain}/subdomains" --header "APIKEY: ${process.env.SECURITYTRAILS_API_KEY}" | jq -r '.subdomains[]'`
                );
                st.split('\n').forEach(sub => {
                    if (sub) results.add(`${sub}.${domain}`);
                });
            } catch (e) {}
        }

        // 3. AlienVault OTX
        console.log('   Checking AlienVault OTX...');
        try {
            const otx = await this.runCommand(
                `curl -s "https://otx.alienvault.com/api/v1/indicators/domain/${domain}/passive_dns" | jq -r '.passive_dns[]?.hostname' | sort -u`
            );
            otx.split('\n').forEach(line => {
                if (line && line.includes(domain)) results.add(line.trim());
            });
        } catch (e) {}

        // 4. VirusTotal (if API key available)
        if (process.env.VIRUSTOTAL_API_KEY) {
            console.log('   Checking VirusTotal...');
            try {
                const vt = await this.runCommand(
                    `curl -s --request GET --url "https://www.virustotal.com/api/v3/domains/${domain}/subdomains?limit=40" --header "x-apikey: ${process.env.VIRUSTOTAL_API_KEY}" | jq -r '.data[].id'`
                );
                vt.split('\n').forEach(line => {
                    if (line && line.includes(domain)) results.add(line.trim());
                });
            } catch (e) {}
        }

        // 5. DNS Dumpster (scraping)
        console.log('   Checking DNS Dumpster...');
        try {
            const dumpster = await this.runCommand(
                `curl -s -X POST -d "user=null&csrfmiddlewaretoken=null&targetip=${domain}" "https://dnsdumpster.com/" | grep -oP '([a-zA-Z0-9][-a-zA-Z0-9]*\\.)*${domain.replace('.', '\\.')}' | sort -u`
            );
            dumpster.split('\n').forEach(line => {
                if (line && line.includes(domain)) results.add(line.trim());
            });
        } catch (e) {}

        // 6. RapidDNS
        console.log('   Checking RapidDNS...');
        try {
            const rapid = await this.runCommand(
                `curl -s "https://rapiddns.io/subdomain/${domain}?full=1" | grep -oP '([a-zA-Z0-9][-a-zA-Z0-9]*\\.)*${domain.replace('.', '\\.')}' | sort -u`
            );
            rapid.split('\n').forEach(line => {
                if (line && line.includes(domain)) results.add(line.trim());
            });
        } catch (e) {}

        // 7. BufferOver
        console.log('   Checking BufferOver...');
        try {
            const buffer = await this.runCommand(
                `curl -s "https://dns.bufferover.run/dns?q=.${domain}" | jq -r '.FDNS_A[],.RDNS[]' 2>/dev/null | grep -oP '([a-zA-Z0-9][-a-zA-Z0-9]*\\.)*${domain.replace('.', '\\.')}' | sort -u`
            );
            buffer.split('\n').forEach(line => {
                if (line && line.includes(domain)) results.add(line.trim());
            });
        } catch (e) {}

        // 8. ThreatCrowd
        console.log('   Checking ThreatCrowd...');
        try {
            const threat = await this.runCommand(
                `curl -s "https://www.threatcrowd.org/searchApi/v2/domain/report/?domain=${domain}" | jq -r '.subdomains[]'`
            );
            threat.split('\n').forEach(line => {
                if (line && line.includes(domain)) results.add(line.trim());
            });
        } catch (e) {}

        // 9. HackerTarget
        console.log('   Checking HackerTarget...');
        try {
            const hackertarget = await this.runCommand(
                `curl -s "https://api.hackertarget.com/hostsearch/?q=${domain}" | cut -d, -f1`
            );
            hackertarget.split('\n').forEach(line => {
                if (line && line.includes(domain)) results.add(line.trim());
            });
        } catch (e) {}

        // 10. CommonCrawl
        console.log('   Checking CommonCrawl...');
        try {
            const commoncrawl = await this.runCommand(
                `curl -s "http://index.commoncrawl.org/CC-MAIN-2024-10-index?url=*.${domain}&output=json" | jq -r '.url' | sed 's/.*\\/\\/\\([^/]*\\).*/\\1/' | grep -oP '([a-zA-Z0-9][-a-zA-Z0-9]*\\.)*${domain.replace('.', '\\.')}' | sort -u`
            );
            commoncrawl.split('\n').forEach(line => {
                if (line && line.includes(domain)) results.add(line.trim());
            });
        } catch (e) {}

        return Array.from(results);
    }

    // ==================== PHASE 2: DNS RESOLUTION ====================
    async resolveSubdomains(subdomains) {
        console.log(`\n🔍 Phase 2: Resolving ${subdomains.length} subdomains...`);
        const results = [];

        for (let i = 0; i < subdomains.length; i += 50) { // Process in batches
            const batch = subdomains.slice(i, i + 50);
            const batchResults = await Promise.all(
                batch.map(async sub => {
                    try {
                        // Use dig for faster resolution
                        const output = await this.runCommand(`dig +short ${sub} A`);
                        const ips = output.split('\n').filter(ip => ip.match(/^\d+\.\d+\.\d+\.\d+$/));
                        
                        if (ips.length > 0) {
                            return {
                                subdomain: sub,
                                ips,
                                resolved: true
                            };
                        }
                        return {
                            subdomain: sub,
                            ips: [],
                            resolved: false
                        };
                    } catch (e) {
                        return {
                            subdomain: sub,
                            ips: [],
                            resolved: false
                        };
                    }
                })
            );

            results.push(...batchResults.filter(r => r.resolved));
            
            if (i % 100 === 0) {
                console.log(`   Resolved ${results.length}/${subdomains.length} so far...`);
            }
        }

        console.log(`   Found ${results.length} resolving subdomains`);
        return results;
    }

    // ==================== PHASE 3: HTTP PROBING ====================
    async probeHttp(subdomains) {
        console.log(`\n🔍 Phase 3: Probing ${subdomains.length} subdomains for HTTP services...`);
        
        // Create input file for httpx
        const inputFile = path.join(this.tempDir, `httpx-input-${Date.now()}.txt`);
        await fs.writeFile(inputFile, subdomains.map(s => s.subdomain).join('\n'));

        // Run httpx for HTTP probing
        const outputFile = path.join(this.tempDir, `httpx-output-${Date.now()}.json`);
        
        try {
            await this.runCommand(
                `httpx -l ${inputFile} -silent -json -o ${outputFile} -threads 100 -timeout 5 -status-code -title -tech-detect -content-length -web-server -ip -cname -cdn`
            );
        } catch (e) {
            // Fallback to basic curl if httpx not available
            return this.fallbackHttpProbe(subdomains);
        }

        // Parse results
        const results = [];
        try {
            const content = await fs.readFile(outputFile, 'utf8');
            const lines = content.split('\n').filter(l => l.trim());
            
            for (const line of lines) {
                try {
                    const data = JSON.parse(line);
                    results.push({
                        subdomain: data.input || data.url?.replace(/^https?:\/\//, ''),
                        url: data.url,
                        statusCode: data.status_code,
                        title: data.title,
                        technologies: data.tech || [],
                        contentLength: data.content_length,
                        webServer: data.webserver,
                        ip: data.host || data.ip,
                        cdn: data.cdn_name || data.cdn,
                        responseTime: data.response_time
                    });
                } catch (e) {}
            }
        } catch (e) {}

        // Cleanup
        await fs.unlink(inputFile).catch(() => {});
        await fs.unlink(outputFile).catch(() => {});

        return results;
    }

    async fallbackHttpProbe(subdomains) {
        console.log('   Using fallback HTTP probing with curl...');
        const results = [];

        for (let i = 0; i < subdomains.length; i += 20) {
            const batch = subdomains.slice(i, i + 20);
            const batchResults = await Promise.all(
                batch.map(async (sub, index) => {
                    // Try HTTPS first
                    try {
                        const output = await this.runCommand(
                            `curl -s -k -L -I --max-time 5 "https://${sub.subdomain}" 2>/dev/null | head -n 1`
                        );
                        if (output.includes('200') || output.includes('301') || output.includes('302')) {
                            return {
                                subdomain: sub.subdomain,
                                url: `https://${sub.subdomain}`,
                                statusCode: parseInt(output.split(' ')[1]) || 0,
                                https: true
                            };
                        }
                    } catch (e) {}

                    // Try HTTP
                    try {
                        const output = await this.runCommand(
                            `curl -s -I --max-time 5 "http://${sub.subdomain}" 2>/dev/null | head -n 1`
                        );
                        if (output.includes('200') || output.includes('301') || output.includes('302')) {
                            return {
                                subdomain: sub.subdomain,
                                url: `http://${sub.subdomain}`,
                                statusCode: parseInt(output.split(' ')[1]) || 0,
                                https: false
                            };
                        }
                    } catch (e) {}

                    return null;
                })
            );

            results.push(...batchResults.filter(r => r !== null));

            if (i % 100 === 0) {
                console.log(`   Probed ${results.length} live hosts...`);
            }
        }

        return results;
    }

    // ==================== PHASE 4: URL EXTRACTION (Wayback, etc.) ====================
    async extractUrls(domain, liveSubdomains) {
        console.log(`\n🔍 Phase 4: Extracting URLs from archives...`);
        const allUrls = new Set();
        const urlData = [];

        // Process each live subdomain
        for (const sub of liveSubdomains) {
            const subdomain = sub.subdomain || sub;
            console.log(`   Processing ${subdomain}...`);

            // 1. Wayback Machine
            try {
                const wayback = await this.runCommand(
                    `curl -s "http://web.archive.org/cdx/search/cdx?url=*.${subdomain}&output=json&fl=original&collapse=urlkey" | jq -r '.[][]' 2>/dev/null | grep -v "^\[" | grep -v "^original" | head -1000`
                );
                wayback.split('\n').forEach(url => {
                    if (url && url.includes(subdomain)) {
                        allUrls.add(url);
                        urlData.push({ url, source: 'wayback', subdomain });
                    }
                });
            } catch (e) {}

            // 2. CommonCrawl
            try {
                const cc = await this.runCommand(
                    `curl -s "http://index.commoncrawl.org/CC-MAIN-2024-10-index?url=*.${subdomain}&output=json" | jq -r '.url' 2>/dev/null | head -500`
                );
                cc.split('\n').forEach(url => {
                    if (url && url.includes(subdomain)) {
                        allUrls.add(url);
                        urlData.push({ url, source: 'commoncrawl', subdomain });
                    }
                });
            } catch (e) {}

            // 3. URLScan
            try {
                const urlscan = await this.runCommand(
                    `curl -s "https://urlscan.io/api/v1/search/?q=domain:${subdomain}" | jq -r '.results[].page.url' 2>/dev/null | head -200`
                );
                urlscan.split('\n').forEach(url => {
                    if (url && url.includes(subdomain)) {
                        allUrls.add(url);
                        urlData.push({ url, source: 'urlscan', subdomain });
                    }
                });
            } catch (e) {}

            // 4. AlienVault OTX URLs
            try {
                const otx = await this.runCommand(
                    `curl -s "https://otx.alienvault.com/api/v1/indicators/domain/${subdomain}/url_list?limit=100" | jq -r '.url_list[].url' 2>/dev/null`
                );
                otx.split('\n').forEach(url => {
                    if (url && url.includes(subdomain)) {
                        allUrls.add(url);
                        urlData.push({ url, source: 'otx', subdomain });
                    }
                });
            } catch (e) {}
        }

        console.log(`   Found ${allUrls.size} unique URLs`);

        // Categorize URLs
        const categorized = {
            js: [],
            css: [],
            images: [],
            api: [],
            admin: [],
            backup: [],
            config: [],
            other: []
        };

        urlData.forEach(item => {
            const url = item.url.toLowerCase();
            if (url.includes('.js') || url.includes('.js?')) {
                categorized.js.push(item);
            } else if (url.includes('.css') || url.includes('.css?')) {
                categorized.css.push(item);
            } else if (url.includes('.jpg') || url.includes('.png') || url.includes('.gif') || url.includes('.svg')) {
                categorized.images.push(item);
            } else if (url.includes('/api/') || url.includes('/v1/') || url.includes('/v2/') || url.includes('/graphql')) {
                categorized.api.push(item);
            } else if (url.includes('/admin') || url.includes('/administrator') || url.includes('/wp-admin')) {
                categorized.admin.push(item);
            } else if (url.includes('.bak') || url.includes('.backup') || url.includes('.sql')) {
                categorized.backup.push(item);
            } else if (url.includes('.env') || url.includes('.git') || url.includes('config.')) {
                categorized.config.push(item);
            } else {
                categorized.other.push(item);
            }
        });

        return {
            total: allUrls.size,
            categorized,
            all: Array.from(allUrls).slice(0, 5000) // Limit to 5000
        };
    }

    // ==================== PHASE 5: JAVASCRIPT ANALYSIS ====================
    async analyzeJavaScript(jsUrls) {
        console.log(`\n🔍 Phase 5: Analyzing ${jsUrls.length} JavaScript files...`);
        const findings = [];

        for (let i = 0; i < Math.min(jsUrls.length, 100); i++) { // Limit to 100 JS files
            const js = jsUrls[i];
            console.log(`   Analyzing ${js.url.substring(0, 60)}...`);

            try {
                const content = await this.runCommand(
                    `curl -s --max-time 10 "${js.url}"`
                );

                // Look for API keys in JS
                const patterns = {
                    'AWS Key': /AKIA[0-9A-Z]{16}/g,
                    'Google API': /AIza[0-9A-Za-z-_]{35}/g,
                    'Facebook Token': /EAACEdEose0cBA[0-9A-Za-z]+/g,
                    'GitHub Token': /ghp_[a-zA-Z0-9]{36}/g,
                    'Slack Token': /xox[baprs]-[0-9a-zA-Z]{10,48}/g,
                    'Stripe Key': /sk_live_[0-9a-zA-Z]{24}/g,
                    'Twilio Key': /SK[0-9a-f]{32}/g,
                    'JWT Token': /eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/g,
                    'Internal IP': /(10\.\d{1,3}\.\d{1,3}\.\d{1,3})|(172\.(1[6-9]|2[0-9]|3[0-1])\.\d{1,3}\.\d{1,3})|(192\.168\.\d{1,3}\.\d{1,3})/g,
                    'Email': /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
                    'API Endpoint': /https?:\/\/[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}(?::\d+)?(?:\/[^\s"'<>]*)?/g,
                    'Firebase URL': /https?:\/\/[a-zA-Z0-9-]+\.firebaseio\.com/g,
                    'MongoDB Connection': /mongodb(?:\+srv)?:\/\/[^\s]+/g,
                    'MySQL Connection': /mysql:\/\/[^\s]+/g,
                    'Redis Connection': /redis:\/\/[^\s]+/g,
                    'Password in URL': /password=[^&\s]+/gi,
                    'Token in URL': /token=[^&\s]+/gi,
                    'Secret in URL': /secret=[^&\s]+/gi,
                    'API Key in URL': /api[_-]?key=[^&\s]+/gi
                };

                for (const [type, pattern] of Object.entries(patterns)) {
                    const matches = content.match(pattern);
                    if (matches) {
                        findings.push({
                            type,
                            url: js.url,
                            subdomain: js.subdomain,
                            matches: matches.slice(0, 5),
                            context: content.substring(
                                Math.max(0, content.indexOf(matches[0]) - 50),
                                Math.min(content.length, content.indexOf(matches[0]) + 100)
                            ).replace(/\n/g, ' ')
                        });
                        console.log(`      Found ${type} in ${js.url}`);
                    }
                }

                // Look for hardcoded credentials
                if (content.includes('password') && (content.includes('=') || content.includes(':'))) {
                    findings.push({
                        type: 'Possible Hardcoded Password',
                        url: js.url,
                        subdomain: js.subdomain,
                        context: content.substring(
                            Math.max(0, content.indexOf('password') - 50),
                            Math.min(content.length, content.indexOf('password') + 100)
                        ).replace(/\n/g, ' ')
                    });
                }

                // Look for internal endpoints
                const internalPaths = content.match(/\/api\/internal|\/private|\/admin|\/debug|\/test|\/staging/g);
                if (internalPaths) {
                    findings.push({
                        type: 'Internal Endpoint Reference',
                        url: js.url,
                        subdomain: js.subdomain,
                        matches: internalPaths.slice(0, 5)
                    });
                }

            } catch (e) {
                console.log(`      Error analyzing ${js.url}: ${e.message}`);
            }
        }

        console.log(`   Found ${findings.length} potential secrets in JavaScript`);
        return findings;
    }

    // ==================== PHASE 6: SENSITIVE PATH SCANNING ====================
    async scanSensitivePaths(liveSubdomains) {
        console.log(`\n🔍 Phase 6: Scanning for sensitive paths...`);
        
        const sensitivePaths = [
            '/.env', '/.env.local', '/.env.production', '/.env.development', '/.env.staging',
            '/.git/config', '/.git/HEAD', '/.git/index', '/.git/refs/heads/master',
            '/.aws/credentials', '/.aws/config',
            '/.npmrc', '/.yarnrc', '/.pypirc', '/.gem/credentials',
            '/.ssh/id_rsa', '/.ssh/id_dsa', '/.ssh/authorized_keys', '/.ssh/config',
            '/composer.json', '/composer.lock', '/package.json', '/package-lock.json',
            '/Gemfile', '/Gemfile.lock', '/requirements.txt', '/Pipfile', '/Pipfile.lock',
            '/wp-config.php', '/wp-config.php.bak', '/wp-config.php.save',
            '/configuration.php', '/config.php', '/config.php.bak',
            '/settings.py', '/settings.py.bak', '/local_settings.py',
            '/database.yml', '/application.properties', '/secrets.yml',
            '/.htaccess', '/.htpasswd', '/web.config', '/web.config.bak',
            '/robots.txt', '/sitemap.xml', '/sitemap.xml.gz', '/sitemap-index.xml',
            '/crossdomain.xml', '/clientaccesspolicy.xml',
            '/phpinfo.php', '/info.php', '/test.php', '/php.php', '/info',
            '/phpmyadmin', '/phpMyAdmin', '/pma', '/adminer', '/mysql-admin',
            '/backup.sql', '/dump.sql', '/db.sql', '/database.sql', '/data.sql',
            '/backup.zip', '/backup.tar.gz', '/backup.tgz', '/backup.tar',
            '/.DS_Store', '/Thumbs.db', '/.directory', '/.svn', '/.svn/entries',
            '/swagger.json', '/swagger.yaml', '/swagger-ui', '/openapi.json',
            '/api-docs', '/docs', '/api/documentation',
            '/graphql', '/graphiql', '/playground', '/voyager',
            '/.well-known/security.txt', '/.well-known/openid-configuration',
            '/server-status', '/server-info', '/status', '/metrics', '/stats',
            '/actuator', '/actuator/health', '/actuator/info', '/actuator/env',
            '/actuator/metrics', '/actuator/beans', '/actuator/mappings',
            '/console', '/h2-console', '/h2', '/h2-console/login.jsp',
            '/jenkins', '/jenkins/login', '/jira', '/confluence',
            '/gitlab', '/gitlab/users/sign_in', '/github', '/bitbucket',
            '/webmin', '/cpanel', '/whm', '/plesk', '/vesta',
            '/api/swagger', '/api/docs', '/api/v1/docs', '/api/v2/docs',
            '/debug', '/debug/', '/debug/pprof', '/debug/vars',
            '/test', '/test/', '/tests', '/testing', '/staging',
            '/private', '/private/', '/internal', '/internal/',
            '/admin', '/admin/', '/administrator', '/admin-console',
            '/backup', '/backup/', '/backups', '/archive',
            '/logs', '/log', '/logging', '/logger',
            '/cache', '/cached', '/tmp', '/temp', '/temp/'
        ];

        const findings = [];

        for (const sub of liveSubdomains.slice(0, 20)) { // Limit to 20 subdomains
            const subdomain = sub.subdomain || sub;
            console.log(`   Scanning ${subdomain}...`);

            for (const path of sensitivePaths) {
                try {
                    const url = `https://${subdomain}${path}`;
                    const output = await this.runCommand(
                        `curl -s -k -L --max-time 3 -o /dev/null -w "%{http_code}" "${url}"`
                    );

                    if (output === '200') {
                        console.log(`      FOUND: ${url}`);
                        
                        // Try to get the content
                        const content = await this.runCommand(
                            `curl -s -k -L --max-time 3 "${url}" | head -c 500`
                        );

                        findings.push({
                            url,
                            subdomain,
                            path,
                            statusCode: 200,
                            contentPreview: content.substring(0, 200)
                        });
                    }
                } catch (e) {}

                // Try HTTP if HTTPS fails
                try {
                    const url = `http://${subdomain}${path}`;
                    const output = await this.runCommand(
                        `curl -s -L --max-time 3 -o /dev/null -w "%{http_code}" "${url}"`
                    );

                    if (output === '200') {
                        console.log(`      FOUND: ${url}`);
                        
                        const content = await this.runCommand(
                            `curl -s -L --max-time 3 "${url}" | head -c 500`
                        );

                        findings.push({
                            url,
                            subdomain,
                            path,
                            statusCode: 200,
                            contentPreview: content.substring(0, 200)
                        });
                    }
                } catch (e) {}
            }
        }

        return findings;
    }

    // ==================== PHASE 7: PORT SCANNING ====================
    async scanPorts(liveSubdomains) {
        console.log(`\n🔍 Phase 7: Scanning common ports...`);
        
        const commonPorts = [
            21, 22, 23, 25, 53, 80, 81, 110, 111, 135, 139, 143,
            443, 445, 465, 514, 587, 593, 631, 636, 993, 995,
            1080, 1433, 1434, 1521, 1723, 2082, 2083, 2086, 2087,
            2095, 2096, 3306, 3389, 3690, 5432, 5800, 5801, 5900,
            5901, 5984, 5985, 5986, 6379, 7000, 7001, 7002, 8080,
            8081, 8443, 8888, 9000, 9090, 9200, 9300, 10000, 11211,
            27017, 27018, 27019, 50000, 50001
        ];

        const openPorts = [];

        for (const sub of liveSubdomains.slice(0, 10)) { // Limit to 10 subdomains
            const subdomain = sub.subdomain || sub;
            console.log(`   Scanning ports on ${subdomain}...`);

            for (const port of commonPorts.slice(0, 20)) { // Limit to 20 ports per host
                try {
                    const output = await this.runCommand(
                        `timeout 2 nc -zv ${subdomain} ${port} 2>&1 || echo "closed"`
                    );
                    
                    if (output.includes('succeeded') || output.includes('open')) {
                        console.log(`      Port ${port} open on ${subdomain}`);
                        openPorts.push({
                            subdomain,
                            port,
                            service: this.getPortService(port)
                        });
                    }
                } catch (e) {}
            }
        }

        return openPorts;
    }

    getPortService(port) {
        const services = {
            21: 'FTP', 22: 'SSH', 23: 'Telnet', 25: 'SMTP', 53: 'DNS',
            80: 'HTTP', 81: 'HTTP-alt', 110: 'POP3', 111: 'RPC',
            135: 'RPC', 139: 'NetBIOS', 143: 'IMAP', 443: 'HTTPS',
            445: 'SMB', 465: 'SMTPS', 514: 'Syslog', 587: 'SMTP',
            593: 'RPC', 631: 'IPP', 636: 'LDAPS', 993: 'IMAPS',
            995: 'POP3S', 1080: 'SOCKS', 1433: 'MSSQL', 1434: 'MSSQL',
            1521: 'Oracle', 1723: 'PPTP', 2082: 'cPanel', 2083: 'cPanel SSL',
            2086: 'WHM', 2087: 'WHM SSL', 2095: 'cPanel Webmail',
            2096: 'cPanel Webmail SSL', 3306: 'MySQL', 3389: 'RDP',
            3690: 'SVN', 5432: 'PostgreSQL', 5800: 'VNC', 5801: 'VNC',
            5900: 'VNC', 5901: 'VNC', 5984: 'CouchDB', 5985: 'WinRM',
            5986: 'WinRM SSL', 6379: 'Redis', 7000: 'Cassandra',
            7001: 'Cassandra', 7002: 'Cassandra', 8080: 'HTTP-alt',
            8081: 'HTTP-alt', 8443: 'HTTPS-alt', 8888: 'HTTP-proxy',
            9000: 'HTTP-alt', 9090: 'HTTP-alt', 9200: 'Elasticsearch',
            9300: 'Elasticsearch', 10000: 'Webmin', 11211: 'Memcached',
            27017: 'MongoDB', 27018: 'MongoDB', 27019: 'MongoDB',
            50000: 'DB2', 50001: 'DB2'
        };
        return services[port] || 'Unknown';
    }

    // ==================== MAIN SCAN FUNCTION ====================
    async scan(domain) {
        const scanId = crypto.randomBytes(8).toString('hex');
        const startTime = Date.now();
        
        console.log('\n' + '='.repeat(60));
        console.log(`🚀 SMART AI RECON SCAN STARTED - ID: ${scanId}`);
        console.log(`📌 Target: ${domain}`);
        console.log('='.repeat(60));

        const results = {
            scanId,
            domain,
            timestamp: new Date().toISOString(),
            duration: 0,
            phases: {},
            summary: {
                subdomainsFound: 0,
                liveSubdomains: 0,
                urlsExtracted: 0,
                jsFilesFound: 0,
                secretsFound: 0,
                sensitivePathsFound: 0,
                openPortsFound: 0
            },
            data: {}
        };

        // Phase 1: Subdomain Enumeration
        const phase1Start = Date.now();
        const subdomains = await this.enumerateSubdomains(domain);
        results.phases.subdomainEnum = {
            duration: Date.now() - phase1Start,
            count: subdomains.length
        };
        results.summary.subdomainsFound = subdomains.length;
        results.data.subdomains = subdomains;

        // Phase 2: DNS Resolution
        const phase2Start = Date.now();
        const resolvedSubdomains = await this.resolveSubdomains(subdomains);
        results.phases.dnsResolution = {
            duration: Date.now() - phase2Start,
            count: resolvedSubdomains.length
        };
        results.data.resolvedSubdomains = resolvedSubdomains;

        // Phase 3: HTTP Probing
        const phase3Start = Date.now();
        const liveSubdomains = await this.probeHttp(resolvedSubdomains);
        results.phases.httpProbe = {
            duration: Date.now() - phase3Start,
            count: liveSubdomains.length
        };
        results.summary.liveSubdomains = liveSubdomains.length;
        results.data.liveSubdomains = liveSubdomains;

        // Phase 4: URL Extraction
        const phase4Start = Date.now();
        const urls = await this.extractUrls(domain, resolvedSubdomains.map(s => s.subdomain));
        results.phases.urlExtraction = {
            duration: Date.now() - phase4Start,
            count: urls.total
        };
        results.summary.urlsExtracted = urls.total;
        results.data.urls = urls;

        // Phase 5: JavaScript Analysis
        const phase5Start = Date.now();
        const jsFindings = await this.analyzeJavaScript(urls.categorized.js);
        results.phases.jsAnalysis = {
            duration: Date.now() - phase5Start,
            count: jsFindings.length
        };
        results.summary.secretsFound = jsFindings.length;
        results.data.jsFindings = jsFindings;

        // Phase 6: Sensitive Path Scanning
        const phase6Start = Date.now();
        const sensitivePaths = await this.scanSensitivePaths(resolvedSubdomains.map(s => s.subdomain));
        results.phases.sensitivePaths = {
            duration: Date.now() - phase6Start,
            count: sensitivePaths.length
        };
        results.summary.sensitivePathsFound = sensitivePaths.length;
        results.data.sensitivePaths = sensitivePaths;

        // Phase 7: Port Scanning
        const phase7Start = Date.now();
        const openPorts = await this.scanPorts(resolvedSubdomains.map(s => s.subdomain));
        results.phases.portScan = {
            duration: Date.now() - phase7Start,
            count: openPorts.length
        };
        results.summary.openPortsFound = openPorts.length;
        results.data.openPorts = openPorts;

        // Finalize
        results.duration = Date.now() - startTime;

        console.log('\n' + '='.repeat(60));
        console.log('✅ SCAN COMPLETE');
        console.log(`⏱️  Duration: ${(results.duration / 1000).toFixed(2)}s`);
        console.log(`📊 Summary:`);
        console.log(`   - Subdomains found: ${results.summary.subdomainsFound}`);
        console.log(`   - Live subdomains: ${results.summary.liveSubdomains}`);
        console.log(`   - URLs extracted: ${results.summary.urlsExtracted}`);
        console.log(`   - Secrets found: ${results.summary.secretsFound}`);
        console.log(`   - Sensitive paths: ${results.summary.sensitivePathsFound}`);
        console.log(`   - Open ports: ${results.summary.openPortsFound}`);
        console.log('='.repeat(60));

        return results;
    }
}

// ==================== API ENDPOINTS ====================
const scanner = new SmartReconEngine();

app.post('/api/smart-scan', async (req, res) => {
    try {
        const { domain } = req.body;
        
        if (!domain) {
            return res.status(400).json({ error: 'Domain is required' });
        }

        // Validate domain format
        const domainRegex = /^([a-zA-Z0-9][-a-zA-Z0-9]*\.)+[a-zA-Z]{2,}$/;
        if (!domainRegex.test(domain)) {
            return res.status(400).json({ error: 'Invalid domain format' });
        }

        const results = await scanner.scan(domain);

        // Save results to file
        const resultFile = path.join(scanner.resultsDir, `${domain}-${Date.now()}.json`);
        await fs.writeFile(resultFile, JSON.stringify(results, null, 2));

        res.json(results);

    } catch (error) {
        console.error('Scan error:', error);
        res.status(500).json({ 
            error: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});

app.get('/api/scan-status/:scanId', (req, res) => {
    res.json({ status: 'Scan status endpoint' });
});

app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        tools: {
            curl: true,
            dig: true,
            httpx: false, // Check if installed
            nmap: false   // Check if installed
        }
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 SMART AI RECON SERVER running on port ${PORT}`);
    console.log(`📡 API: http://localhost:${PORT}/api/smart-scan`);
    console.log(`🔍 Health: http://localhost:${PORT}/api/health`);
    console.log(`📁 Results dir: ${scanner.resultsDir}`);
});

module.exports = app;
