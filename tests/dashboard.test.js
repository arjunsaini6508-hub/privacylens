const fs = require('fs');
const path = require('path');

const appJsCode = fs.readFileSync(path.resolve(__dirname, '../frontend/js/app.js'), 'utf8');

describe('Dashboard XSS Prevention', () => {
    test('REGRESSION: escapes HTML in dashboard dynamic values', () => {
        // Extract the escapeHtml function from app.js using regex
        const match = appJsCode.match(/function escapeHtml\s*\([^)]*\)\s*\{[\s\S]*?\}/);
        expect(match).not.toBeNull();
        
        // Evaluate the function so we can test it directly
        eval(match[0]);
        
        // Verify it escapes malicious input correctly
        expect(escapeHtml('<script>alert(1)</script>')).toBe('&lt;script&gt;alert(1)&lt;/script&gt;');
        expect(escapeHtml('"><img src=x onerror=alert(1)>')).toBe('&quot;&gt;&lt;img src=x onerror=alert(1)&gt;');
        expect(escapeHtml('\'onclick=\'alert(1)')).toBe('&#039;onclick=&#039;alert(1)');
        expect(escapeHtml('safe text')).toBe('safe text');
    });
});
