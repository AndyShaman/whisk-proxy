#!/usr/bin/env node

/**
 * Whisk CLI - Cross-platform wrapper
 * Works on Windows, Mac, and Linux
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Path to cli.ts relative to this script
const cliPath = join(__dirname, '..', 'src', 'cli.ts');

// Get command line arguments (skip node and script path)
const args = process.argv.slice(2);

// Run tsx with cli.ts and pass all arguments
// On Windows, shell: true is required to run .cmd files
const isWindows = process.platform === 'win32';
const npxCmd = isWindows ? 'npx.cmd' : 'npx';

const child = spawn(npxCmd, ['tsx', cliPath, ...args], {
    stdio: 'inherit',
    cwd: process.cwd(),
    shell: isWindows  // Required for .cmd files on Windows
});

child.on('error', (err) => {
    console.error('Error running whisk:', err.message);
    process.exit(1);
});

child.on('close', (code) => {
    process.exit(code || 0);
});
