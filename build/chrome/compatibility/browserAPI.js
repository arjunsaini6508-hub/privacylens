/**
 * PrivacyLens AI - Browser Compatibility Layer
 * This wrapper abstracts browser-specific APIs (chrome.* vs browser.*) 
 * allowing the exact same codebase to run on Chromium, Firefox, and Safari.
 */

const isFirefox = typeof browser !== 'undefined' && typeof browser.runtime !== 'undefined';
const ext = isFirefox ? browser : chrome;

// Production dashboard URL can be injected via build step or environment. 
// For now, we fallback to production default if not localhost.
const isDev = true; 
const DASHBOARD_URL = isDev ? "http://localhost:3000" : "https://dashboard.privacylens.ai";

const browserAPI = {
    runtime: ext.runtime,
    storage: ext.storage,
    tabs: ext.tabs,
    windows: ext.windows,
    webRequest: ext.webRequest,
    action: ext.action || ext.browserAction,
    scripting: ext.scripting,
    
    // Config
    config: {
        dashboardUrl: DASHBOARD_URL,
        dashboardApiUrl: `${DASHBOARD_URL}/api`,
        isFirefox: !!isFirefox
    }
};

// Export based on environment
if (typeof module !== 'undefined' && module.exports) {
    module.exports = browserAPI;
} else if (typeof window !== 'undefined') {
    window.browserAPI = browserAPI;
} else if (typeof globalThis !== 'undefined') {
    globalThis.browserAPI = browserAPI;
} else {
    // Fallback for some worker environments
    self.browserAPI = browserAPI;
}
