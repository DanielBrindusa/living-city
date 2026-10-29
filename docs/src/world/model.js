import { CONFIG } from '../config/city.js';
import { choose, random } from '../utils/random.js';
export const chunkKey = (cx, cz) => `${cx},${cz}`;
export function chunkAt(x, z, world) {
    const cx = Math.min(world.chunkCount - 1, Math.max(0, Math.floor((x + world.extent) / world.chunkSize)));
    const cz = Math.min(world.chunkCount - 1, Math.max(0, Math.floor((z + world.extent) / world.chunkSize)));
    return { cx, cz, key: chunkKey(cx, cz) };
}
const title = { house: ['Cedar House', 'Willow Home', 'Garden Cottage', 'Maple House', 'Birch Villa'], apartment: ['Parkside Apartments', 'The Terraces', 'Riverside Flats', 'Elm Court'], office: ['Meridian Offices', 'Northstar House', 'Crest Tower', 'Aster Studios'], shop: ['Corner Market', 'Village Goods', 'Book & Bloom', 'High Street Shop'], cafe: ['Juniper Coffee', 'The Morning Cup', 'Pine & Steam'], restaurant: ['The Copper Table', 'The Lantern', 'Olive & Thyme'], factory: ['Bellweather Works', 'Assembly Hall'], school: ['Willow School', 'Brightwood Academy'] };
function districtOf(ix, iz, N) {
    // Broad non-random zones give the city a recognizable geography and skyline.
    const x = ix / N, z = iz / N;
    if (x < .16 && z < .40)
        return 'Oak Grove';
    if (x < .32 && z < .27)
        return 'Quiet Suburbs';
    if (x < .28 && z < .55)
        return 'Riverside Homes';
    if (x < .26 && z >= .72)
        return 'Lakeside';
    if (x < .38 && z >= .55)
        return 'Campus';
    if (x > .74 && z < .28)
        return 'Hospital Heights';
    if (x > .76 && z > .68)
        return 'Workshop Ward';
    if (x > .68 && z > .43)
        return 'Market Quarter';
    if (x > .58 && z < .49)
        return 'Civic Square';
    if (x > .40 && x < .63 && z < .37)
        return 'Midtown';
    if (x > .37 && x < .67 && z > .68)
        return 'Green Commons';
    if (x > .29 && x < .49 && z > .35 && z < .68)
        return 'Old Quarter';
    if (x > .49 && x < .69 && z > .38 && z < .68)
        return 'Downtown';
    if (z > .72)
        return 'Southside';
    if (z < .27)
        return 'New Borough';
    return 'University Hill';
}
const landmarkList = [
    [17, 17, 'park', 'Orchard Square'], [18, 17, 'cafe', 'Juniper Coffee'], [16, 17, 'restaurant', 'The Copper Table'], [17, 18, 'shop', 'Orchard Books'], [18, 18, 'apartment', 'Garden House'], [17, 16, 'playground', 'Little Steps'],
    [23, 13, 'cityhall', 'Bellweather City Hall'], [24, 13, 'bank', 'First Community Bank'], [25, 13, 'post', 'Central Post Office'], [24, 14, 'police', 'Central Police Station'], [26, 12, 'fire', 'Fire Station No. 1'],
    [29, 8, 'hospital', 'Bellweather General'], [30, 9, 'hospital', 'North Wing Clinic'], [7, 16, 'school', 'Willow School'], [9, 19, 'school', 'Riverside Academy'], [8, 24, 'university', 'Bellweather University'],
    [27, 23, 'mall', 'Market Hall'], [30, 20, 'supermarket', 'Fresh Market'], [26, 27, 'construction', 'New Community Center'], [31, 29, 'factory', 'Municipal Workshop'],
    [13, 28, 'sports', 'South Athletic Ground'], [14, 29, 'park', 'South Gardens'], [6, 26, 'park', 'Lakeside Park'], [11, 11, 'park', 'Maple Park'], [22, 28, 'park', 'Founders Green'],
    [19, 21, 'restaurant', 'Olive & Thyme'], [20, 20, 'cafe', 'Café Mistral'], [12, 16, 'playground', 'Maple Playground']
];
const landmarks = new Map(landmarkList.map(([x, z, t, n]) => [`${x},${z}`, { type: t, name: n }]));
function normalTypes(d, seed) {
    const a = random(seed), b = random(seed + 8);
    if (d === 'Oak Grove' || d === 'Quiet Suburbs' || d === 'Lakeside')
        return ['house', b > .7 ? 'house' : 'house'];
    if (d === 'Riverside Homes' || d === 'Southside')
        return ['apartment', b > .72 ? 'shop' : 'house'];
    if (d === 'Midtown' || d === 'Downtown')
        return ['office', b > .52 ? 'cafe' : 'apartment'];
    if (d === 'Old Quarter')
        return [a > .54 ? 'apartment' : 'house', b > .72 ? 'cafe' : 'shop'];
    if (d === 'New Borough')
        return ['apartment', b > .65 ? 'office' : 'apartment'];
    if (d === 'Campus' || d === 'University Hill')
        return [a > .75 ? 'school' : 'apartment', b > .65 ? 'cafe' : 'house'];
    if (d === 'Workshop Ward')
        return [a > .5 ? 'factory' : 'shop', b > .65 ? 'office' : 'factory'];
    if (d === 'Hospital Heights')
        return [a > .68 ? 'hospital' : 'apartment', b > .6 ? 'shop' : 'office'];
    if (d === 'Market Quarter')
        return [a > .6 ? 'supermarket' : 'shop', b > .5 ? 'restaurant' : 'apartment'];
    if (d === 'Civic Square')
        return ['office', b > .6 ? 'bank' : 'apartment'];
    return ['apartment', b > .5 ? 'cafe' : 'house'];
}
function colorOf(type, seed, d) {
    const palette = { house: d === 'Old Quarter' ? [0xb89d7c, 0xcfb599, 0xd4b5a0] : [0xe0cfba, 0xb9c7b5, 0xd9bba6, 0xbcc9cd], office: [0x7f9ba7, 0x708d93, 0x879598], apartment: [0xc9bfaa, 0xa9b8b4, 0xcac4ba], factory: [0x79868a, 0x9aa3a0], shop: [0xbac2ae, 0xc9b7a3], cafe: [0xb79d80, 0xd0b4a0], restaurant: [0xafa393, 0xcebea5], hospital: [0xb5c7ca] };
    return choose(palette[type] ?? [0xc9bdac, 0xc7b8a7, 0xabbdbb], seed);
}
export function buildWorld() {
    const N = CONFIG.grid.blocks, S = CONFIG.grid.step, extent = N * S / 2, per = CONFIG.streaming.blocksPerChunk;
    if (N % per !== 0)
        throw new Error('World block count must be divisible by blocksPerChunk');
    const chunkSize = per * S, chunkCount = N / per, roads = Array.from({ length: N + 1 }, (_, i) => -extent + i * S);
    const chunks = new Map(), venues = [];
    const centerOfBlock = (ix, iz) => ({ x: -extent + (ix + .5) * S, z: -extent + (iz + .5) * S });
    for (let cz = 0; cz < chunkCount; cz++)
        for (let cx = 0; cx < chunkCount; cx++) {
            const key = chunkKey(cx, cz), origin = { x: -extent + cx * chunkSize, z: -extent + cz * chunkSize };
            const blockX = cx * per, blockZ = cz * per;
            chunks.set(key, { key, cx, cz, origin, venues: [], district: districtOf(blockX + 1, blockZ + 1, N) });
        }
    for (let iz = 0; iz < N; iz++)
        for (let ix = 0; ix < N; ix++) {
            const seed = CONFIG.seed + ix * 9871 + iz * 131071, base = centerOfBlock(ix, iz), district = districtOf(ix, iz, N), landmark = landmarks.get(`${ix},${iz}`);
            const types = landmark ? [landmark.type] : normalTypes(district, seed);
            const { key } = chunkAt(base.x, base.z, { extent, chunkSize, chunkCount });
            const chunk = chunks.get(key);
            for (let j = 0; j < types.length; j++) {
                const type = types[j], id = venues.length, r = seed + j * 797;
                const large = types.length === 1;
                const width = large ? type === 'park' || type === 'sports' || type === 'playground' ? 29 : 26 : type === 'house' ? 11.5 : 13.5;
                const depth = large ? 26 : type === 'house' ? 13.5 : 17;
                const floors = type === 'house' ? 2 : type === 'apartment' ? 3 + Math.floor(random(r + 3) * 5) : type === 'office' ? 4 + Math.floor(random(r + 3) * 5) : type === 'hospital' ? 5 : type === 'mall' ? 3 : type === 'factory' ? 2 : type === 'park' || type === 'playground' || type === 'sports' ? 0 : type === 'construction' ? 6 : 2 + Math.floor(random(r + 3) * 2);
                const height = floors * 3.15;
                const x = base.x + (large ? 0 : j === 0 ? -8.5 : 8.5), z = base.z + (large ? 0 : j === 0 ? -1 : 1);
                const open = ['hospital', 'police', 'fire', 'house', 'apartment'].includes(type) ? [0, 24] : ['school', 'university'].includes(type) ? [7, 17] : ['bank', 'post', 'cityhall'].includes(type) ? [9, 17] : type === 'office' ? [7, 20] : type === 'restaurant' ? [11, 23] : type === 'cafe' ? [7, 22] : [8, 22];
                const name = landmark?.name ?? `${choose(title[type] ?? [type.charAt(0).toUpperCase() + type.slice(1)], r)} ${ix + 1}${String.fromCharCode(65 + j)}`;
                const venue = { id, name, type, district, x, z, width, depth, height, floors, color: colorOf(type, r, district), roof: type === 'house' ? random(r + 1) > .40 ? 'gable' : 'hip' : 'flat', entrance: { x, z: z + depth / 2 + .8 }, open, chunk: key, blockX: ix, blockZ: iz };
                venues.push(venue);
                chunk.venues.push(venue);
            }
        }
    const byType = new Map();
    for (const v of venues) {
        const group = byType.get(v.type) ?? [];
        group.push(v);
        byType.set(v.type, group);
    }
    return { venues, houses: venues.filter(v => v.type === 'house' || v.type === 'apartment'), jobs: venues.filter(v => ['office', 'school', 'university', 'hospital', 'police', 'fire', 'shop', 'restaurant', 'cafe', 'cityhall', 'bank', 'post', 'mall', 'supermarket', 'construction', 'factory'].includes(v.type)), amenities: venues.filter(v => !['house', 'apartment', 'office', 'construction', 'factory'].includes(v.type)), byType, roads, extent, chunks, chunkSize, chunkCount, origin: -extent, centerOfBlock };
}
export function nearbyVenues(world, from, types, radius = 5) {
    const result = [];
    const { cx, cz } = chunkAt(from.x, from.z, world);
    const chunkRadius = Math.max(1, Math.ceil(radius * CONFIG.grid.step / world.chunkSize));
    for (let dz = -chunkRadius; dz <= chunkRadius; dz++)
        for (let dx = -chunkRadius; dx <= chunkRadius; dx++) {
            const chunk = world.chunks.get(chunkKey(cx + dx, cz + dz));
            if (!chunk)
                continue;
            for (const v of chunk.venues)
                if (types.includes(v.type) && Math.abs(v.x - from.x) <= radius * CONFIG.grid.step && Math.abs(v.z - from.z) <= radius * CONFIG.grid.step)
                    result.push(v);
        }
    return result;
}
export function isOpen(v, hour, weekday) { return (weekday === 0 || weekday === 6) && ['school', 'university', 'bank', 'post', 'cityhall'].includes(v.type) ? false : hour >= v.open[0] && hour < v.open[1]; }
