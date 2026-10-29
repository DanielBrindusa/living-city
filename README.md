# Living City

**A little world, always in motion.**

Living City is a browser-based autonomous 3D city diorama. Fictional residents have stable identities, homes, work assignments, schedules, moods and destinations. City activity changes with the configured time zone, seasons, weather and holidays. Visitors observe, explore, inspect residents and follow their journeys; they never manage the city.

This repository contains a **working first-iteration implementation**, not a claim that the entire multi-year simulation specification has been completed.

## Requirements

- Node.js 22 or newer and npm
- A browser with WebGL 2 support
- An internet connection for **initial npm package installation**; the city itself can function after installation without a backend (live weather needs network access)

## Run locally

```bash
npm install
npm run dev
```

Open the local address printed by Vite (usually `http://localhost:5173/`).

## Build and preview

```bash
npm test
npm run check
npm run build
npm run preview
```

The deployable site is generated in `dist/`. Do not open `index.html` by double-clicking; use Vite or a static HTTP server to serve the compiled output.

## Deploy directly from `main` branch (no Actions deployment)

The ZIP already contains **`docs/index.html` and all needed application files**. GitHub Pages can serve these as a static site without executing Vite or TypeScript. **Do not select `/ (root)`**; `index.html` at the repository root is for Vite development and cannot run directly on GitHub Pages.

1. Unzip the project locally. Upload **all contents** of the `living-city` directory into the **root** of your GitHub repository on the `main` branch, keeping the `docs` directory and all its files. Do not upload just the ZIP file. Commit the changes. If replacing an earlier version, overwrite existing files and make sure the old workflow has been replaced.
2. Open **Repository → Settings → Pages**.
3. Under **Build and deployment**, choose **Source: Deploy from a branch** (not GitHub Actions).
4. Choose **Branch: `main`** and **Folder: `/docs`**; click **Save**.
5. Once GitHub Pages finishes publishing, open the URL shown in Settings → Pages. You should see the 3D city UI, not the original “Building your little world…” text.

The files initially included in `docs/` are a **prebuilt ES-module fallback**. They work without a build step, but load the Three.js engine from jsDelivr over HTTPS. No authentication is required. The city still uses Open-Meteo weather with a graceful weather fallback. If a viewer cannot access the Three.js CDN, the site shows a startup error rather than hanging silently.

**Recommended for production:** on your own machine with internet/npm access, run:

```bash
npm install
npm test
npm run build:pages
```

This replaces the `docs/` fallback with a real **Vite-bundled production build**, including Three.js locally. Commit/push the generated `docs/` changes to `main`; GitHub Pages will publish the updated files directly from that branch without running a deployment workflow.

For a regular build targeting a different host, `npm run build` continues to generate `dist/`.

The included `.github/workflows/deploy.yml` has been changed into an optional **validation-only** workflow. It **does not deploy**; Pages reads `/docs` from `main`.

**Troubleshooting:** If you see only the unstyled initial loading sentence, Pages is probably serving the repository root rather than `/docs`. If you see a “could not load” message, open browser DevTools → Console/Network and check Three.js CDN availability. If you see a blank 3D viewport on an older device, check WebGL 2 support.

## What works now

- A **real Three.js/WebGL 3D map** with 8 × 8 blocks, roads, sidewalks, zebra crossings, building entrances, lamps, planters, parks, two playgrounds, cafés and terraces.
- Distinct residential, retail, office and civic venues including a school, hospital, police and fire stations, bank, post office, mall, supermarket, City Hall and construction site.
- Procedural solid 3D building geometry with doors, windows, façade variation, flat/gable/hip roofs, rooftop equipment and landscaped plots. People, cars and buses are geometric 3D models (not external downloaded art).
- **480 deterministic fictional residents**, with age, occupation, home, workplace, social reference, mood, household index, commute preference and destination. Schedules differ by role, weekends and individual timing offsets.
- Logical trips between venues and moving pedestrians; only pedestrians currently on trips are rendered. Click people to inspect them and use Follow to track them.
- Moving 3D cars and buses on road-based route segments, with lighter nighttime car traffic.
- Calendar-derived city date/time in `Europe/Bucharest`, four day phases and sun/ambient lighting with shadows on desktop.
- Keyless Open-Meteo weather lookup for **one configured city location** with deterministic no-network fallback.
- Basic seasonal deciduous trees and conifers; staged Halloween pumpkins/lights and Christmas roofline/wreath decoration driven by the calendar.
- Construction height linked to a global deterministic 183-day build / 21-day demolition / 183-day rebuild loop.
- Desktop mouse-wheel zoom/drag pan, touch pan/pinch zoom, camera reset and a discover-a-place control.
- GitHub Pages Actions workflow, simple tests, and TypeScript build commands.

