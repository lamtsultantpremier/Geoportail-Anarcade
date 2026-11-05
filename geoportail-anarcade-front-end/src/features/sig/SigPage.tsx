import { useMemo } from 'react'
import { ClipboardList, Home, Info, Landmark, Loader2, Sprout, Users } from 'lucide-react'
import RubriqueCard, { type Rubrique } from './RubriqueCard'
import { buildTree } from './tree'
import { useSigTree } from './useSigTree'

const RUBRIQUES: Rubrique[] = [
  { id: 'decoupage', title: 'Découpage administratif', geo: true, tone: 'orange', icon: <Landmark size={22} />,
    subtitle: 'Limites District → Région → Département → Sous-préfecture → Localité → Quartier',
    note: "Les quartiers n'ont pas de géométrie : leur colonne géométrie reste vide. En Shapefile, chaque niveau est un fichier du zip." },
  { id: 'parcelles', title: 'Parcelles', geo: true, tone: 'green', icon: <Sprout size={22} />,
    subtitle: 'Parcelles anacarde géoréférencées (correctes, incorrectes, zone interdite)' },
  { id: 'menages', title: 'Ménages', geo: false, tone: 'blue', icon: <Home size={22} />,
    subtitle: 'Données attributaires des ménages enquêtés' },
  { id: 'exploitants', title: 'Exploitants', geo: false, tone: 'red', icon: <Users size={22} />,
    subtitle: "Producteurs d'anacarde : identité, activité, équipements, rattachement" },
  { id: 'denombrements', title: 'Dénombrements', geo: false, tone: 'orange', icon: <ClipboardList size={22} />,
    subtitle: 'Fiches de dénombrement, enquêteur et représentant' },
]

export default function SigPage() {
  const tree = useSigTree()
  const roots = useMemo(() => (tree.data ? buildTree(tree.data) : []), [tree.data])

  return (
    <div className="w-full space-y-6">
      <header className="flex items-center gap-4 rounded-2xl border border-line bg-white px-6 py-5">
        <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-blue-100 text-blue-700"><Info size={22} /></span>
        <div>
          <h1 className="text-xl font-semibold">Centre de téléchargement</h1>
          <p className="text-[13px] text-muted">
            Cochez des zones (un district, deux sous-préfectures, quatre localités, un quartier…) puis choisissez le format.
            Le bouton « Tout » d'une zone télécharge tout son contenu.
          </p>
        </div>
      </header>

      {tree.isLoading && (
        <div className="flex items-center gap-3 rounded-2xl border border-line bg-white p-6 text-sm text-muted">
          <Loader2 size={18} className="animate-spin text-brand-600" /> Chargement des circonscriptions…
        </div>
      )}
      {tree.isError && (
        <p className="rounded-2xl bg-red-50 p-4 text-sm text-red-700">
          Impossible de charger les circonscriptions. Le serveur Django est-il lancé ?
        </p>
      )}

      {tree.data && RUBRIQUES.map((r) => <RubriqueCard key={r.id} r={r} roots={roots} />)}
    </div>
  )
}