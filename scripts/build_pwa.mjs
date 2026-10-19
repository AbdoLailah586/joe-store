import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
const files = ['/index.html','/offline.html','/manifest.webmanifest','/pwa/icon-192.png','/pwa/icon-512.png','/pwa/maskable-512.png','/logo.webp','/logo-icon.png','/product-placeholder.svg',
  ...fs.readdirSync('dist/assets').filter(file => /\.(js|css)$/.test(file)).sort().map(file => '/assets/'+file)];
const template = fs.readFileSync('pwa/service-worker.template.js','utf8');
const digest = createHash('sha256').update(template);
for (const file of files) digest.update(fs.readFileSync(path.join('dist',file)));
const version = digest.digest('hex').slice(0,16);
fs.writeFileSync('dist/sw.js',template.replace('__PWA_VERSION__',version).replace('__PWA_PRECACHE__',JSON.stringify(files)));
console.log(`PWA ${version}: ${files.length} public app files ready for offline use.`);
