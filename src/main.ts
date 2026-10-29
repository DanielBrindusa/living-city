import './ui/styles.css';
import {CONFIG} from './config/city';
import {getCityTime,constructionProgress,holidayProgress} from './environment/time';
import {refreshWeather,weather} from './environment/weather';
import {buildWorld} from './world/model';
import {createPopulation,updatePopulation} from './simulation/population';
import {createTraffic,updateTraffic} from './transport/traffic';
import {Viewer} from './render/viewer';
const app=document.querySelector<HTMLDivElement>('#app')!;
app.innerHTML=`<div class="viewport" id="viewport"></div><div class="hud"><div class="top"><div class="brand"><div class="brand-mark">⌂</div><div><h1>Living City<span style="color:#e8c28f">.</span></h1><p>A little world, always in motion</p></div></div><div class="clock pill"><div><div class="big" id="date">Loading city time</div><div class="sub" id="phase">Bellweather</div></div><div class="divider"></div><div class="wx" id="wxicon">☀</div><div><div class="big" id="weather">Weather</div><div class="sub" id="season">Season</div></div></div></div><div class="footer-note">An autonomous fictional city · No account or tracking</div><div class="bottom"><div class="intro"><div class="eyebrow">✦ The city is awake</div><h2>Every window has a story.</h2><p>Watch the streets, follow a neighbor, or discover what's happening. The city goes on with or without you.</p></div><div class="controls"><button class="btn accent" id="discover">✦ What's happening?</button><button class="btn" id="reset">⌂ Reset view</button><button class="btn" id="follow" style="display:none">✕ Stop following</button></div></div><section class="panel hidden" id="inspector" aria-live="polite"><button class="close" id="close" aria-label="Close">×</button><div class="caption">Meet a neighbor</div><h3 id="person-name"></h3><p id="person-job"></p><div class="details"><p id="person-home"></p><p id="person-action"></p><p id="person-mood"></p><p id="person-dest"></p></div><button class="btn accent" id="track">Follow this resident</button></section></div>`;
const world=buildWorld(),population=createPopulation(world),vehicles=createTraffic(world);
let selected:number|null=null;
const viewer=new Viewer(document.getElementById('viewport')!,world,getCityTime(),id=>{selected=id;showCitizen();});
function showCitizen(){if(selected===null)return;(document.getElementById('track') as HTMLButtonElement).style.display='';const c=population[selected];document.getElementById('inspector')!.classList.remove('hidden');
 document.getElementById('person-name')!.textContent=`${c.name}, ${c.age}`;
 document.getElementById('person-job')!.textContent=c.occupation;
 document.getElementById('person-home')!.textContent=`⌂ Lives in ${c.home.district}`;
 document.getElementById('person-action')!.textContent=`◌ Currently: ${c.traveling?'Traveling to '+c.destination.name:c.activity}`;
 document.getElementById('person-mood')!.textContent=`♡ Mood: ${c.mood}`;
 document.getElementById('person-dest')!.textContent=`⌁ Destination: ${c.destination.name}`;
}
document.getElementById('close')!.addEventListener('click',()=>document.getElementById('inspector')!.classList.add('hidden'));
document.getElementById('track')!.addEventListener('click',()=>{if(selected!==null){viewer.follow(selected);document.getElementById('follow')!.style.display='';}});
document.getElementById('follow')!.addEventListener('click',()=>{viewer.follow(null);document.getElementById('follow')!.style.display='none';});
document.getElementById('reset')!.addEventListener('click',()=>{viewer.reset();viewer.follow(null);document.getElementById('follow')!.style.display='none';});
const events=[...world.venues.filter(v=>['park','construction','cafe','school','mall','hospital','fire','restaurant'].includes(v.type))];let eventIndex=0;
document.getElementById('discover')!.addEventListener('click',()=>{const t=getCityTime();eventIndex=(eventIndex+1)%events.length;const v=events[(eventIndex+Math.floor(t.date.getTime()/600000))%events.length];viewer.focus(v.x,v.z,125);document.getElementById('inspector')!.classList.remove('hidden');document.getElementById('person-name')!.textContent=v.name;document.getElementById('person-job')!.textContent=`${v.district} · ${v.type}`;document.getElementById('person-home')!.textContent=`◌ ${population.filter(c=>c.destination.id===v.id).length} residents currently headed here`;document.getElementById('person-action')!.textContent=`Discover a place in ${CONFIG.name}.`;document.getElementById('person-mood')!.textContent='';document.getElementById('person-dest')!.textContent='';(document.getElementById('track') as HTMLButtonElement).style.display='none';});
document.getElementById('close')!.addEventListener('click',()=>{(document.getElementById('track') as HTMLButtonElement).style.display='';});
let lastTick=-1,lastHud=-1;function frame(){const t=getCityTime();const tick=Math.floor(t.date.getTime()/1000);
 if(tick!==lastTick){updatePopulation(population,t,world);updateTraffic(vehicles,t);lastTick=tick;}
 if(t.second!==lastHud){lastHud=t.second;document.getElementById('date')!.textContent=t.formatted;document.getElementById('phase')!.textContent=`${CONFIG.name} · ${t.phase}`;
 document.getElementById('season')!.textContent=`${t.season} · ${weather.source==='live'?'Live weather':'Simulated weather'}`;
 document.getElementById('weather')!.textContent=`${weather.temperature}° · ${weather.description}`;
 document.getElementById('wxicon')!.textContent=({rain:'☂',snow:'❄',cloudy:'☁',clear:'☀'} as const)[weather.kind];
 if(selected!==null&&!document.getElementById('inspector')!.classList.contains('hidden'))showCitizen();}
 viewer.update(population,vehicles,t,weather);requestAnimationFrame(frame);}
refreshWeather().then(()=>{});setInterval(()=>refreshWeather(),15*60*1000);
void constructionProgress;void holidayProgress;
frame();
