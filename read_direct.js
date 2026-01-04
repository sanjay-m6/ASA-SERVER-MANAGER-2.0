
import fs from 'fs';

try {
    let content = fs.readFileSync('keys_direct.txt');
    let text = content.toString('utf8'); // Usually CMD redirection is mostly ascii/utf8 compatible-ish

    // Check for standard signature
    if (text.includes("Your public key was:")) {
        const pubMatch = text.match(/Your public key was:\s+([A-Za-z0-9+/=]+)/);
        const privMatch = text.match(/Your private key was:\s+([A-Za-z0-9+/=]+)/);

        if (pubMatch) console.log("FOUND_PUB_KEY:" + pubMatch[1]);
        if (privMatch) console.log("FOUND_PRIV_KEY:" + privMatch[1]);
    } else {
        console.log("KEYS_NOT_FOUND");
        console.log("PREVIEW:" + text.substring(0, 200));
    }

} catch (e) {
    console.error(e);
}
