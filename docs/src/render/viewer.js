import * as THREE from 'three';
import { makeHuman, makeVehicle } from './geometry.js';
import { WorldStreamer } from './streaming.js';
import { CONFIG } from '../config/city.js';
import { clamp } from '../utils/random.js';
export class Viewer {
    host;
    world;
    scene = new THREE.Scene();
    renderer;
    camera;
    target = new THREE.Vector3();
    zoomDistance = CONFIG.streaming.startingZoom;
    pointer = new THREE.Vector2();
    ray = new THREE.Raycaster();
    sunlight = new THREE.DirectionalLight(0xffffff, 3);
    ambient = new THREE.HemisphereLight(0xcde5ff, 0x52634b, 2);
    streamer;
    citizens = new THREE.Group();
    carMeshes = new THREE.Group();
    citizenModels = new Map();
    vehicleModels = new Map();
    inspect;
    following = null;
    dragged = false;
    downX = 0;
    downY = 0;
    downTarget = new THREE.Vector3();
    x0 = 0;
    y0 = 0;
    pinch = 0;
    lastWeather = '';
    size = { w: 1, h: 1 };
    humanColors = [0x567a8b, 0xb77d59, 0x63785d, 0x994c57, 0xd6a246, 0x68647e, 0x67908b, 0x9f8570];
    mobile = matchMedia('(max-width: 700px)').matches;
    constructor(host, world, t, onInspect) {
        this.host = host;
        this.world = world;
        this.inspect = onInspect;
        const spot = world.centerOfBlock(CONFIG.streaming.startBlock.x, CONFIG.streaming.startBlock.z);
        this.target.set(spot.x, 0, spot.z);
        this.renderer = new THREE.WebGLRenderer({ antialias: !this.mobile, alpha: false, powerPreference: 'high-performance' });
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, this.mobile ? 1.35 : 1.7));
        this.renderer.shadowMap.enabled = !this.mobile;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.2;
        host.appendChild(this.renderer.domElement);
        this.camera = new THREE.OrthographicCamera(-100, 100, 100, -100, .2, 1000);
        this.scene.add(this.ambient, this.sunlight);
        this.sunlight.castShadow = !this.mobile;
        this.sunlight.shadow.mapSize.set(1024, 1024);
        this.sunlight.shadow.camera.left = -215;
        this.sunlight.shadow.camera.right = 215;
        this.sunlight.shadow.camera.top = 215;
        this.sunlight.shadow.camera.bottom = -215;
        this.sunlight.shadow.normalBias = .018;
        this.sunlight.shadow.bias = -.0003;
        this.scene.add(this.sunlight.target);
        this.streamer = new WorldStreamer(world, t);
        this.scene.add(this.streamer.group, this.citizens, this.carMeshes);
        this.bindControls();
        this.resize();
        window.addEventListener('resize', this.resizeBound);
        this.updateLighting(t);
        this.streamer.sync(this.target.x, this.target.z, this.zoomDistance, this.size.w / this.size.h);
    }
    resizeBound = () => this.resize();
    resize() { this.size = { w: Math.max(1, this.host.clientWidth), h: Math.max(1, this.host.clientHeight) }; this.renderer.setSize(this.size.w, this.size.h, false); this.updateCamera(); }
    updateCamera() {
        const aspect = this.size.w / this.size.h, span = this.zoomDistance;
        this.camera.left = -span * aspect / 2;
        this.camera.right = span * aspect / 2;
        this.camera.top = span / 2;
        this.camera.bottom = -span / 2;
        this.camera.position.set(this.target.x + span * .70, this.target.y + span * .97, this.target.z + span * .87);
        this.camera.lookAt(this.target);
        this.camera.updateProjectionMatrix();
    }
    moveTarget(x, z) { const limit = this.world.extent - 25; this.target.set(clamp(x, -limit, limit), 0, clamp(z, -limit, limit)); this.updateCamera(); }
    bindControls() {
        const dom = this.renderer.domElement;
        dom.style.touchAction = 'none';
        const min = CONFIG.streaming.minZoomIn, max = CONFIG.streaming.maxZoomOut;
        dom.addEventListener('wheel', e => { e.preventDefault(); this.zoomDistance = clamp(this.zoomDistance * Math.exp(e.deltaY * .0011), min, max); this.updateCamera(); }, { passive: false });
        dom.addEventListener('pointerdown', e => { dom.setPointerCapture(e.pointerId); this.downX = e.clientX; this.downY = e.clientY; this.x0 = e.clientX; this.y0 = e.clientY; this.downTarget.copy(this.target); this.dragged = false; });
        dom.addEventListener('pointermove', e => {
            if (!dom.hasPointerCapture(e.pointerId) || e.pointerType === 'touch' && this.pinch > 0)
                return;
            const dx = e.clientX - this.x0, dy = e.clientY - this.y0;
            if (Math.abs(e.clientX - this.downX) + Math.abs(e.clientY - this.downY) > 6)
                this.dragged = true;
            const scale = this.zoomDistance / this.size.h;
            this.moveTarget(this.downTarget.x + (-dx * .68 - dy * .73) * scale, this.downTarget.z + (dx * .73 - dy * .68) * scale);
            this.following = null;
        });
        dom.addEventListener('pointerup', e => {
            if (this.dragged || this.pinch > 0)
                return;
            const rect = dom.getBoundingClientRect();
            this.pointer.set((e.clientX - rect.left) / rect.width * 2 - 1, -(e.clientY - rect.top) / rect.height * 2 + 1);
            this.ray.setFromCamera(this.pointer, this.camera);
            const hits = this.ray.intersectObjects(this.citizens.children, true);
            for (const hit of hits) {
                let node = hit.object;
                while (node && node.userData.citizenId === undefined)
                    node = node.parent;
                if (node && typeof node.userData.citizenId === 'number') {
                    this.inspect(node.userData.citizenId);
                    return;
                }
            }
        });
        dom.addEventListener('touchstart', e => { if (e.touches.length === 2)
            this.pinch = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY); }, { passive: true });
        dom.addEventListener('touchmove', e => { if (e.touches.length === 2) {
            const d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
            if (this.pinch)
                this.zoomDistance = clamp(this.zoomDistance * this.pinch / d, min, max);
            this.pinch = d;
            this.updateCamera();
        } }, { passive: true });
        dom.addEventListener('touchend', () => { this.pinch = 0; }, { passive: true });
    }
    reset() { this.following = null; const c = this.world.centerOfBlock(CONFIG.streaming.startBlock.x, CONFIG.streaming.startBlock.z); this.moveTarget(c.x, c.z); this.zoomDistance = CONFIG.streaming.startingZoom; this.updateCamera(); }
    focus(x, z, zoom = 145) { this.following = null; this.moveTarget(x, z); this.zoomDistance = clamp(zoom, CONFIG.streaming.minZoomIn, CONFIG.streaming.maxZoomOut); this.updateCamera(); }
    follow(id) { this.following = id; }
    cameraPosition() { return { x: this.target.x, z: this.target.z, zoom: this.zoomDistance }; }
    getStats() { return this.streamer.getStats(); }
    updateLighting(t) {
        const h = t.hour + t.minute / 60, sunlight = Math.max(.06, t.daylight);
        this.sunlight.position.set(this.target.x + Math.cos(h / 24 * Math.PI * 2) * 180, 100 + sunlight * 170, this.target.z + Math.sin(h / 24 * Math.PI * 2) * 180);
        this.sunlight.target.position.set(this.target.x, 0, this.target.z);
        this.sunlight.target.updateMatrixWorld();
        this.sunlight.intensity = .2 + sunlight * 2.5;
        this.ambient.intensity = .35 + sunlight * 1.8;
        const night = t.phase === 'Night', sky = new THREE.Color(night ? 0x101a30 : t.phase === 'Evening' ? 0xc9a57f : t.phase === 'Morning' ? 0xb6ccd0 : 0xa8c7d8);
        this.scene.background = sky;
        this.scene.fog = new THREE.Fog(sky, 285, 570);
        this.renderer.toneMappingExposure = night ? .76 : 1.1;
    }
    update(people, vehicles, t, w) {
        this.streamer.updateCalendar(t);
        this.streamer.sync(this.target.x, this.target.z, this.zoomDistance, this.size.w / this.size.h);
        const limit = this.mobile ? CONFIG.visibleMobile : CONFIG.visibleDesktop, renderDistance = this.zoomDistance * 1.95;
        const candidates = people.filter(c => c.visible && Math.abs(c.x - this.target.x) < renderDistance && Math.abs(c.z - this.target.z) < renderDistance)
            .sort((a, b) => ((a.x - this.target.x) ** 2 + (a.z - this.target.z) ** 2) - ((b.x - this.target.x) ** 2 + (b.z - this.target.z) ** 2)).slice(0, limit);
        const active = new Set();
        for (const c of candidates) {
            active.add(c.id);
            let mesh = this.citizenModels.get(c.id);
            if (!mesh) {
                mesh = makeHuman(this.humanColors[c.id % this.humanColors.length], c.age);
                mesh.userData.citizenId = c.id;
                this.citizens.add(mesh);
                this.citizenModels.set(c.id, mesh);
            }
            mesh.position.set(c.x, .12, c.z);
            mesh.visible = true;
            if (c.traveling) {
                const next = c.path[Math.min(c.path.length - 1, Math.floor(c.progress * (c.path.length - 1)) + 1)];
                if (next)
                    mesh.rotation.y = Math.atan2(next.x - c.x, next.z - c.z);
            }
        }
        // Strictly bounded model pools, independent of how many distant sectors were explored.
        for (const [id, mesh] of this.citizenModels)
            if (!active.has(id)) {
                this.citizens.remove(mesh);
                this.citizenModels.delete(id);
            }
        const localCars = vehicles.filter(v => v.moving && Math.abs(v.x - this.target.x) < renderDistance && Math.abs(v.z - this.target.z) < renderDistance).slice(0, this.mobile ? 65 : 135);
        const carIds = new Set();
        for (const v of localCars) {
            carIds.add(v.id);
            let mesh = this.vehicleModels.get(v.id);
            if (!mesh) {
                mesh = makeVehicle(v.kind, v.color);
                this.carMeshes.add(mesh);
                this.vehicleModels.set(v.id, mesh);
            }
            mesh.position.set(v.x, .1, v.z);
            mesh.rotation.y = v.angle;
            mesh.visible = true;
        }
        for (const [id, mesh] of this.vehicleModels)
            if (!carIds.has(id)) {
                this.carMeshes.remove(mesh);
                this.vehicleModels.delete(id);
            }
        if (this.following !== null) {
            const c = people[this.following];
            if (c) {
                this.target.x += (c.x - this.target.x) * .04;
                this.target.z += (c.z - this.target.z) * .04;
                this.zoomDistance += (95 - this.zoomDistance) * .025;
                this.updateCamera();
            }
        }
        if (t.second % 10 === 0)
            this.updateLighting(t);
        if (w.kind !== this.lastWeather) {
            this.lastWeather = w.kind;
            const sky = this.scene.background;
            if (w.kind === 'rain')
                sky.multiplyScalar(.78);
            if (w.kind === 'snow')
                sky.lerp(new THREE.Color(0xd7e1ea), .3);
        }
        this.renderer.render(this.scene, this.camera);
    }
    destroy() { window.removeEventListener('resize', this.resizeBound); this.streamer.dispose(); this.renderer.dispose(); this.host.replaceChildren(); }
}
