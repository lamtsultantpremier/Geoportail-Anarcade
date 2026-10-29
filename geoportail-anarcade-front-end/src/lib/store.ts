import { create } from 'zustand'
import { DEFAULT_BASEMAP } from '../features/carte/basemaps'
interface FlyTarget { lng: number; lat: number; key: number }

interface UiState {
  hoveredId: string | null
  selectedId: string | null
  flyTo: FlyTarget | null
  layers: Record<string, boolean>
  setHovered: (id: string | null) => void
  setSelected: (id: string | null) => void
  requestFlyTo: (lng: number, lat: number) => void
  toggleLayer: (key: string) => void
}

export const useUi = create<UiState>((set) => ({
  hoveredId: null,
  selectedId: null,
  flyTo: null,
  layers: { parcels: true, admin: false, regions: true, base: true ,zone:true},
  setHovered: (hoveredId) => set({ hoveredId }),
  setSelected: (selectedId) => set({ selectedId }),
  // `key` change à chaque demande : on peut re-cibler le même point
  requestFlyTo: (lng, lat) => set({ flyTo: { lng, lat, key: Date.now() } }),
  toggleLayer: (key) => set((s) => ({ layers: { ...s.layers, [key]: !s.layers[key] } })),
}))