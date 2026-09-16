# PrivacyLens AI

**"See the screen. Protect the data. Automate privately."**

PrivacyLens AI is a privacy-preserving browser AI agent built for Smart India Hackathon 2026 (PS ID: SIH26171). It understands the user's browser screen and helps perform tasks while ensuring that sensitive information (PII) is detected and protected LOCALLY before any network transmission occurs.

## Architecture

The project consists of a Chrome Manifest V3 Extension that operates completely locally:
- **DOM Analyzer**: Scans visible UI elements.
- **PII Detector**: Uses heuristics, regex, and DOM attributes to detect emails, passwords, credit cards, phones, etc.
- **Redactor**: Modifies the DOM locally to mask sensitive values (e.g., replacing `secret123` with `[PASSWORD]`).
- **Privacy Score**: Evaluates the page's privacy safety deterministically.
- **Network Monitor**: Tracks 1st-party vs 3rd-party network requests without inspecting bodies.

## Security & Privacy Principles
- **Zero-trust boundary**: No raw PII is ever sent to a remote server.
- **Local-first**: All detection and redaction happens inside the user's browser.
- **Data minimization**: The JSON exported for agent processing only contains redacted tokens (e.g. `[EMAIL]`).
- **No PII Logging**: Console logs strictly exclude sensitive values.
- **Safe Storage**: `chrome.storage` is only used for safe metadata, never raw PII.

## Installation & Running

1. **Chrome Extension**:
   - Open Chrome and navigate to `chrome://extensions/`.
   - Enable **Developer mode**.
   - Click **Load unpacked** and select the `privacy-lens-ai/extension` folder.
2. **Demo Pages**:
   - Open the local demo files directly in your browser:
     - `demo/checkout.html`
     - `demo/login.html`
     - `demo/profile.html`
3. **Usage**:
   - On a demo page, click the PrivacyLens AI extension icon.
   - Click **Analyze Current Page** to generate a safe DOM representation.
   - Click **Redact Sensitive Values** to visually mask the data on the page.
   - Click **View DOM JSON** to verify that no raw sensitive data is exported.

## Testing
If Node.js and NPM are installed:
```bash
npm install
npm test
npm run test:e2e
```
*Note: The environment requires Node.js to run Jest tests, and Playwright for E2E testing.*
