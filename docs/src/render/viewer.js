import * as THREE from 'three';
import { buildCityGeometry, makeHuman, makeVehicle } from './geometry.js';
import { CONFIG } from '../config/city.js';
import { clamp } from '../utils/random.js';
export class Viewer {
    host;
    world;
    scene = new THREE.Scene();
    renderer;
    camera;
    target = new THREE.Vector3(0, 0, 0);
    zoomDistance = 470;
    pointer = new THREE.Vector2();
    ray = new THREE.Raycaster();
    sunlight = new THREE.DirectionalLight(0xffffff, 3);
    ambient = new THREE.HemisphereLight(0xcde5ff, 0x52634b, 2);
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
    constructor(host, world, t, onInspect) {
        this.host = host;
        this.world = world;
        this.inspect = onInspect;
        const mobile = matchMedia('(max-width: 700px)').matches;
        this.renderer = new THREE.WebGLRenderer({ antialias: !mobile, alpha: false, powerPreference: 'high-performance' });
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, mobile ? 1.5 : 1.85));
        this.renderer.shadowMap.enabled = !mobile;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.2;
        host.appendChild(this.renderer.domElement);
        this.camera = new THREE.OrthographicCamera(-100, 100, 100, -100, .2, 1800);
        this.scene.add(this.ambient, this.sunlight);
        this.sunlight.castShadow = !mobile;
        this.sunlight.shadow.mapSize.set(2048, 2048);
        this.sunlight.shadow.camera.left = -280;
        this.sunlight.shadow.camera.right = 280;
        this.sunlight.shadow.camera.top = 280;
        this.sunlight.shadow.camera.bottom = -280;
        this.sunlight.shadow.normalBias = .018;
        this.sunlight.shadow.bias = -.0003;
        this.sunlight.target.position.set(0, 0, 0);
        this.scene.add(this.sunlight.target);
        const geometry = buildCityGeometry(world, t);
        this.scene.add(geometry.group, this.citizens, this.carMeshes);
        this.bindControls();
        this.resize();
        window.addEventListener('resize', () => this.resize());
        this.updateLighting(t);
    }
    resize() { this.size = { w: this.host.clientWidth, h: this.host.clientHeight }; this.renderer.setSize(this.size.w, this.size.h, false); this.updateCamera(); }
    updateCamera() {
        const aspect = this.size.w / Math.max(1, this.size.h);
        const span = this.zoomDistance;
        this.camera.left = -span * aspect / 2;
        this.camera.right = span * aspect / 2;
        this.camera.top = span / 2;
        this.camera.bottom = -span / 2;
        this.camera.position.set(this.target.x + span * .69, this.target.y + span * .95, this.target.z + span * .92);
        this.camera.lookAt(this.target);
        this.camera.updateProjectionMatrix();
    }
    bindControls() {
        const dom = this.renderer.domElement;
        dom.style.touchAction = 'none';
        dom.addEventListener('wheel', e => { e.preventDefault(); this.zoomDistance = clamp(this.zoomDistance * Math.exp(e.deltaY * .0011), 55, 640); this.updateCamera(); }, { passive: false });
        dom.addEventListener('pointerdown', e => { dom.setPointerCapture(e.pointerId); this.downX = e.clientX; this.downY = e.clientY; this.x0 = e.clientX; this.y0 = e.clientY; this.downTarget.copy(this.target); this.dragged = false; });
        dom.addEventListener('pointermove', e => {
            if (!dom.hasPointerCapture(e.pointerId))
                return;
            const dx = e.clientX - this.x0, dy = e.clientY - this.y0;
            if (Math.abs(e.clientX - this.downX) + Math.abs(e.clientY - this.downY) > 5)
                this.dragged = true;
            const scale = this.zoomDistance / this.size.h;
            this.target.x = clamp(this.downTarget.x + (-dx * .68 - dy * .73) * scale, -175, 175);
            this.target.z = clamp(this.downTarget.z + (dx * .73 - dy * .68) * scale, -175, 175);
            this.following = null;
            this.updateCamera();
        });
        dom.addEventListener('pointerup', e => {
            if (this.dragged)
                return;
            const rect = dom.getBoundingClientRect();
            this.pointer.set((e.clientX - rect.left) / rect.width * 2 - 1, -(e.clientY - rect.top) / rect.height * 2 + 1);
            this.ray.setFromCamera(this.pointer, this.camera);
            const intersections = this.ray.intersectObjects(this.citizens.children, true);
            for (const hit of intersections) {
                let node = hit.object;
                while (node && node.userData.citizenId === undefined)
                    node = node.parent;
                if (node && typeof node.userData.citizenId === 'number') {
                    this.inspect(node.userData.citizenId);
                    return;
                }
            }
        });
        dom.addEventListener('touchstart', e => { if (e.touches.length === 2) {
            this.pinch = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
        } }, { passive: true });
        dom.addEventListener('touchmove', e => { if (e.touches.length === 2) {
            const d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
            this.zoomDistance = clamp(this.zoomDistance * this.pinch / d, 55, 640);
            this.pinch = d;
            this.updateCamera();
        } }, { passive: true });
    }
    reset() { this.following = null; this.target.set(0, 0, 0); this.zoomDistance = 470; this.updateCamera(); }
    focus(x, z, zoom = 145) { this.following = null; this.target.set(x, 0, z); this.zoomDistance = zoom; this.updateCamera(); }
    follow(id) { this.following = id; }
    updateLighting(t) {
        const h = t.hour + t.minute / 60;
        const sunlight = Math.max(.06, t.daylight);
        this.sunlight.position.set(Math.cos(h / 24 * Math.PI * 2) * 240, 80 + sunlight * 220, Math.sin(h / 24 * Math.PI * 2) * 170);
        this.sunlight.intensity = .18 + sunlight * 2.5;
        this.ambient.intensity = .35 + sunlight * 1.8;
        const night = t.phase === 'Night';
        const sky = new THREE.Color(night ? 0x101a30 : t.phase === 'Evening' ? 0xc9a57f : t.phase === 'Morning' ? 0xb6ccd0 : 0xa8c7d8);
        this.scene.background = sky;
        this.scene.fog = new THREE.Fog(sky, 350, 950);
        this.renderer.toneMappingExposure = night ? .76 : 1.1;
    }
    update(people, vehicles, t, w) {
        const mobile = matchMedia('(max-width: 700px)').matches;
        const limit = mobile ? CONFIG.visibleMobile : CONFIG.visibleDesktop;
        const candidates = people.filter(c => c.visible).sort((a, b) => ((a.x - this.target.x) ** 2 + (a.z - this.target.z) ** 2) - ((b.x - this.target.x) ** 2 + (b.z - this.target.z) ** 2)).slice(0, limit);
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
            mesh.position.set(c.x, 0.12, c.z);
            mesh.visible = true;
            const next = c.path[Math.min(c.path.length - 1, Math.floor(c.progress * (c.path.length - 1)) + 1)];
            if (next)
                mesh.rotation.y = Math.atan2(next.x - c.x, next.z - c.z);
        }
        for (const [id, m] of this.citizenModels) {
            if (!active.has(id))
                m.visible = false;
        }
        for (const v of vehicles) {
            let mesh = this.vehicleModels.get(v.id);
            if (!mesh) {
                mesh = makeVehicle(v.kind, v.color);
                this.carMeshes.add(mesh);
                this.vehicleModels.set(v.id, mesh);
            }
            mesh.position.set(v.x, .1, v.z);
            mesh.rotation.y = v.angle;
            mesh.visible = v.progress < .999;
        }
        if (this.following !== null) {
            const c = people[this.following];
            if (c) {
                this.target.x += (c.x - this.target.x) * .04;
                this.target.z += (c.z - this.target.z) * .04;
                this.zoomDistance += (105 - this.zoomDistance) * .03;
                this.updateCamera();
            }
        }
        if (t.second % 10 === 0)
            this.updateLighting(t);
        if (w.kind !== this.lastWeather) {
            this.lastWeather = w.kind;
            const sky = this.scene.background;
            if (w.kind === 'rain')
                sky.multiplyScalar(.75);
            if (w.kind === 'snow')
                sky.lerp(new THREE.Color(0xd7e1ea), .4);
        }
        this.renderer.render(this.scene, this.camera);
    }
    destroy() { this.renderer.dispose(); this.host.replaceChildren(); }
}
