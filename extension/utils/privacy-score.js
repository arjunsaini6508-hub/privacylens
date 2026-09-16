// privacy-score.js

const PrivacyScoreCalculator = {
    calculate(analysisData) {
        let score = 100;
        let reasons = [];
        
        const sensitiveCount = analysisData.sensitiveElements || 0;
        const totalElements = analysisData.totalElements || 0;
        const redactedCount = analysisData.redactedElements || 0;
        
        // Base penalty for having sensitive fields
        if (sensitiveCount > 0) {
            if (redactedCount >= sensitiveCount) {
                // If they are all redacted, don't penalize as much
                score -= 5;
                reasons.push("+ Sensitive fields detected but redacted locally");
            } else {
                const penalty = Math.min(30, sensitiveCount * 5);
                score -= penalty;
                reasons.push(`- ${sensitiveCount} sensitive fields detected on page`);
            }
        } else {
            reasons.push("+ No sensitive fields detected locally");
        }
        
        // Analyze specific types if available
        let hasPayment = false;
        let hasPassword = false;
        
        if (analysisData.elements) {
            analysisData.elements.forEach(el => {
                if (el.sensitiveType === 'CREDIT_CARD' || el.sensitiveType === 'PAN') hasPayment = true;
                if (el.sensitiveType === 'PASSWORD') hasPassword = true;
            });
        }
        
        if (hasPayment) {
            score -= 10;
            reasons.push("- Payment information present");
        }
        if (hasPassword) {
            score -= 5;
            reasons.push("- Password field present");
        }
        
        // Network deductions (assumes background script injects this)
        const network = analysisData.network || { thirdParty: 0 };
        if (network.thirdParty > 0) {
            const netPenalty = Math.min(20, network.thirdParty * 2);
            score -= netPenalty;
            reasons.push(`- ${network.thirdParty} third-party destinations detected`);
        } else {
            reasons.push("+ No third-party network requests detected");
        }
        
        return {
            score: Math.max(0, Math.min(100, score)),
            reasons: reasons
        };
    }
};

if (typeof window !== 'undefined') {
    window.PrivacyScoreCalculator = PrivacyScoreCalculator;
}
