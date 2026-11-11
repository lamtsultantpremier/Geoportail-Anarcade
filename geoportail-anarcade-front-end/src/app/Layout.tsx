import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import {
  ClipboardList, Database, Map as MapIcon, Sprout, Upload,
  Users, ChartSpline, Home,LogOut,
} from 'lucide-react'
import clsx from 'clsx'

import { useImports } from '../features/imports/importStore'
import ImportModal from '../features/imports/ImportModal'
import Sidebar from './Sidebar'
import { useAuth,useIsSuperAdmin} from '../features/admin/auth'
import {capitalize} from '../lib/function'

import { useEffect } from 'react'


const nav = [
  { to: '/denombrements', label: 'Dénombrements', icon: ClipboardList },
  { to: '/menages', label: 'Ménages', icon: Home },
  { to: '/', label: 'Carte', icon: MapIcon },
  { to: '/exploitants', label: 'Exploitants', icon: Users },
  { to: '/data', label: 'Statiques', icon: ChartSpline },
  { to: '/data-sent', label: 'Données validées', icon: Database },
]


export default function Layout() {
  
  const load = useAuth((s) => s.load)
  const clear = useAuth((s) => s.clear)
  const isSuper = useIsSuperAdmin()

  const canImport = useAuth((s) => !!s.user?.droits.includes('importer'))

  useEffect(() => { void load() }, [load])
  useEffect(() => {
  window.addEventListener('auth:expired', clear)
  return () => window.removeEventListener('auth:expired', clear)
}, [clear])

  const { user, logout } = useAuth()
  const openImport = useImports((s) => s.openImport)
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center gap-8 border-b border-line bg-white px-6 py-3">
        {/* Logo cliquable → ouvre/ferme la sidebar */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMenuOpen((o) => !o)}
            aria-label="Ouvrir le menu"
            aria-expanded={menuOpen}
            aria-controls="sidebar"
            className="grid size-10 place-items-center rounded-xl bg-brand-600 text-white transition hover:bg-brand-700 hover:shadow-md focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2"
          >
            <Sprout size={20} />
          </button>
          <div className="text-[10px] tracking-widest text-muted">GÉOPORTAIL ANACARDE</div>
        </div>

        {/* Menu horizontal (conservé) */}
        <nav className="flex gap-1">
          {nav.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium',
                  isActive ? 'bg-brand-50 text-brand-700' : 'text-muted hover:bg-canvas',
                )
              }
            >
              <Icon size={16} /> {label}
            </NavLink>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-4">
            {canImport && (
                <button onClick={openImport} className="flex items-center gap-2 rounded-lg border border-line px-4 py-2 text-sm font-medium hover:bg-canvas">
                    <Upload size={16} /> Importer des données validées
                </button>
            )}
          <div className="flex items-center gap-3 px-1">
                <span className="grid size-10 place-items-center rounded-full bg-red-600 font-bold text-white">
                    {(user?.nom ?? '?').split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()}
                </span>
                <div className="min-w-0 flex-1 leading-tight">
                    <div className="truncate text-sm font-semibold text-black">{capitalize(user?.nom)}</div>
                    <div className="text-[12px] text-slate-400">{user?.role}</div>
                </div>
              <button onClick={logout} className="rounded-lg border border-line px-3 py-1.5 text-xs font-medium hover:bg-canvas">Déconnexion</button>
        </div>
      </div>
      </header>

      <main className="flex-1 px-6 py-6">
        <Outlet />
      </main>

      <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} />
      {canImport && <ImportModal />}
    </div>
  )
}