## Configuration

Edit `src/config/city.ts` to change the city name, `WORLD_SEED` equivalent (`seed`), city time zone, fixed weather coordinates, population size or construction epoch. The weather coordinates are a **public reference weather point**, not the visitor's location. No sign-in, analytics, location permission or personal-data collection is implemented.

## Code structure

| Directory | Purpose |
| --- | --- |
| `src/config` | City constants, seed, timezone and fixed weather coordinates |
| `src/world` | 8 × 8 spatial layout, venues and opening hours |
| `src/simulation` | Stable citizen identities, trip state, schedules and path choice |
| `src/transport` | Bus/car route state and motion |
| `src/render` | Three.js geometry, aerial camera, lighting, selection and rendering |
| `src/environment` | Time, holiday progress, construction stage and weather |
| `src/ui` | Minimal viewport and overlays |
| `tests` | Baseline project consistency checks |

## Remaining Enhancements

This is intentionally a substantial **foundation**, not a finished photorealistic society. The following features from the full product specification are **not fully implemented**:

1. **Road topology and traffic fidelity:** Vehicles currently use deterministic waypoint routes, not full directed-lane graph search, junction reservations, adaptive congestion, traffic signals, car ownership/parking lifecycles or robust no-overlap guarantees. Some paths have abrupt turns. Bus routes are visual; real passenger boarding/exiting and timetable-based stop behavior are still needed.
2. **Pedestrian navigation:** Sidewalk-oriented Manhattan routing is a simple first pass. It needs a validated pedestrian graph with correct crosswalk links, detailed path collision checks, entrance connectors, obstacle avoidance and smooth waypoint turning; some corner transitions may be visually imperfect.
3. **Citizen behavior:** Occupants mainly travel to home, work, school or venues on deterministic schedules. Trips do not yet chain complex goals or perform visible shopping, dining, dog walking, social interactions, queueing, family care or realistic seated actions. Mood and jobs are stored, but detailed need-based utility planning is not yet built. People are stylized procedural figures rather than polished character assets.
4. **Synchronization:** All visitors share world seed/calendar-derived identities and environmental stages, but realtime journeys are approximated from client time rather than synchronized server state. There is no authoritative globally shared event/relationship database.
5. **Weather visuals:** API results and fallback are implemented; volumetric precipitation, umbrellas, wet surfaces, snow accumulation, seasonal ground treatments and weather-influenced commute decisions remain to be added.
6. **Holiday staging:** Decorations follow date-derived density but appear via geometry updates at page creation; citizens do not yet physically install or remove them. Halloween costumes/trick-or-treat groups and Christmas tree delivery, public decorating, cocoa gatherings and holiday lifecycle are pending.
7. **Long-term stories:** No durable births, pet adoption, aging milestones, friendships evolving, emergency dispatch, arrests, rare events, and causal multi-step responses yet. Construction advances geometrically on the calendar but lacks animated workers/equipment and phased site management.
8. **Visual polish:** Procedural geometry is original and efficient but not yet high-end architectural visualization. Curved road geometry, detailed building materials, more model archetypes, reflections, non-placeholder human animation, and high-quality vegetation/vehicle models are desirable. Streetlights/windows are emissive-looking geometry, not complete physically accurate night lighting.
9. **Performance:** Quality adapts in basic ways for mobile; advanced per-object LOD, frustum-aware instancing, simulation Web Worker, pooled meshes and robust production profiling across devices are pending. Initial map geometry is relatively dense and may run slowly on low-end mobile hardware.
10. **Validation:** `npm test` performs lightweight source/setup checks, **not** visual browser regression tests or the full invariant suite. Expand automated graph/path/simulation correctness tests and add browser screenshot comparisons before a production-grade release.

## Asset credits and licensing

All 3D objects, textures and scene geometry in this repository are **procedurally generated by the included source code**. No copyrighted game assets are bundled. Three.js, Vite and TypeScript are external open-source dependencies with their respective licenses. Typography uses system fonts without a remote font request. Weather data, when live, comes from [Open-Meteo](https://open-meteo.com/) and is subject to its usage terms.

The site is a fictional simulation; do not treat its residents or events as real-world data.
