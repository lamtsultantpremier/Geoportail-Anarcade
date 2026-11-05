import { toApiParams, toIds, useFilters, withLevel } from '../filters/useFilters'
import { useGeoOptions } from '../filters/useGeoOptions'
import GeoMultiSelect from '../denombrements/GeoMultiSelect'

export default function DataFilters() {
  const { filters, setFilters, reset, isFiltered } = useFilters()
  const { region_id, departement_id, sous_prefecture_id } = toApiParams(filters)

  const regions = useGeoOptions('regions')
  const departments = useGeoOptions('departements', { region_id })
  const subPrefs = useGeoOptions('sous-prefectures', { region_id, departement_id })
  const localities = useGeoOptions('localites', { region_id, departement_id, sous_prefecture_id })

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-white p-4">
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
      {isFiltered && (
        <button onClick={reset} className="px-2 text-sm font-semibold text-brand-700">Réinitialiser</button>
      )}
    </div>
  )
}