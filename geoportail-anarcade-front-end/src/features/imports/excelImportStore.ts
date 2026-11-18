import { create } from 'zustand'
import { apiGet, apiSend } from '../../lib/api'

export type ExcelLotStatus = 'brouillon' | 'synchronise' | 'publie' | 'annule'

export interface ExcelLot {
  id: number
  fichier: string
  statut: ExcelLotStatus
  cree_le: string
  synchronise_le: string | null
  publie_le: string | null
  nb_parcelles: number
  nb_exploitants: number
  nb_denombrements: number
  nb_matches: number
  nb_erreurs: number
}

interface ExcelImportState {
  // UI
  importOpen: boolean
  loading: boolean
  error: string | null
  busyLot: number | null

  // Data
  lots: ExcelLot[]

  // Actions
  openImport: () => void
  closeImport: () => void
  refresh: () => Promise<void>
  remove: (id: number) => Promise<void>
}

export const useExcelImports = create<ExcelImportState>((set, get) => {
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
    importOpen: false,
    loading: false,
    error: null,
    busyLot: null,
    lots: [],

    openImport: () => set({ importOpen: true }),
    closeImport: () => set({ importOpen: false }),

    refresh: async () => {
      set({ loading: true, error: null })
      try {
        const lots = await apiGet<ExcelLot[]>('/imports-excel/')
        set({ lots, loading: false })
      } catch (e) {
        set({
          loading: false,
          error: e instanceof Error ? e.message : 'Chargement impossible.',
        })
      }
    },

    remove: (id) => act(id, () => apiSend('DELETE', `/imports-excel/${id}/`)),
  }
})