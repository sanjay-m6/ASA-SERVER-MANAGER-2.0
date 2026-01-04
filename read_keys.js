
import fs from 'fs';

try {
    // Try reading as UCS-2 (UTF-16LE) which is likely what PowerShell outputs
    const content = fs.readFileSync('keys.txt', 'ucs2');
    console.log("--- START FILE CONTENT ---");
    console.log(content);
    console.log("--- END FILE CONTENT ---");
} catch (e) {
    console.error('Failed to read file:', e);
}
