import { useSearchParams } from 'react-router-dom'
import { useMemo } from 'react'

export interface Filters {
  region: string; 
  department: string; 
  subPrefecture: string;
  locality:string;
  min: number; 
  max: number
}

export const EMPTY_FILTERS: Filters = {
  region: '', department: '', subPrefecture: '', locality: '', min: 0, max: 100,
}

export function toApiParams(f: Filters): Record<string, string> {
  const p: Record<string, string> = {}
  if (f.region) p.region_id = f.region
  if (f.department) p.departement_id = f.department
  if (f.subPrefecture) p.sous_prefecture_id = f.subPrefecture
  if (f.locality) p.localite_id = f.locality
  if (f.min > EMPTY_FILTERS.min) p.superficie_min = String(f.min)
  if (f.max < EMPTY_FILTERS.max) p.superficie_max = String(f.max)
  return p
}

export function useFilters() {
  const [params, setParams] = useSearchParams()

  const filters = useMemo<Filters>(() => ({
    region: params.get('region_id') ?? '',
    department: params.get('departement_id') ?? '',
    subPrefecture: params.get('sous_prefecture_id') ?? '',
    locality: params.get('localite_id') ?? '',
    min: Number(params.get('min') ?? EMPTY_FILTERS.min),
    max: Number(params.get('max') ?? EMPTY_FILTERS.max),
  }), [params])

  const isFiltered = Boolean(
    filters.region || filters.department || filters.subPrefecture || filters.locality,
  )

  const setFilters = (f: Filters) => setParams(toApiParams(f))
  const reset = () => setParams({})

  return { filters, setFilters, reset, isFiltered }
}

// "3,7,12" → ['3','7','12']
export const toIds = (s: string) => (s ? s.split(',').filter(Boolean) : [])

export const FILTER_ORDER = ['region', 'department', 'subPrefecture', 'locality'] as const
export type GeoKey = typeof FILTER_ORDER[number]

// Change un niveau et vide ceux du dessous
export function withLevel(f: Filters, key: GeoKey, ids: string[]): Filters {
  const next: Filters = { ...f, [key]: ids.join(',') }
  FILTER_ORDER.slice(FILTER_ORDER.indexOf(key) + 1).forEach((k) => { next[k] = '' })
  return next
}