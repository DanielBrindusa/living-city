# Living City

**A little world, always in motion.**

Living City is a static-hostable, browser-based 3D city simulation. Visitors look into a large, autonomous fictional city and explore neighborhood life; they do not build or manage it. Its fictional residents have stable seeded identities, households, homes, jobs, dates, routines, pets, moods and destinations. Activity responds to local time, weather, seasons, and the type of district being observed.

**This is the working world-streaming foundation, not a production-quality simulation of every behavior in the original specification.** The incomplete systems are listed explicitly below.

## Run locally

Requirements: Node.js **22+**, npm, a WebGL-capable browser.

```bash
npm install
npm run dev
```

Visit the local Vite URL (usually `http://localhost:5173`).

## Test and build

```bash
npm test                 # regenerate the prebuilt /docs snapshot and run tests
npm run check            # TypeScript type check (requires npm install)
npm run build            # production /dist bundle (includes Three.js)
npm run preview          # preview /dist locally
```

The project includes a second, deliberately simpler build mode for static hosting:

```bash
npm run build:branch     # recreate /docs without Vite; Three.js loaded from CDN
npm run build:pages      # recommended: compile bundled Vite production app into /docs
```

Run `npm install` before either production build. **`npm test` regenerates the fallback `/docs`; if you want a bundled release, run `npm run build:pages` after your last test.** The generated `docs/` folder is included in the ZIP so it can be deployed through GitHub's web upload even without running npm locally. The included fallback is a JavaScript ES-module site using Three.js 0.180.0 from jsDelivr; it requires an internet connection for that one library. `build:pages` produces a self-contained Three.js bundle in `docs/` (apart from optional live weather) and is recommended for production.

## Deploy from GitHub `main` branch — **no Actions deployment**

1. Unzip the project. Upload **the contents** of the `living-city` folder, including the entire `docs/` directory, to the **repository root** of your `main` branch. Commit your files. Do **not** upload just the ZIP.
2. Open your GitHub repository **Settings → Pages**.
3. Choose **Source: Deploy from a branch**.
4. Choose **Branch: `main`**, **Folder: `/docs`**, then **Save**.
5. Open the URL listed in the Pages settings after GitHub publishes it.

**Do not deploy `/ (root)`.** Root `index.html` imports `/src/main.ts` and is only used by Vite; a static host does not compile TypeScript. `/docs/index.html` contains browser-ready JS. `.nojekyll` is included in `/docs`.

There is a `.github/workflows/deploy.yml` workflow for **source validation only**; it deliberately does **not** publish Pages. Generated `/docs` changes must be committed to `main` when you rebuild the site.

## World streaming and population behavior

- **36 × 36 interconnected city blocks** across roughly 1.66 × 1.66 km, with more than 2,300 deterministically positioned venues (houses, offices, apartments, stores, institutions and green spaces). Districts include quieter detached-house suburbs, old and new residential areas, downtown, commercial zones, hospital area, university district, workshop district, parks and sports facilities.
- **9 × 9 render-sector grid**, each sector spanning four blocks. The camera starts beside Orchard Square, a mixed-use park/café neighborhood. Zoom-out is limited; exploring by panning reveals the rest.
- **ACTIVE sectors** have solid 3D buildings, roofs, sidewalks, roads, streetlights, trees, windows and agents. **PRELOADED sectors** have nearby world descriptions in memory but no allocated meshes. **BACKGROUND/UNLOADED sectors** retain seeded world and citizen identities while their scene meshes are absent. A spare ring surrounds active sectors, and old sector render resources are removed when sufficiently distant.
- **6,200 stable fictional logical residents**, with jobs/households, staggered routines, school, weekend differences, off days, weather-sensitive leisure and outdoor jobs. Only neighborhood-relevant residents are updated in detail each second, using a spatial index. Distant residents' destinations and activities are reconstructed on demand from the calendar and seed, without maintaining per-frame distant footsteps.
- Visible weekday outdoor activity includes purposeful gardening, plant care, park maintenance, postal deliveries, construction, street cleaning, utility checks, errands, coffee/lunch trips, shopping, dog walking, retirees and students. Many other workers remain correctly indoors.
- **2,400 cars and 20 buses** with globally defined paths. Traffic updates are lightweight and vehicle models render only near the camera. Trips and bus positions are derived from time, not chunk activation. Vehicles may cross sector boundaries without reinitializing their identities.
- Shared/cached geometry and materials, batched instanced static detail, bounded visible citizen/vehicle meshes, desktop/mobile render limits and a smaller shadow map reduce per-sector cost.
- Seasonal tree variants, initial Halloween/Christmas decorations, calendar-based construction progress, fixed-timezone four-period lighting and live Open-Meteo weather with an offline deterministic fallback.
- Mouse drag/pan, scroll zoom, touch pan/pinch, reset camera, discover places, click citizens to inspect them, and follow a resident. Add `?debug=1` to the URL to see internal sector/model counts.

The fixed world seed is in `src/config/city.ts`. Its `grid.blocks`, `streaming.blocksPerChunk`, `streaming.activeRadius`, `preloadRadius`, `unloadRadius`, `minZoomIn` and `maxZoomOut` are development configuration values, not viewer-facing controls. The block count must be divisible by the blocks-per-chunk value.

