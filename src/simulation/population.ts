import {CONFIG} from '../config/city';
import {World,Venue,isOpen} from '../world/model';
import {CityTime} from '../environment/time';
import {random,choose,clamp} from '../utils/random';
export interface Citizen {id:number;name:string;age:number;occupation:string;home:Venue;work:Venue|null;friend:number;mode:'walk'|'car'|'bus';personality:number;household:number;mood:string;destination:Venue;origin:Venue;activity:string;progress:number;traveling:boolean;x:number;z:number;visible:boolean;path:{x:number;z:number}[];}
const first=['Alex','Sam','Maya','Eva','Noah','Mila','Theo','Oliver','Sofia','Lena','Leo','Amelia','Elliot','Iris','Nora','Kai','Ada','Mason','Robin','Ari','Jules','Eden','Hugo','Elena','Jordan','Max','Zoe','Parker'];
const last=['Morgan','Rivera','Bennett','Park','Novak','Fischer','Evans','Ionescu','Taylor','Clarke','Popescu','Keller','Reed','Hale','Carter','Brooks','Young','Stone'];
export function createPopulation(world:World):Citizen[]{
 return Array.from({length:CONFIG.citizens},(_,id)=>{
  const r=(n:number)=>random(CONFIG.seed+id*137+n*19937);
  const age=r(1)<.19?6+Math.floor(r(2)*12):r(3)<.19?66+Math.floor(r(4)*25):19+Math.floor(r(5)*46);
  const occupation=age<18?'Student':age>=66?'Retired':choose(['Office worker','Nurse','Teacher','Retail worker','Barista','Chef','Civil servant','Construction worker','Remote worker','Police officer','Firefighter','Unemployed','Part-time worker'],id*171+CONFIG.seed);
  const home=world.houses[Math.floor(r(6)*world.houses.length)];
  let work:Venue|null=null;
  const matching:Record<string,string[]>={Student:['school'],Nurse:['hospital'],Teacher:['school'],'Retail worker':['shop','supermarket','mall'],Barista:['cafe'],Chef:['restaurant'],'Civil servant':['cityhall','post','bank'],'Construction worker':['construction'],'Police officer':['police'],Firefighter:['fire'],'Office worker':['office'],'Part-time worker':['office','shop']};
  if(matching[occupation]){const options=world.jobs.filter(v=>matching[occupation].includes(v.type));work=options[Math.floor(r(7)*options.length)]??null;}
  const mode=age<12?'walk':r(8)<.56?'walk':r(8)<.81?'car':'bus';
  return {id,name:`${choose(first,id*83+17)} ${choose(last,id*97+431)}`,age,occupation,home,work,friend:(id+1)%CONFIG.citizens,mode,personality:r(9),household:Math.floor(id/2.6),mood:'Content',destination:home,origin:home,activity:'At home',progress:1,traveling:false,x:home.entrance.x,z:home.entrance.z,visible:false,path:[]};
 });
}
function nearestRoad(n:number,roads:number[]) {return roads.reduce((a,b)=>Math.abs(b-n)<Math.abs(a-n)?b:a,roads[0]);}
export function pedestrianPath(a:Venue,b:Venue,world:World,variant:number):{x:number;z:number}[]{
 const roads=world.roads;
 // All building entrances face +Z. Exit to the sidewalk on that same (front) road.
 const front=(v:Venue)=>roads.find(r=>r>v.z)??roads[roads.length-1];
 const aZ=front(a)-5.6,bZ=front(b)-5.6;
 const aX=nearestRoad(a.x,roads)+(a.x>nearestRoad(a.x,roads)?5.6:-5.6);
 const bX=nearestRoad(b.x,roads)+(b.x>nearestRoad(b.x,roads)?5.6:-5.6);
 const pts=[{...a.entrance},{x:a.x,z:aZ},{x:aX,z:aZ}];
 if(variant%2===0)pts.push({x:bX,z:aZ});
 else pts.push({x:aX,z:bZ});
 pts.push({x:bX,z:bZ},{x:b.x,z:bZ},{...b.entrance});
 return pts;
}
export function locationAlong(path:{x:number;z:number}[],progress:number){
 if(!path.length)return {x:0,z:0};
 let len=0;const lengths=[];
 for(let i=1;i<path.length;i++){const d=Math.hypot(path[i].x-path[i-1].x,path[i].z-path[i-1].z);lengths.push(d);len+=d;}
 let dist=clamp(progress,0,1)*len;
 for(let i=0;i<lengths.length;i++){if(dist<=lengths[i]){const t=lengths[i]===0?0:dist/lengths[i];return {x:path[i].x+(path[i+1].x-path[i].x)*t,z:path[i].z+(path[i+1].z-path[i].z)*t};}dist-=lengths[i];}
 return path[path.length-1];
}
export function desiredLocation(c:Citizen,t:CityTime,world:World):{venue:Venue;activity:string;mood:string} {
 const h=t.hour+t.minute/60+t.second/3600, day=t.dateKey,seed=day*17+c.id*131,weekend=t.weekday===0||t.weekday===6;
 const stagger=(random(seed)*2-1)*1.25;
 const works=!!c.work&&!(weekend&&c.occupation!=='Nurse'&&c.occupation!=='Chef'&&c.occupation!=='Barista'&&c.occupation!=='Retail worker'&&c.occupation!=='Firefighter'&&c.occupation!=='Police officer')&&random(seed+9)>.08;
 const shift=c.occupation==='Nurse'||c.occupation==='Police officer'||c.occupation==='Firefighter';
 const start=c.occupation==='Student'?8:c.occupation==='Barista'?7:c.occupation==='Chef'?11:shift?6:8.5;
 const end=c.occupation==='Student'?15:c.occupation==='Barista'?15:c.occupation==='Chef'?21:shift?18:17;
 const inShift=shift&&random(c.id+101)>.7 ? h>=19||h<6 : h>=start+stagger&&h<end+stagger;
 if(works&&(shift?inShift:h>=start+stagger&&h<end+stagger)) return {venue:c.work!,activity:c.occupation==='Student'?'Learning at school':c.occupation==='Remote worker'?'Working':'At work',mood:'Focused'};
 if(h<7.2+stagger||h>22.1+stagger)return {venue:c.home,activity:h<6||h>22?'Sleeping':'Relaxing at home',mood:'Resting'};
 const amenity=world.amenities.filter(v=>isOpen(v,t.hour,t.weekday));
 const pick=(types:string[])=>{const options=amenity.filter(v=>types.includes(v.type));return options.length?options[Math.floor(random(seed+Math.floor(h/2)*23)*options.length)]:c.home;};
 if(c.age<18){if(h<16)return {venue:c.home,activity:'At home with family',mood:'Content'};const v=pick(['park','playground']);return {venue:v,activity:'Playing outside',mood:'Happy'};}
 const slot=Math.floor((h+random(seed+4)*2)/2.9);
 const interest=random(seed+slot*31);
 if(h>=18&&interest>.85)return {venue:c.home,activity:'Spending time with family',mood:'Happy'};
 if(interest<.21){const v=pick(['cafe','restaurant']);return {venue:v,activity:v.type==='cafe'?'Having a coffee':'Dining out',mood:'Happy'};}
 if(interest<.43){return {venue:pick(['park','playground']),activity:c.age>=66?'Taking an afternoon stroll':'Enjoying the park',mood:'Relaxed'};}
 if(interest<.67){return {venue:pick(['supermarket','mall','shop']),activity:'Shopping for essentials',mood:'Content'};}
 if(interest<.76){return {venue:pick(['bank','post','cityhall']),activity:'Running an errand',mood:'Busy'};}
 return {venue:c.home,activity:c.occupation==='Remote worker'?'Working from home':'At home',mood:'Content'};
}
export function updatePopulation(pop:Citizen[],t:CityTime,world:World){
 const epoch=t.date.getTime()/1000;
 for(const c of pop){
  const goal=desiredLocation(c,t,world);
  // Deterministic time buckets: each resident is stable across reloads, no random teleportation at scene update.
  const quantum=1080;const offset=random(c.id*17+CONFIG.seed)*quantum;
  const timeline=(epoch+offset)/quantum;
  const f=timeline-Math.floor(timeline);
  const minutesSince= f*quantum;
  const previous=desiredLocation(c,getShiftedTime(t,-minutesSince),world);
  const current=goal;
  const prev=previous.venue;
  c.origin=prev;c.destination=current.venue;c.activity=current.activity;c.mood=current.mood;
  if(prev.id!==current.venue.id){
   c.path=pedestrianPath(prev,current.venue,world,c.id);
   const distance=c.path.reduce((s,p,i)=>i? s+Math.hypot(p.x-c.path[i-1].x,p.z-c.path[i-1].z):0,0);
   const duration=clamp(distance/(c.mode==='walk'?1.3:4.5),25,250);
   c.progress=clamp(minutesSince/duration,0,1);
   c.traveling=c.progress<1;
   const p=locationAlong(c.path,c.progress);c.x=p.x;c.z=p.z;
  }else{c.traveling=false;c.progress=1;c.x=current.venue.entrance.x;c.z=current.venue.entrance.z;}
  // Buildings hide their occupants. Local rendered population uses the existing persistent identities.
  c.visible=c.traveling;
 }
}
function getShiftedTime(t:CityTime,seconds:number):CityTime {return importTime(new Date(t.date.getTime()+seconds*1000));}
import {getCityTime as importTime} from '../environment/time';
