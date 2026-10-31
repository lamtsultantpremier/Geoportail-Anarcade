import { apiGet } from '../../lib/api'

export interface Duplicate {
  rang: number
  code: string
  nouvelle: { superficie_ha: number | null; annee: number | null }
  existante: { id: number; superficie_ha: number | null; annee: number | null; code_exploitant: string } | null
}

export interface Preview {
  a_inserer: number
  erreurs: number
  doublons: Duplicate[]
}

export const fetchPreview = (lotId: number) => apiGet<Preview>(`/imports/${lotId}/apercu/`)