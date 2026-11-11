import { Link } from 'react-router-dom'
import { AlertTriangle, Check, Download, Home, Loader2, RefreshCw, Sprout, Upload, Users, UserPlus } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { useAdminDashboard } from './useAdmin'
import AdminExploitants from './AdminExploitants'

const nf = new Intl.NumberFormat('fr-FR')

const CARDS = [
  { key: 'exploitants', label: 'Exploitants enregistrés', icon: Users, top: 'border-t-red-600', chip: 'bg-red-50 text-red-700' },
  { key: 'parcelles', label: 'Parcelles recensées', icon: Sprout, top: 'border-t-emerald-600', chip: 'bg-emerald-50 text-emerald-700' },
  { key: 'menages', label: 'Ménages enquêtés', icon: Home, top: 'border-t-blue-600', chip: 'bg-blue-50 text-blue-700' },
  { key: 'anomalies', label: 'Anomalies à traiter', icon: AlertTriangle, top: 'border-t-orange-500', chip: 'bg-orange-50 text-orange-700' },
] as const

const ROLE: Record<string, string> = {
  'Super-admin': 'bg-red-50 text-red-700 border-red-200',
  Admin: 'bg-orange-50 text-orange-700 border-orange-200',
  Utilisateur: 'bg-blue-50 text-blue-700 border-blue-200',
}
const GENRE = {
  ok: { icon: Check, cls: 'bg-emerald-100 text-emerald-700' },
  alerte: { icon: AlertTriangle, cls: 'bg-orange-100 text-orange-700' },
  import: { icon: Upload, cls: 'bg-blue-100 text-blue-700' },
} as const
const AVATAR = ['bg-red-600', 'bg-blue-600', 'bg-emerald-600', 'bg-orange-500', 'bg-slate-900']

export default function AdminDashboard() {
  const { data, isLoading, isError, isFetching } = useAdminDashboard()
  const qc = useQueryClient()
  const maj = data ? new Date(data.mis_a_jour) : null

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Tableau de bord</h1>
          <p className="mt-1 text-sm text-muted">
            Vue d'ensemble de la campagne de recensement anacarde
            {maj && ` · Mise à jour : ${maj.toLocaleDateString('fr-FR')} à ${maj.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`}
          </p>
        </div>
        <div className="flex gap-3">
          <a href="/api/exploitants/export/?fmt=xlsx" download
            className="flex items-center gap-2 rounded-xl border border-line bg-white px-4 py-2.5 text-sm font-semibold hover:bg-slate-50">
            <Download size={16} /> Exporter
          </a>
          <button onClick={() => qc.invalidateQueries({ queryKey: ['admin-dashboard'] })}
            className="flex items-center gap-2 rounded-xl border border-line bg-white px-4 py-2.5 text-sm font-semibold hover:bg-slate-50">
            <RefreshCw size={16} className={isFetching ? 'animate-spin' : ''} /> Actualiser
          </button>
        </div>
      </div>

      {isError && <p className="rounded-xl bg-red-50 p-4 text-sm text-red-700">Impossible de charger le tableau de bord. Le serveur Django est-il lancé ?</p>}

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {CARDS.map((c) => {
          const Icon = c.icon
          return (
            <div key={c.key} className={`rounded-2xl border border-line border-t-4 bg-white p-6 shadow-sm ${c.top}`}>
              <span className={`grid size-12 place-items-center rounded-xl ${c.chip}`}><Icon size={22} /></span>
              <div className="mt-5 text-4xl font-bold">{data ? nf.format(data.compteurs[c.key]) : isLoading ? '…' : '—'}</div>
              <div className="mt-1 text-sm text-muted">{c.label}</div>
            </div>
          )
        })}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <section className="rounded-2xl border border-line bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-line px-6 py-5">
            <h2 className="text-lg font-bold">Utilisateurs récents</h2>
            <Link to="/administration/utilisateurs" className="text-sm font-semibold text-red-700">Voir tous →</Link>
          </div>
          <table className="w-full text-left text-sm">
            <thead className="text-[12px] uppercase tracking-wide text-muted">
              <tr><th className="px-6 py-3">Utilisateur</th><th className="px-3 py-3">Rôle</th>
                <th className="px-3 py-3">Statut</th><th className="px-3 py-3">Dernière connexion</th></tr>
            </thead>
            <tbody className="divide-y divide-line">
              {data?.utilisateurs.map((u, i) => (
                <tr key={u.id}>
                  <td className="px-6 py-3.5">
                    <div className="flex items-center gap-3">
                      <span className={`grid size-10 place-items-center rounded-full text-[13px] font-bold text-white ${AVATAR[i % AVATAR.length]}`}>
                        {u.nom.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()}
                      </span>
                      <div><div className="font-semibold">{u.nom}</div><div className="text-[12px] text-muted">{u.email || '—'}</div></div>
                    </div>
                  </td>
                  <td className="px-3"><span className={`rounded-full border px-3 py-1 text-[12px] font-semibold ${(ROLE[u.role] ?? ROLE.Utilisateur)}`}>{u.role}</span></td>
                  <td className="px-3">
                    <span className={`rounded-full border px-3 py-1 text-[12px] font-semibold ${u.actif ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-orange-200 bg-orange-50 text-orange-700'}`}>
                      {u.actif ? '✓ Actif' : 'Suspendu'}
                    </span>
                  </td>
                  <td className="px-3 text-muted">
                    {u.derniere_connexion ? new Date(u.derniere_connexion).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' }) : 'Jamais'}
                  </td>
                </tr>
              ))}
              {data?.utilisateurs.length === 0 && <tr><td colSpan={4} className="px-6 py-8 text-center text-muted">Aucun utilisateur.</td></tr>}
              {isLoading && <tr><td colSpan={4} className="px-6 py-8 text-center"><Loader2 className="mx-auto animate-spin text-red-600" /></td></tr>}
            </tbody>
          </table>
        </section>

        <section className="rounded-2xl border border-line bg-white shadow-sm">
          <div className="border-b border-line px-6 py-5"><h2 className="text-lg font-bold">Activité récente</h2></div>
          <ul className="space-y-5 p-6">
            {data?.activite.map((a, i) => {
              const g = GENRE[a.genre]
              const Icon = g.icon
              return (
                <li key={i} className="flex gap-4">
                  <span className={`grid size-10 shrink-0 place-items-center rounded-xl ${g.cls}`}><Icon size={18} /></span>
                  <div><div className="font-semibold">{a.titre}</div><div className="text-[13px] text-muted">{a.detail}</div></div>
                </li>
              )
            })}
            {data?.activite.length === 0 && <li className="text-sm text-muted">Aucune activité récente.</li>}
          </ul>
        </section>
      </div>

      <AdminExploitants />
    </div>
  )
}