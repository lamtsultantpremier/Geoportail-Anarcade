import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { apiGet } from '../../lib/api'
import type { Paginated } from '../exploitants/useExploitants'

type S = string | null

export interface DenombFilters {
  q: string
  statut: string
  milieu_id: string
  region_id: string          // identifiants séparés par des virgules : "3,7"
  departement_id: string
  sous_prefecture_id: string
  localite_id: string
}

export interface DenombRow {
  id: number; uuid: S; num_questionnaire: S; date_enquete: S
  enqueteur_nom: S; enqueteur_contact: S; gps: S
  district: S; region: S; departement: S; sous_prefecture: S
  secteur: S; zone: S; localite: S; quartier: S; milieu: S; code_menage: S
  nb_exploitants: S; a_exploitant: S
  nom_chef: S; prenom_chef: S; contact_chef: S
  exploitant_present: S; est_representant: S
  nom_representant: S; prenom_representant: S; contact_representant: S
  statut: S; source: S; cree_le: S
}

export interface DenombStats { fiches: number; avec_exploitant: number;sans_exploitant:number;validees: number; exploitants: number}

export interface DenombOptions {
  statuts: string[]
  milieux: { id_milieu: number; lib_mil: string }[]
}

export const PAGE_SIZES = [25, 50, 100]

export type GeoLevel = 'regions' | 'departements' | 'sous-prefectures' | 'localites'

export interface GeoOption { id: number; nom: string }

export function useDenombGeo(level: GeoLevel, params: Record<string, string>) {
  return useQuery({
    queryKey: ['denombrements-geo', level, params],
    queryFn: ({ signal }) => apiGet<GeoOption[]>(`/denombrements/geo/${level}/`, params, signal),
    placeholderData: keepPreviousData,
    staleTime: 1000 * 60 * 5,
  })
}

export function useDenombrements(f: DenombFilters, page: number, pageSize: number) {
  return useQuery({
    queryKey: ['denombrements', f, page, pageSize],
    queryFn: ({ signal }) =>
      apiGet<Paginated<DenombRow>>('/denombrements/', { ...f, page, page_size: pageSize }, signal),
    placeholderData: keepPreviousData,
    staleTime: 1000 * 30,
    retry: false,
  })
}

export function useDenombStats(f: DenombFilters) {
  return useQuery({
    queryKey: ['denombrements-stats', f],
    queryFn: ({ signal }) => apiGet<DenombStats>('/denombrements/stats/', { ...f }, signal),
    placeholderData: keepPreviousData,
    staleTime: 1000 * 30,
  })
}

export function useDenombOptions() {
  return useQuery({
    queryKey: ['denombrements-options'],
    queryFn: ({ signal }) => apiGet<DenombOptions>('/denombrements/filtres/', {}, signal),
    staleTime: 1000 * 60 * 10,
  })
}