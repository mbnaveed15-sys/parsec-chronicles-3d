// One-command build: bundles the 3D renderer and assembles the self-contained index.html.
// Run: npm install  (first time)  then  npm run build
import { build } from 'esbuild';
import fs from 'fs';

const read = p => fs.readFileSync(p, 'utf8');

// 1) Prepare the 3D module entry (resolve three/addons -> three/examples/jsm for the bundler).
const scriptB = read('src/scriptB.js').replace(/three\/addons\//g, 'three/examples/jsm/');
fs.writeFileSync('.entry.js', scriptB);

// 2) Bundle three.js + the renderer into a single offline IIFE (no CDN, no imports left).
const result = await build({
  entryPoints: ['.entry.js'],
  bundle: true, format: 'iife', platform: 'browser', target: 'es2020',
  minify: true, write: false,
});
const bundle = result.outputFiles[0].text;
fs.unlinkSync('.entry.js');
if (bundle.toLowerCase().includes('</script')) throw new Error('bundle contains a closing script tag');

// 3) Assemble: Script A (src/game.html) + embedded fonts + bundled Script B.
let src = read('src/game.html');
const fonts = read('src/fonts.embedded.css');
src = src.replace(/<link[^>]*fonts\.googleapis[^>]*>\s*/g, '');
src = src.replace(/<link[^>]*fonts\.gstatic[^>]*>\s*/g, '');
src = src.replace(/<script type="importmap">[\s\S]*?<\/script>\s*/g, '');
src = src.replace('<style>', '<style>\n' + fonts + '\n');
const tag = '<script type="module">';
const start = src.indexOf(tag);
const bs = start + tag.length;
const end = src.indexOf('</script>', bs);
src = src.slice(0, bs) + '\n' + bundle + '\n' + src.slice(end);

fs.writeFileSync('index.html', src);
const external = (src.match(/https?:\/\/[^"'\s)<>]+/g) || [])
  .filter(u => !u.includes('w3.org') && !u.includes('discourse.threejs.org'));
console.log('Built index.html:', src.length, 'chars | external URLs:', external.length ? external : 'none');