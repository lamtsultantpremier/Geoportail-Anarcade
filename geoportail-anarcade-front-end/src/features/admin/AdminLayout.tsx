import { NavLink, Outlet, useLocation, Link } from 'react-router-dom'
import {
  Archive, BookOpen, Home, KeyRound, LayoutDashboard, ClipboardList, Map as MapIcon,
  ScrollText, Settings, Sprout, Upload, UserCog, Users, ArrowLeft, Bell, Plus, Search,LogOut,Package
} from 'lucide-react'
import clsx from 'clsx'
import { useAdminDashboard } from './useAdmin'
import { useAuth, useCan } from '../admin/auth'

const nf = new Intl.NumberFormat('fr-FR')

interface Item { to: string; label: string; 
    icon: typeof Home; 
    color: string; 
    count?: keyof NonNullable<ReturnType<typeof useAdminDashboard>['data']>['compteurs'] ;
    droit?: string
    superOnly?: boolean
}
const GROUPS: { title: string; items: Item[] }[] = [
  { title: 'Principal', items: [
    { to: '/administration', label: 'Tableau de bord', icon: LayoutDashboard, color: 'text-blue-400' },
    { to: '/administration/exploitants', label: 'Exploitants', icon: Users, color: 'text-red-400', count: 'exploitants' },
    { to: '/administration/parcelles', label: 'Parcelles', icon: Sprout, color: 'text-emerald-400', count: 'parcelles' },
    { to: '/administration/menages', label: 'Ménages', icon: Home, color: 'text-orange-400', count: 'menages' },
    { to: '/administration/enquetes', label: 'Enquêtes', icon: ClipboardList, color: 'text-blue-400', count: 'enquetes' },
  ] },
  { title: 'Gestion', items: [
    { to: '/administration/utilisateurs', label: 'Utilisateurs', icon: UserCog, color: 'text-red-400', count: 'utilisateurs', droit:'gerer_utilisateurs'},
    { to: '/administration/roles', label: 'Rôles & permissions', icon: KeyRound, color: 'text-orange-400' ,droit:'gerer_utilisateurs'},
    { to: '/administration/imports', label: 'Imports', icon: Upload, color: 'text-blue-400', count: 'imports' ,droit: 'voir_donnees_validees'},
    { to: '/administration/referentiels', label: 'Référentiels', icon: BookOpen, color: 'text-emerald-400' ,droit:'gerer_referentiels'},
    { to: '/administration/decoupage', label: 'Découpage admin.', icon: MapIcon, color: 'text-blue-400' },
  ] },
  { title: 'Système', items: [
    { to: '/administration/logs', label: 'Logs & activité', icon: ScrollText, color: 'text-orange-400', droit:'voir_logs'},
    { to: '/administration/versions', label: "Versions de l'application", icon: Package, color: 'text-red-400', droit: 'parametres' },
    { to: '/administration/parametres', label: 'Paramètres', icon: Settings, color: 'text-emerald-400' ,droit:'parametres'},
    { to: '/administration/sauvegardes', label: 'Sauvegardes', icon: Archive, color: 'text-red-400' ,droit:'sauvegardes'},
  ] },
]



const TITLES: Record<string, string> = Object.fromEntries(
  GROUPS.flatMap((g) => g.items.map((i) => [i.to, i.label])))

export default function AdminLayout() {
    const { user, logout } = useAuth()
    const canUsers = useCan('gerer_utilisateurs')
    const isSuper = user?.role === 'Super-admin'
    const visible = (it: Item) =>
  (!it.superOnly || isSuper) && (!it.droit || user?.droits.includes(it.droit))
    const { pathname } = useLocation()
    const { data } = useAdminDashboard()
    const current = TITLES[pathname.replace(/\/$/, '')] ?? 'Administration'

  return (
    <div className="flex min-h-screen bg-slate-50 text-ink">
      <aside className="sticky top-0 flex h-screen w-72 shrink-0 flex-col border-r-4 border-red-600 bg-[#0b0d14] text-slate-300">
        <div className="flex items-center gap-3 border-b border-white/10 px-5 py-5">
          <span className="grid size-11 place-items-center rounded-xl bg-gradient-to-br from-red-500 to-red-700 text-white shadow-lg">
            <Sprout size={22} />
          </span>
          <div className="leading-tight">
            <div className="font-bold text-white">Anacarde Admin</div>
            <div className="text-[12px] text-slate-400">Back-office · Campagne {new Date().getFullYear()}</div>
          </div>
        </div>

        <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-5">
          {GROUPS.map((g) => (
            <div key={g.title}>
              <div className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">{g.title}</div>
              <div className="space-y-1">
                {g.items.filter(visible).map((it) => {
                  const Icon = it.icon
                  const n = it.count ? data?.compteurs[it.count] : undefined
                  return (
                    <NavLink key={it.to} to={it.to} end
                      className={({ isActive }) => clsx(
                        'flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] font-medium transition-colors',
                        isActive ? 'bg-red-600/20 text-white ring-1 ring-red-500/50' : 'hover:bg-white/5 hover:text-white')}>
                      <Icon size={18} className={it.color} />
                      <span className="flex-1">{it.label}</span>
                      {n !== undefined && (
                        <span className="rounded-full bg-red-600 px-2 py-0.5 text-[11px] font-bold text-white">{nf.format(n)}</span>
                      )}
                    </NavLink>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="border-t border-white/10 p-4">
          <Link to="/" className="mb-3 flex items-center gap-2 rounded-lg px-2 py-1.5 text-[13px] text-slate-400 hover:bg-white/5 hover:text-white">
            <ArrowLeft size={15} /> Retour au géoportail
          </Link>
           <div className="flex items-center gap-3 px-1">
            <span className="grid size-10 place-items-center rounded-full bg-red-600 font-bold text-white">
                    {(user?.nom ?? '?').split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()}
            </span>
            <div className="min-w-0 flex-1 leading-tight">
                <div className="truncate text-sm font-semibold text-white">{user?.nom}</div>
                <div className="text-[12px] text-slate-400">{user?.role}</div>
            </div>
            <button onClick={logout} title="Se déconnecter" aria-label="Se déconnecter"
                    className="rounded-lg p-2 text-slate-400 hover:bg-white/10 hover:text-white"><LogOut size={16} /></button>
          </div>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-10 flex items-center gap-4 border-b border-line bg-white px-8 py-4">
          <nav className="flex items-center gap-2 text-sm text-muted">
            <span>Administration</span><span>/</span><span className="font-semibold text-ink">{current}</span>
          </nav>
          <label className="ml-auto flex w-72 items-center gap-2 rounded-xl border border-line bg-slate-50 px-3 py-2.5">
            <Search size={15} className="text-muted" />
            <input placeholder="Rechercher un exploitant…" className="w-full bg-transparent text-sm outline-none" />
          </label>
          <button aria-label="Notifications" className="relative grid size-10 place-items-center rounded-xl border border-line">
            <Bell size={17} />
            {!!data?.compteurs.anomalies && <span className="absolute right-2 top-2 size-2 rounded-full bg-red-600" />}
          </button>
          {canUsers && (
                <Link to="/administration/utilisateurs?nouveau=1"
                    className="flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white shadow hover:bg-red-700">
                    <Plus size={16} /> Nouvel utilisateur
                </Link>
            )}
        </header>
        <main className="p-8"><Outlet /></main>
      </div>
    </div>
  )
}