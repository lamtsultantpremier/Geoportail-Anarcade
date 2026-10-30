import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Map, {
  Layer, NavigationControl, ScaleControl, Source,
  type MapLayerMouseEvent, type MapRef,
} from 'react-map-gl/maplibre'
import 'maplibre-gl/dist/maplibre-gl.css'
import BasemapSwitcher from '../carte/BasemapSwitcher'
import { BASE_STYLE, applyBasemap } from '../carte/baseStyle'
import { geometryBounds, mergeBounds, type Bbox } from '../../lib/geo'
import { useUi } from '../../lib/store'
import { useImports } from './importStore'

const CI_BOUNDS: Bbox = [-8.6, 4.3, -2.5, 10.75]
const COLOR: any = ['case', ['==', ['get', '_status'], 'erreur'], '#ef4444', ['get', '_color']]

export default function ImportedMap() {
  const ref = useRef<MapRef>(null)
  const features = useImports((s) => s.features)
  const files = useImports((s) => s.files)
  const selectedUid = useImports((s) => s.selectedUid)
  const select = useImports((s) => s.select)
  const basemap = useUi((s) => s.basemap)
  const [hover, setHover] = useState(false)

  const fc = useMemo<GeoJSON.FeatureCollection>(
    () => ({ type: 'FeatureCollection', features }), [features])

  const bounds = useMemo(
    () => mergeBounds(features.map((f) => geometryBounds(f.geometry))), [features])

  const fit = useCallback(() => {
    if (bounds) ref.current?.fitBounds(bounds, { padding: 80, maxZoom: 17, duration: 800 })
  }, [bounds])

  useEffect(() => { fit() }, [fit])

  // La carte se redimensionne quand le panneau de droite s'ouvre ou se ferme
  useEffect(() => {
    const t = setTimeout(() => ref.current?.resize(), 50)
    return () => clearTimeout(t)
  }, [selectedUid])

  useEffect(() => {
    const map = ref.current?.getMap()
    if (!map) return
    if (map.isStyleLoaded()) applyBasemap(map, basemap)
    else map.once('load', () => applyBasemap(map, basemap))
  }, [basemap])

  const onClick = (e: MapLayerMouseEvent) =>
    select((e.features?.[0]?.properties?._uid as string) ?? null)

  const isSel: any = ['==', ['get', '_uid'], selectedUid ?? '__none__']
  const okFiles = files.filter((f) => f.statut !== 'annule')

  return (
    <div className="relative size-full">
      <Map
        ref={ref}
        mapStyle={BASE_STYLE}
        initialViewState={{ bounds: bounds ?? CI_BOUNDS, fitBoundsOptions: { padding: 80, maxZoom: 17 } }}
        interactiveLayerIds={['imp-fill']}
        cursor={hover ? 'pointer' : 'grab'}
        onLoad={() => applyBasemap(ref.current?.getMap(), basemap)}
        onMouseMove={(e) => setHover(Boolean(e.features?.length))}
        onMouseLeave={() => setHover(false)}
        onClick={onClick}
      >
        <NavigationControl position="top-right" showCompass />
        <ScaleControl position="bottom-right" unit="metric" />

        <Source id="imported" type="geojson" data={fc}>
          <Layer
            id="imp-fill" type="fill"
            paint={{
              'fill-color': COLOR,
              'fill-opacity': ['case', isSel, 0.6, 0.3],
            }}
          />
          <Layer
            id="imp-line" type="line"
            paint={{
              'line-color': ['case', isSel, '#ffffff', COLOR],
              'line-width': ['case', isSel, 3.5, 2],
            }}
          />
          <Layer
            id="imp-label" type="symbol" minzoom={15}
            layout={{
              'text-field': ['get', '_label'],
              'text-font': ['Noto Sans Regular'],
              'text-size': 11,
            }}
            paint={{ 'text-color': '#ffffff', 'text-halo-color': '#14472d', 'text-halo-width': 1.5 }}
          />
        </Source>
      </Map>

      <BasemapSwitcher />

      <div className="pointer-events-none absolute left-4 top-4 rounded-xl bg-white px-4 py-3 shadow">
        <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-brand-700">
          <span className="size-2 rounded-full bg-brand-600" /> Importées
        </div>
        <div className="mt-1 text-3xl font-semibold leading-none">{features.length}</div>
      </div>

      {okFiles.length > 0 && (
        <div className="absolute bottom-10 left-4 max-w-[260px] rounded-xl bg-white p-3 text-xs shadow">
          <div className="mb-2 text-[10px] tracking-widest text-muted">LÉGENDE</div>
            {okFiles.map((f) => (
                <div key={f.id} className="mb-1 flex items-center gap-2">
                    <span className="size-3 shrink-0 rounded-sm border border-black/20" style={{ background: f.color }} />
                    <span className="truncate">{f.name}</span>
                </div>
          ))}
          <div className="flex items-center gap-2">
            <span className="size-3 shrink-0 rounded-sm border border-black/20" style={{ background: '#ef4444' }} />
            Parcelle en erreur
          </div>
        </div>
      )}
    </div>
  )
}