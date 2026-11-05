import { useEffect, useState } from 'react'
import { SlidersHorizontal, Sprout } from 'lucide-react'
import { toApiParams, toIds, useFilters, withLevel } from './useFilters'
import { useGeoOptions } from './useGeoOptions'
import { useUi } from '../../lib/store'
import GeoMultiSelect from '../denombrements/GeoMultiSelect'

const inputCls = 'w-full rounded-lg border border-line bg-white px-3 py-2.5 text-sm'

export default function FilterSidebar() {
  const { filters, setFilters, reset, isFiltered } = useFilters()
  const { layers, toggleLayer } = useUi()

  // Superficie : appliquée à la sortie du champ ou avec Entrée
  const [min, setMin] = useState(String(filters.min))
  const [max, setMax] = useState(String(filters.max))
  useEffect(() => { setMin(String(filters.min)); setMax(String(filters.max)) }, [filters.min, filters.max])
  const applyArea = () => setFilters({ ...filters, min: Number(min) || 0, max: Number(max) || 100 })

  const { region_id, departement_id, sous_prefecture_id } = toApiParams(filters)
  const regions = useGeoOptions('regions')
  const departments = useGeoOptions('departements', { region_id })
  const subPrefs = useGeoOptions('sous-prefectures', { region_id, departement_id })
  const localities = useGeoOptions('localites', { region_id, departement_id, sous_prefecture_id })

  const layerList = [
    { key: 'regions', label: 'Regions', sub: 'Regions en Côte d Ivoire' },
    { key: 'zone', label: 'Zones interdites', sub: 'Zone Interdites' },
  ]

  return (
    <aside className="h-fit rounded-2xl border border-line bg-white p-5">
      <div className="mt-2 border-b border-line pb-5">
        <div className="mb-3 flex justify-between text-sm">
          <span className="font-medium">Couches SIG</span>
          <span className="text-xs text-muted">{layerList.length} couches</span>
        </div>
        {layerList.map((l) => (
          <label key={l.key} className="mb-3 flex cursor-pointer items-start gap-3">
            <input type="checkbox" className="mt-1" checked={layers[l.key]} onChange={() => toggleLayer(l.key)} />
            <span className="text-sm leading-tight">
              {l.label}
              <span className="block text-xs text-muted">{l.sub}</span>
            </span>
          </label>
        ))}
      </div>

      <div className="mt-5 flex items-center justify-between">
        <span className="flex items-center gap-2 font-medium">
          <SlidersHorizontal size={16} /> Filtres
        </span>
        {isFiltered && (
          <button onClick={reset} className="text-xs text-brand-600">Réinitialiser</button>
        )}
      </div>

      {regions.isError && (
        <p className="mt-3 rounded-lg bg-red-50 p-2 text-xs text-red-700">
          Impossible de joindre l'API. Le serveur Django est-il lancé ?
        </p>
      )}

      <div className="mt-4 space-y-3">
        <GeoMultiSelect label="Région" allLabel="Toutes" selected={toIds(filters.region)}
          options={regions.data} loading={regions.isLoading}
          onChange={(ids) => setFilters(withLevel(filters, 'region', ids))} />
        <GeoMultiSelect label="Département" allLabel="Tous" selected={toIds(filters.department)}
          options={departments.data} loading={departments.isLoading}
          onChange={(ids) => setFilters(withLevel(filters, 'department', ids))} />
        <GeoMultiSelect label="Sous-préf." allLabel="Toutes" selected={toIds(filters.subPrefecture)}
          options={subPrefs.data} loading={subPrefs.isLoading}
          onChange={(ids) => setFilters(withLevel(filters, 'subPrefecture', ids))} />
        <GeoMultiSelect label="Localité" allLabel="Toutes" selected={toIds(filters.locality)}
          options={localities.data} loading={localities.isLoading}
          onChange={(ids) => setFilters(withLevel(filters, 'locality', ids))} />
      </div>

      <label className="mb-1.5 mt-5 block text-xs text-muted">Superficie (ha)</label>
      <div className="flex gap-2">
        <input type="number" className={inputCls} value={min} min={0}
          onChange={(e) => setMin(e.target.value)} onBlur={applyArea}
          onKeyDown={(e) => e.key === 'Enter' && applyArea()} />
        <input type="number" className={inputCls} value={max} min={0}
          onChange={(e) => setMax(e.target.value)} onBlur={applyArea}
          onKeyDown={(e) => e.key === 'Enter' && applyArea()} />
      </div>

      <div className="mt-4 flex items-center gap-2 text-xs text-muted">
        <Sprout size={14} className="text-brand-600" /> Culture
        <span className="rounded-md bg-brand-50 px-2 py-0.5 font-medium text-brand-700">Anacarde</span>
      </div>
    </aside>
  )
}