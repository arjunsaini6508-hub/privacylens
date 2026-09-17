// dom-analyzer.js

let elementCounter = 0;

function generateElementId() {
    elementCounter++;
    return `element_${elementCounter.toString().padStart(3, '0')}`;
}

function isElementVisible(element) {
    if (!element) return false;
    
    // Check computed styles
    const style = window.getComputedStyle(element);
    if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
        return false;
    }
    
    // Check bounding box dimensions
    const rect = element.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) {
        return false;
    }
    
    // Check if element is entirely outside the viewport (simplified check)
    const windowHeight = (window.innerHeight || document.documentElement.clientHeight);
    const windowWidth = (window.innerWidth || document.documentElement.clientWidth);
    
    if (rect.bottom < 0 || rect.right < 0 || rect.top > windowHeight || rect.left > windowWidth) {
        return false;
    }
    
    return true;
}

function getElementLabel(element) {
    let labelText = '';
    
    // Check aria-label
    if (element.hasAttribute('aria-label')) {
        labelText = element.getAttribute('aria-label');
    }
    
    // Check associated label element
    if (element.id) {
        const labelElem = document.querySelector(`label[for="${element.id}"]`);
        if (labelElem) {
            labelText = labelElem.innerText || labelText;
        }
    }
    
    // Check placeholder
    if (!labelText && element.placeholder) {
        labelText = element.placeholder;
    }
    
    return labelText.trim();
}

function detectSensitiveElement(element) {
    if (window.PIIDetector) {
        const labelText = getElementLabel(element);
        return window.PIIDetector.detectElement(element, labelText);
    }
    // Fallback if not loaded
    return { isSensitive: false, sensitiveType: null };
}

function getBoundingBox(element) {
    const rect = element.getBoundingClientRect();
    return {
        x: Math.round(rect.x),
        y: Math.round(rect.y),
        width: Math.round(rect.width),
        height: Math.round(rect.height)
    };
}

function getElementInfo(element) {
    const tagName = element.tagName.toLowerCase();
    let text = element.innerText || element.textContent || '';
    text = text.trim().substring(0, 100);
    
    const label = getElementLabel(element);
    const visible = isElementVisible(element);
    const disabled = element.disabled || false;
    const { isSensitive, sensitiveType } = detectSensitiveElement(element);
    
    let value = element.value || '';
    
    if (isSensitive) {
        value = `[${sensitiveType}]`;
        text = `[${sensitiveType}]`;
    }
    
    // Assign stable local ID if not present
    let localId = element.getAttribute('data-privacylens-id');
    if (!localId) {
        localId = generateElementId();
        element.setAttribute('data-privacylens-id', localId);
    }
    
    return {
        id: localId,
        tag: tagName,
        type: element.type || tagName,
        text: text,
        label: label,
        placeholder: element.placeholder || '',
        name: element.name || '',
        role: element.getAttribute('role') || '',
        value: value,
        visible: visible,
        disabled: disabled,
        sensitive: isSensitive,
        boundingBox: getBoundingBox(element)
    };
}

function guessPageType() {
    const url = window.location.href.toLowerCase();
    if (url.includes('login') || document.querySelector('input[type="password"]')) return 'login';
    if (url.includes('checkout') || url.includes('cart')) return 'checkout';
    if (url.includes('register') || url.includes('signup')) return 'registration';
    if (url.includes('search')) return 'search';
    if (url.includes('settings') || url.includes('profile')) return 'settings';
    return 'general';
}

function analyzePage() {
    console.log("[PrivacyLens] DOM analysis started");
    elementCounter = 0; // Reset counter for new analysis
    
    const elementsToAnalyze = document.querySelectorAll('h1, h2, h3, p, button, a, input, textarea, select, checkbox, radio, img, form, label');
    const analyzedElements = [];
    
    let visibleCount = 0;
    let sensitiveCount = 0;
    
    elementsToAnalyze.forEach(el => {
        const info = getElementInfo(el);
        if (info.visible) {
            analyzedElements.push(info);
            visibleCount++;
            if (info.sensitive) {
                sensitiveCount++;
            }
        }
    });
    
    console.log(`[PrivacyLens] Elements detected: ${analyzedElements.length}`);
    console.log(`[PrivacyLens] Sensitive elements: ${sensitiveCount}`);
    console.log("[PrivacyLens] Analysis completed locally");
    
    return {
        url: window.location.href,
        title: document.title,
        pageType: guessPageType(),
        timestamp: new Date().toISOString(),
        totalElements: elementsToAnalyze.length,
        visibleElements: visibleCount,
        sensitiveElements: sensitiveCount,
        elements: analyzedElements
    };
}

window.analyzePage = analyzePage;
