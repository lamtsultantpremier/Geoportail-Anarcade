import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { apiGet ,apiSend} from '../../lib/api'
import type { Paginated } from '../exploitants/useExploitants'
import type { GeoOption } from '../denombrements/useDenombrements'

type S = string | null

export interface MenageFilters {
  q: string
  region_id: string; departement_id: string; sous_prefecture_id: string
  zone_id: string; localite_id: string
}

export interface MenageRow {
  id: number; code_menage: S
  nom_chef: S; prenom_chef: S; contact_chef: S
  nb_enfants: S; nb_femmes: S; nb_personne_en_charge: S; nb_personne_menage: S; nb_enfant_scolarise: S
  type_batiment: S; materiaux_murs: S; materiaux_toit: S; type_sanitaire: S
  source_combustible: S; source_eclairage: S; source_eau: S
  nb_exploitant: S; a_exploitant: S; distance_sante: S; distance_ecole: S
  quartier: S; reseau: S; internet: S; infr_sante: S; banque: S
  localite: S; zone: S; sous_prefecture: S; departement: S; region: S; district: S
  nb_exploitants_reel: number
}

export interface MenageStats { total: number; avec: number; sans: number }
export type MenageGeoLevel = 'regions' | 'departements' | 'sous-prefectures' | 'zones' | 'localites'
export const PAGE_SIZES = [25, 50, 100]

export function useMenages(f: MenageFilters, page: number, pageSize: number) {
  return useQuery({
    queryKey: ['menages', f, page, pageSize],
    queryFn: ({ signal }) =>
      apiGet<Paginated<MenageRow>>('/menages/', { ...f, page, page_size: pageSize }, signal),
    placeholderData: keepPreviousData,
    staleTime: 1000 * 30,
    retry: false,
  })
}

export function useMenageStats(f: MenageFilters) {
  return useQuery({
    queryKey: ['menages-stats', f],
    queryFn: ({ signal }) => apiGet<MenageStats>('/menages/stats/', { ...f }, signal),
    placeholderData: keepPreviousData,
    staleTime: 1000 * 30,
  })
}

export function useMenageGeo(level: MenageGeoLevel, params: Record<string, string>) {
  return useQuery({
    queryKey: ['menages-geo', level, params],
    queryFn: ({ signal }) => apiGet<GeoOption[]>(`/menages/geo/${level}/`, params, signal),
    placeholderData: keepPreviousData,
    staleTime: 1000 * 60 * 5,
  })
}
// Indicateurs calculés sur une sélection de lignes (POST : la liste peut être longue)
export function useMenageSelectionStats(ids: number[]) {
  const key = [...ids].sort((a, b) => a - b).join(',')
  return useQuery({
    queryKey: ['menages-selection-stats', key],
    enabled: ids.length > 0,
    queryFn: () => apiSend<MenageStats>('POST', '/menages/stats/', { ids: key }),
    placeholderData: keepPreviousData,
    staleTime: 1000 * 30,
  })
}