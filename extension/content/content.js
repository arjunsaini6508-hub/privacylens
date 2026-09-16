console.log("PrivacyLens AI: Content script loaded.");

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === "ANALYZE_PAGE") {
        try {
            const result = window.analyzePage();
            // Calculate privacy score locally
            if (window.PrivacyScoreCalculator) {
                const scoreResult = window.PrivacyScoreCalculator.calculate(result);
                result.privacyScore = scoreResult.score;
                result.privacyReasons = scoreResult.reasons;
            }
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
