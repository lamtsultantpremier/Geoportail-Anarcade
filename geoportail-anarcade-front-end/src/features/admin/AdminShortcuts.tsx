import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowRight } from 'lucide-react'
import { apiGet } from '../../lib/api'
import type { SigTreeData } from '../sig/tree'
import { CARD } from './AdminUi'
import { useAdminDashboard } from './useAdmin'

function Shortcut({ title, text, to, label, count }: { title: string; text: string; to: string; label: string; count?: number }) {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">{title}</h1>
      <div className={`${CARD} max-w-xl border-t-4 border-t-blue-600 p-8`}>
        {count !== undefined && <div className="text-5xl font-bold">{new Intl.NumberFormat('fr-FR').format(count)}</div>}
        <p className="mt-2 text-muted">{text}</p>
        <Link to={to} className="mt-6 inline-flex items-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-700">
          {label} <ArrowRight size={16} />
        </Link>
      </div>
    </div>
  )
}

export function AdminParcelles() {
  const c = useAdminDashboard().data?.compteurs
  return <Shortcut title="Parcelles" count={c?.parcelles} text="Parcelles validées, visibles sur la carte avec leurs contours." to="/" label="Ouvrir la carte" />
}
export function AdminMenages() {
  const c = useAdminDashboard().data?.compteurs
  return <Shortcut title="Ménages" count={c?.menages} text="Liste complète des ménages, filtres géographiques et export." to="/menages" label="Ouvrir les ménages" />
}
export function AdminEnquetes() {
  const c = useAdminDashboard().data?.compteurs
  return <Shortcut title="Enquêtes" count={c?.enquetes} text="Suivi des enquêtes par mois et par enquêteur dans les statistiques." to="/data" label="Ouvrir les statistiques" />
}

const NIVEAUX: [keyof SigTreeData, string, string][] = [
  ['district', 'Districts', 'border-t-red-600'], ['region', 'Régions', 'border-t-orange-500'],
  ['departement', 'Départements', 'border-t-emerald-600'], ['sous_prefecture', 'Sous-préfectures', 'border-t-blue-600'],
  ['localite', 'Localités', 'border-t-red-600'], ['quartier', 'Quartiers / Campements', 'border-t-orange-500'],
]

export function AdminDecoupage() {
  const q = useQuery({ queryKey: ['sig-tree'], queryFn: ({ signal }) => apiGet<SigTreeData>('/sig/arbre/', {}, signal), staleTime: 30 * 60_000 })
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Découpage administratif</h1>
        <Link to="/sig" className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700">Télécharger le découpage →</Link>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {NIVEAUX.map(([k, l, c]) => (
          <div key={k} className={`${CARD} border-t-4 p-6 ${c}`}>
            <div className="text-4xl font-bold">{q.data ? new Intl.NumberFormat('fr-FR').format(q.data[k].length) : '…'}</div>
            <div className="mt-1 text-sm text-muted">{l}</div>
          </div>
        ))}
      </div>
    </div>
  )
}