import * as THREE from 'three';
import { random } from '../utils/random.js';
import { constructionProgress, holidayProgress } from '../environment/time.js';
const mat = (color, roughness = .85, metalness = 0) => new THREE.MeshStandardMaterial({ color, roughness, metalness });
const grass = mat(0x698c5b), asphalt = mat(0x414b51), paving = mat(0xb7b8af), line = mat(0xe5ddc4), bark = mat(0x685342), leaf = [mat(0x4b8055), mat(0x668e58), mat(0x8b9c57), mat(0x547959)], metal = mat(0x52666c, .46, .6), glass = mat(0x7898a6, .25, .3), darkGlass = mat(0x3b596a, .26, .28), warm = mat(0xe8ba6b), wood = mat(0x866b4f), lightRoof = mat(0x77776e), garden = mat(0x6a9768);
export function box(parent, w, h, d, material, x = 0, y = h / 2, z = 0) { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; parent.add(m); return m; }
function sphere(parent, r, material, x, y, z, detail = 1) { const m = new THREE.Mesh(new THREE.IcosahedronGeometry(r, detail), material); m.position.set(x, y, z); m.castShadow = true; parent.add(m); return m; }
function cylinder(parent, rt, rb, h, material, x, y, z, sides = 8) { const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, sides), material); m.position.set(x, y, z); m.castShadow = true; parent.add(m); return m; }
function textSprite(text, scale = 1) { const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 128; const ctx = canvas.getContext('2d'); ctx.fillStyle = '#f6efda'; ctx.font = 'bold 42px Arial'; ctx.textAlign = 'center'; ctx.fillText(text.slice(0, 20), 256, 80); const tex = new THREE.CanvasTexture(canvas); const m = new THREE.Mesh(new THREE.PlaneGeometry(10 * scale, 2.5 * scale), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, side: THREE.DoubleSide })); return m; }
function tree(parent, x, z, seed, t) {
    const size = 2.7 + random(seed + 1) * 2.4;
    const seasonal = t.season === 'Winter' ? 0 : t.season === 'Spring' ? .72 : t.season === 'Autumn' ? .75 : 1;
    const evergreen = random(seed + 9) < .17;
    const crown = evergreen ? mat(0x355b49) : t.season === 'Autumn' ? mat([0xb17e38, 0x9c7b3c, 0xa8663f, 0x777c3a][seed % 4]) : leaf[seed % leaf.length];
    cylinder(parent, .15, .25, size * .65, bark, x, size * .32, z, 7);
    if (evergreen) {
        for (let i = 0; i < 3; i++) {
            const m = new THREE.Mesh(new THREE.ConeGeometry((size * .45) * (1 - i * .25), size * .56, 7), crown);
            m.position.set(x, size * (.54 + i * .17), z);
            m.castShadow = true;
            parent.add(m);
        }
    }
    else {
        for (let i = 0; i < 4; i++) {
            const angle = i * 2.399;
            const radius = size * (.27 + random(seed + i) * .10) * seasonal;
            if (radius > .05)
                sphere(parent, radius, crown, x + Math.sin(angle) * size * .2, size * (.67 + random(seed + i + 11) * .19), z + Math.cos(angle) * size * .18, 1);
        }
    }
}
function lamp(parent, x, z) { cylinder(parent, .065, .09, 5.1, metal, x, 2.55, z, 8); box(parent, 1.45, .11, .28, metal, x + .65, 5.1, z); box(parent, .73, .07, .28, warm, x + 1.01, 5.02, z); }
function bench(parent, x, z) { box(parent, 2, .13, .64, wood, x, .67, z); box(parent, 2, .78, .13, wood, x, 1.12, z - .32); for (const dx of [-.7, .7])
    box(parent, .12, .62, .13, metal, x + dx, .32, z); }
