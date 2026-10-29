import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';

const htmlPath = resolve('dist/index.html');
assert.ok(existsSync(htmlPath), 'dist/index.html is missing — run npm run build first');
const html = readFileSync(htmlPath, 'utf8');
assert.ok(!html.includes('src="/src/main.ts"'), 'Vite did not transform the TypeScript entrypoint');
const assets = [...html.matchAll(/(?:src|href)=["']([^"']+\.(?:js|css))["']/g)].map(m => m[1]);
assert.ok(assets.some(p => p.endsWith('.js')), 'Compiled JavaScript is missing from HTML');
assert.ok(assets.some(p => p.endsWith('.css')), 'Compiled CSS is missing from HTML');
for (const asset of assets) {
  assert.ok(!/^(?:https?:)?\/\//.test(asset), `Unexpected external asset: ${asset}`);
  const local = resolve('dist', asset.replace(/^\.\//, '').replace(/^\//, ''));
  assert.ok(existsSync(local), `HTML references missing asset: ${asset}`);
}
console.log('Production HTML references valid local JavaScript and CSS assets.');
