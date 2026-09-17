const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const EXT_DIR = path.join(ROOT_DIR, 'extension');
const BUILD_DIR = path.join(ROOT_DIR, 'build');

const TARGETS = ['chrome', 'edge', 'firefox'];

// Helper to copy directory recursively
function copyDirSync(src, dest) {
    if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
    
    const entries = fs.readdirSync(src, { withFileTypes: true });
    
    for (const entry of entries) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);
        
        if (entry.isDirectory()) {
            copyDirSync(srcPath, destPath);
        } else {
            fs.copyFileSync(srcPath, destPath);
        }
    }
}

// Build loop
function build() {
    console.log("Starting PrivacyLens AI Cross-Browser Build...");
    
    if (!fs.existsSync(BUILD_DIR)) {
        fs.mkdirSync(BUILD_DIR);
    }

    TARGETS.forEach(target => {
        const targetDir = path.join(BUILD_DIR, target);
        console.log(`Building for ${target}...`);
        
        // 1. Copy all source files
        copyDirSync(EXT_DIR, targetDir);
        
        // 2. Read and modify manifest.json
        const manifestPath = path.join(targetDir, 'manifest.json');
        const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
        
        // 3. Apply target-specific manifest overrides
        if (target === 'firefox') {
            // Firefox uses scripts array instead of service_worker for MV3 background (fallback/compat)
            // It also requires a gecko ID
            manifest.browser_specific_settings = {
                gecko: {
                    id: "privacylens@arjun.kataria",
                    strict_min_version: "109.0"
                }
            };
            
            manifest.background = {
                scripts: ["compatibility/browserAPI.js", "background/background.js"]
            };
            
            // Firefox doesn't fully support module backgrounds in MV3 cleanly without issues,
            // but we can try letting it be a script. 
            // In our background.js we use import. So we need to remove the import line for Firefox script mode,
            // or just rely on Firefox's native ES module support if we use type: module.
            // Actually, Firefox 114+ supports "type": "module" in background.scripts, 
            // so we'll set type module back.
            manifest.background.type = "module";
        }
        
        // 4. Write manifest back
        fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
        console.log(`✓ ${target} build complete (${targetDir})`);
    });
    
    console.log("\nBuilds finished successfully!");
    console.log("To package for Safari, run:");
    console.log("  xcrun safari-web-extension-converter build/safari");
}

build();
