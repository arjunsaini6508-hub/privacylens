let currentAnalysisData = null;
let currentTabId = null;

// --- NAVIGATION ---
document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        if (btn.dataset.target === 'view-dashboard') {
            console.log("[PrivacyLens] Dash clicked");
            console.log("[PrivacyLens] Sending OPEN_DASHBOARD / Querying tabs");
            const dashUrl = browserAPI.config.dashboardUrl;
            browserAPI.tabs.query({ url: `${dashUrl}/*` }, (tabs) => {
                if (tabs && tabs.length > 0) {
                    console.log("[PrivacyLens] Dashboard tab found");
                    browserAPI.tabs.update(tabs[0].id, { active: true }).catch(e => console.error("[PrivacyLens] Failed to focus dashboard", e));
                    browserAPI.windows.update(tabs[0].windowId, { focused: true }).catch(e => console.error("[PrivacyLens] Failed to focus window", e));
                } else {
                    console.log("[PrivacyLens] Opening dashboard");
                    browserAPI.tabs.create({ url: dashUrl }).catch(e => console.error("[PrivacyLens] Failed to open dashboard", e));
                }
            });
            return; // Do not change popup view
        }

        document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.popup-view').forEach(v => v.classList.remove('active'));
        
        btn.classList.add('active');
        const targetView = document.getElementById(btn.dataset.target);
        if (targetView) targetView.classList.add('active');
    });
});

document.getElementById('header-settings').addEventListener('click', () => {
    document.querySelector('.nav-btn[data-target="view-settings"]').click();
});

// --- HYDRATION ---
document.addEventListener('DOMContentLoaded', async () => {
    try {
        const [tab] = await browserAPI.tabs.query({ active: true, currentWindow: true });
        if (tab) currentTabId = tab.id;
        
        const res = await fetch(`${browserAPI.config.dashboardApiUrl}/dashboard/data`);
        const state = await res.json();
        
        if (state.settings) hydrateSettings(state.settings);
        
        if (state.lastAnalysis) {
            currentAnalysisData = state.lastAnalysis;
            displayResults(state.lastAnalysis);
        }
    } catch(e) {
        console.error("Hydration failed:", e);
    }
});

// --- SETTINGS SYNC ---
function hydrateSettings(settings) {
    document.getElementById('set-detect-pii').checked = settings.detectPII;
    document.getElementById('set-auto-redact').checked = settings.autoRedact;
    document.getElementById('set-track-network').checked = settings.trackNetwork;
}

['set-detect-pii', 'set-auto-redact', 'set-track-network'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
        el.addEventListener('change', () => {
            const body = {
                detectPII: document.getElementById('set-detect-pii').checked,
                autoRedact: document.getElementById('set-auto-redact').checked,
                trackNetwork: document.getElementById('set-track-network').checked
            };
            fetch(`${browserAPI.config.dashboardApiUrl}/settings/update`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            }).catch(e => console.error(e));
        });
    }
});

// --- ANALYSIS LOGIC ---
async function updateNetworkStats(tabUrl) {
    if (!currentTabId) return;
    browserAPI.runtime.sendMessage({ type: "GET_NETWORK_STATS", tabId: currentTabId }, (response) => {
        if (response && response.type === "NETWORK_STATS" && response.data) {
            
            if (currentAnalysisData) {
                currentAnalysisData.network = response.data;
                if (tabUrl) currentAnalysisData.url = tabUrl;
                if (!currentAnalysisData.timestamp) currentAnalysisData.timestamp = Date.now();
                updateJsonView();
                displayResults(currentAnalysisData); // refresh views
                
                fetch(`${browserAPI.config.dashboardApiUrl}/dashboard/update`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(currentAnalysisData)
                })
                .then(res => res.json())
                .then(updatedData => {
                    currentAnalysisData = updatedData;
                    displayResults(currentAnalysisData);
                })
                .catch(e => console.error('Dashboard sync error:', e));
            }
        }
    });
}

document.getElementById('btn-analyze').addEventListener('click', async () => {
    const btn = document.getElementById('btn-analyze');
    if (btn.disabled) return;
    btn.innerText = "Analyzing...";
    btn.disabled = true;
    
    try {
        const [tab] = await browserAPI.tabs.query({ active: true, currentWindow: true });
        if (!tab || tab.url.startsWith('chrome://') || tab.url.startsWith('about:')) {
            btn.innerText = "Error: Cannot analyze this page";
            btn.disabled = false;
            return;
        }
        currentTabId = tab.id;
        
        browserAPI.tabs.sendMessage(tab.id, { type: "ANALYZE_PAGE" }, (response) => {
            btn.innerText = "Analyze Current Page";
            btn.disabled = false;
            
            if (browserAPI.runtime.lastError) {
                btn.innerText = "Error: Connection unavailable";
                return;
            }
            
            if (response && response.type === "DOM_ANALYSIS_RESULT") {
                currentAnalysisData = response.data;
                displayResults(response.data);
                updateNetworkStats(tab.url);
            } else if (response && response.type === "DOM_ANALYSIS_ERROR") {
                btn.innerText = "Analysis failed. Try again.";
            }
        });
    } catch (e) {
        btn.innerText = "Analysis failed. Try again.";
        btn.disabled = false;
    }
});

document.getElementById('btn-redact').addEventListener('click', async () => {
    if (!currentTabId) return;
    const btn = document.getElementById('btn-redact');
    btn.innerText = "Redacting...";
    
    browserAPI.tabs.sendMessage(currentTabId, { type: "REDACT_SENSITIVE" }, (response) => {
        if (response && response.type === "REDACTION_RESULT") {
            btn.innerText = `Redacted ${response.count} items`;
            btn.style.background = '#10b981';
            setTimeout(() => {
                btn.innerText = "Redact Sensitive Values";
                btn.style.background = '#ef4444';
                document.getElementById('btn-analyze').click();
            }, 2000);
        }
    });
});