## Architecture

| Path | Purpose |
| --- | --- |
| `src/world/model.ts` | Seeded world, districts, venues, roads, 81 lightweight sector descriptors |
| `src/simulation/population.ts` | Stable identities, household/job assignment, schedule-based goals, indexed local detailed activity |
| `src/transport/traffic.ts` | Global route data, car/bus trips, time-derived vehicle locations |
| `src/render/streaming.ts` | Active/preload/background sector state, geometry creation and cleanup |
| `src/render/geometry.ts` | Procedural 3D models, repeated detail instancing, vegetation and seasonal decorations |
| `src/render/viewer.ts` | Three.js scene, aerial camera, input, lighting and locally visible model pools |
| `src/environment` | Calendar, live/fallback weather, seasonal and holiday progress |
| `src/config` | Fictional public city configuration |
| `tests` | Deterministic world, sector assignment, geometry spacing, local life, traffic and deployment checks |
| `docs/` | **Committed browser-ready deployment snapshot** for `main` → `/docs` Pages |

## Validation

`node scripts/build-branch.mjs` produces an ES-module deployable snapshot for branch Pages; `npm test` verifies it and core world invariants. The provided updated archive passed **11 automated checks** at packaging time.

**Validation limitation:** The environment used to package this version had no installable Three.js/Vite dependencies and browser visual rendering could not be confirmed. Therefore a full `npm run build`, TypeScript type-check using installed Three.js types, visual fidelity, or FPS benchmarks must still be run on a machine with npm/internet. Source-level build transpilation and Node-based simulation tests were executed successfully. The fallback `docs/` site expects jsDelivr access for Three.js; the recommended `npm run build:pages` bundles it locally.

## Privacy and assets

No login, tracking, visitor geolocation, microphone, camera or personal data is required. Fixed public weather coordinates are configured in source, independent of the viewer. Fictional names are generated locally.

Procedural meshes are original to this repository. Three.js (MIT license) is referenced by the fallback `docs/` site through https://cdn.jsdelivr.net/npm/three@0.180.0/ and bundled by Vite when npm is available. No commercial game assets are used. Weather: public Open-Meteo API (subject to its current usage terms and availability).

## Remaining Enhancements

This update is a **functional foundation** for the larger-city architecture, not a complete life simulator. Known gaps:

1. **True distant-state/event persistence:** identities, schedules, routes and calendar-derived construction survive revisits; adoptions, births, moves, individual employment changes, personal episodic memory, ongoing multi-day stories and household-specific event histories are not yet modeled. Background trips are derived from the clock rather than retained in a full global travel event queue.
2. **More complete transport:** basic two-way lane offsets and city-wide waypoint routes exist, but robust directed intersection connectivity, traffic-light priority, junction reservations, no-overlap guarantees, pedestrian yielding, household-owned car parking, loading/unloading, lane-accurate turns and realistic congestion remain incomplete. Buses have visual timetables and approximate rider counts, but boarding/exiting and individually tracked bus passengers are not implemented.
3. **Purposeful pedestrian movement:** routes follow an approximate sidewalk grid but still need a validated navigation graph with actual crosswalk assignments, consistent curb-side corners, obstacle avoidance, smooth transitions, and scalable long-range navigation. Some distant journeys are compressed into time-based travel windows, so speed can be unrealistic.
4. **Visible life fidelity:** outdoor jobs/yard chores are now logical activities with visible local citizens, but tools, hands, detailed human walking cycles, dog meshes/leashes, garden implements, delivery parcels, workers at scaffolding, shop interior scenes, and actual table seating are not yet properly animated. Visible residents use stylized simple 3D models, not the requested high-end detailed characters.
5. **Rendering optimization:** chunk meshes are batched and locally bounded; full camera-frustum-sector intersection, distance LOD, gradual asynchronous geometry creation, instanced buildings/vegetation by archetype, smarter mesh pooling, performance-adaptive quality and off-main-thread scene preparation remain improvements. Fast jumps/zoom changes can create a geometry build hitch. No hard FPS or memory benchmarks have been completed on real devices.
6. **Season/weather:** basic seasonal vegetation and holiday decorations exist; tree-by-tree week-scale leaf phenology, accumulation, falling leaves, rain/snow particle fields, wet reflective surfaces, umbrellas, detailed winter clothing, weather-dependent road traction and smoothly changing evening window light require further work.
7. **Emergency/holiday narratives:** fire/police/ambulance response lifecycles, arrest causes, differentiated healthcare appointments, school playground animations, physical home-decoration installation/removal, Halloween trick-or-treat groups and December 24–25 Christmas tree gathering/cocoa activities are not yet fully implemented. The discovered-place button is not yet an emergent event-feed service.
8. **Visual quality and validation:** current procedural architecture is substantially larger but not professional architectural visualization. More architectural variation, roof correctness checks on every archetype, carefully authored facades and props, scene-level visual testing and automated browser screenshots remain necessary.
9. **Network/offline:** the included prebuilt no-npm `docs/` version fetches Three.js from jsDelivr. Run `npm run build:pages` and commit the output to eliminate that runtime CDN dependency. Weather gracefully falls back when Open-Meteo is unavailable.

Contributions should preserve the core design: **global low-cost logical state, local detailed behavior, and render only what the visitor can see**.
