import browserAPI from '../compatibility/browserAPI.js';

console.log("PrivacyLens AI: Background Service Worker initialized.");

let networkStats = {
    total: 0,
    firstParty: 0,
    thirdParty: 0,
    tabIdMap: {} // Map tabId to their stats
};

browserAPI.webRequest.onCompleted.addListener(
    (details) => {
        // Only track for main_frame or sub_frame or xmlhttprequest etc.
        // For privacy, we only record the count and party classification.
        if (details.tabId === -1) return;
        
        try {
            const requestUrl = new URL(details.url);
            
            // Get the tab to determine if it's 1st or 3rd party
            browserAPI.tabs.get(details.tabId, (tab) => {
                if (browserAPI.runtime.lastError || !tab || !tab.url) return;
                
                if (tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) return;
                
                const tabUrl = new URL(tab.url);
                
                if (!networkStats.tabIdMap[details.tabId]) {
                    networkStats.tabIdMap[details.tabId] = { total: 0, firstParty: 0, thirdParty: 0, recentRequests: [] };
                }
                
                const stats = networkStats.tabIdMap[details.tabId];
                stats.total++;
                
                // Helper to extract base domain (e.g. www.example.co.uk -> example.co.uk)
                const getBaseDomain = (hostname) => {
                    const parts = hostname.split('.');
                    if (parts.length <= 2) return hostname;
                    const tld = parts[parts.length - 1];
                    const sld = parts[parts.length - 2];
                    if ((tld.length === 2 && sld.length <= 3) || ['com', 'org', 'net', 'edu', 'gov'].includes(sld)) {
                        if (parts.length >= 3) return parts.slice(-3).join('.');
                    }
                    return parts.slice(-2).join('.');
                };
                
                const reqBase = getBaseDomain(requestUrl.hostname);
                const tabBase = getBaseDomain(tabUrl.hostname);
                
                // Protocols like data: and blob: belong to the page. Localhost is usually 1st party.
                const isFirstParty = (reqBase === tabBase) || 
                                     ['data:', 'blob:', 'chrome-extension:'].includes(requestUrl.protocol) ||
                                     requestUrl.hostname === 'localhost' || requestUrl.hostname === '127.0.0.1';
                
                if (isFirstParty) {
                    stats.firstParty++;
                } else {
                    stats.thirdParty++;
                }
                
                // Track detailed request history (bounded to 50 for performance)
                stats.recentRequests.unshift({
                    url: details.url,
                    domain: requestUrl.hostname || requestUrl.protocol,
                    type: details.type || 'unknown',
                    firstParty: isFirstParty,
                    partyType: isFirstParty ? 'First-party' : 'Third-party',
                    timestamp: Date.now()
                });
                
                if (stats.recentRequests.length > 50) {
                    stats.recentRequests.pop();
                }
                
                // Debug logging as requested
                console.log(`[PrivacyLens] Current page: ${tabUrl.href}`);
                console.log(`[PrivacyLens] Total: ${stats.total}`);
                console.log(`[PrivacyLens] First-party: ${stats.firstParty}`);
                console.log(`[PrivacyLens] Third-party: ${stats.thirdParty}`);
                console.assert(stats.total === stats.firstParty + stats.thirdParty, "Invariant failed: Total != 1st + 3rd");
                
            });
        } catch(e) {
            // Ignore malformed URLs
        }
    },
    { urls: ["<all_urls>"] }
);

// Listen for tab updates to reset stats
browserAPI.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'loading') {
        networkStats.tabIdMap[tabId] = { total: 0, firstParty: 0, thirdParty: 0 };
    }
});

// Provide stats to popup
browserAPI.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === "GET_NETWORK_STATS") {
        const stats = request.tabId ? (networkStats.tabIdMap[request.tabId] || { total: 0, firstParty: 0, thirdParty: 0 }) : networkStats;
        sendResponse({ type: "NETWORK_STATS", data: stats });
    } else if (request.type === "AUTO_ANALYSIS_COMPLETE") {
        const tabId = sender.tab ? sender.tab.id : null;
        if (tabId) {
            const stats = networkStats.tabIdMap[tabId] || { total: 0, firstParty: 0, thirdParty: 0 };
            const data = request.data;
            
            // Forward complete stats to dashboard backend SSOT
            data.network = stats;
            if (sender.tab && sender.tab.url) data.url = sender.tab.url;
            if (!data.timestamp) data.timestamp = Date.now();
            
            fetch(`${browserAPI.config.dashboardApiUrl}/dashboard/update`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            }).catch(() => {});
        }
    }
    return true;
});

browserAPI.runtime.onInstalled.addListener(() => {
    console.log("Extension installed.");
});
