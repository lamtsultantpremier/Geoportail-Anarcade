import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { apiGet } from '../../lib/api'
import type { Paginated } from '../exploitants/useExploitants'
import type { SigTreeData } from '../sig/tree'

export interface AdminDashboard {
  compteurs: { exploitants: number; parcelles: number; menages: number; enquetes: number
  imports: number; utilisateurs: number; anomalies: number }
  utilisateurs: { id: number; nom: string; email: string; role: string; actif: boolean; derniere_connexion: string | null }[]
  activite: { titre: string; detail: string; genre: 'ok' | 'alerte' | 'import' }[]
  mis_a_jour: string
}

export interface AdminExploitant {
  id: number; code: string; nom: string | null; prenom: string | null; contacts: string | null
  district: string | null; parcelles: number; superficie: number; statut: 'valide' | 'erreur_gps'
}

export const useAdminDashboard = () =>
  useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: ({ signal }) => apiGet<AdminDashboard>('/admin-api/tableau-de-bord/', {}, signal),
    staleTime: 30_000,
  })

export const useAdminExploitants = (p: { q: string; district_id: string; statut: string; page: number }) =>
  useQuery({
    queryKey: ['admin-exploitants', p],
    queryFn: ({ signal }) => apiGet<Paginated<AdminExploitant>>('/admin-api/exploitants/', { ...p, page_size: 10 }, signal),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  })

export const useAdminDistricts = () =>
  useQuery({
    queryKey: ['sig-tree'],
    queryFn: ({ signal }) => apiGet<SigTreeData>('/sig/arbre/', {}, signal),
    staleTime: 30 * 60_000,
    select: (d) => d.district,
  })