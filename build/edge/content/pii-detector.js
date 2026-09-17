// pii-detector.js

const PII_RULES = [
    { type: 'EMAIL', regex: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g },
    { type: 'PHONE', regex: /(?:(?:\+|0{0,2})91(\s*[\-]\s*)?|[0]?)?[6789]\d{9}/g }, // basic indian phone regex
    { type: 'CREDIT_CARD', regex: /\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|6(?:011|5[0-9][0-9])[0-9]{12}|3[47][0-9]{13}|3(?:0[0-5]|[68][0-9])[0-9]{11}|(?:2131|1800|35\d{3})\d{11})\b/g },
    { type: 'AADHAAR', regex: /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g },
    { type: 'PAN', regex: /[A-Z]{5}[0-9]{4}[A-Z]{1}/g },
    { type: 'API_KEY', regex: /sk-[a-zA-Z0-9]{20,}/g },
    { type: 'PINCODE', regex: /\b^[1-9][0-9]{5}$\b/g },
    // IP_ADDRESS
    { type: 'IP_ADDRESS', regex: /\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b/g }
];

const PIIDetector = {
    detectInText(text) {
        if (!text) return null;
        for (const rule of PII_RULES) {
            // Need to reset lastIndex if we use /g and reuse the regex object, but here we just .match()
            if (text.match(rule.regex)) {
                return rule.type;
            }
        }
        return null;
    },
    
    detectElement(element, labelText) {
        let isSensitive = false;
        let sensitiveType = null;
        
        const tagName = element.tagName.toLowerCase();
        
        if (tagName === 'input' || tagName === 'textarea') {
            const type = (element.type || '').toLowerCase();
            const autocomplete = (element.getAttribute('autocomplete') || '').toLowerCase();
            const name = (element.name || '').toLowerCase();
            const id = (element.id || '').toLowerCase();
            const label = (labelText || '').toLowerCase();
            const placeholder = (element.placeholder || '').toLowerCase();
            
            const combinedContext = `${autocomplete} ${name} ${id} ${label} ${placeholder}`;
            
            if (type === 'password' || combinedContext.includes('password') || combinedContext.includes('passcode')) {
                isSensitive = true;
                sensitiveType = 'PASSWORD';
            } else if (autocomplete.includes('email') || type === 'email' || combinedContext.includes('email')) {
                isSensitive = true;
                sensitiveType = 'EMAIL';
            } else if (autocomplete.includes('tel') || type === 'tel' || combinedContext.includes('phone') || combinedContext.includes('mobile')) {
                isSensitive = true;
                sensitiveType = 'PHONE';
            } else if (autocomplete.includes('cc-') || combinedContext.includes('card number') || combinedContext.includes('credit card') || combinedContext.includes('debit card')) {
                isSensitive = true;
                sensitiveType = 'CREDIT_CARD';
            } else if (combinedContext.includes('aadhaar') || combinedContext.includes('aadhar')) {
                isSensitive = true;
                sensitiveType = 'AADHAAR';
            } else if (combinedContext.includes('pan card') || combinedContext.match(/\bpan\b/)) {
                isSensitive = true;
                sensitiveType = 'PAN';
            } else if (autocomplete.includes('name') || combinedContext.includes('first name') || combinedContext.includes('last name') || combinedContext.match(/\bname\b/)) {
                isSensitive = true;
                sensitiveType = 'NAME';
            } else if (autocomplete.includes('street-address') || combinedContext.includes('address')) {
                isSensitive = true;
                sensitiveType = 'ADDRESS';
            } else if (autocomplete.includes('postal-code') || combinedContext.includes('pincode') || combinedContext.includes('zip code')) {
                isSensitive = true;
                sensitiveType = 'PINCODE';
            } else if (combinedContext.includes('dob') || combinedContext.includes('date of birth') || combinedContext.includes('birth date')) {
                isSensitive = true;
                sensitiveType = 'DATE_OF_BIRTH';
            }
            
            // Check value with regex if heuristics didn't catch it and it has a value
            if (!isSensitive && element.value) {
                const textType = this.detectInText(element.value);
                if (textType) {
                    isSensitive = true;
                    sensitiveType = textType;
                }
            }
        } else {
            const textContent = element.innerText || element.textContent || '';
            if (textContent) {
                const textType = this.detectInText(textContent);
                if (textType) {
                    isSensitive = true;
                    sensitiveType = textType;
                }
            }
        }
        
        return { isSensitive, sensitiveType };
    }
};

if (typeof window !== 'undefined') {
    window.PIIDetector = PIIDetector;
}
