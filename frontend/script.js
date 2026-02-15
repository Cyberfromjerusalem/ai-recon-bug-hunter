let currentJobId = null;
let pollInterval = null;

document.getElementById('scanBtn').addEventListener('click', startRecon);
document.getElementById('exportJson').addEventListener('click', exportJSON);
document.getElementById('exportPdf').addEventListener('click', exportPDF);

// Tab switching
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        
        btn.classList.add('active');
        document.getElementById(btn.dataset.tab + 'Tab').classList.add('active');
    });
});

async function startRecon() {
    const domain = document.getElementById('domainInput').value.trim();
    if (!domain) {
        alert('Please enter a domain');
        return;
    }

    const options = {
        deepScan: document.getElementById('deepScan').checked,
        useAI: document.getElementById('useAI').checked,
        aggressive: document.getElementById('aggressiveMode').checked
    };

    // Show progress
    document.getElementById('progressContainer').classList.remove('hidden');
    document.getElementById('results').classList.add('hidden');

    try {
        const response = await fetch('/api/recon', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ domain, options })
        });

        const data = await response.json();
        if (data.error) {
            throw new Error(data.error);
        }

        currentJobId = data.jobId;
        startPolling(currentJobId);

    } catch (error) {
        alert('Error: ' + error.message);
        document.getElementById('progressContainer').classList.add('hidden');
    }
}

function startPolling(jobId) {
    pollInterval = setInterval(async () => {
        try {
            const response = await fetch(`/api/recon/${jobId}`);
            const data = await response.json();

            updateProgress(data);

            if (data.state === 'completed' && data.result) {
                clearInterval(pollInterval);
                displayResults(data.result);
            } else if (data.state === 'failed') {
                clearInterval(pollInterval);
                alert('Recon failed: ' + (data.error || 'Unknown error'));
            }
        } catch (error) {
            console.error('Polling error:', error);
        }
    }, 2000);
}

function updateProgress(data) {
    const progress = data.progress || 0;
    document.getElementById('progressFill').style.width = `${progress}%`;
    
    const statuses = {
        10: 'Discovering subdomains...',
        40: 'Finding sensitive data...',
        70: 'Analyzing with AI...',
        90: 'Generating report...',
        100: 'Complete!'
    };
    
    document.getElementById('progressStatus').textContent = 
        statuses[Math.floor(progress / 10) * 10] || 'Processing...';
}

function displayResults(result) {
    document.getElementById('progressContainer').classList.add('hidden');
    document.getElementById('results').classList.remove('hidden');

    // Update stats
    document.getElementById('totalSubdomains').textContent = result.stats.totalSubdomains;
    document.getElementById('liveSubdomains').textContent = result.stats.liveSubdomains;
    document.getElementById('sensitiveFindings').textContent = result.stats.sensitiveFindings;
    document.getElementById('riskScore').textContent = result.aiAnalysis?.riskScore || 'N/A';

    // Display subdomains
    displaySubdomains(result.subdomains);
    
    // Display sensitive data
    displaySensitiveData(result.sensitiveData);
    
    // Display AI analysis
    displayAIAnalysis(result.aiAnalysis);
    
    // Create visualization
    createVisualization(result.subdomains);
}

function displaySubdomains(subdomains) {
    const list = document.getElementById('subdomainsList');
    list.innerHTML = '';

    subdomains.forEach(sub => {
        const card = document.createElement('div');
        card.className = 'subdomain-card';
        
        card.innerHTML = `
            <div class="subdomain-header">
                <h3>${sub.subdomain}</h3>
                <span class="status-badge ${sub.isLive ? 'live' : 'dead'}">
                    ${sub.isLive ? 'Live' : 'Dead'}
                </span>
            </div>
            ${sub.isLive ? `
                <div class="subdomain-details">
                    <p><strong>IP:</strong> ${sub.ips?.join(', ') || 'N/A'}</p>
                    <p><strong>Status:</strong> ${sub.statusCode || 'N/A'}</p>
                    <p><strong>Title:</strong> ${sub.title || 'N/A'}</p>
                    <p><strong>Server:</strong> ${sub.server || 'N/A'}</p>
                    <p><strong>Technologies:</strong> ${sub.technologies?.map(t => t.name).join(', ') || 'None detected'}</p>
                </div>
                <div class="subdomain-actions">
                    <a href="https://${sub.subdomain}" target="_blank" class="btn-small">
                        <i class="fas fa-external-link-alt"></i> Visit
                    </a>
                </div>
            ` : ''}
        `;
        
        list.appendChild(card);
    });
}

function displaySensitiveData(data) {
    const list = document.getElementById('sensitiveList');
    list.innerHTML = '';

    if (!data || data.length === 0) {
        list.innerHTML = '<p class="no-data">No sensitive data found</p>';
        return;
    }

    data.forEach(item => {
        const card = document.createElement('div');
        card.className = `sensitive-card severity-${item.severity}`;
        
        card.innerHTML = `
            <div class="sensitive-header">
                <span class="severity-badge">${item.severity}</span>
                <span class="sensitive-type">${item.type}</span>
            </div>
            <p><strong>Location:</strong> ${item.subdomain}${item.path || ''}</p>
            <p><strong>Pattern:</strong> ${item.pattern}</p>
            <p><strong>Matches:</strong></p>
            <pre class="matches">${item.matches.join('\n')}</pre>
            ${item.context ? `<p><strong>Context:</strong> ${item.context}</p>` : ''}
        `;
        
        list.appendChild(card);
    });
}

function displayAIAnalysis(analysis) {
    const container = document.getElementById('aiAnalysis');
    
    if (!analysis) {
        container.innerHTML = '<p class="no-data">AI analysis not available</p>';
        return;
    }

    container.innerHTML = `
        <div class="analysis-section">
            <h3>Analysis</h3>
            <div class="analysis-content">${analysis.analysis.replace(/\n/g, '<br>')}</div>
        </div>
        
        ${analysis.vulnerabilities?.length ? `
            <div class="vulnerabilities-section">
                <h3>Potential Vulnerabilities</h3>
                <ul>
                    ${analysis.vulnerabilities.map(v => `<li>${v}</li>`).join('')}
                </ul>
            </div>
        ` : ''}
        
        ${analysis.recommendations?.length ? `
            <div class="recommendations-section">
                <h3>Recommendations</h3>
                <ul>
                    ${analysis.recommendations.map(r => `<li>${r}</li>`).join('')}
                </ul>
            </div>
        ` : ''}
    `;
}

function createVisualization(subdomains) {
    const ctx = document.getElementById('subdomainGraph').getContext('2d');
    
    const liveCount = subdomains.filter(s => s.isLive).length;
    const deadCount = subdomains.length - liveCount;
    
    new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Live Subdomains', 'Inactive'],
            datasets: [{
                data: [liveCount, deadCount],
                backgroundColor: ['#10b981', '#ef4444'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'bottom'
                },
                title: {
                    display: true,
                    text: 'Subdomain Status Distribution'
                }
            }
        }
    });
}

function exportJSON() {
    const results = document.getElementById('results').dataset;
    const data = {
        timestamp: new Date().toISOString(),
        results: window.currentResults
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `recon-${Date.now()}.json`;
    a.click();
}

function exportPDF() {
    alert('PDF export coming soon!');
}
