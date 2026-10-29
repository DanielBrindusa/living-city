import { CONFIG } from '../config/city';
import { getCityTime } from './time';
export type Weather = { kind:'clear'|'cloudy'|'rain'|'snow'; temperature:number; description:string; source:'live'|'simulated';};
export let weather:Weather={kind:'clear',temperature:17,description:'Clear skies',source:'simulated'};
export async function refreshWeather():Promise<Weather> {
 try {
  const {latitude,longitude}=CONFIG.weather;
  const url=`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code&timezone=auto`;
  const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),4500);
  let data: {current?:{temperature_2m?:number;weather_code?:number}};
  try { const r=await fetch(url,{signal:controller.signal});if(!r.ok)throw new Error('Weather unavailable');data=await r.json(); }finally{clearTimeout(timer);}
  const code=data.current?.weather_code;if(code===undefined)throw new Error('No weather code');
  const kind=code>=71&&code<=86?'snow':code>=51&&code<=67||code>=80&&code<=82||code>=95?'rain':code>=2&&code<=3?'cloudy':'clear';
  weather={kind,temperature:Math.round(data.current?.temperature_2m??15),description:({snow:'Snowfall',rain:'Rain showers',cloudy:'Cloudy skies',clear:'Clear skies'} as const)[kind],source:'live'};
 }catch{
  const t=getCityTime();const n=(t.dateKey*17)%23;
  const kind=t.season==='Winter'&&n<5?'snow':n<5?'rain':n<11?'cloudy':'clear';
  const base=({Winter:2,Spring:14,Summer:25,Autumn:12} as Record<string,number>)[t.season];
  weather={kind,temperature:base+(n%7)-3,description:({snow:'Light snow',rain:'Passing rain',cloudy:'Partly cloudy',clear:'Fair weather'} as const)[kind],source:'simulated'};
 }
 return weather;
}
