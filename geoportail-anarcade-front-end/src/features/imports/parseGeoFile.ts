import { kml } from '@tmcw/togeojson'
import shp from 'shpjs'

export type Kind = 'geojson' | 'kml' | 'shapefile'
export type PolyGeometry = GeoJSON.Polygon | GeoJSON.MultiPolygon
export type PolyFeature = GeoJSON.Feature<PolyGeometry, Record<string, unknown>>

export const ACCEPT = '.geojson,.kml,.zip'
export const KIND_LABEL: Record<Kind, string> = {
  geojson: 'GeoJSON',
  kml: 'KML',
  shapefile: 'Shapefile',
}

export function kindOf(name: string): Kind | null {
  const dot = name.lastIndexOf('.')
  if (dot < 0) return null
  const ext = name.slice(dot).toLowerCase()
  if (ext === '.geojson') return 'geojson'
  if (ext === '.kml') return 'kml'
  if (ext === '.zip') return 'shapefile'
  return null
}

// Tout ce que peuvent renvoyer les lecteurs → liste de Feature
function toFeatures(input: unknown): GeoJSON.Feature[] {
  if (Array.isArray(input)) return input.flatMap(toFeatures)
  const g = input as any
  if (!g || typeof g !== 'object') return []
  if (g.type === 'FeatureCollection') return g.features ?? []
  if (g.type === 'Feature') return [g]
  if (g.type && g.coordinates) return [{ type: 'Feature', properties: {}, geometry: g }]
  return []
}

function polygonsOf(g: GeoJSON.Geometry | null | undefined): GeoJSON.Position[][][] {
  if (!g) return []
  if (g.type === 'Polygon') return [g.coordinates]
  if (g.type === 'MultiPolygon') return g.coordinates
  if (g.type === 'GeometryCollection') return g.geometries.flatMap(polygonsOf)
  return []
}

const inWgs84 = (polys: GeoJSON.Position[][][]) =>
  polys.every((p) => p.every((r) => r.every(([x, y]) =>
    Number.isFinite(x) && Number.isFinite(y) && Math.abs(x) <= 180 && Math.abs(y) <= 90)))

// Nom lisible d'une parcelle : premier champ « code / nom / id » trouvé
const LABEL_KEYS = ['code_parc', 'code', 'id_parc', 'parcelle', 'name', 'nom', 'id']

export function codeOf(props: Record<string, unknown>): string | null {
  const byLower = new Map(Object.keys(props).map((k) => [k.toLowerCase(), k]))
  for (const key of LABEL_KEYS) {
    const real = byLower.get(key)
    const v = real ? props[real] : null
    if (v !== null && v !== undefined && String(v).trim() !== '') return String(v).trim()
  }
  return null
}

export const labelOf = (props: Record<string, unknown>, index: number) =>
  codeOf(props) ?? `Parcelle ${index + 1}`

export interface Parsed {
  kind: Kind
  features: PolyFeature[]
  skipped: number
}

export async function parseGeoFile(file: File): Promise<Parsed> {
  const kind = kindOf(file.name)
  if (!kind) throw new Error('Format non pris en charge (.geojson, .kml ou .zip).')

  let raw: unknown
  if (kind === 'geojson') {
    try {
      raw = JSON.parse((await file.text()).replace(/^\uFEFF/, ''))
    } catch {
      throw new Error('Fichier GeoJSON invalide (JSON illisible).')
    }
  } else if (kind === 'kml') {
    const doc = new DOMParser().parseFromString(await file.text(), 'text/xml')
    if (doc.querySelector('parsererror')) throw new Error('Fichier KML invalide (XML illisible).')
    raw = kml(doc)
  } else {
    try {
      raw = await shp(await file.arrayBuffer())
    } catch {
      throw new Error('Archive illisible : le .zip doit contenir un Shapefile (.shp, .dbf, .shx, .prj).')
    }
  }

  const features: PolyFeature[] = []
  let skipped = 0
  for (const f of toFeatures(raw)) {
    const polys = polygonsOf(f.geometry)
    if (polys.length === 0) { skipped++; continue }
    if (!inWgs84(polys)) {
      throw new Error(
        'Coordonnées hors WGS 84 : le fichier semble être en projection (UTM…). ' +
        'Ajoute le .prj dans le zip ou exporte-le en EPSG:4326.',
      )
    }
    const clean = polys.map((p) => p.map((r) => r.map(([x, y]) => [x, y])))
    features.push({
      type: 'Feature',
      geometry: clean.length === 1
        ? { type: 'Polygon', coordinates: clean[0] }
        : { type: 'MultiPolygon', coordinates: clean },
      properties: { ...((f.properties as Record<string, unknown>) ?? {}) },
    })
  }

  if (features.length === 0) throw new Error('Aucun polygone trouvé dans ce fichier.')
  return { kind, features, skipped }
}