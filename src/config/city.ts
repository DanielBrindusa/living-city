/** Public, fixed, fictional city configuration. All spatial distances are approximately metres. */
export const CONFIG = {
  name: 'Bellweather',
  seed: 487291,
  timezone: 'Europe/Bucharest',
  weather: { latitude: 45.7489, longitude: 21.2087, label: 'Public reference weather point' },
  grid: { blocks: 36, step: 46, roadWidth: 9, sidewalkWidth: 2.1 },
  streaming: {
    blocksPerChunk: 4,
    activeRadius: 1,
    preloadRadius: 2,
    unloadRadius: 3,
    updateIntervalMs: 180,
    maxZoomOut: 235,
    minZoomIn: 60,
    startBlock: { x: 17, z: 17 },
    startingZoom: 158
  },
  citizens: 6200,
  visibleDesktop: 175,
  visibleMobile: 65,
  vehicles: 2400,
  buses: 20,
  constructionEpoch: '2026-07-01T00:00:00Z',
  cityDayAcceleration: 1
} as const;
