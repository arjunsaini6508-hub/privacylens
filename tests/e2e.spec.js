const { test, expect, chromium } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

test.describe('PrivacyLens AI E2E', () => {
    let browserContext;

    test.beforeAll(async () => {
        const pathToExtension = path.join(__dirname, '../extension');
        const userDataDir = path.join(__dirname, '../test-user-data-dir');
        
        browserContext = await chromium.launchPersistentContext(userDataDir, {
            headless: false, // extensions only work in non-headless
            args: [
                `--disable-extensions-except=${pathToExtension}`,
                `--load-extension=${pathToExtension}`
            ]
        });
    });

    test.afterAll(async () => {
        await browserContext.close();
    });

    const pagesToTest = ['checkout.html', 'login.html', 'profile.html'];

    for (const pageName of pagesToTest) {
        test(`Test ${pageName}`, async () => {
            const page = await browserContext.newPage();
            const errors = [];
            page.on('pageerror', error => errors.push(error.message));
            
            await page.goto(`http://localhost:8000/${pageName}`);
            await page.waitForTimeout(1000); // Wait for extension to inject
            
            // To evaluate in the content script context, we must use the background page to send a message
            // or just evaluate in the page if the script is not isolated. But manifest V3 isolates by default.
            
            // Let's get the background worker
            let [background] = browserContext.serviceWorkers();
            if (!background) {
                background = await browserContext.waitForEvent('serviceworker');
            }

            // Ask the background script to send a message to the active tab to ANALYZE_PAGE
            const analysisResult = await background.evaluate(async () => {
                const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
                return new Promise((resolve, reject) => {
                    chrome.tabs.sendMessage(tab.id, { type: "ANALYZE_PAGE" }, (response) => {
                        if (chrome.runtime.lastError) {
                            reject(chrome.runtime.lastError.message);
                        } else {
                            resolve(response);
                        }
                    });
                });
            });

            expect(analysisResult).toBeDefined();
            expect(analysisResult.type).toBe('DOM_ANALYSIS_RESULT');
            expect(analysisResult.data).toBeDefined();
            expect(analysisResult.data.elements).toBeDefined();
            expect(analysisResult.data.elements.length).toBeGreaterThan(0);

            // Redact sensitive elements
            const redactionResult = await background.evaluate(async () => {
                const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
                return new Promise((resolve, reject) => {
                    chrome.tabs.sendMessage(tab.id, { type: "REDACT_SENSITIVE" }, (response) => {
                        if (chrome.runtime.lastError) {
                            reject(chrome.runtime.lastError.message);
                        } else {
                            resolve(response);
                        }
                    });
                });
            });

            expect(redactionResult).toBeDefined();
            expect(redactionResult.type).toBe('REDACTION_RESULT');
            
            // Take screenshot to show redacted fields
            await page.screenshot({ path: path.join(__dirname, `../demo/${pageName}-e2e.png`) });
            
            expect(errors.length).toBe(0);
            
            await page.close();
        });
    }
});
