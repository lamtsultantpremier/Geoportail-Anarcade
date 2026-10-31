import { create } from 'zustand'
import { apiGet, apiSend } from '../../lib/api'
import type { PolyFeature } from './parseGeoFile'

const PALETTE = ['#f59e0b', '#06b6d4', '#ec4899', '#8b5cf6', '#3b82f6', '#14b8a6', '#f97316', '#6366f1']

export type LotStatus = 'brouillon' | 'publie' | 'annule'

interface LotSummary {
  id: number; fichier: string; format: string; statut: LotStatus
  cree_le: string; publie_le: string | null
  total: number; valides: number; avertissements: number; erreurs: number
  doublons: number
}

export interface ImportedFile {
  id: string
  lotId: number
  name: string
  format: string
  statut: LotStatus
  total: number
  valides: number
  avertissements: number
  erreurs: number
  color: string
  addedAt: string
  publishedAt: string | null
  doublons: number
}

export interface ServerMessage { niveau: 'erreur' | 'avertissement'; texte: string }

interface ServerFeature {
  type: 'Feature'
  geometry: GeoJSON.Polygon | GeoJSON.MultiPolygon
  properties: {
    rang: number; code: string | null; 
    statut: 'valide' | 'avertissement' | 'doublon' | 'erreur' | 'remplacee' | 'conservee' | 'publiee'
    messages: ServerMessage[]; superficie_ha: number | null; proprietes: Record<string, unknown>
  }
}

interface ImportState {
  importOpen: boolean
  loading: boolean
  error: string | null
  busyLot: number | null
  files: ImportedFile[]
  features: PolyFeature[]
  selectedUid: string | null
  openImport: () => void
  closeImport: () => void
  select: (uid: string | null) => void
  refresh: () => Promise<void>
  publish: (lotId: number, remplacer?: number[]) => Promise<void>
  cancel: (lotId: number) => Promise<void>
  remove: (lotId: number) => Promise<void>
}

export const useImports = create<ImportState>((set, get) => {
  const act = async (lotId: number, run: () => Promise<unknown>) => {
    set({ busyLot: lotId, error: null })
    try {
      await run()
      await get().refresh()
    } catch (e) {
      set({ error: e instanceof Error ? e.message : 'Opération impossible.' })
    } finally {
      set({ busyLot: null })
    }
  }

  return {
    importOpen: false, loading: false, error: null, busyLot: null,
    files: [], features: [], selectedUid: null,
    openImport: () => set({ importOpen: true }),
    closeImport: () => set({ importOpen: false }),
    select: (selectedUid) => set({ selectedUid }),

    refresh: async () => {
      set({ loading: true, error: null })
      try {
        const lots = await apiGet<LotSummary[]>('/imports/')
        const files: ImportedFile[] = lots.map((l) => ({
          id: String(l.id), lotId: l.id, name: l.fichier, format: l.format, statut: l.statut,
          total: l.total, valides: l.valides, avertissements: l.avertissements, erreurs: l.erreurs,
          color: PALETTE[l.id % PALETTE.length], addedAt: l.cree_le, publishedAt: l.publie_le,doublons: l.doublons ?? 0,
        }))

        const features: PolyFeature[] = []
        const collections = await Promise.all(
          files.filter((f) => f.statut !== 'annule').map(async (f) => ({
            f, fc: await apiGet<{ features: ServerFeature[] }>(`/imports/${f.lotId}/geojson/`),
          })),
        )
        for (const { f, fc } of collections) {
          for (const sf of fc.features) {
            const p = sf.properties
            features.push({
              type: 'Feature',
              geometry: sf.geometry,
              properties: {
                ...p.proprietes,
                _uid: `${f.lotId}-${p.rang}`,
                _fileId: f.id,
                _color: f.color,
                _label: p.code ?? `Parcelle ${p.rang + 1}`,
                _status: p.statut,
                _messages: p.messages,
                _ha: p.superficie_ha,
              },
            })
          }
        }

        const stillThere = features.some((x) => x.properties._uid === get().selectedUid)
        set({ files, features, loading: false, selectedUid: stillThere ? get().selectedUid : null })
      } catch (e) {
        set({ loading: false, error: e instanceof Error ? e.message : 'Chargement impossible.' })
      }
    },

    publish: (id, remplacer = []) => act(id, () => apiSend('POST', `/imports/${id}/publier/`, { remplacer })),
    cancel: (id) => act(id, () => apiSend('POST', `/imports/${id}/annuler/`)),
    remove: (id) => act(id, () => apiSend('DELETE', `/imports/${id}/`)),
  }
})