// --- RENDER VIEWS ---
function displayResults(data) {
    if (!data) return;
    
    // 1. DASHBOARD TAB
    const score = data.privacyScore !== undefined ? data.privacyScore : '--';
    document.getElementById('res-score').innerText = score;
    
    const container = document.getElementById('score-container');
    const statusText = document.getElementById('score-status-text');
    if (container && statusText && score !== '--') {
        container.className = 'score-card';
        if (score >= 80) {
            container.classList.add('state-safe');
            statusText.innerHTML = '<span>✓</span> Low Risk';
        } else if (score >= 50) {
            container.classList.add('state-warning');
            statusText.innerHTML = '<span>⚠</span> Moderate Risk';
        } else {
            container.classList.add('state-danger');
            statusText.innerHTML = '<span>✕</span> High/Critical Risk';
        }
    }
    
    const bdContainer = document.getElementById('score-breakdown');
    if (bdContainer) {
        if (data.privacyBreakdown && data.privacyBreakdown.length > 0) {
            bdContainer.style.display = 'block';
            bdContainer.innerHTML = '<div style="font-weight:600; margin-bottom:6px; text-align:center;">Risk Breakdown</div>';
            data.privacyBreakdown.forEach(b => {
                const color = b.penalty ? 'var(--danger)' : 'var(--success)';
                bdContainer.innerHTML += `<div style="display:flex; justify-content:space-between; margin-bottom:4px;"><span>${b.label}</span><span style="color:${color}; font-weight:600;">${b.value}</span></div>`;
            });
        } else {
            bdContainer.style.display = 'none';
        }
    }
    
    const piiEls = data.elements ? data.elements.filter(e => e.sensitive) : [];
    document.getElementById('res-sensitive').innerText = `${piiEls.length} detected`;
    
    const net = data.network || {total:0, firstParty:0, thirdParty:0};
    document.getElementById('res-net-total').innerText = net.total;
    document.getElementById('res-net-1p').innerText = net.firstParty;
    document.getElementById('res-net-3p').innerText = net.thirdParty;
    
    document.getElementById('btn-redact').style.display = piiEls.length > 0 ? 'block' : 'none';

    // 2. PII DETECTIONS TAB
    const piiContainer = document.getElementById('pii-list-container');
    piiContainer.innerHTML = '';
    const unredacted = piiEls.filter(e => !e.value.startsWith('['));
    if (unredacted.length === 0) {
        piiContainer.innerHTML = '<div class="empty-state">No active sensitive data detected</div>';
    } else {
        unredacted.forEach(el => {
            piiContainer.innerHTML += `
                <div class="list-item">
                    <div class="list-item-left">
                        <span class="list-item-title">${el.sensitiveType}</span>
                        <span class="list-item-sub">Selector: ${el.selector || 'element'}</span>
                    </div>
                    <div class="list-item-right tag-danger">DETECTED</div>
                </div>
            `;
        });
    }

    // 3. NETWORK TAB
    document.getElementById('net-tab-total').innerText = net.total;
    document.getElementById('net-tab-1p').innerText = net.firstParty;
    document.getElementById('net-tab-3p').innerText = net.thirdParty;
    
    const netContainer = document.getElementById('network-list-container');
    netContainer.innerHTML = '';
    if (!net.recentRequests || net.recentRequests.length === 0) {
        netContainer.innerHTML = '<div class="empty-state">No network requests recorded yet.</div>';
    } else {
        net.recentRequests.forEach(req => {
            const timeStr = new Date(req.timestamp).toLocaleTimeString();
            const tagClass = req.partyType === 'First-party' ? 'tag-safe' : 'tag-danger';
            netContainer.innerHTML += `
                <div class="list-item">
                    <div class="list-item-left">
                        <span class="list-item-title" style="word-break: break-all;">${req.domain}</span>
                        <span class="list-item-sub">${req.type} • ${timeStr}</span>
                    </div>
                    <div class="list-item-right ${tagClass}">${req.partyType}</div>
                </div>
            `;
        });
    }
    
    // 4. REDACTIONS TAB
    const redContainer = document.getElementById('redactions-list-container');
    redContainer.innerHTML = '';
    const redacted = piiEls.filter(e => e.value.startsWith('['));
    if (redacted.length === 0) {
        redContainer.innerHTML = '<div class="empty-state">No redactions performed yet</div>';
    } else {
        redacted.forEach(el => {
            redContainer.innerHTML += `
                <div class="list-item">
                    <div class="list-item-left">
                        <span class="list-item-title">${el.sensitiveType}</span>
                        <span class="list-item-sub">Protected on ${data.url || 'current page'}</span>
                    </div>
                    <div class="list-item-right tag-safe">REDACTED</div>
                </div>
            `;
        });
    }
    
    updateJsonView();
}

function updateJsonView() {
    if (!currentAnalysisData) return;
    const safeData = JSON.parse(JSON.stringify(currentAnalysisData));
    if (safeData.elements) {
        safeData.elements = safeData.elements.map(el => {
            if (el.sensitive && !el.value.startsWith('[')) el.value = `[${el.sensitiveType}]`;
            return el;
        });
    }
    const jView = document.getElementById('json-view');
    if (jView) jView.value = JSON.stringify(safeData, null, 2);
}

const dbgBtn = document.getElementById('btn-debug-toggle');
if (dbgBtn) {
    dbgBtn.addEventListener('click', () => {
        const sec = document.getElementById('debug-section');
        sec.style.display = sec.style.display === 'block' ? 'none' : 'block';
    });
}
