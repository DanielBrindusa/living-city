import { CONFIG } from '../config/city.js';
import { getCityTime } from './time.js';
export let weather = { kind: 'clear', temperature: 17, description: 'Clear skies', source: 'simulated' };
export async function refreshWeather() {
    try {
        const { latitude, longitude } = CONFIG.weather;
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code&timezone=auto`;
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 4500);
        let data;
        try {
            const r = await fetch(url, { signal: controller.signal });
            if (!r.ok)
                throw new Error('Weather unavailable');
            data = await r.json();
        }
        finally {
            clearTimeout(timer);
        }
        const code = data.current?.weather_code;
        if (code === undefined)
            throw new Error('No weather code');
        const kind = code >= 71 && code <= 86 ? 'snow' : code >= 51 && code <= 67 || code >= 80 && code <= 82 || code >= 95 ? 'rain' : code >= 2 && code <= 3 ? 'cloudy' : 'clear';
        weather = { kind, temperature: Math.round(data.current?.temperature_2m ?? 15), description: { snow: 'Snowfall', rain: 'Rain showers', cloudy: 'Cloudy skies', clear: 'Clear skies' }[kind], source: 'live' };
    }
    catch {
        const t = getCityTime();
        const n = (t.dateKey * 17) % 23;
        const kind = t.season === 'Winter' && n < 5 ? 'snow' : n < 5 ? 'rain' : n < 11 ? 'cloudy' : 'clear';
        const base = { Winter: 2, Spring: 14, Summer: 25, Autumn: 12 }[t.season];
        weather = { kind, temperature: base + (n % 7) - 3, description: { snow: 'Light snow', rain: 'Passing rain', cloudy: 'Partly cloudy', clear: 'Fair weather' }[kind], source: 'simulated' };
    }
    return weather;
}
