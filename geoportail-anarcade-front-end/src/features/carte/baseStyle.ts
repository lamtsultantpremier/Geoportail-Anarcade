import type { StyleSpecification ,} from 'maplibre-gl'
import { BASEMAPS } from './basemaps'
import type { Map as MLMap } from 'maplibre-gl'

export const BASE_STYLE: StyleSpecification = {
  version: 8,
  glyphs: 'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf',
  sources: Object.fromEntries(
    BASEMAPS.map((b) => [
      `bm-${b.id}`,
      {
        type: 'raster' as const,
        tiles: b.tiles,
        tileSize: b.tileSize,
        maxzoom: b.maxzoom,
        attribution: b.attribution,
      },
    ]),
  ),
  layers: [
    { id: 'bg', type: 'background', paint: { 'background-color': '#e7ebdb' } },
    ...BASEMAPS.map((b) => ({
      id: `bm-${b.id}`,
      type: 'raster' as const,
      source: `bm-${b.id}`,
      layout: { visibility: 'none' as const },
    })),
  ],
}

// Affiche uniquement le fond demandé
export function applyBasemap(map: MLMap | undefined, id: string) {
  if (!map) return
  BASEMAPS.forEach((b) => {
    if (map.getLayer(`bm-${b.id}`)) {
      map.setLayoutProperty(`bm-${b.id}`, 'visibility', b.id === id ? 'visible' : 'none')
    }
  })
}