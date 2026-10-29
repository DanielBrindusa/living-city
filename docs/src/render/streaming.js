import * as THREE from 'three';
import { CONFIG } from '../config/city.js';
import { chunkAt, chunkKey } from '../world/model.js';
import { buildChunkGeometry, disposeChunkGeometry } from './geometry.js';
/** Rendering-only streaming. World venues, roads, households and plans do not disappear when meshes do. */
export class WorldStreamer {
    world;
    time;
    group = new THREE.Group();
    entries = new Map();
    lastCenter = '';
    lastRadius = -1;
    day = -1;
    constructor(world, time) {
        this.world = world;
        this.time = time;
    }
    sync(x, z, zoom, aspect = 1.7) {
        const { cx, cz, key } = chunkAt(x, z, this.world);
        const activeRadius = CONFIG.streaming.activeRadius + (zoom > 175 && aspect > 1.35 ? 1 : 0);
        if (key === this.lastCenter && activeRadius === this.lastRadius && this.day === this.time.dateKey)
            return;
        this.lastCenter = key;
        this.lastRadius = activeRadius;
        this.day = this.time.dateKey;
        const preloadRadius = Math.max(CONFIG.streaming.preloadRadius, activeRadius + 1);
        const distance = (key) => { const [i, j] = key.split(',').map(Number); return Math.max(Math.abs(cx - i), Math.abs(cz - j)); };
        const needed = [];
        for (let dz = -preloadRadius; dz <= preloadRadius; dz++)
            for (let dx = -preloadRadius; dx <= preloadRadius; dx++) {
                const id = chunkKey(cx + dx, cz + dz);
                if (this.world.chunks.has(id))
                    needed.push(id);
            }
        // Sort near-to-far so any necessary geometry is completed before a chunk becomes visible.
        needed.sort((a, b) => distance(a) - distance(b));
        for (const id of needed) {
            let entry = this.entries.get(id);
            if (!entry) {
                entry = { state: 'BACKGROUND', dayKey: this.time.dateKey };
                this.entries.set(id, entry);
            }
            const near = distance(id) <= activeRadius;
            if (near) {
                if (!entry.geometry || entry.dayKey !== this.time.dateKey) {
                    if (entry.geometry) {
                        this.group.remove(entry.geometry);
                        disposeChunkGeometry(entry.geometry);
                    }
                    entry.geometry = buildChunkGeometry(this.world, this.world.chunks.get(id), this.time);
                    entry.dayKey = this.time.dateKey;
                    this.group.add(entry.geometry);
                }
                entry.state = 'ACTIVE';
                entry.geometry.visible = true;
            }
            else {
                if (entry.geometry) {
                    this.group.remove(entry.geometry);
                    disposeChunkGeometry(entry.geometry);
                    entry.geometry = undefined;
                }
                // Preloading consists of keeping stable district geometry descriptors and venue lists available.
                // GPU resources are generated only when a chunk becomes active.
                entry.state = 'PRELOADED';
            }
        }
        for (const [id, entry] of this.entries) {
            if (distance(id) <= preloadRadius)
                continue;
            if (entry.geometry) {
                this.group.remove(entry.geometry);
                disposeChunkGeometry(entry.geometry);
                entry.geometry = undefined;
            }
            if (distance(id) > CONFIG.streaming.unloadRadius + activeRadius)
                this.entries.delete(id);
            else
                entry.state = 'BACKGROUND';
        }
    }
    updateCalendar(time) { this.time = time; }
    getStats() {
        let active = 0, preloaded = 0, background = 0;
        for (const e of this.entries.values()) {
            if (e.state === 'ACTIVE')
                active++;
            else if (e.state === 'PRELOADED')
                preloaded++;
            else
                background++;
        }
        return { active, preloaded, background, logical: this.world.chunks.size, rendered: this.group.children.length };
    }
    dispose() { for (const e of this.entries.values())
        if (e.geometry)
            disposeChunkGeometry(e.geometry); this.entries.clear(); this.group.clear(); }
}
