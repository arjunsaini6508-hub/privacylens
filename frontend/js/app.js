document.addEventListener('DOMContentLoaded', () => {
    // --- MOCK DATA / STORAGE ADAPTER ---
    // Safely handles storage whether in Chrome Extension context or localhost testing
    const AppStorage = {
        get: (keys, callback) => {
            if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
                chrome.storage.local.get(keys, callback);
            } else {
                // Fallback to localStorage for localhost testing
                const result = {};
                keys.forEach(k => {
                    const val = localStorage.getItem('privacylens_' + k);
                    if (val) result[k] = JSON.parse(val);
                });
                callback(result);
            }
        },
        set: (data, callback) => {
            if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
                chrome.storage.local.set(data, callback);
            } else {
                Object.keys(data).forEach(k => {
                    localStorage.setItem('privacylens_' + k, JSON.stringify(data[k]));
                });
                if(callback) callback();
            }
        }
    };

    // --- NAVIGATION LOGIC ---
    const navItems = document.querySelectorAll('.nav-item');
    const viewSections = document.querySelectorAll('.view-section');
    const headerTitle = document.getElementById('header-title');
    const headerSubtitle = document.getElementById('header-subtitle');

    const viewTitles = {
        'overview': { title: 'Dashboard Overview', sub: 'Monitor local privacy protection and agent activity.' },
        'pii': { title: 'PII Detections', sub: 'Detailed breakdown of redacted sensitive data.' },
        'network': { title: 'Network Activity', sub: 'Analysis of intercepted and monitored requests.' },
        'settings': { title: 'Agent Settings', sub: 'Configure local privacy protection behaviors.' },
        'history': { title: 'Redaction History', sub: 'Complete log of protective actions taken.' }
    };

    function switchView(viewId) {
        // Update nav active state (ignore history view since it has no nav item)
        navItems.forEach(item => {
            if (item.dataset.view === viewId) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });

        // Hide all views, show targeted one
        viewSections.forEach(section => {
            if (section.id === `view-${viewId}`) {
                section.style.display = 'block';
                // Add a small fade-in effect
                section.style.opacity = '0';
                setTimeout(() => section.style.opacity = '1', 10);
                section.style.transition = 'opacity 0.3s ease';
            } else {
                section.style.display = 'none';
            }
        });

        // Update headers
        if (viewTitles[viewId]) {
            headerTitle.textContent = viewTitles[viewId].title;
            headerSubtitle.textContent = viewTitles[viewId].sub;
        }
    }

    // Attach click listeners to nav items
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const viewId = item.dataset.view;
            if (viewId) switchView(viewId);
        });
    });

    // View All button
    document.getElementById('btn-view-all').addEventListener('click', () => {
        switchView('history');
    });

    // --- DATA POPULATION & LOGIC ---
    
    // Mock Data for localhost demonstration
    const mockData = {
        lastAnalysis: {
            pageType: "checkout",
            timestamp: Date.now() - 120000,
            privacyScore: 94,
            networkStats: { total: 124, firstParty: 80, thirdParty: 44 },
            redactions: [
                { category: 'Email', page: 'checkout.html', time: Date.now() - 120000, action: 'Redacted', typeClass: 'email-icon', icon: '📧' },
                { category: 'Credit Card', page: 'checkout.html', time: Date.now() - 300000, action: 'Redacted', typeClass: 'cc-icon', icon: '💳' },
                { category: 'Password', page: 'login.html', time: Date.now() - 3600000, action: 'Redacted', typeClass: 'pass-icon', icon: '🔑' },
                { category: 'Phone', page: 'profile.html', time: Date.now() - 7200000, action: 'Redacted', typeClass: 'pass-icon', icon: '📱' },
                { category: 'Email', page: 'newsletter.html', time: Date.now() - 86400000, action: 'Redacted', typeClass: 'email-icon', icon: '📧' }
            ]
        },
        settings: {
            detectPII: true,
            autoRedact: false,
            trackNetwork: true
        }
    };

    function loadDashboardData() {
        AppStorage.get(['lastAnalysis', 'settings'], (result) => {
            const data = result.lastAnalysis || mockData.lastAnalysis;
            const settings = result.settings || mockData.settings;

            // Overview Update
            document.getElementById('overview-score').textContent = data.privacyScore || 0;
            document.getElementById('overview-score-bar').style.width = `${data.privacyScore || 0}%`;
            document.getElementById('overview-pii-count').textContent = data.redactions ? data.redactions.length : 0;
            
            if (data.networkStats) {
                document.getElementById('overview-network-total').textContent = data.networkStats.total;
                // Network View Update
                document.getElementById('net-total').textContent = data.networkStats.total;
                document.getElementById('net-first').textContent = data.networkStats.firstParty;
                document.getElementById('net-third').textContent = data.networkStats.thirdParty;
            }

            // Settings Update
            document.getElementById('setting-detect-pii').checked = settings.detectPII;
            document.getElementById('setting-auto-redact').checked = settings.autoRedact;
            document.getElementById('setting-track-network').checked = settings.trackNetwork;

            // PII Detections Stats
            if (data.redactions) {
                const piiStats = { Email: 0, Password: 0, 'Credit Card': 0, Phone: 0 };
                data.redactions.forEach(r => {
                    if (piiStats[r.category] !== undefined) piiStats[r.category]++;
                });
                document.getElementById('pii-emails').textContent = piiStats.Email;
                document.getElementById('pii-passwords').textContent = piiStats.Password;
                document.getElementById('pii-cc').textContent = piiStats['Credit Card'];
                document.getElementById('pii-phones').textContent = piiStats.Phone;
            }

            // Populate Lists
            populateActivityList(data.redactions || [], 'recent-redactions-list', 3);
            populateActivityList(data.redactions || [], 'history-redactions-list', null);
        });
    }

    function formatTimeAgo(ms) {
        const diff = Date.now() - ms;
        const mins = Math.floor(diff / 60000);
        if (mins < 60) return `${mins} mins ago`;
        const hours = Math.floor(mins / 60);
        if (hours < 24) return `${hours} hours ago`;
        return `${Math.floor(hours / 24)} days ago`;
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
        list.innerHTML = '';
        
        const itemsToShow = limit ? redactions.slice(0, limit) : redactions;

        itemsToShow.forEach(item => {
            const li = document.createElement('li');
            li.className = 'activity-item';
            li.style.cursor = 'pointer';
            
            li.innerHTML = `
                <div class="activity-icon ${escapeHtml(item.typeClass)}">${escapeHtml(item.icon)}</div>
                <div class="activity-details">
                    <h4>${escapeHtml(item.category)} Protected</h4>
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
        
        content.innerHTML = `
            <p><strong>Category:</strong> ${escapeHtml(item.category)}</p>
            <p><strong>Action Taken:</strong> <span style="color:var(--success)">${escapeHtml(item.action)}</span></p>
            <p><strong>Location:</strong> ${escapeHtml(item.page)}</p>
            <p><strong>Time:</strong> ${escapeHtml(new Date(item.time).toLocaleString())}</p>
            <div style="margin-top:16px; padding:8px; background:rgba(239, 68, 68, 0.1); border-left:3px solid var(--danger); font-size:0.875rem;">
                Raw value was redacted locally and never stored.
            </div>
        `;
        
        modal.style.display = 'flex';
    }

    // Settings Save Event
    document.getElementById('btn-save-settings').addEventListener('click', () => {
        const newSettings = {
            detectPII: document.getElementById('setting-detect-pii').checked,
            autoRedact: document.getElementById('setting-auto-redact').checked,
            trackNetwork: document.getElementById('setting-track-network').checked
        };
        
        AppStorage.set({ settings: newSettings }, () => {
            const btn = document.getElementById('btn-save-settings');
            const origText = btn.textContent;
            btn.textContent = 'Saved!';
            btn.style.background = 'var(--success)';
            setTimeout(() => {
                btn.textContent = origText;
                btn.style.background = 'var(--accent-blue)';
            }, 2000);
        });
    });

    // Chart Animation
    const bars = document.querySelectorAll('.bar');
    setInterval(() => {
        bars.forEach(bar => {
            const currentHeight = parseFloat(bar.style.height) || 50;
            const fluctuation = (Math.random() - 0.5) * 15;
            let newHeight = currentHeight + fluctuation;
            if (newHeight > 100) newHeight = 100;
            if (newHeight < 20) newHeight = 20;
            bar.style.height = `${newHeight}%`;
        });
    }, 3000);

    // Initial Load
    loadDashboardData();
});
