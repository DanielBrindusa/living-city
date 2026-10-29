import { CONFIG } from '../config/city.js';
import { isOpen, nearbyVenues, chunkAt, chunkKey } from '../world/model.js';
import { random, choose, clamp } from '../utils/random.js';
const first = ['Alex', 'Sam', 'Maya', 'Eva', 'Noah', 'Mila', 'Theo', 'Oliver', 'Sofia', 'Lena', 'Leo', 'Amelia', 'Elliot', 'Iris', 'Nora', 'Kai', 'Ada', 'Mason', 'Robin', 'Ari', 'Jules', 'Eden', 'Hugo', 'Elena', 'Jordan', 'Max', 'Zoe', 'Parker'];
const last = ['Morgan', 'Rivera', 'Bennett', 'Park', 'Novak', 'Fischer', 'Evans', 'Ionescu', 'Taylor', 'Clarke', 'Popescu', 'Keller', 'Reed', 'Hale', 'Carter', 'Brooks', 'Young', 'Stone'];
const jobs = [
    ['Office worker', 22], ['Remote worker', 9], ['Retail worker', 8], ['Part-time worker', 8],
    ['Nurse', 5], ['Teacher', 5], ['Barista', 4], ['Chef', 4], ['Civil servant', 5],
    ['Construction worker', 3], ['Police officer', 2], ['Firefighter', 2], ['Gardener', 2],
    ['Postal worker', 2], ['Delivery driver', 4], ['Street cleaner', 1], ['Utility technician', 2],
    ['Shop assistant', 6], ['Unemployed', 6], ['Night-shift worker', 2]
];
const roleTotal = jobs.reduce((n, r) => n + r[1], 0);
function occupationAt(seed) {
    let roll = random(seed) * roleTotal;
    for (const [job, weight] of jobs) {
        roll -= weight;
        if (roll < 0)
            return job;
    }
    return 'Office worker';
}
const employment = { Student: ['school', 'university'], Nurse: ['hospital'], Teacher: ['school', 'university'], 'Retail worker': ['shop', 'supermarket', 'mall'], Barista: ['cafe'], Chef: ['restaurant'], 'Civil servant': ['cityhall', 'post', 'bank'], 'Construction worker': ['construction'], 'Police officer': ['police'], Firefighter: ['fire'], 'Office worker': ['office'], 'Part-time worker': ['office', 'shop'], Gardener: ['park', 'playground'], 'Postal worker': ['post'], 'Delivery driver': ['supermarket', 'shop', 'mall'], 'Street cleaner': ['park', 'cityhall'], 'Utility technician': ['factory', 'construction'], 'Shop assistant': ['shop', 'supermarket'], 'Night-shift worker': ['hospital', 'factory'] };
const nearbyCache = new Map();
function around(world, home, types) {
    const key = `${home.id}:${types.join(',')}`;
    let result = nearbyCache.get(key);
    if (!result) {
        result = nearbyVenues(world, home, types, 7);
        nearbyCache.set(key, result);
    }
    return result;
}
function workFor(world, home, occupation, seed) {
    const types = employment[occupation];
    if (!types)
        return null;
    const local = around(world, home, types);
    const all = local.length ? local : types.flatMap(type => world.byType.get(type) ?? []);
    return all.length ? all[Math.floor(random(seed) * all.length)] : null;
}
export function createPopulation(world) {
    nearbyCache.clear();
    return Array.from({ length: CONFIG.citizens }, (_, id) => {
        const r = (n) => random(CONFIG.seed + id * 137 + n * 19937);
        const age = r(1) < .185 ? 6 + Math.floor(r(2) * 12) : r(3) < .19 ? 66 + Math.floor(r(4) * 26) : 19 + Math.floor(r(5) * 46);
        const occupation = age < 18 ? 'Student' : age >= 66 ? 'Retired' : occupationAt(id * 171 + CONFIG.seed);
        const household = Math.floor(id / 2.8);
        const home = world.houses[Math.floor(random(CONFIG.seed + household * 1973) * world.houses.length)];
        const work = workFor(world, home, occupation, CONFIG.seed + id * 73);
        const mode = age < 12 ? 'walk' : r(8) < .50 ? 'walk' : r(8) < .81 ? 'car' : 'bus';
        return { id, name: `${choose(first, id * 83 + 17)} ${choose(last, id * 97 + 431)}`, age, occupation, home, work, friend: (id + 1) % CONFIG.citizens, mode, personality: r(9), household, hasDog: r(12) < .17, mood: 'Content', destination: home, origin: home, activity: 'At home', progress: 1, traveling: false, x: home.entrance.x, z: home.entrance.z, visible: false, path: [], surface: 'inside' };
    });
}
export function buildPopulationIndex(pop, world) {
    const index = new Map();
    const add = (key, id) => { const a = index.get(key) ?? []; a.push(id); index.set(key, a); };
    // Initial index is a cheap identity-based fallback. At runtime it is rebuilt at low frequency
    // from CURRENT schedule goals, without calculating distant footstep animation.
    for (const c of pop) {
        add(c.home.chunk, c.id);
        if (c.work && c.work.chunk !== c.home.chunk)
            add(c.work.chunk, c.id);
    }
    return index;
}
/** Low-frequency GLOBAL planning; this does not position, animate or render distant citizens. */
export function refreshPopulationIndex(pop, t, world, index) {
    index.clear();
    const past = shifted(t, -720);
    const add = (key, id) => { const arr = index.get(key) ?? []; arr.push(id); index.set(key, arr); };
    for (const c of pop) {
        const goal = desiredLocation(c, t, world), prev = desiredLocation(c, past, world);
        add(goal.venue.chunk, c.id);
        if (goal.venue.id !== prev.venue.id) {
            // Register the potential travel corridor across every sector it crosses.
            // Chunk borders never split a pedestrian's identity or interrupt their trip.
            const route = pedestrianPath(prev.venue, goal.venue, world, c.id), keys = new Set([prev.venue.chunk, goal.venue.chunk]);
            for (let i = 1; i < route.length; i++) {
                const a = route[i - 1], b = route[i], steps = Math.max(1, Math.ceil(Math.hypot(a.x - b.x, a.z - b.z) / (world.chunkSize / 2)));
                for (let j = 0; j <= steps; j++)
                    keys.add(chunkAt(a.x + (b.x - a.x) * j / steps, a.z + (b.z - a.z) * j / steps, world).key);
            }
            for (const key of keys)
                if (key !== goal.venue.chunk)
                    add(key, c.id);
        }
    }
}
export function localCitizenIds(index, world, x, z, radius) {
    const { cx, cz } = chunkAt(x, z, world), seen = new Set();
    for (let dz = -radius; dz <= radius; dz++)
        for (let dx = -radius; dx <= radius; dx++)
            for (const id of index.get(chunkKey(cx + dx, cz + dz)) ?? [])
                seen.add(id);
    return [...seen];
}
function nearestRoad(n, roads) { return roads.reduce((a, b) => Math.abs(b - n) < Math.abs(a - n) ? b : a, roads[0]); }
export function pedestrianPath(a, b, world, variant) {
    if (a.id === b.id)
        return [{ ...a.entrance }];
    const roads = world.roads;
    const front = (v) => roads[Math.min(roads.length - 1, Math.max(0, v.blockZ + 1))];
    const aZ = front(a) - 5.65, bZ = front(b) - 5.65;
    const aRoad = nearestRoad(a.x, roads), bRoad = nearestRoad(b.x, roads);
    const aX = aRoad + (a.x > aRoad ? 5.65 : -5.65), bX = bRoad + (b.x > bRoad ? 5.65 : -5.65);
    const pts = [{ ...a.entrance }, { x: a.x, z: aZ }, { x: aX, z: aZ }];
    if (variant % 2 === 0)
        pts.push({ x: bX, z: aZ });
    else
        pts.push({ x: aX, z: bZ });
    pts.push({ x: bX, z: bZ }, { x: b.x, z: bZ }, { ...b.entrance });
    return pts;
}
export function locationAlong(path, progress) {
    if (!path.length)
        return { x: 0, z: 0 };
    if (path.length === 1)
        return path[0];
    let len = 0;
    const lengths = [];
    for (let i = 1; i < path.length; i++) {
        const d = Math.hypot(path[i].x - path[i - 1].x, path[i].z - path[i - 1].z);
        lengths.push(d);
        len += d;
    }
    let dist = clamp(progress, 0, 1) * len;
    for (let i = 0; i < lengths.length; i++) {
        if (dist <= lengths[i]) {
            const t = lengths[i] === 0 ? 0 : dist / lengths[i];
            return { x: path[i].x + (path[i + 1].x - path[i].x) * t, z: path[i].z + (path[i + 1].z - path[i].z) * t };
        }
        dist -= lengths[i];
    }
    return path[path.length - 1];
}
const workOutside = new Set(['Gardener', 'Construction worker', 'Postal worker', 'Delivery driver', 'Street cleaner', 'Utility technician']);
export function desiredLocation(c, t, world) {
    const h = t.hour + t.minute / 60 + t.second / 3600, seed = t.dateKey * 17 + c.id * 131, weekend = t.weekday === 0 || t.weekday === 6;
    const stagger = (random(seed) * 2 - 1) * 1.1;
    const isShift = ['Nurse', 'Police officer', 'Firefighter', 'Night-shift worker'].includes(c.occupation);
    const weekendWorks = ['Nurse', 'Chef', 'Barista', 'Retail worker', 'Firefighter', 'Police officer', 'Shop assistant', 'Night-shift worker', 'Delivery driver'].includes(c.occupation);
    const works = !!c.work && (!weekend || weekendWorks) && random(seed + 9) > .11;
    const start = c.occupation === 'Student' ? 8 : c.occupation === 'Barista' ? 7 : c.occupation === 'Chef' ? 11 : isShift ? 6 : 8.4;
    const end = c.occupation === 'Student' ? 15 : c.occupation === 'Barista' ? 16 : c.occupation === 'Chef' ? 21 : isShift ? 18 : 17.3;
    const inShift = isShift && random(c.id + 101) > .67 ? h >= 19 || h < 6 : h >= start + stagger && h < end + stagger;
    // Outdoor occupations remain physically visible while working, not just during commute.
    if (works && inShift) {
        if (c.occupation === 'Student')
            return { venue: c.work, activity: 'Learning at school', mood: 'Focused', outside: false };
        if (workOutside.has(c.occupation)) {
            const action = { Gardener: t.season === 'Winter' ? 'Clearing park paths' : t.season === 'Autumn' ? 'Raking leaves' : t.season === 'Spring' ? 'Planting flowers' : 'Maintaining the park', 'Construction worker': 'Working on the construction site', 'Postal worker': 'Delivering parcels', 'Delivery driver': 'Unloading deliveries', 'Street cleaner': 'Cleaning the streets', 'Utility technician': 'Checking utilities' };
            return { venue: c.work, activity: action[c.occupation], mood: 'Busy', outside: true };
        }
        if (h >= 11.8 && h < 13.3 && ['Office worker', 'Civil servant', 'Teacher', 'Part-time worker'].includes(c.occupation) && random(seed + 13) > .38) {
            const cafes = around(world, c.work, ['cafe', 'restaurant']).filter(v => isOpen(v, t.hour, t.weekday));
            if (cafes.length)
                return { venue: choose(cafes, seed + 17), activity: 'Out for lunch', mood: 'Relaxed', outside: true };
        }
        return { venue: c.work, activity: c.occupation === 'Remote worker' ? 'Working' : 'At work', mood: 'Focused', outside: false };
    }
    if (h < 6.8 + stagger || h > 22.7 + stagger)
        return { venue: c.home, activity: h < 6 || h > 22 ? 'Sleeping' : 'Relaxing at home', mood: 'Resting', outside: false };
    if (c.occupation === 'Remote worker' && h >= 9 && h < 16 && random(seed + 33) > .30)
        return { venue: c.home, activity: 'Working from home', mood: 'Focused', outside: false };
    // Deterministic, individually staggered activity slots prevent synchronized crowds.
    const slot = Math.floor((h + random(seed + 4) * 2) / 1.65), roll = random(seed + slot * 31);
    const pick = (types, outside, activity) => {
        const options = around(world, c.home, types).filter(v => isOpen(v, t.hour, t.weekday));
        const v = options.length ? choose(options, seed + slot * 521) : c.home;
        return { venue: v, activity, mood: 'Content', outside: outside && v.id !== c.home.id };
    };
    if (c.age < 18) {
        if (h < 15.5)
            return { venue: c.home, activity: 'At home with family', mood: 'Content', outside: false };
        return roll > .32 ? pick(['park', 'playground'], true, 'Playing with friends') : { venue: c.home, activity: 'At home', mood: 'Content', outside: false };
    }
    if (c.hasDog && roll < .15 && h >= 7 && h <= 21)
        return pick(['park'], true, 'Walking the dog');
    if (c.home.type === 'house' && t.season !== 'Winter' && h > 8 && h < 19 && roll < .23)
        return { venue: c.home, activity: t.season === 'Spring' ? 'Planting in the garden' : t.season === 'Autumn' ? 'Raking leaves in the yard' : 'Tending the garden', mood: 'Relaxed', outside: true };
    if (roll < .34)
        return pick(['park', 'playground'], true, c.age >= 66 ? 'Taking a stroll' : 'Visiting the park');
    if (roll < .52)
        return pick(['cafe', 'restaurant'], true, 'Meeting a friend for coffee');
    if (roll < .70)
        return pick(['supermarket', 'mall', 'shop'], true, 'Shopping for essentials');
    if (roll < .79 && !weekend)
        return pick(['bank', 'post', 'cityhall'], true, 'Running an errand');
    return { venue: c.home, activity: c.occupation === 'Remote worker' ? 'Working remotely' : 'At home', mood: 'Content', outside: false };
}
function shifted(t, seconds) {
    // Query the local clock without invoking Intl thousands of times per simulation tick.
    let total = t.hour * 3600 + t.minute * 60 + t.second + seconds, offset = 0;
    while (total < 0) {
        total += 86400;
        offset--;
    }
    while (total >= 86400) {
        total -= 86400;
        offset++;
    }
    return { ...t, hour: Math.floor(total / 3600), minute: Math.floor(total % 3600 / 60), second: Math.floor(total % 60), dateKey: t.dateKey + offset, weekday: (t.weekday + offset + 7) % 7 };
}
function outdoorPosition(c, goal, t, weatherKind) {
    const v = goal.venue, epoch = t.date.getTime() / 1000, id = c.id;
    if (v.id === c.home.id && v.type === 'house') {
        // Real yard, beside the home footprint, not inside the wall.
        return { x: v.x - (v.width / 2 + 1.1), z: v.z - 2.5 + Math.sin(epoch / 23 + id) * 1.3 };
    }
    const pace = goal.activity.includes('Working') || goal.activity.includes('Cleaning') ? 0.6 : 1;
    const phase = epoch / (23 + id % 17) + id * 2.31, range = v.type === 'park' || v.type === 'playground' ? 6 : 3.2;
    const x = v.x + Math.sin(phase) * range * pace, z = (v.type === 'park' || v.type === 'playground') ? v.z + Math.cos(phase * .72) * (v.depth / 2 - 4) : v.z + v.depth / 2 + 2.2 + Math.cos(phase * .72) * 1.5;
    if (weatherKind === 'rain' && v.type === 'park')
        return { x: v.entrance.x + 1.3, z: v.entrance.z + 1.5 };
    return { x, z };
}
/** Only nearby index candidates receive detailed movement updates; all others retain deterministic identities and date-derived plans. */
export function updatePopulation(pop, t, world, ids, weatherKind = 'clear') {
    const candidates = ids ?? pop.map(c => c.id), past = shifted(t, -720), epoch = t.date.getTime() / 1000;
    for (const id of candidates) {
        const c = pop[id], goal = desiredLocation(c, t, world), previous = desiredLocation(c, past, world);
        c.destination = goal.venue;
        c.origin = previous.venue;
        c.activity = goal.activity;
        c.mood = goal.mood;
        if (previous.venue.id !== goal.venue.id) {
            // The 12-minute transition window is calendar-based, so revisits materialize on the same journey.
            c.path = pedestrianPath(previous.venue, goal.venue, world, c.id);
            let low = -720, high = 0;
            for (let n = 0; n < 8; n++) {
                const m = (low + high) / 2;
                if (desiredLocation(c, shifted(t, m), world).venue.id === goal.venue.id)
                    high = m;
                else
                    low = m;
            }
            const elapsed = -high, travelSeconds = Math.max(160, Math.min(720, Math.abs(goal.venue.x - previous.venue.x) / 4 + Math.abs(goal.venue.z - previous.venue.z) / 4));
            c.progress = clamp(elapsed / travelSeconds, 0, 1);
            c.traveling = c.progress < 1;
            if (c.traveling) {
                const p = locationAlong(c.path, c.progress);
                c.x = p.x;
                c.z = p.z;
                c.surface = 'travel';
                c.visible = true;
                continue;
            }
        }
        c.traveling = false;
        c.progress = 1;
        c.path = [];
        // Weather and season modulate *optional* outdoor leisure; necessary outdoor jobs continue.
        const necessary = workOutside.has(c.occupation) && c.work?.id === goal.venue.id;
        const outside = goal.outside && (necessary || weatherKind === 'clear' || weatherKind === 'cloudy' || random(c.id + t.dateKey * 19) > .62);
        c.surface = outside ? 'outside' : 'inside';
        c.visible = outside;
        const p = outside ? outdoorPosition(c, goal, t, weatherKind) : goal.venue.entrance;
        c.x = p.x;
        c.z = p.z;
    }
    void epoch;
}
