export function hash(value: number): number { let n = value | 0; n = Math.imul(n ^ (n >>> 16), 0x7feb352d); n = Math.imul(n ^ (n >>> 15), 0x846ca68b); return (n ^ (n >>> 16)) >>> 0; }
export function random(seed: number): number { return hash(seed) / 4294967296; }
export function choose<T>(items: readonly T[], seed: number): T { return items[Math.floor(random(seed) * items.length)]; }
export function mix(a: number,b: number,t: number) {return a + (b-a)*Math.min(1,Math.max(0,t));}
export function clamp(n: number, lo: number, hi: number) {return Math.min(hi,Math.max(lo,n));}
