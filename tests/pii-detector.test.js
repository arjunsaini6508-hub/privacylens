const fs = require('fs');
const path = require('path');

// Load PIIDetector into global scope for tests
const piiDetectorCode = fs.readFileSync(path.resolve(__dirname, '../extension/content/pii-detector.js'), 'utf8');
eval(piiDetectorCode);

describe('PII Detector', () => {
    test('detects email in text', () => {
        expect(PIIDetector.detectInText('My email is student@example.com')).toBe('EMAIL');
    });

    test('detects phone in text', () => {
        expect(PIIDetector.detectInText('Call me at 9876543210')).toBe('PHONE');
    });

    test('detects credit card in text', () => {
        expect(PIIDetector.detectInText('Card: 4111111111111111')).toBe('CREDIT_CARD');
    });

    test('detects email element by type', () => {
        document.body.innerHTML = '<input type="email" id="e1" />';
        const el = document.getElementById('e1');
        const res = PIIDetector.detectElement(el, '');
        expect(res.isSensitive).toBe(true);
        expect(res.sensitiveType).toBe('EMAIL');
    });

    test('detects password element', () => {
        document.body.innerHTML = '<input type="password" id="p1" value="secret123" />';
        const el = document.getElementById('p1');
        const res = PIIDetector.detectElement(el, '');
        expect(res.isSensitive).toBe(true);
        expect(res.sensitiveType).toBe('PASSWORD');
        
        // Security check
        const json = JSON.stringify(res);
        expect(json).not.toContain('secret123');
    });
});
