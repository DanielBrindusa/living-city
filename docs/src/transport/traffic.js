import { CONFIG } from '../config/city.js';
import { random, clamp } from '../utils/random.js';
function nearest(n, roads) { return roads.reduce((a, b) => Math.abs(a - n) < Math.abs(b - n) ? a : b, roads[0]); }
function pathLength(path) { let total = 0; const lengths = path.slice(1).map((p, i) => { const d = Math.hypot(p.x - path[i].x, p.z - path[i].z); total += d; return d; }); return { lengths, total }; }
/** Two-way roadway, right-side driving: positive X uses positive Z, positive Z uses negative X. */
export function driveRoute(from, to, roads) {
    const x0 = nearest(from.x, roads), z0 = nearest(from.z, roads), x1 = nearest(to.x, roads), z1 = nearest(to.z, roads);
    const xDir = Math.sign(x1 - x0), zDir = Math.sign(z1 - z0), l = 2.22;
    const pts = [];
    const add = (x, z) => { const last = pts[pts.length - 1]; if (!last || Math.hypot(x - last.x, z - last.z) > .01)
        pts.push({ x, z }); };
    // Detour one block when both endpoints are aligned, retaining a valid two-way lane.
    if (!xDir && !zDir) {
        add(x0 - l, z0);
        add(x0 - l, z0 + CONFIG.grid.step);
        add(x0 + l, z0 + CONFIG.grid.step);
        add(x0 + l, z0);
        return pts;
    }
    if (xDir) {
        add(x0, z0 + xDir * l);
        add(x1 - zDir * l, z0 + xDir * l);
    }
    if (zDir) {
        const xOffset = x1 - zDir * l;
        if (!xDir)
            add(xOffset, z0);
        add(xOffset, z1);
    }
    if (!zDir && xDir)
        add(x1, z0 + xDir * l);
    // A stationary near-curb endpoint is a road position, never inside the building.
    return pts;
}
export function createTraffic(world) {
    const colors = [0x314960, 0xb8c0c5, 0xc04639, 0x244b47, 0xeeeae1, 0x20232a, 0x9b9fa3, 0x93684e];
    const all = [];
    const n = CONFIG.vehicles + CONFIG.buses;
    for (let id = 0; id < n; id++) {
        const bus = id < CONFIG.buses;
        let from, to;
        if (bus) {
            const row = 4 + (id % 8) * 4, west = 4 + (id % 3), east = world.roads.length - 5 - (id % 3);
            if (id % 2 === 0) {
                from = { x: world.roads[west], z: world.roads[row] };
                to = { x: world.roads[east], z: world.roads[row + 2] };
            }
            else {
                from = { x: world.roads[row], z: world.roads[west] };
                to = { x: world.roads[row + 2], z: world.roads[east] };
            }
        }
        else {
            const home = world.houses[Math.floor(random(CONFIG.seed + id * 73) * world.houses.length)];
            // Work/errands bias toward local neighborhoods and keep identifiable origin/destination.
            const jobs = world.jobs.filter(v => Math.abs(v.x - home.x) < 370 && Math.abs(v.z - home.z) < 370);
            const destination = (jobs.length ? jobs : world.jobs)[Math.floor(random(CONFIG.seed + id * 41) * Math.max(jobs.length, 1))] ?? home;
            from = home;
            to = destination;
        }
        const route = driveRoute(from, to, world.roads), returnRoute = driveRoute(to, from, world.roads);
        const out = pathLength(route), back = pathLength(returnRoute);
        all.push({ id, kind: bus ? 'bus' : 'car', x: route[0].x, z: route[0].z, angle: 0, progress: 1, route, returnRoute, color: bus ? 0xc79b42 : colors[id % colors.length], passengers: bus ? 3 + Math.floor(random(id * 3 + 5) * 24) : 0, moving: false, owner: id - CONFIG.buses, lengths: out.lengths, total: out.total, returnLengths: back.lengths, returnTotal: back.total });
    }
    return all;
}
function place(v, route, lengths, total, seconds, speed) {
    let d = clamp(seconds * speed, 0, total), angle = 0;
    for (let i = 0; i < lengths.length; i++) {
        const a = route[i], b = route[i + 1];
        angle = Math.atan2(b.x - a.x, b.z - a.z);
        if (d <= lengths[i]) {
            const f = lengths[i] ? d / lengths[i] : 0;
            v.x = a.x + (b.x - a.x) * f;
            v.z = a.z + (b.z - a.z) * f;
            v.angle = angle;
            break;
        }
        d -= lengths[i];
    }
    v.progress = clamp(seconds * speed / Math.max(1, total), 0, 1);
    v.moving = true;
}
export function updateTraffic(vehicles, t) {
    const epoch = t.date.getTime() / 1000, h = t.hour + t.minute / 60 + t.second / 3600;
    for (const v of vehicles) {
        if (v.kind === 'bus') {
            const speed = 7.2, wait = 12 * (Math.max(1, Math.floor(v.total / CONFIG.grid.step))); // stop dwell, timetable derived from epoch
            const cycle = (v.total + v.returnTotal) / speed + wait * 2;
            const s = ((epoch + v.id * 171) % cycle + cycle) % cycle;
            if (s < v.total / speed) {
                place(v, v.route, v.lengths, v.total, s, speed);
            }
            else if (s < v.total / speed + wait) {
                v.moving = false;
                v.x = v.route.at(-1).x;
                v.z = v.route.at(-1).z;
            }
            else if (s < v.total / speed + wait + v.returnTotal / speed)
                place(v, v.returnRoute, v.returnLengths, v.returnTotal, s - v.total / speed - wait, speed);
            else {
                v.moving = false;
                v.x = v.returnRoute.at(-1).x;
                v.z = v.returnRoute.at(-1).z;
            }
            // Fixed route identity, deterministic approximate occupancy; boarding is a remaining enhancement.
            v.passengers = Math.max(0, Math.round(11 + 8 * Math.sin(epoch / 600 + v.id)));
            continue;
        }
        const speed = 8.5 * (t.phase === 'Night' ? 1.05 : 1), duration = v.total / speed, backDuration = v.returnTotal / speed;
        const offset = (random(CONFIG.seed + v.id * 31) - .5) * 2.3;
        const errand = v.id % 5 === 0, evening = v.id % 7 === 0;
        const depart = errand ? 10.1 + offset : 7.2 + offset;
        const returnAt = errand ? 13.4 + offset : evening ? 20 + offset : 17.2 + offset;
        if (h >= depart && h < depart + duration / 3600) {
            place(v, v.route, v.lengths, v.total, (h - depart) * 3600, speed);
        }
        else if (h >= returnAt && h < returnAt + backDuration / 3600) {
            place(v, v.returnRoute, v.returnLengths, v.returnTotal, (h - returnAt) * 3600, speed);
        }
        else if (v.id % 8 === 0 && h >= 8.5 && h < 21) {
            // Service/delivery vehicles make repeated scheduled service calls with a stop between jobs.
            const travelOut = v.total / speed, travelBack = v.returnTotal / speed, cycle = travelOut + travelBack + 380;
            const seconds = ((epoch + v.id * 79) % cycle + cycle) % cycle;
            if (seconds < travelOut)
                place(v, v.route, v.lengths, v.total, seconds, speed);
            else if (seconds < travelOut + travelBack)
                place(v, v.returnRoute, v.returnLengths, v.returnTotal, seconds - travelOut, speed);
            else {
                v.moving = false;
                v.progress = 1;
            }
        }
        else {
            v.moving = false;
            v.progress = 1;
        }
    }
}