function patio(parent, v) { for (let j = 0; j < 2; j++) {
    const x = v.x - 2 + j * 4, z = v.z + v.depth / 2 + 4.1;
    cylinder(parent, .07, .07, .78, metal, x, .4, z);
    cylinder(parent, .72, .72, .09, wood, x, .8, z, 10);
    cylinder(parent, .06, .06, 1.6, metal, x, 1.7, z);
    const cone = new THREE.Mesh(new THREE.ConeGeometry(1.65, .75, 8), mat(j ? 0xb15b4d : 0xdfd1b1));
    cone.position.set(x, 2.5, z);
    parent.add(cone);
    for (const dx of [-1.35, 1.35]) {
        box(parent, .55, .15, .5, wood, x + dx, .56, z);
        box(parent, .1, .65, .1, metal, x + dx, .31, z);
    }
} }
function playground(parent, v) {
    box(parent, 19, .08, 18, mat(0xc2a98b), v.x, .045, v.z);
    for (let n = 0; n < 2; n++) {
        const x = v.x - 5 + n * 8;
        box(parent, 2.5, .13, 1.6, mat(n ? 0x5c9aaf : 0xca8e40), x, 2.3, v.z);
        for (const dx of [-1, 1])
            cylinder(parent, .08, .08, 2.3, metal, x + dx, 1.15, v.z);
        const slide = box(parent, 1.5, .08, 3, mat(0xb65f4e), x, 1.13, v.z + 2);
        slide.rotation.x = -.6;
    }
    for (let i = 0; i < 3; i++)
        bench(parent, v.x - 5 + i * 5, v.z + 8.8);
}
function structure(parent, v, t) {
    const site = v.type === 'construction';
    const progress = site ? constructionProgress(t.date).progress : 1;
    const floors = site ? Math.max(1, Math.floor(v.floors * progress)) : v.floors;
    const h = floors * 3.15, w = v.width, d = v.depth;
    const root = new THREE.Group();
    root.position.set(v.x, 0, v.z);
    parent.add(root);
    const wall = mat(v.color), trim = mat(0xdcd9d0), roof = mat(v.type === 'house' ? 0x77564b : 0x64747a), ground = mat(0xa3a49a);
    box(root, w + .8, .12, d + .8, ground, 0, .06, 0);
    box(root, w, h, d, site ? mat(0xaeb5b2) : wall);
    if (v.roof === 'gable' && !site) {
        // Actual triangular roof profile extruded along the building's depth.
        const shape = new THREE.Shape();
        shape.moveTo(-w / 2 - .5, 0);
        shape.lineTo(0, 3);
        shape.lineTo(w / 2 + .5, 0);
        shape.closePath();
        const geo = new THREE.ExtrudeGeometry(shape, { depth: d + 1, bevelEnabled: false });
        geo.translate(0, h, -d / 2 - .5);
        const mesh = new THREE.Mesh(geo, roof);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        root.add(mesh);
    }
    else if (v.roof === 'hip' && !site) {
        const bottom = [[-w / 2 - .5, h, -d / 2 - .5], [w / 2 + .5, h, -d / 2 - .5], [w / 2 + .5, h, d / 2 + .5], [-w / 2 - .5, h, d / 2 + .5]];
        const top = [[-w * .28, h + 2.5, 0], [w * .28, h + 2.5, 0]];
        const pts = [...bottom, ...top];
        const tris = [0, 1, 5, 0, 5, 4, 3, 4, 5, 3, 5, 2, 0, 4, 3, 1, 2, 5];
        const arr = [];
        for (const i of tris)
            arr.push(...pts[i]);
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.Float32BufferAttribute(arr, 3));
        geo.computeVertexNormals();
        const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: 0x765f58, side: THREE.DoubleSide }));
        mesh.castShadow = true;
        root.add(mesh);
    }
    else {
        box(root, w + .8, .35, d + .8, roof, 0, h + .175, 0);
        if (!site) {
            for (const dx of [-w / 2 + .45, w / 2 - .45])
                box(root, .28, .65, d + .7, trim, dx, h + .55, 0);
            for (const dz of [-d / 2 + .45, d / 2 - .45])
                box(root, w + .5, .65, .28, trim, 0, h + .55, dz);
        }
        if (v.floors >= 4 && !site) {
            box(root, 2.9, 1, 2.4, metal, w * .24, h + 1, 0);
            box(root, .6, 1.6, .7, metal, -w * .25, h + .8, -d * .2);
        }
    }
    if (site) {
        for (let k = 0; k < 4; k++) {
            const xx = -w / 2 + k * w / 3;
            cylinder(root, .08, .08, v.height + .5, metal, xx, (v.height + .5) / 2, -d / 2 - .9);
            cylinder(root, .08, .08, v.height + .5, metal, xx, (v.height + .5) / 2, d / 2 + .9);
        }
        for (let k = 1; k <= floors; k++)
            box(root, w + .5, .15, d + .8, mat(0xaeb9bd), 0, k * 3.15, 0);
    }
    else {
        const panes = Math.max(2, Math.floor(w / 3.25));
        for (let floor = 0; floor < floors; floor++)
            for (let i = 0; i < panes; i++) {
                const xx = -w / 2 + (i + .5) * w / panes;
                for (const side of [-1, 1]) {
                    const m = box(root, Math.min(1.55, w / panes * .62), 1.6, .1, (i + floor + v.id) % 7 === 0 ? warm : glass, xx, floor * 3.15 + 1.82, side * (d / 2 + .055));
                    m.castShadow = false;
                    box(root, Math.min(1.7, w / panes * .68), .12, .22, trim, xx, floor * 3.15 + 1, d / 2 * side + .1 * side);
                }
            }
        for (let floor = 0; floor < floors; floor++)
            for (let j = 0; j < Math.max(1, Math.floor(d / 3.6)); j++) {
                const zz = -d / 2 + (j + .5) * d / Math.max(1, Math.floor(d / 3.6));
                for (const side of [-1, 1]) {
                    const m = box(root, .09, 1.7, 1.5, darkGlass, side * (w / 2 + .055), floor * 3.15 + 1.8, zz);
                    m.castShadow = false;
                }
            }
        box(root, 2.1, 2.35, .13, mat(0x394b51), 0, 1.18, d / 2 + .09);
        box(root, 2.55, .27, .55, trim, 0, 2.45, d / 2 + .38);
        if (v.type === 'house') {
            box(root, .7, 1.1, .72, roof, -w * .29, h + 1.5, -d * .21);
            box(root, w + .6, .22, .25, trim, 0, h * .75, d / 2 + .14);
        }
        if (!['house', 'apartment', 'office'].includes(v.type)) {
            const sign = textSprite(v.name, .62);
            sign.position.set(0, 2.8, d / 2 + .22);
            root.add(sign);
        }
    }
    if (v.type === 'cafe' || v.type === 'restaurant')
        patio(parent, v);
    if (v.type === 'house') {
        box(parent, 3.6, .1, 5.1, paving, v.x, .055, v.z + d / 2 + 3.4);
        for (let i = 0; i < 3; i++)
            sphere(parent, .45, garden, v.x - w / 2 - 1, .45, v.z - 4 + i * 4);
    }
    return root;
}
export function buildCityGeometry(world, t) {
    const group = new THREE.Group(), trees = new THREE.Group(), decorations = new THREE.Group(), construction = new THREE.Group();
    group.add(trees, decorations, construction);
    const E = world.extent;
    box(group, E * 2 + 38, .28, E * 2 + 38, grass, 0, -.18, 0);
    for (const r of world.roads) {
        box(group, E * 2 + 20, .07, 9, asphalt, 0, .025, r);
        box(group, 9, .07, E * 2 + 20, asphalt, r, .032, 0);
        for (const side of [-1, 1]) {
            box(group, E * 2 + 20, .13, 2.1, paving, 0, .12, r + side * 5.65);
            box(group, 2.1, .13, E * 2 + 20, paving, r + side * 5.65, .12, 0);
        }
        for (let k = -E + 8; k < E; k += 11) {
            box(group, 3, .014, .12, line, k, .069, r);
            box(group, .12, .014, 3, line, r, .07, k);
        }
    }
    // Zebra crossing stripes at central junctions.
    for (let i = 1; i < world.roads.length - 1; i++)
        for (let j = 1; j < world.roads.length - 1; j++) {
            const x = world.roads[i], z = world.roads[j];
            for (let a = -3; a <= 3; a++) {
                box(group, .55, .013, 3.2, line, x + a * 1.04, .078, z + 8.5);
                box(group, 3.2, .013, .55, line, x + 8.5, .078, z + a * 1.04);
            }
        }
    for (const v of world.venues) {
        if (v.type === 'park' || v.type === 'playground') {
            box(group, 21, .09, 26, garden, v.x, .035, v.z);
            if (v.type === 'playground')
                playground(group, v);
            else {
                box(group, 2.3, .12, 25, paving, v.x, .12, v.z);
                box(group, 20, .12, 2.3, paving, v.x, .13, v.z);
                for (let k = 0; k < 3; k++)
                    bench(group, v.x - 7 + k * 6, v.z - 9);
            }
        }
        else if (v.type === 'construction')
            structure(construction, v, t);
        else
            structure(group, v, t);
        if (v.type === 'park' || v.type === 'playground')
            for (let i = 0; i < 5; i++)
                tree(trees, v.x - 8 + (i % 2) * 16, v.z - 10 + Math.floor(i / 2) * 9, v.id * 19 + i, t);
        else if (v.type === 'house')
            tree(trees, v.x - 7, v.z - 8, v.id * 47, t);
        else if (v.id % 3 === 0)
            tree(trees, v.x - 7, v.z - 8, v.id * 47, t);
        if (v.id % 5 === 0)
            lamp(group, v.x + 9, v.z + 11);
    }
    // Densely landscaped outer belt.
    for (let i = 0; i < 230; i++) {
        const x = (random(i * 19 + 4) - .5) * (E * 2 + 22), z = (random(i * 31 + 19) - .5) * (E * 2 + 22);
        if (world.roads.some(r => Math.abs(x - r) < 9 || Math.abs(z - r) < 9))
            continue;
        if (world.venues.some(v => Math.abs(x - v.x) < v.width / 2 + 2 && Math.abs(z - v.z) < v.depth / 2 + 2))
            continue;
        tree(trees, x, z, i * 43 + 99, t);
    }
    applyDecorations(decorations, world, t);
    return { group, trees, decorations, construction };
}
function applyDecorations(group, world, t) {
    const holiday = holidayProgress(t);
    if (!holiday.name)
        return;
    const amber = mat(0xdf8c28), gold = mat(0xeacb82), green = mat(0x2b694d), purple = mat(0x754e92);
    for (const v of world.venues) {
        if (v.type !== 'house' && v.type !== 'cafe' && v.type !== 'cityhall')
            continue;
        const level = random(v.id * 31 + 10);
        if (level > holiday.progress)
            continue;
        if (holiday.name === 'Halloween') {
            for (let i = 0; i < 3; i++) {
                const x = v.x - v.width * .25 + i * v.width * .25;
                sphere(group, .46, amber, x, .5, v.z + v.depth / 2 + 1.9);
                cylinder(group, .06, .08, .22, green, x, .97, v.z + v.depth / 2 + 1.9);
            }
            if (v.id % 3 === 0) {
                sphere(group, .62, purple, v.x + 3, 2.8, v.z + v.depth / 2 + .6);
            }
        }
        else {
            for (let i = 0; i < 9; i++) {
                const x = v.x - v.width / 2 + i * v.width / 8;
                sphere(group, .115, i % 2 ? gold : green, x, v.height + .62, v.z + v.depth / 2 + .4, 0);
            }
            if (v.id % 4 === 0) {
                const m = new THREE.Mesh(new THREE.TorusGeometry(.62, .12, 6, 12), green);
                m.position.set(v.x, 1.9, v.z + v.depth / 2 + .22);
                group.add(m);
            }
        }
    }
}
export function makeHuman(color, age) {
    const root = new THREE.Group();
    const jacket = mat(color), skin = mat(0xc9987f), pants = mat(0x3d4a59), hair = mat(0x45392e);
    const scale = age < 12 ? .72 : age < 18 ? .88 : age > 75 ? .94 : 1;
    box(root, .49, .83, .26, jacket, 0, 1.11, 0);
    box(root, .43, .68, .28, pants, 0, .41, 0);
    cylinder(root, .25, .24, .37, skin, 0, 1.77, 0, 9);
    sphere(root, .29, skin, 0, 1.96, 0, 1);
    sphere(root, .28, hair, 0, 2.14, -.045, 1);
    for (const side of [-1, 1]) {
        const a = box(root, .17, .75, .17, jacket, side * .35, 1.1, 0);
        a.rotation.z = side * .1;
        box(root, .16, .38, .2, pants, side * .15, .19, 0);
    }
    root.scale.setScalar(scale);
    return root;
}
export function makeVehicle(kind, color) {
    const g = new THREE.Group(), body = mat(color, .42, .35), windows = mat(0x334b59, .17, .34), rubber = mat(0x272c2e);
    const len = kind === 'bus' ? 10.5 : 4.6, w = kind === 'bus' ? 2.5 : 2.05, h = kind === 'bus' ? 2.7 : 1.25;
    box(g, w, h, len, body, 0, .55 + h / 2, 0);
    box(g, w * .86, kind === 'bus' ? 1.2 : .8, len * (kind === 'bus' ? .9 : .48), windows, 0, .65 + h + (kind === 'bus' ? .35 : .25), kind === 'bus' ? 0 : -.3);
    for (const side of [-1, 1])
        for (const z of [-len * .33, len * .33]) {
            const m = new THREE.Mesh(new THREE.CylinderGeometry(.43, .43, .19, 12), rubber);
            m.rotation.z = Math.PI / 2;
            m.position.set(side * (w / 2 + .01), .45, z);
            g.add(m);
        }
    for (const side of [-1, 1]) {
        box(g, .38, .22, .08, mat(0xffe6b3), side * .65, .99, len / 2 + .06);
        box(g, .38, .22, .08, mat(0xc94838), side * .65, .99, -len / 2 - .06);
    }
    return g;
}
