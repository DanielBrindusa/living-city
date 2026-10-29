import {World} from '../world/model';
import {random,clamp} from '../utils/random';
import {CityTime} from '../environment/time';
export interface Vehicle {id:number;kind:'car'|'bus';x:number;z:number;angle:number;progress:number;route:{x:number;z:number}[];color:number;passengers:number;}
export function createTraffic(world:World):Vehicle[] {
 const roads=world.roads,carColors=[0x314960,0xb8c0c5,0xc04639,0x244b47,0xeeeae1,0x20232a,0x9b9fa3,0x93684e];
 return Array.from({length:67},(_,i)=>{
  const bus=i<5,at=world.houses[(i*17)%world.houses.length],to=world.jobs[(i*11)%world.jobs.length];
  const x1=roads.reduce((a,b)=>Math.abs(b-at.x)<Math.abs(a-at.x)?b:a,roads[0]);
  const z1=roads.reduce((a,b)=>Math.abs(b-at.z)<Math.abs(a-at.z)?b:a,roads[0]);
  const x2=roads.reduce((a,b)=>Math.abs(b-to.x)<Math.abs(a-to.x)?b:a,roads[0]);
  const z2=roads.reduce((a,b)=>Math.abs(b-to.z)<Math.abs(a-to.z)?b:a,roads[0]);
  const lane=2.2;
  const route=bus?roads.map((r,j)=>({x:j%2?r+lane:r-lane,z:z1+lane})).concat([...roads].reverse().map(r=>({x:x2+lane,z:r-lane}))):[
   {x:x1+lane,z:z1+lane},{x:x2+lane,z:z1+lane},{x:x2+lane,z:z2+lane},
   {x:x2-lane,z:z2-lane},{x:x1-lane,z:z2-lane},{x:x1-lane,z:z1-lane},{x:x1+lane,z:z1+lane}];
  return {id:i,kind:bus?'bus':'car',x:x1,z:z1,angle:0,progress:0,route,color:bus?0xdb9d38:carColors[i%carColors.length],passengers:bus?4+Math.floor(random(i)*15):0};
 });
}
export function updateTraffic(vehicles:Vehicle[],t:CityTime){
 const epoch=t.date.getTime()/1000;
 const hour=t.hour+t.minute/60;
 for(const v of vehicles){
  const path=v.route,segLengths=path.slice(1).map((p,i)=>Math.hypot(p.x-path[i].x,p.z-path[i].z));
  const total=segLengths.reduce((a,b)=>a+b,0);
  const off= v.id*83.7;
  const speed=(v.kind==='bus'?4.3:5.8)*(t.phase==='Night'?1.12:1);
  const busy=hour>7&&hour<21;
  const moving=v.kind==='bus'||busy||v.id%5===0;
  const cycle=total/speed+ (v.kind==='bus'?36:80);
  let pos=((epoch+off)%cycle+cycle)%cycle;
  if(!moving)pos=total/speed+2;
  if(pos>=total/speed){v.progress=1;v.x=path[path.length-1].x;v.z=path[path.length-1].z;continue;}
  let d=pos*speed;v.progress=clamp(d/total,0,1);
  for(let i=0;i<segLengths.length;i++){
   if(d<=segLengths[i]){const a=path[i],b=path[i+1],f=segLengths[i]?d/segLengths[i]:0;v.x=a.x+(b.x-a.x)*f;v.z=a.z+(b.z-a.z)*f;v.angle=Math.atan2(b.x-a.x,b.z-a.z);break;}d-=segLengths[i];
  }
 }
}
