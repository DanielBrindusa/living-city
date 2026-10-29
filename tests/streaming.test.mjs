import {test} from 'node:test';
import assert from 'node:assert/strict';
const {CONFIG}=await import('../docs/src/config/city.js');
const {buildWorld,chunkAt,chunkKey,nearbyVenues}=await import('../docs/src/world/model.js');
const {createPopulation,buildPopulationIndex,refreshPopulationIndex,localCitizenIds,updatePopulation,desiredLocation}=await import('../docs/src/simulation/population.js');
const {getCityTime}=await import('../docs/src/environment/time.js');
const {createTraffic,updateTraffic}=await import('../docs/src/transport/traffic.js');
const world=buildWorld();

test('world is much larger but has stable contiguous sectors',()=>{
 assert.equal(CONFIG.grid.blocks,36);
 assert.equal(world.chunks.size,81);
 assert.equal(world.roads.length,37);
 assert.ok(world.venues.length>2300);
 const same=buildWorld();
 assert.deepEqual(world.venues.slice(0,100).map(v=>[v.id,v.type,v.x,v.z]),same.venues.slice(0,100).map(v=>[v.id,v.type,v.x,v.z]));
 assert.deepEqual([...world.chunks.keys()],[...same.chunks.keys()]);
});
test('each venue belongs to one sector with non-overlapping building-road geometry',()=>{
 const half=CONFIG.grid.step/2,road=CONFIG.grid.roadWidth/2+CONFIG.grid.sidewalkWidth;
 for(const v of world.venues){
  const center=world.centerOfBlock(v.blockX,v.blockZ);
  assert.ok(Math.abs(v.x-center.x)+v.width/2<half-road+.02,`Road intrusion X ${v.id}`);
  assert.ok(Math.abs(v.z-center.z)+v.depth/2<half-road+.02,`Road intrusion Z ${v.id}`);
  assert.equal(chunkAt(v.x,v.z,world).key,v.chunk);
  assert.ok(world.chunks.get(v.chunk).venues.includes(v));
 }
});
test('localized agents retain IDs, plans, and active public street life during weekday hours',()=>{
 const pop=createPopulation(world),index=buildPopulationIndex(pop,world);
 assert.equal(pop.length,CONFIG.citizens);
 const start=world.centerOfBlock(CONFIG.streaming.startBlock.x,CONFIG.streaming.startBlock.z);
 const ids=localCitizenIds(index,world,start.x,start.z,1);
 assert.ok(ids.length>70&&ids.length<CONFIG.citizens/2);
 const t=getCityTime(new Date('2026-10-29T10:10:00Z'));
 updatePopulation(pop,t,world,ids,'clear');
 const local=ids.map(i=>pop[i]).filter(c=>c.visible&&Math.abs(c.x-start.x)<world.chunkSize*1.5&&Math.abs(c.z-start.z)<world.chunkSize*1.5);
 assert.ok(local.length>=10,`Too few weekday street citizens (${local.length})`);
 const stable=pop.slice(0,25).map(c=>[c.name,c.home.id,c.work?.id,c.hasDog]);
 assert.deepEqual(stable,createPopulation(world).slice(0,25).map(c=>[c.name,c.home.id,c.work?.id,c.hasDog]));
 assert.ok(local.some(c=>!c.traveling),'Outdoor workers/visitors must be visible beyond trips');
});
test('sectors crossed by traffic are render boundaries, not route boundaries',()=>{
 const vehicles=createTraffic(world),t=getCityTime(new Date('2026-10-29T07:55:00Z'));
 assert.equal(vehicles.length,CONFIG.vehicles+CONFIG.buses);
 updateTraffic(vehicles,t);
 assert.ok(vehicles.some(v=>v.moving));
 for(const v of vehicles){assert.ok(Number.isFinite(v.x)&&Number.isFinite(v.z));assert.ok(v.route.length>=2);assert.ok(v.total>0);}
});
test('different districts have recognizable land uses',()=>{
 const counts=new Map();for(const c of world.chunks.values())counts.set(c.district,(counts.get(c.district)??0)+1);
 assert.ok(counts.size>=10);
 const houses=world.chunks.get('0,0');const center=world.chunks.get('4,4');
 assert.ok(houses.venues.some(v=>v.type==='house'));
 assert.ok(center.venues.some(v=>v.type==='cafe'||v.type==='restaurant'||v.type==='park'));
});
