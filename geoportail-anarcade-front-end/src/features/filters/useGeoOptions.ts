import { toApiParams, type Filters } from './useFilters'
import { useQuery } from '@tanstack/react-query'
import { apiGet } from '../../lib/api'

export type GeoLevel = 'regions' | 'departements' | 'sous-prefectures' | 'localites' | 'quartiers'
export interface GeoOption { id: number; nom: string }

export function useGeoOptions(level: GeoLevel, params: Record<string, string | undefined> = {}) {
  return useQuery({
    queryKey: ['geo', level, params],
    queryFn: ({ signal }) => apiGet<GeoOption[]>(`/filtres/${level}/`, params, signal),
    staleTime: 1000 * 60 * 10,
  })
}

export function useFilterLabels(f: Filters) {
  const p = toApiParams(f)
  const regions = useGeoOptions('regions')
  const departments = useGeoOptions('departements', { region_id: p.region_id })
  const names = (list: GeoOption[] | undefined, csv: string) => {
    const ids = csv ? csv.split(',') : []
    if (ids.length === 0) return undefined
    if (ids.length > 1) return `${ids.length} sélectionnés`
    return list?.find((o) => String(o.id) === ids[0])?.nom
  }
  return {
    region: names(regions.data, f.region),
    department: names(departments.data, f.department),
  }
}