import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { apiGet } from '../../lib/api'
import { CARD } from './AdminUi'

interface Lot { id: number; fichier: string; format: string; statut: 'brouillon' | 'publie' | 'annule'
  cree_le: string; publie_le: string | null; total: number; valides: number; avertissements: number; erreurs: number; doublons?: number }
const BADGE = { brouillon: 'bg-orange-100 text-orange-800', publie: 'bg-emerald-100 text-emerald-800', annule: 'bg-slate-100 text-slate-600' }
const LABEL = { brouillon: 'Brouillon', publie: 'Publié', annule: 'Annulé' }
const nf = new Intl.NumberFormat('fr-FR')

export default function AdminImports() {
  const q = useQuery({ queryKey: ['admin-imports'], queryFn: ({ signal }) => apiGet<Lot[]>('/imports/', {}, signal) })
  const lots = q.data ?? []
  const stat = (s: Lot['statut']) => lots.filter((l) => l.statut === s).length
  const kpis = [
    ['Lots', lots.length, 'border-t-blue-600'], ['Brouillons', stat('brouillon'), 'border-t-orange-500'],
    ['Publiés', stat('publie'), 'border-t-emerald-600'], ['Annulés', stat('annule'), 'border-t-red-600'],
  ] as const

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Imports</h1>
        <Link to="/data-sent" className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700">Publier / contrôler les lots →</Link>
      </div>
      <div className="grid gap-4 sm:grid-cols-4">
        {kpis.map(([l, v, c]) => (
          <div key={l} className={`${CARD} border-t-4 p-5 ${c}`}><div className="text-3xl font-bold">{v}</div><div className="text-sm text-muted">{l}</div></div>
        ))}
      </div>
      <section className={`${CARD} overflow-x-auto`}>
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="bg-slate-50 text-[12px] uppercase tracking-wide text-muted">
            <tr><th className="px-6 py-3.5">Lot</th><th className="px-3">Fichier</th><th className="px-3">Statut</th><th className="px-3">Parcelles</th>
              <th className="px-3">Valides</th><th className="px-3">Avert.</th><th className="px-3">Erreurs</th><th className="px-3">Date</th></tr>
          </thead>
          <tbody className="divide-y divide-line">
            {lots.map((l) => (
              <tr key={l.id}>
                <td className="px-6 py-3.5 font-mono text-[12px] font-bold">#{l.id}</td>
                <td className="px-3 font-medium">{l.fichier} <span className="text-[11px] text-muted">{l.format}</span></td>
                <td className="px-3"><span className={`rounded-full px-3 py-1 text-[12px] font-semibold ${BADGE[l.statut]}`}>{LABEL[l.statut]}</span></td>
                <td className="px-3">{nf.format(l.total)}</td>
                <td className="px-3 text-emerald-700">{nf.format(l.valides)}</td>
                <td className="px-3 text-orange-700">{nf.format(l.avertissements)}</td>
                <td className="px-3 text-red-700">{nf.format(l.erreurs)}</td>
                <td className="px-3 text-muted">{new Date(l.publie_le ?? l.cree_le).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}</td>
              </tr>
            ))}
            {q.isLoading && <tr><td colSpan={8} className="p-8 text-center"><Loader2 className="mx-auto animate-spin text-red-600" /></td></tr>}
            {q.data && lots.length === 0 && <tr><td colSpan={8} className="p-8 text-center text-muted">Aucun import.</td></tr>}
          </tbody>
        </table>
      </section>
    </div>
  )
}