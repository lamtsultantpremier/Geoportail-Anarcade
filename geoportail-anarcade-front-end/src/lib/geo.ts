export type Bbox = [number, number, number, number] // ouest, sud, est, nord
type Geometry = GeoJSON.Polygon | GeoJSON.MultiPolygon

export function geometryBounds(g: Geometry | null): Bbox | null {
  if (!g) return null
  const polygons = g.type === 'Polygon' ? [g.coordinates] : g.coordinates
  const pts = polygons.flatMap((poly) => poly[0])
  if (pts.length === 0) return null
  const xs = pts.map((p) => p[0])
  const ys = pts.map((p) => p[1])
  return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)]
}

export function mergeBounds(list: (Bbox | null)[]): Bbox | null {
  const valid = list.filter((b): b is Bbox => b !== null)
  if (valid.length === 0) return null
  return [
    Math.min(...valid.map((b) => b[0])),
    Math.min(...valid.map((b) => b[1])),
    Math.max(...valid.map((b) => b[2])),
    Math.max(...valid.map((b) => b[3])),
  ]
}

// Superficie approximative d'un polygone WGS 84, en hectares
export function areaHa(g: GeoJSON.Polygon | GeoJSON.MultiPolygon): number {
  const polys = g.type === 'Polygon' ? [g.coordinates] : g.coordinates
  const first = polys[0]?.[0]?.[0]
  if (!first) return 0
  const [x0, y0] = first
  const ky = 110574
  const kx = 111320 * Math.cos((y0 * Math.PI) / 180)
  const ring = (r: number[][]) => {
    let s = 0
    for (let i = 0; i < r.length - 1; i++) {
      const x1 = (r[i][0] - x0) * kx, y1 = (r[i][1] - y0) * ky
      const x2 = (r[i + 1][0] - x0) * kx, y2 = (r[i + 1][1] - y0) * ky
      s += x1 * y2 - x2 * y1
    }
    return Math.abs(s) / 2
  }
  const m2 = polys.reduce(
    (t, rings) => t + rings.reduce((a, r, i) => a + (i === 0 ? ring(r) : -ring(r)), 0), 0)
  return m2 / 10000
}