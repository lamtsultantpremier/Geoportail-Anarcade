import { useState } from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { Search } from 'lucide-react'
import { apiGet } from '../../lib/api'
import type { Paginated } from '../exploitants/useExploitants'
import Pagination from '../exploitants/Pagination'
import { CARD } from './AdminUi'
import { ROLE_STYLE } from './AdminUi'


interface Log { id: number; 
                date: string; 
                utilisateur: string; 
                nom_famille: string | null
                prenom: string | null;
                role: string | null 
                action: string; 
                cible: string; 
                detail: string; 
                ip: string | null 
              }

type Resp = Paginated<Log> & { actions: string[] }

const tone = (a: string) =>
  /echec|supprim|annul/.test(a) ? 'bg-red-100 text-red-800'
    : /connexion|deconnexion/.test(a) ? 'bg-blue-100 text-blue-800'
      : /modifi|parametres|roles/.test(a) ? 'bg-orange-100 text-orange-800' : 'bg-emerald-100 text-emerald-800'

export default function AdminLogs() {
  const [q, setQ] = useState('')
  const [term, setTerm] = useState('')
  const [action, setAction] = useState('')
  const [page, setPage] = useState(1)
  const list = useQuery({
    queryKey: ['admin-logs', term, action, page],
    queryFn: ({ signal }) => apiGet<Resp>('/admin-api/logs/', { q: term, action, page, page_size: 15 }, signal),
    placeholderData: keepPreviousData,
  })
  const count = list.data?.count ?? 0

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Logs & activité</h1>
      <section className={CARD}>
        <div className="flex flex-wrap items-center gap-3 border-b border-line px-6 py-4">
          <select className="rounded-xl border border-line bg-white px-4 py-2.5 text-sm" value={action}
            onChange={(e) => { setAction(e.target.value); setPage(1) }}>
            <option value="">Toutes les actions</option>
            {list.data?.actions.map((a) => <option key={a}>{a}</option>)}
          </select>
          <form onSubmit={(e) => { e.preventDefault(); setTerm(q.trim()); setPage(1) }}
            className="ml-auto flex items-center gap-2 rounded-xl border border-line px-3">
            <Search size={15} className="text-muted" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Utilisateur, cible, détail (Entrée)" className="w-64 bg-transparent py-2.5 text-sm outline-none" />
          </form>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="bg-slate-50 text-[12px] uppercase tracking-wide text-muted">
              <tr>
                  <th className="px-6 py-3.5">Date</th>
                  <th className="px-3">Utilisateur</th>
                  <th className="px-3">Rôle</th>
                  <th className="px-3">Action</th>
                  <th className="px-3">Cible</th>
                  <th className="px-3">Détail</th>
                  <th className="px-3">IP</th>
              </tr>
            </thead>
            <tbody className={`divide-y divide-line ${list.isFetching ? 'opacity-60' : ''}`}>
              {list.data?.results.map((l) => (
                <tr key={l.id}>
                  <td className="whitespace-nowrap px-6 py-3 text-muted">{new Date(l.date).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'medium' })}</td>
                  <td className="px-3">
                      <div className="font-semibold">
                        {[l.prenom, l.nom_famille].filter(Boolean).join(' ') || l.utilisateur || '—'}
                      </div>
                      {(l.prenom || l.nom_famille) && <div className="text-[12px] text-muted">{l.utilisateur}</div>}
                  </td>
                  <td className="px-3">
                    {l.role
                      ? <span className={`rounded-full border px-3 py-1 text-[12px] font-semibold ${ROLE_STYLE[l.role] ?? ROLE_STYLE.Utilisateur}`}>{l.role}</span>
                      : <span className="text-[12px] italic text-muted">Compte inconnu</span>}
                  </td>
                  <td className="px-3"><span className={`rounded-full px-3 py-1 text-[12px] font-semibold ${tone(l.action)}`}>{l.action}</span></td>
                  <td className="px-3 font-mono text-[12px]">{l.cible}</td>
                  <td className="max-w-xs truncate px-3 text-muted" title={l.detail}>{l.detail}</td>
                  <td className="px-3 font-mono text-[12px] text-muted">{l.ip}</td>
                </tr>
              ))}
              {list.data?.results.length === 0 && <tr><td colSpan={7} className="p-10 text-center text-muted">Aucune entrée.</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between px-6 py-4 text-sm text-muted">
          <span><strong className="text-ink">{count}</strong> entrée{count > 1 ? 's' : ''}</span>
          {count > 15 && <Pagination page={page} pageCount={Math.ceil(count / 15)} onChange={setPage} disabled={list.isFetching} />}
        </div>
      </section>
    </div>
  )
}