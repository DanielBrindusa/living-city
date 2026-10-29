import { CONFIG } from '../config/city.js';
const formatter = new Intl.DateTimeFormat('en-GB', { timeZone: CONFIG.timezone, year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' });
export function getCityTime(date = new Date()) {
    const parts = Object.fromEntries(formatter.formatToParts(date).map(p => [p.type, p.value]));
    const year = +parts.year, month = +parts.month, day = +parts.day, hour = +parts.hour, minute = +parts.minute, second = +parts.second;
    const weekday = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(parts.weekday);
    const dayOfYear = Math.floor((Date.UTC(year, month - 1, day) - Date.UTC(year, 0, 1)) / 86400000) + 1;
    const season = month === 12 || month < 3 ? 'Winter' : month < 6 ? 'Spring' : month < 9 ? 'Summer' : 'Autumn';
    const h = hour + minute / 60;
    const phase = h < 6.5 || h >= 23.5 ? 'Night' : h < 10 ? 'Morning' : h < 17 ? 'Daytime' : 'Evening';
    const daylight = Math.max(0, Math.min(1, (h - 5.5) / 2, (21 - h) / 2));
    return { date, year, month, day, weekday, hour, minute, second, dayOfYear, dateKey: year * 10000 + month * 100 + day, season, phase, daylight, formatted: `${parts.weekday}, ${String(day).padStart(2, '0')} ${new Intl.DateTimeFormat('en-GB', { month: 'long', timeZone: 'UTC' }).format(new Date(Date.UTC(2020, month - 1, 1)))} · ${parts.hour}:${parts.minute}` };
}
export function holidayProgress(t) {
    if (t.month === 10 && t.day >= 27)
        return { name: 'Halloween', progress: (t.day - 26) / 5, removing: false };
    if (t.month === 11 && t.day <= 3)
        return { name: 'Halloween', progress: 1 - t.day / 4, removing: true };
    if (t.month === 12)
        return { name: 'Christmas', progress: Math.min(1, t.day / 15), removing: false };
    if (t.month === 1 && t.day <= 15)
        return { name: 'Christmas', progress: 1 - t.day / 16, removing: true };
    return { name: '', progress: 0, removing: false };
}
export function constructionProgress(now) {
    const days = (now.getTime() - new Date(CONFIG.constructionEpoch).getTime()) / 86400000;
    const cycle = ((days % 387) + 387) % 387;
    if (cycle < 183)
        return { phase: 'building', progress: 0.5 + 0.5 * cycle / 183 };
    if (cycle < 204)
        return { phase: 'demolishing', progress: 1 - (cycle - 183) / 21 };
    return { phase: 'building', progress: (cycle - 204) / 183 };
}
