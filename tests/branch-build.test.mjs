import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import { resolve, dirname, join } from 'node:path';
const root=resolve(import.meta.dirname,'..');
const docs=join(root,'docs');
const load=(name)=>readFile(join(docs,name),'utf8');

test('main branch docs contains a deployable HTML entry and linked styles',async()=>{
  const html=await load('index.html');
  assert.ok(/\.\/src\/main\.js/.test(html) || /\.\/assets\/index-[^"']+\.js/.test(html), 'Site entry module not found');
  assert.ok(/\.\/src\/ui\/styles\.css/.test(html) || /\.\/assets\/index-[^"']+\.css/.test(html), 'Stylesheet not found');
  assert.doesNotMatch(html,/src="\/src\/main\.ts"/);
  if (/\.\/src\/main\.js/.test(html)) assert.match(html, /three.*cdn\.jsdelivr\.net/s);
  assert.equal((await stat(join(docs,'.nojekyll'))).isFile(),true);
});

test('prebuilt JavaScript modules resolve their relative imports',async()=>{
  // Runs only for the bundled branch-build variant. Vite builds move code to assets.
  let main;
  try {main=await load('src/main.js');} catch {return;}
  const walk=async(file,seen=new Set())=>{
    if(seen.has(file))return; seen.add(file);
    const code=await load(file);
    for(const match of code.matchAll(/(?:from\s*|import\s*)['"](\.{1,2}\/[^'"\n]+)['"]/g)){
      const dep=resolve(dirname(join(docs,file)),match[1]);
      assert.ok(dep.startsWith(docs),`Outside docs: ${dep}`);
      assert.ok(dep.endsWith('.js'),`Missing JS extension: ${dep}`);
      await walk(dep.slice(docs.length+1),seen);
    }
  };
  assert.ok(main.includes('Viewer'));
  await walk('src/main.js');
});

test('compiled simulation creates a stable seeded world', async()=>{
  try {await stat(join(docs,'src/world/model.js'));} catch {return;}
  const {buildWorld}=await import('../docs/src/world/model.js');
  const {createPopulation,updatePopulation}=await import('../docs/src/simulation/population.js');
  const {getCityTime}=await import('../docs/src/environment/time.js');
  const world=buildWorld(),residents=createPopulation(world);
  assert.ok(world.venues.length>50);
  assert.equal(residents.length,6200);
  assert.deepEqual(residents.slice(0,10).map(x=>[x.name,x.home.id]),createPopulation(buildWorld()).slice(0,10).map(x=>[x.name,x.home.id]));
  for(const day of ['2026-01-15','2026-04-15','2026-07-15','2026-10-29','2026-12-25']){
    for(const hour of ['00','06','09','12','18','22']){
      updatePopulation(residents,getCityTime(new Date(`${day}T${hour}:30:00Z`)),world);
      for(const p of residents){assert.ok(Number.isFinite(p.x)&&Number.isFinite(p.z));assert.ok(p.destination);}
    }
  }
});
