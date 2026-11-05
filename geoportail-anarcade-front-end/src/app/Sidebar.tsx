import { useEffect } from 'react'
import { NavLink } from 'react-router-dom'
import {
  ChartSpline, CheckCheck, ClipboardList, Home, Map as MapIcon, Settings, Sprout, Users, X,
  Crosshair,
} from 'lucide-react'
import clsx from 'clsx'

// Classes écrites en entier : Tailwind ne génère pas les noms construits dynamiquement
const TONES = {
  orange: { icon: 'text-orange-400', active: 'bg-orange-500/20 text-orange-100 ring-1 ring-orange-500/50', bar: 'bg-orange-500' },
  green:  { icon: 'text-emerald-400', active: 'bg-emerald-500/20 text-emerald-100 ring-1 ring-emerald-500/50', bar: 'bg-emerald-500' },
  red:    { icon: 'text-red-400', active: 'bg-red-500/20 text-red-100 ring-1 ring-red-500/50', bar: 'bg-red-500' },
  blue:   { icon: 'text-blue-400', active: 'bg-blue-500/25 text-blue-100 ring-1 ring-blue-500/50', bar: 'bg-blue-500' },
} as const
type Tone = keyof typeof TONES

interface Item { to: string; label: string; icon: typeof Home; tone: Tone; end?: boolean }

const MAIN: Item[] = [
  { to: '/denombrements', label: 'Dénombrements', icon: ClipboardList, tone: 'orange' },
  { to: '/menages', label: 'Ménages', icon: Home, tone: 'green' },
  { to: '/', label: 'Carte', icon: MapIcon, tone: 'red', end: true },
  { to: '/exploitants', label: 'Exploitants', icon: Users, tone: 'blue' },
  { to: '/data', label: 'Statiques', icon: ChartSpline, tone: 'orange' },
  { to: '/data-sent', label: 'Données validées', icon: CheckCheck, tone: 'green' },
  { to: '/sig', label: 'SIG', icon: Crosshair, tone: 'red' },
]

const ADMIN: Item = { to: '/administration', label: 'Administration', icon: Settings, tone: 'blue' }

function Link({ item, onNavigate }: { item: Item; onNavigate: () => void }) {
  const t = TONES[item.tone]
  const Icon = item.icon
  return (
    <NavLink
      to={item.to}
      end={item.end}
      onClick={onNavigate}
      className={({ isActive }) =>
        clsx(
          'group relative flex items-center gap-4 rounded-xl px-4 py-3 text-[15px] font-medium transition-colors',
          isActive ? t.active : 'text-slate-300 hover:bg-white/5 hover:text-white',
        )
      }
    >
      {({ isActive }) => (
        <>
          {isActive && <span className={clsx('absolute -left-3 top-2 bottom-2 w-1 rounded-r', t.bar)} />}
          <Icon size={19} className={t.icon} />
          {item.label}
        </>
      )}
    </NavLink>
  )
}

export default function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  return (
    <>
      {/* Voile derrière la sidebar */}
      <div
        onClick={onClose}
        aria-hidden="true"
        className={clsx(
          'fixed inset-0 z-40 bg-black/50 transition-opacity duration-200',
          open ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
      />

      <aside
        id="sidebar"
        aria-label="Navigation principale"
        aria-hidden={!open}
        className={clsx(
          'fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-[#080c16] px-3 py-5 shadow-2xl transition-transform duration-200',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="mb-6 flex items-center justify-between px-3">
          <div className="flex items-center gap-3">
            <div className="grid size-9 place-items-center rounded-xl bg-brand-600 text-white">
              <Sprout size={18} />
            </div>
            <span className="text-[11px] font-semibold tracking-[0.18em] text-slate-400">GÉOPORTAIL ANACARDE</span>
          </div>
          <button onClick={onClose} aria-label="Fermer le menu"
            className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white">
            <X size={18} />
          </button>
        </div>

        <nav className="flex flex-1 flex-col gap-1.5 overflow-y-auto pl-3">
          {MAIN.map((item) => <Link key={item.to} item={item} onNavigate={onClose} />)}
        </nav>

        <div className="border-t border-white/10 pl-3 pt-3">
          <Link item={ADMIN} onNavigate={onClose} />
        </div>
      </aside>
    </>
  )
}