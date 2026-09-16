let currentAnalysisData = null;
let currentTabId = null;

async function updateNetworkStats() {
    if (!currentTabId) return;
    chrome.runtime.sendMessage({ type: "GET_NETWORK_STATS", tabId: currentTabId }, (response) => {
        if (response && response.type === "NETWORK_STATS" && response.data) {
            document.getElementById('res-net-total').innerText = response.data.total;
            document.getElementById('res-net-1p').innerText = response.data.firstParty;
            document.getElementById('res-net-3p').innerText = response.data.thirdParty;
            
            if (currentAnalysisData) {
                currentAnalysisData.network = response.data;
                updateJsonView();
            }
        }
    });
}

document.getElementById('btn-analyze').addEventListener('click', async () => {
    const btn = document.getElementById('btn-analyze');
    btn.innerText = "Analyzing...";
    
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab) {
            btn.innerText = "Error: No active tab";
            return;
        }
        currentTabId = tab.id;
        
        chrome.tabs.sendMessage(tab.id, { type: "ANALYZE_PAGE" }, (response) => {
            btn.innerText = "Analyze Current Page";
            
            if (chrome.runtime.lastError) {
                console.error("Error sending message:", chrome.runtime.lastError);
                return;
            }
            
            if (response && response.type === "DOM_ANALYSIS_RESULT") {
                displayResults(response.data);
                updateNetworkStats();
            }
        });
    } catch (e) {
        console.error("Failed to analyze:", e);
        btn.innerText = "Analyze Current Page";
    }
});

document.getElementById('btn-redact').addEventListener('click', async () => {
    if (!currentTabId) return;
    
    const btn = document.getElementById('btn-redact');
    btn.innerText = "Redacting...";
    
    chrome.tabs.sendMessage(currentTabId, { type: "REDACT_SENSITIVE" }, (response) => {
        if (response && response.type === "REDACTION_RESULT") {
            btn.innerText = `Redacted ${response.count} items`;
            btn.style.background = '#10b981'; // Green
            setTimeout(() => {
                btn.innerText = "Redact Sensitive Values";
                btn.style.background = '#ef4444';
                // Trigger re-analyze to update view
                document.getElementById('btn-analyze').click();
            }, 2000);
        }
    });
});

function displayResults(data) {
    currentAnalysisData = data;
    
    document.getElementById('res-score').innerText = data.privacyScore !== undefined ? data.privacyScore : '--';
    
    const scoreColor = data.privacyScore >= 80 ? '#10b981' : (data.privacyScore >= 50 ? '#f59e0b' : '#ef4444');
    document.getElementById('res-score').style.color = scoreColor;
    
    document.getElementById('res-page').innerText = data.pageType || 'Unknown';
    document.getElementById('res-sensitive').innerText = `${data.sensitiveElements || 0} detected`;
    
    const listEl = document.getElementById('pii-list');
    listEl.innerHTML = '';
    
    if (data.sensitiveElements > 0) {
        listEl.style.display = 'block';
        document.getElementById('btn-redact').style.display = 'block';
        
        data.elements.filter(e => e.sensitive).forEach(el => {
            const item = document.createElement('div');
            item.className = 'element-item';
            
            const badge = document.createElement('span');
            badge.className = 'tag-badge';
            
            // If the element value matches the token, it means it is redacted
            if (el.value === `[${el.sensitiveType}]`) {
                badge.className += ' tag-safe';
                badge.innerText = '[REDACTED]';
            } else {
                badge.innerText = '[DETECTED]';
            }
            
            item.appendChild(badge);
            item.appendChild(document.createTextNode(` ${el.sensitiveType || 'UNKNOWN'}`));
            listEl.appendChild(item);
        });
    } else {
        listEl.style.display = 'none';
        document.getElementById('btn-redact').style.display = 'none';
    }
    
    updateJsonView();
}

function updateJsonView() {
    if (!currentAnalysisData) return;
    
    // Create a safe copy for JSON view that strictly excludes raw values of sensitive fields
    const safeData = JSON.parse(JSON.stringify(currentAnalysisData));
    if (safeData.elements) {
        safeData.elements = safeData.elements.map(el => {
            if (el.sensitive && !el.value.startsWith('[')) {
                el.value = `[${el.sensitiveType}]`;
            }
            return el;
        });
    }
    document.getElementById('json-view').value = JSON.stringify(safeData, null, 2);
}

document.getElementById('btn-debug-toggle').addEventListener('click', () => {
    const sec = document.getElementById('debug-section');
    sec.style.display = sec.style.display === 'block' ? 'none' : 'block';
});
