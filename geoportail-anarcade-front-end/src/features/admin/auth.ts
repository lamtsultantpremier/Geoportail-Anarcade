import { create } from 'zustand'
import { apiGet, apiSend, getToken, setToken } from '../../lib/api'

export interface Me {
  id: number; username: string; nom: string; email: string; role: string; droits: string[]
}

export const PAGES: { to: string; droit: string }[] = [
  { to: '/', droit: 'voir_carte' },
  { to: '/denombrements', droit: 'voir_denombrement' },
  { to: '/menages', droit: 'voir_menage' },
  { to: '/exploitants', droit: 'voir_exploitants' },
  { to: '/data', droit: 'voir_statistique' },
]
export const firstAllowed = (droits: string[]) => PAGES.find((p) => droits.includes(p.droit))?.to

interface AuthState {
  user: Me | null
  ready: boolean
  load: () => Promise<void>
  login: (username: string, password: string) => Promise<void>
  logout: () => Promise<void>
  clear: () => void
}

export const useAuth = create<AuthState>((set) => ({
  user: null,
  ready: false,
  load: async () => {
    if (!getToken()) { set({ user: null, ready: true }); return }
    try { set({ user: await apiGet<Me>('/admin-api/auth/me/'), ready: true }) }
    catch { setToken(null); set({ user: null, ready: true }) }
  },
  login: async (username, password) => {
    const r = await apiSend<{ token: string; user: Me }>('POST', '/admin-api/auth/login/', { username, password })
    setToken(r.token)
    set({ user: r.user, ready: true })
  },
  logout: async () => {
    try { await apiSend('POST', '/admin-api/auth/logout/') } catch { /* déjà expiré */ }
    setToken(null)
    set({ user: null })
  },
  clear: () => set({ user: null }),
}))

export const useCan = (droit: string) => useAuth((s) => s.user?.droits.includes(droit) ?? false)
export const useIsSuperAdmin = () => useAuth((s) => s.user?.role === 'Super-admin')