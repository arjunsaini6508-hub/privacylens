// redactor.js

const Redactor = {
    redactElement(element, type) {
        if (!element) return false;
        
        let redactedCount = 0;
        
        if (element.tagName.toLowerCase() === 'input' || element.tagName.toLowerCase() === 'textarea') {
            // Store original locally on the DOM node for session (never storage)
            if (!element.hasAttribute('data-privacylens-original-val')) {
                element.setAttribute('data-privacylens-original-val', element.value);
            }
            
            // Only redact if it has a value
            if (element.value && element.value !== `[${type}]`) {
                element.value = `[${type}]`;
                redactedCount = 1;
            }
        } else {
            // Text node redaction
            // Implementation for text nodes would go here using tree walker
            // For now we focus on inputs
        }
        
        return redactedCount;
    },
    
    redactAll(analyzedElements) {
        let totalRedacted = 0;
        
        analyzedElements.forEach(info => {
            if (info.sensitive && info.id) {
                const el = document.querySelector(`[data-privacylens-id="${info.id}"]`);
                if (el) {
                    totalRedacted += this.redactElement(el, info.sensitiveType);
                }
            }
        });
        
        return totalRedacted;
    }
};

if (typeof window !== 'undefined') {
    window.Redactor = Redactor;
}
