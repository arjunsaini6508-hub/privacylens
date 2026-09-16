console.log("PrivacyLens AI: Background Service Worker initialized.");

let networkStats = {
    total: 0,
    firstParty: 0,
    thirdParty: 0,
    tabIdMap: {} // Map tabId to their stats
};

chrome.webRequest.onCompleted.addListener(
    (details) => {
        // Only track for main_frame or sub_frame or xmlhttprequest etc.
        // For privacy, we only record the count and party classification.
        if (details.tabId === -1) return;
        
        try {
            const requestUrl = new URL(details.url);
            
            // Get the tab to determine if it's 1st or 3rd party
            chrome.tabs.get(details.tabId, (tab) => {
                if (chrome.runtime.lastError || !tab || !tab.url) return;
                
                if (tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) return;
                
                const tabUrl = new URL(tab.url);
                
                if (!networkStats.tabIdMap[details.tabId]) {
                    networkStats.tabIdMap[details.tabId] = { total: 0, firstParty: 0, thirdParty: 0 };
                }
                
                const stats = networkStats.tabIdMap[details.tabId];
                stats.total++;
                
                if (requestUrl.hostname.endsWith(tabUrl.hostname) || tabUrl.hostname.endsWith(requestUrl.hostname)) {
                    stats.firstParty++;
                } else {
                    stats.thirdParty++;
                }
            });
        } catch(e) {
            // Ignore malformed URLs
        }
    },
    { urls: ["<all_urls>"] }
);

// Listen for tab updates to reset stats
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'loading') {
        networkStats.tabIdMap[tabId] = { total: 0, firstParty: 0, thirdParty: 0 };
    }
});

// Provide stats to popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === "GET_NETWORK_STATS") {
        const stats = request.tabId ? (networkStats.tabIdMap[request.tabId] || { total: 0, firstParty: 0, thirdParty: 0 }) : networkStats;
        sendResponse({ type: "NETWORK_STATS", data: stats });
    }
    return true;
});

chrome.runtime.onInstalled.addListener(() => {
    console.log("Extension installed.");
});
