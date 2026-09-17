console.log("PrivacyLens AI: Content script loaded.");

function performAutoAnalysis() {
    try {
        if (typeof window.analyzePage !== 'function') return;
        const result = window.analyzePage();
        
        // Auto-redact if enabled in storage
        if (typeof browserAPI !== 'undefined' && browserAPI.storage && browserAPI.storage.local) {
            browserAPI.storage.local.get(['settings'], (storageRes) => {
                if (storageRes.settings && storageRes.settings.autoRedact && window.Redactor) {
                    const redactedCount = window.Redactor.redactAll(result.elements);
                    result.redactedElementsCount = redactedCount;
                }
                
                // Save locally
                if (window.StorageUtils) {
                    window.StorageUtils.saveAnalysis(result);
                }
                
                // Send to background for dashboard forwarding
                browserAPI.runtime.sendMessage({ type: "AUTO_ANALYSIS_COMPLETE", data: result }).catch(() => {});
            });
        }
    } catch (e) {
        console.error("[PrivacyLens] Auto-analysis error:", e);
    }
}

// Run initially
if (document.readyState === 'complete' || document.readyState === 'interactive') {
    setTimeout(performAutoAnalysis, 1000);
} else {
    window.addEventListener('DOMContentLoaded', () => setTimeout(performAutoAnalysis, 1000));
}

// Observe for SPA navigation
let lastUrl = location.href;
new MutationObserver(() => {
    if (location.href !== lastUrl) {
        lastUrl = location.href;
        setTimeout(performAutoAnalysis, 1000);
    }
}).observe(document, {subtree: true, childList: true});

browserAPI.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === "ANALYZE_PAGE") {
        try {
            const result = window.analyzePage();
            sendResponse({ type: "DOM_ANALYSIS_RESULT", data: result });
        } catch (e) {
            console.error("[PrivacyLens] Error analyzing page:", e);
            sendResponse({ type: "DOM_ANALYSIS_ERROR", error: e.toString() });
        }
    } else if (request.type === "REDACT_SENSITIVE") {
        try {
            const result = window.analyzePage(); // Get fresh analysis
            let redactedCount = 0;
            if (window.Redactor) {
                redactedCount = window.Redactor.redactAll(result.elements);
            }
            result.redactedElements = redactedCount;
            sendResponse({ type: "REDACTION_RESULT", count: redactedCount, data: result });
        } catch (e) {
            console.error("[PrivacyLens] Error redacting page:", e);
            sendResponse({ type: "REDACTION_ERROR", error: e.toString() });
        }
    }
    return true; // Keep message channel open for async response
});
