// privacy-score.js

const PrivacyScoreCalculator = {
    calculate(analysisData) {
        let score = 100;
        let breakdown = [];
        
        let piiPenalty = 0;
        let networkPenalty = 0;
        
        // PII Severities
        if (analysisData.elements && Array.isArray(analysisData.elements)) {
            const sensitiveEls = analysisData.elements.filter(e => e.sensitive);
            sensitiveEls.forEach(el => {
                const type = el.sensitiveType || 'UNKNOWN';
                if (type === 'CREDIT_CARD' || type === 'PAN') piiPenalty += 15;
                else if (type === 'PASSWORD') piiPenalty += 10;
                else if (type === 'PHONE') piiPenalty += 5;
                else piiPenalty += 3; // Email, Name, etc.
            });
            
            if (piiPenalty > 0) {
                // Check for redaction bonus
                const redactedCount = sensitiveEls.filter(e => e.value && e.value.startsWith('[')).length;
                let bonus = 0;
                if (redactedCount > 0) {
                    const ratio = redactedCount / sensitiveEls.length;
                    bonus = Math.floor(piiPenalty * ratio * 0.8); // 80% of penalty is refunded if redacted
                }
                
                piiPenalty = Math.min(60, piiPenalty); // Cap PII penalty at 60
                score -= piiPenalty;
                breakdown.push({ label: 'PII Risk', value: `-${piiPenalty}`, penalty: true });
                
                if (bonus > 0) {
                    score += bonus;
                    breakdown.push({ label: 'Protection/Redaction', value: `+${bonus}`, penalty: false });
                }
            }
        }
        
        // Network Penalties
        const network = analysisData.network;
        if (network && network.thirdParty > 0) {
            // 1 point per 3 requests, max 20 penalty
            networkPenalty = Math.floor(network.thirdParty / 3);
            networkPenalty = Math.min(20, Math.max(1, networkPenalty)); // At least 1 if thirdParty > 0
            
            if (networkPenalty > 0) {
                score -= networkPenalty;
                breakdown.push({ label: 'Third-party Risk', value: `-${networkPenalty}`, penalty: true });
            }
        }
        
        if (breakdown.length === 0) {
            breakdown.push({ label: 'No significant risks', value: '+0', penalty: false });
        }
        
        return {
            score: Math.max(0, Math.min(100, score)),
            breakdown: breakdown
        };
    }
};

if (typeof window !== 'undefined') {
    window.PrivacyScoreCalculator = PrivacyScoreCalculator;
}
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PrivacyScoreCalculator;
}
