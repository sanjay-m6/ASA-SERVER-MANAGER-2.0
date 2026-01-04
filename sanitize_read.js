
const fs = require('fs');
try {
    // Try reading as UTF-16LE (UCS-2) which PowerShell/Windows often uses for redirects
    // If that looks garbage, we can try utf8
    let content = fs.readFileSync('keys_final.txt');

    // Check for BOM
    let encoding = 'utf8';
    if (content[0] === 0xFF && content[1] === 0xFE) {
        encoding = 'utf16le';
    }

    let text = content.toString(encoding);
    console.log("--- START RAW ---");
    console.log(text.replace(/\r/g, '\nCR\n')); // Debug CRs
    console.log("--- END RAW ---");

    // Try to extract keys
    const pubMatch = text.match(/Your public key was:\s+([A-Za-z0-9+/=]+)/);
    const privMatch = text.match(/Your private key was:\s+([A-Za-z0-9+/=]+)/);

    if (pubMatch) console.log("FOUND_PUB_KEY:" + pubMatch[1]);
    if (privMatch) console.log("FOUND_PRIV_KEY:" + privMatch[1]);

} catch (e) {
    console.error(e);
}
