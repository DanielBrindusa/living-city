import {CONFIG} from '../config/city';
import {choose,random} from '../utils/random';
export type District='Oak Grove'|'Riverside Homes'|'Midtown'|'Downtown'|'Market Quarter'|'Civic Square'|'Campus'|'Green Commons';
export type VenueType='house'|'apartment'|'office'|'cafe'|'restaurant'|'shop'|'supermarket'|'mall'|'bank'|'post'|'cityhall'|'police'|'fire'|'hospital'|'school'|'park'|'playground'|'construction';
export interface Venue {id:number;name:string;type:VenueType;district:District;x:number;z:number;width:number;depth:number;height:number;floors:number;color:number;roof:'gable'|'hip'|'flat';entrance:{x:number;z:number};open:[number,number];}
export interface World {venues:Venue[];houses:Venue[];jobs:Venue[];amenities:Venue[];roads:number[];extent:number;}
const districts:District[]=['Oak Grove','Riverside Homes','Midtown','Downtown','Market Quarter','Civic Square','Campus','Green Commons'];
export function buildWorld():World {
 const N=CONFIG.grid.blocks,S=CONFIG.grid.step,extent=N*S/2;
 const roads=Array.from({length:N+1},(_,i)=>-extent+i*S);
 const venues:Venue[]=[];
 const specials:Record<string,[VenueType,string][]>={
  '3,3':[['cityhall','Bellweather City Hall'],['bank','First Community Bank']],
  '4,3':[['post','Bellweather Post Office'],['police','Central Police Station']],
  '3,4':[['cafe','Juniper Coffee'],['restaurant','The Copper Table']],
  '4,4':[['park','Founders Park'],['park','Memorial Garden']],
  '5,3':[['hospital','Bellweather General Hospital']],
  '6,3':[['fire','Fire Station No. 1']],
  '1,5':[['school','Willow School'],['playground','Willow Play Area']],
  '2,6':[['school','Northside Academy'],['playground','Little Steps Playground']],
  '5,5':[['mall','Market Hall'],['supermarket','Fresh Market']],
  '6,5':[['shop','Book & Bloom'],['cafe','The Morning Cup']],
  '5,6':[['construction','New Community Center']],
  '2,4':[['park','Maple Park'],['playground','Maple Playground']],
  '6,6':[['park','South Gardens'],['restaurant','Olive & Thyme']],
  '4,5':[['restaurant','The Lantern'],['shop','Corner Pharmacy']]
 };
 const homeNames=['Maple House','Willow Cottage','Cedar Home','Birch Residence','Oak House','Garden Villa'];
 for(let iz=0;iz<N;iz++) for(let ix=0;ix<N;ix++){
  const x=(roads[ix]+roads[ix+1])/2,z=(roads[iz]+roads[iz+1])/2;
  const key=`${ix},${iz}`;
  const selections=specials[key];
  const residential=ix<=2||iz<=1||iz>=7;
  const office=ix>=3&&ix<=6&&iz<=2;
  const apartment=ix<=2&&iz>=2&&iz<=4;
  const types:VenueType[]=selections?selections.map(s=>s[0]):residential?['house','house']:apartment?['apartment','apartment']:office?['office','office']:['shop','apartment'];
  for(let j=0;j<types.length;j++){
   const type=types[j],id=venues.length,seed=id*7919+CONFIG.seed;
   const district=ix<=1?'Oak Grove':iz<=1?'Midtown':ix>=5&&iz<=3?'Civic Square':ix>=5&&iz>=4?'Market Quarter':iz>=5?'Green Commons':ix<=2?'Riverside Homes':'Downtown';
   const width=type==='park'||type==='playground'?16:type==='house'?12:type==='mall'||type==='hospital'?18:15;
   const depth=type==='house'?13:16;
   const floors=type==='house'?2:type==='apartment'?4+Math.floor(random(seed)*3):type==='office'?5+Math.floor(random(seed)*4):type==='hospital'?5:type==='mall'?3:type==='park'||type==='playground'?0:type==='construction'?6:2+Math.floor(random(seed)*2);
   const height=floors*3.15;
   const vx=x+(j===0?-9.5:9.5),vz=z+(j===0?-2.2:2.2);
   const n=selections?.[j]?.[1] ?? (type==='house'?`${choose(homeNames,seed)} ${id}`:type==='office'?`${choose(['Northstar','Meridian','Aster','Crest'],seed)} Offices`:type==='apartment'?`${choose(['Elm','Parkside','Terrace','Haven'],seed)} Apartments`:type==='shop'?`${choose(['Village','Corner','Local'],seed)} Shop`:'Neighborhood Venue');
   const open: [number,number]=type==='hospital'||type==='police'||type==='fire'||type==='house'||type==='apartment'?[0,24]:type==='school'?[7,17]:type==='bank'||type==='post'||type==='cityhall'?[9,17]:type==='office'?[7,20]:type==='restaurant'?[11,23]:type==='cafe'?[7,22]:[8,22];
   const color=type==='house'?choose([0xd6bd9d,0xf1dfbe,0xaebccb,0xd9b2a7,0xc8d3c3],seed):type==='office'?choose([0x718b96,0x8299a8,0xa1aaa9],seed):type==='apartment'?choose([0xc3b4a4,0xb5bdc2,0xd2c9b7],seed):choose([0xd8c8af,0xa7b6bc,0xc9c1b4],seed);
   venues.push({id,name:n,type,district,x:vx,z:vz,width,depth,height,floors,color,roof:type==='house'?random(seed+1)>.4?'gable':'hip':'flat',entrance:{x:vx,z:vz+depth/2+1.1},open});
  }
 }
 return {venues,houses:venues.filter(v=>v.type==='house'||v.type==='apartment'),jobs:venues.filter(v=>['office','school','hospital','police','fire','shop','restaurant','cafe','cityhall','bank','post','mall','supermarket','construction'].includes(v.type)),amenities:venues.filter(v=>!['house','apartment','office','construction'].includes(v.type)),roads,extent};
}
export function isOpen(v:Venue,hour:number,weekday:number):boolean {return (weekday===0||weekday===6)&&['school','bank','post','cityhall'].includes(v.type)?false:hour>=v.open[0]&&hour<v.open[1];}
