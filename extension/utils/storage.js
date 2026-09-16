// storage.js
// Centralized storage utility to ensure PII is NEVER stored.

const StorageUtils = {
    async saveAnalysis(data) {
        // SECURITY CHECK: Strip actual elements or ensure they are redacted
        // Only saving metadata for safety
        const safeMetadata = {
            pageType: data.pageType,
            timestamp: data.timestamp,
            totalElements: data.totalElements,
            visibleElements: data.visibleElements,
            sensitiveElements: data.sensitiveElements,
            privacyScore: data.privacyScore || 0,
            networkStats: data.network || { total: 0, firstParty: 0, thirdParty: 0 }
        };
        
        return new Promise((resolve) => {
            chrome.storage.local.set({ lastAnalysis: safeMetadata }, () => {
                resolve(safeMetadata);
            });
        });
    },
    
    async getAnalysis() {
        return new Promise((resolve) => {
            chrome.storage.local.get(['lastAnalysis'], (result) => {
                resolve(result.lastAnalysis || null);
            });
        });
    },

    async clearAnalysis() {
        return new Promise((resolve) => {
            chrome.storage.local.remove(['lastAnalysis'], () => {
                resolve(true);
            });
        });
    },
    
    async getSettings() {
        return new Promise((resolve) => {
            chrome.storage.local.get(['settings'], (result) => {
                const defaultSettings = {
                    detectPII: true,
                    autoRedact: false, // Must be OFF by default
                    trackNetwork: true
                };
                resolve(result.settings || defaultSettings);
            });
        });
    },
    
    async saveSettings(settings) {
        return new Promise((resolve) => {
            chrome.storage.local.set({ settings }, () => resolve(true));
        });
    }
};

// Make available globally if loaded in content script, or export for ES modules
if (typeof window !== 'undefined') {
    window.StorageUtils = StorageUtils;
}
