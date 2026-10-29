/**
 * Builds a GitHub Pages-ready, plain ES-module version under docs/.
 * Only TypeScript is required for this fallback build. Three.js is resolved
 * through a public CDN at runtime; `npm run build:pages` instead uses Vite and
 * packages Three.js locally for a fully bundled production deployment.
 */
import { createRequire } from 'node:module';
import { readFile, writeFile, mkdir, readdir, rm, cp } from 'node:fs/promises';
import { resolve, relative, dirname, join, extname } from 'node:path';
const require = createRequire(import.meta.url);
const ts = require('typescript');
const root = resolve(import.meta.dirname, '..');
const src = join(root, 'src');
const out = join(root, 'docs');

await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });

async function convert(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const file = join(dir, entry.name);
    if (entry.isDirectory()) { await convert(file); continue; }
    const rel = relative(src, file);
    const dest = join(out, 'src', rel.replace(/\.ts$/, '.js'));
    await mkdir(dirname(dest), { recursive: true });
    if (extname(file) !== '.ts') { await cp(file, dest); continue; }
    const original = await readFile(file, 'utf8');
    let transpiled = ts.transpileModule(original, {
      fileName: file,
      compilerOptions: {
        target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.ES2022,
        importsNotUsedAsValues: ts.ImportsNotUsedAsValues.Remove,
      },
      reportDiagnostics: true,
    });
    const errors = (transpiled.diagnostics || []).filter(d => d.category === ts.DiagnosticCategory.Error);
    if (errors.length) throw new Error(`${rel}: ${errors.map(e => ts.flattenDiagnosticMessageText(e.messageText,' ')).join('; ')}`);
    let js = transpiled.outputText;
    // Browser ESM requires explicit .js extension; Vite handles that itself.
    js = js.replace(/(\bfrom\s*['"])(\.{1,2}\/[^'"\n]+)(['"])/g,
      (_, a, path, b) => a + (path.match(/\.(?:js|json)$/) ? path : path + '.js') + b);
    js = js.replace(/^import\s*['"]\.\/ui\/styles\.css['"];?\s*/m, '');
    await writeFile(dest, js);
  }
}
await convert(src);
const originalHtml = await readFile(join(root, 'index.html'), 'utf8');
const startup = `<link rel="stylesheet" href="./src/ui/styles.css"/>
<script type="importmap">{"imports":{"three":"https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js"}}</script>
<script type="module">
  try { await import('./src/main.js'); }
  catch (error) {
    console.error('Living City could not start:', error);
    const root = document.getElementById('app');
    if (root) {
      root.style.cssText = 'padding:2.5rem;color:#edf2ff;font:16px system-ui;background:#152433;min-height:100vh';
      root.replaceChildren();
      const heading = document.createElement('h1'); heading.textContent = 'Living City could not load';
      const detail = document.createElement('p'); detail.textContent = 'The 3D engine did not load. Check your network connection and browser developer console, then reload.';
      root.append(heading, detail);
    }
  }
</script>`;
const html = originalHtml.replace('<script type="module" src="/src/main.ts"></script>', startup);
if (html === originalHtml) throw new Error('Could not replace the Vite development entrypoint');
await writeFile(join(out, 'index.html'), html);
await writeFile(join(out, '.nojekyll'), '');
await writeFile(join(out, 'BUILD_INFO.txt'), 'GitHub Pages branch deployment: main /docs\nPrebuilt ES modules; Three.js 0.180.0 is loaded from jsDelivr.\nFor a fully bundled build run: npm install && npm run build:pages\n');
console.log('Generated main-branch GitHub Pages site in docs/');
