
import { spawn } from 'child_process';
import fs from 'fs';

const child = spawn('npm.cmd', ['run', 'tauri', '--', 'signer', 'generate'], {
    cwd: process.cwd(),
    env: process.env,
    stdio: ['pipe', 'pipe', 'pipe']
});

let output = '';

child.stdout.on('data', (data) => {
    const str = data.toString();
    output += str;
    // console.log('STDOUT:', str); // Optional: debug

    if (str.includes('Password:')) {
        child.stdin.write('\n'); // Send empty password
    }
});

child.stderr.on('data', (data) => {
    output += data.toString();
});

child.on('close', (code) => {
    console.log('Process exited with code', code);
    fs.writeFileSync('keys_gen_node.txt', output);

    // Extract keys
    const pubMatch = output.match(/Your public key was:\s+([A-Za-z0-9+/=]+)/);
    const privMatch = output.match(/Your private key was:\s+([A-Za-z0-9+/=]+)/);

    if (pubMatch && privMatch) {
        console.log("SUCCESS_PUB:" + pubMatch[1]);
        console.log("SUCCESS_PRIV:" + privMatch[1]);
    } else {
        console.log("FAILED_TO_FIND_KEYS");
        console.log(output);
    }
});
