const fs = require('fs');
const path = require('path');

// Load dependencies into global scope for tests
const piiDetectorCode = fs.readFileSync(path.resolve(__dirname, '../extension/content/pii-detector.js'), 'utf8');
const domAnalyzerCode = fs.readFileSync(path.resolve(__dirname, '../extension/content/dom-analyzer.js'), 'utf8');
eval(piiDetectorCode);
eval(domAnalyzerCode);

describe('DOM Analyzer Tests', () => {
    beforeEach(() => {
        document.body.innerHTML = `
            <div id="test-container">
                <input type="text" id="visible-input" value="normal text" />
                <input type="password" id="pass-input" value="secret123" />
                <p id="leak-paragraph">My email is test@example.com</p>
                <button id="btn-submit">Continue</button>
            </div>
        `;
        
        // Mock getBoundingClientRect
        window.HTMLElement.prototype.getBoundingClientRect = function() {
            return { x: 10, y: 10, width: 100, height: 20, top: 10, right: 110, bottom: 30, left: 10 };
        };
        
        Object.defineProperty(window, 'innerWidth', {writable: true, configurable: true, value: 1024});
        Object.defineProperty(window, 'innerHeight', {writable: true, configurable: true, value: 768});
    });

    test('detects visible elements correctly', () => {
        const input = document.getElementById('visible-input');
        expect(isElementVisible(input)).toBe(true);
    });

    test('detects passwords and redacts them', () => {
        const info = getElementInfo(document.getElementById('pass-input'));
        expect(info.sensitive).toBe(true);
        expect(info.value).toBe('[PASSWORD]');
        expect(info.text).toBe('[PASSWORD]');
        expect(info.value).not.toContain('secret123');
    });

    test('REGRESSION: redacts text content in non-input elements to prevent raw PII leak', () => {
        const pElement = document.getElementById('leak-paragraph');
        const info = getElementInfo(pElement);
        
        expect(info.sensitive).toBe(true);
        
        // The text property MUST be redacted and not contain the raw email
        expect(info.text).toBe('[EMAIL]');
        expect(info.text).not.toContain('test@example.com');
    });
});
