document.addEventListener('DOMContentLoaded', () => {
    // --- NAVIGATION LOGIC ---
    const navItems = document.querySelectorAll('.nav-item');
    const viewSections = document.querySelectorAll('.view-section');
    const headerTitle = document.getElementById('header-title');
    const headerSubtitle = document.getElementById('header-subtitle');

    const viewTitles = {
        'overview': { title: 'Good morning, Arjun 👋', sub: 'Here\'s your privacy overview for today.' },
        'pii': { title: 'PII Detections', sub: 'Detailed breakdown of redacted sensitive data.' },
        'network': { title: 'Network Activity', sub: 'Analysis of intercepted and monitored requests.' },
        'settings': { title: 'Agent Settings', sub: 'Configure local privacy protection behaviors.' },
        'history': { title: 'Redaction History', sub: 'Complete log of protective actions taken.' }
    };

    function switchView(viewId) {
        navItems.forEach(item => {
            if (item.dataset.view === viewId) item.classList.add('active');
            else item.classList.remove('active');
        });

        viewSections.forEach(section => {
            if (section.id === `view-${viewId}`) {
                section.style.display = 'block';
                section.style.opacity = '0';
                setTimeout(() => section.style.opacity = '1', 10);
            } else {
                section.style.display = 'none';
            }
        });

        if (viewTitles[viewId]) {
            headerTitle.textContent = viewTitles[viewId].title;
            headerSubtitle.textContent = viewTitles[viewId].sub;
        }
    }

    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const viewId = item.dataset.view;
            if (viewId) switchView(viewId);
        });
    });

    const btnViewAll = document.getElementById('btn-view-all');
    if (btnViewAll) {
        btnViewAll.addEventListener('click', () => switchView('history'));
    }

    // --- DATA SYNCHRONIZATION via SSE ---
    function formatTimeAgo(ms) {
        if (!ms || isNaN(ms)) return "Time unavailable";
        const diff = Date.now() - ms;
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return `just now`;
        if (mins < 60) return `${mins} min${mins === 1 ? '' : 's'} ago`;
        const hours = Math.floor(mins / 60);
        if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
        return `${Math.floor(hours / 24)} day${Math.floor(hours / 24) === 1 ? '' : 's'} ago`;
    }

    function escapeHtml(unsafe) {
        return (unsafe || '').toString()
             .replace(/&/g, "&amp;")
             .replace(/</g, "&lt;")
             .replace(/>/g, "&gt;")
             .replace(/"/g, "&quot;")
             .replace(/'/g, "&#039;");
    }

    function populateActivityList(redactions, elementId, limit) {
        const list = document.getElementById(elementId);
        if (!list) return;
        list.innerHTML = '';
        
        if (!redactions || redactions.length === 0) {
            list.innerHTML = '<li style="padding:16px; color:var(--text-secondary); text-align:center;">No sensitive data detected</li>';
            return;
        }
        
        const itemsToShow = limit ? redactions.slice(0, limit) : redactions;

        itemsToShow.forEach(item => {
            const li = document.createElement('li');
            li.className = 'activity-item';
            li.style.cursor = 'pointer';
            
            li.innerHTML = `
                <div class="activity-icon ${escapeHtml(item.typeClass)}">${escapeHtml(item.icon)}</div>
                <div class="activity-details">
                    <h4>${escapeHtml(item.category)} ${escapeHtml(item.action)}</h4>
                    <p>Found on ${escapeHtml(item.page)}</p>
                </div>
                <div class="activity-time">${escapeHtml(formatTimeAgo(item.time))}</div>
            `;
            
            li.addEventListener('click', () => showDetailsModal(item));
            list.appendChild(li);
        });
    }

    function showDetailsModal(item) {
        const modal = document.getElementById('details-modal');
        const content = document.getElementById('modal-content');
        if(!modal || !content) return;
        
        content.innerHTML = `
            <p><strong>Category:</strong> ${escapeHtml(item.category)}</p>
            <p><strong>Action Taken:</strong> <span style="color:var(--success)">${escapeHtml(item.action)}</span></p>
            <p><strong>Location:</strong> ${escapeHtml(item.page)}</p>
            <p><strong>Time:</strong> ${escapeHtml(new Date(item.time).toLocaleString())}</p>
        `;
        modal.style.display = 'flex';
    }
    
    function updateNetworkChart(nTotal, nFirst, nThird) {
        const containers = document.querySelectorAll('.network-chart-container, .sub-grid .bar-group');
        if (nTotal === 0) {
            containers.forEach(c => {
                if (c.classList.contains('network-chart-container')) {
                    c.innerHTML = '<div style="color:var(--text-secondary); font-size:0.875rem; padding-bottom:8px;">No network activity detected</div>';
                }
            });
            // Clear sub-grid mock chart
            const subChart = document.querySelector('.sub-grid > div > div[style*="height: 200px"]');
            if (subChart) {
                subChart.innerHTML = '<div style="width:100%; height:100%; display:flex; align-items:center; justify-content:center; color:var(--text-secondary);">No network activity data yet.</div>';
            }
            return;
        }

        // Render actual real bar
        const p1 = (nFirst / nTotal) * 100;
        const p3 = (nThird / nTotal) * 100;
        
        const mainChart = document.querySelector('.network-chart-container');
        if (mainChart) {
            mainChart.innerHTML = `
                <div class="bar-group" style="flex:1; display:flex; flex-direction:column; justify-content:flex-end; gap:2px; height:100%;">
                    <div class="bar-3p" style="height: ${p3}%; width:100%;" title="3rd-party: ${nThird}"></div>
                    <div class="bar-1p" style="height: ${p1}%; width:100%;" title="1st-party: ${nFirst}"></div>
                </div>
            `;
        }
        
        // Render sub-grid chart for the latest analysis
        const subChart = document.querySelector('.sub-grid > div > div[style*="height: 200px"]');
        if (subChart) {
            subChart.innerHTML = `
                <div class="bar-group" style="width:60px; margin:0 auto; display:flex; flex-direction:column; justify-content:flex-end; gap:4px; height:100%;">
                    <div class="bar-3p" style="height: ${p3}%; width:100%;" title="3rd-party: ${nThird}"></div>
                    <div class="bar-1p" style="height: ${p1}%; width:100%;" title="1st-party: ${nFirst}"></div>
                    <span style="font-size:0.75rem; color:var(--text-secondary); text-align:center; margin-top:8px;">Current</span>
                </div>
            `;
        }
    }

    function updateDashboard(globalState) {
        if (!globalState) return;
        
        const data = globalState.lastAnalysis;
        const settings = globalState.settings;

        if (settings) {
            const sDetect = document.getElementById('setting-detect-pii');
            const sAuto = document.getElementById('setting-auto-redact');
            const sNet = document.getElementById('setting-track-network');
            if (sDetect) sDetect.checked = settings.detectPII;
            if (sAuto) sAuto.checked = settings.autoRedact;
            if (sNet) sNet.checked = settings.trackNetwork;
        }

        if (!data) {
            document.getElementById('overview-score').textContent = "--";
            const statusEl = document.getElementById('overview-score-status');
            if (statusEl) {
                statusEl.innerHTML = 'Not analyzed';
                statusEl.style.color = 'inherit';
            }
            const bdContainer = document.getElementById('overview-score-breakdown');
            if (bdContainer) bdContainer.style.display = 'none';
            document.getElementById('overview-pii-count').textContent = "0";
            document.getElementById('overview-network-total').textContent = "0";
            document.getElementById('net-total').textContent = "0";
            document.getElementById('net-first').textContent = "0";
            document.getElementById('net-third').textContent = "0";
            document.getElementById('pii-emails').textContent = "0";
            document.getElementById('pii-passwords').textContent = "0";
            document.getElementById('pii-cc').textContent = "0";
            document.getElementById('pii-phones').textContent = "0";
            populateActivityList([], 'recent-redactions-list', 3);
            populateActivityList([], 'history-redactions-list', null);
            updateNetworkChart(0, 0, 0);
            return;
        }

        const score = data.privacyScore !== undefined ? data.privacyScore : "--";
        document.getElementById('overview-score').textContent = score;
        
        const statusEl = document.getElementById('overview-score-status');
        if (statusEl && score !== '--') {
            if (score >= 80) {
                statusEl.innerHTML = '<span>✓</span> Low Risk';
                statusEl.style.color = 'var(--success)';
            } else if (score >= 50) {
                statusEl.innerHTML = '<span>⚠</span> Moderate Risk';
                statusEl.style.color = 'var(--warning)';
            } else {
                statusEl.innerHTML = '<span>✕</span> High/Critical Risk';
                statusEl.style.color = 'var(--danger)';
            }
        } else if (statusEl) {
             statusEl.innerHTML = 'Not analyzed';
             statusEl.style.color = 'inherit';
        }
        
        const bdContainer = document.getElementById('overview-score-breakdown');
        if (bdContainer) {
            if (data.privacyBreakdown && data.privacyBreakdown.length > 0) {
                bdContainer.style.display = 'block';
                bdContainer.innerHTML = '<div style="font-weight:600; margin-bottom:12px;">Risk Breakdown</div>';
                data.privacyBreakdown.forEach(b => {
                    const color = b.penalty ? 'var(--danger)' : 'var(--success)';
                    bdContainer.innerHTML += `<div style="display:flex; justify-content:space-between; margin-bottom:8px;"><span>${b.label}</span><span style="color:${color}; font-weight:600;">${b.value}</span></div>`;
                });
            } else {
                bdContainer.style.display = 'none';
            }
        }
        
        let redactionsList = [];
        if (data.elements && Array.isArray(data.elements)) {
             const sensitiveEls = data.elements.filter(e => e.sensitive);
             redactionsList = sensitiveEls.map(e => {
                 let icon = '📄';
                 let typeClass = '';
                 let category = e.sensitiveType || 'Unknown';
                 
                 if (category === 'EMAIL') { icon = '📧'; typeClass = 'email-icon'; }
                 else if (category === 'CREDIT_CARD') { icon = '💳'; typeClass = 'cc-icon'; }
                 else if (category === 'PASSWORD') { icon = '🔑'; typeClass = 'pass-icon'; }
                 else if (category === 'PHONE') { icon = '📱'; typeClass = 'pass-icon'; }
                 
                 const isRedacted = e.value && e.value.startsWith('[');
                 return {
                     category: category.replace('_', ' '),
                     page: data.url || data.pageType || 'Unknown Page',
                     time: data.timestamp || Date.now(),
                     action: isRedacted ? 'Redacted' : 'Detected',
                     typeClass,
                     icon
                 };
             });
        }
        
        document.getElementById('overview-pii-count').textContent = redactionsList.length;

        let nTotal = 0, nFirst = 0, nThird = 0;
        if (data.network) {
            nTotal = data.network.total || 0;
            nFirst = data.network.firstParty || 0;
            nThird = data.network.thirdParty || 0;
        }
        document.getElementById('overview-network-total').textContent = nTotal;
        document.getElementById('net-total').textContent = nTotal;
        document.getElementById('net-first').textContent = nFirst;
        document.getElementById('net-third').textContent = nThird;

        const piiStats = { 'EMAIL': 0, 'PASSWORD': 0, 'CREDIT CARD': 0, 'PHONE': 0 };
        redactionsList.forEach(r => {
            const cat = r.category.toUpperCase();
            if (piiStats[cat] !== undefined) piiStats[cat]++;
        });
        document.getElementById('pii-emails').textContent = piiStats['EMAIL'];
        document.getElementById('pii-passwords').textContent = piiStats['PASSWORD'];
        document.getElementById('pii-cc').textContent = piiStats['CREDIT CARD'];
        document.getElementById('pii-phones').textContent = piiStats['PHONE'];

        populateActivityList(redactionsList, 'recent-redactions-list', 3);
        populateActivityList(redactionsList, 'history-redactions-list', null);
        
        updateNetworkChart(nTotal, nFirst, nThird);
        
        // Populate Network Requests list
        const netList = document.getElementById('network-requests-list');
        if (netList) {
            netList.innerHTML = '';
            if (!data.network || !data.network.recentRequests || data.network.recentRequests.length === 0) {
                netList.innerHTML = '<li style="padding:16px; color:var(--text-secondary); text-align:center;">No network requests recorded yet.</li>';
            } else {
                data.network.recentRequests.forEach(req => {
                    const li = document.createElement('li');
                    li.className = 'activity-item';
                    const icon = req.partyType === 'First-party' ? '🟢' : '🟠';
                    const timeStr = new Date(req.timestamp).toLocaleTimeString();
                    li.innerHTML = `
                        <div class="activity-icon" style="background: ${req.partyType === 'First-party' ? 'var(--success-bg)' : 'var(--warning-bg)'}">${icon}</div>
                        <div class="activity-details">
                            <h4 style="word-break: break-all;">${escapeHtml(req.domain)}</h4>
                            <p>${escapeHtml(req.type)} • ${escapeHtml(req.partyType)}</p>
                        </div>
                        <div class="activity-time">${escapeHtml(timeStr)}</div>
                    `;
                    netList.appendChild(li);
                });
            }
        }
    }

    // Connect to SSE stream
    const evtSource = new EventSource('/api/dashboard/stream');
    evtSource.onmessage = function(event) {
        try {
            const globalState = JSON.parse(event.data);
            updateDashboard(globalState);
        } catch (e) {
            console.error("Error parsing stream data:", e);
        }
    };
    evtSource.onerror = function() {
        console.warn("SSE connection lost. Reconnecting...");
    };
});
