
import fs from 'fs';

try {
    let content = fs.readFileSync('keys_final.txt');
    
    // Check for BOM (UTF-16LE)
    let encoding = 'utf8';
    if (content[0] === 0xFF && content[1] === 0xFE) {
        encoding = 'utf16le';
    }
    
    let text = content.toString(encoding);
    console.log("--- START RAW ---");
    // console.log(text.replace(/\r/g, '\nCR\n')); // Too verbose if long
    console.log("--- END RAW ---");
    
    const lines = text.split(/\r?\n/);
    lines.forEach(line => {
        if (line.includes("Your public key was:")) {
             // Extract cleaned
             let parts = line.split(":");
             if (parts[1]) console.log("FOUND_PUB_KEY:" + parts[1].trim());
        }
        if (line.includes("Your private key was:")) {
             let parts = line.split(":");
             if (parts[1]) console.log("FOUND_PRIV_KEY:" + parts[1].trim());
        }
    });

} catch (e) {
    console.error(e);
}
