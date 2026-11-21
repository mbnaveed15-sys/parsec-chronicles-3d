// Dependency-free smoke harness: runs the built single-file game in headless
// Chrome/Brave with virtual time, then reads the QA_RESULT JSON the game writes.
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const candidates = [
  process.env.CHROME,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files/BraveSoftware/Brave-Browser/Application/brave.exe',
  'C:/Program Files (x86)/BraveSoftware/Brave-Browser/Application/brave.exe',
  '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
].filter(Boolean);

const chrome = candidates.find((p) => existsSync(p));
if (!chrome) {
  console.error('No Chrome/Brave binary found. Set CHROME=/path/to/chrome');
  process.exit(2);
}

const url = pathToFileURL(resolve('index.html')).href + '?qa=1&v=' + Date.now();
let dom = '';
try {
  dom = execFileSync(chrome, [
    '--headless=new', '--disable-gpu', '--no-sandbox', '--mute-audio',
    '--virtual-time-budget=30000', '--dump-dom', url,
  ], { encoding: 'utf8', maxBuffer: 1 << 28, timeout: 120000 });
} catch (e) {
  console.error('Browser run failed:', e.message);
  process.exit(2);
}

const m = dom.match(/QA_RESULT (\{[\s\S]*?\})<\/pre>/);
if (!m) {
  console.error('No QA_RESULT marker in DOM — the game may have failed to boot.');
  process.exit(2);
}
let result;
try { result = JSON.parse(m[1]); } catch (e) {
  console.error('QA payload was not valid JSON:', m[1].slice(0, 400));
  process.exit(2);
}
console.log(JSON.stringify(result, null, 2));
process.exit(result.ok ? 0 : 1);
