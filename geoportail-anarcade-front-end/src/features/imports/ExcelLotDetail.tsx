import { ArrowLeft, FileSpreadsheet, Calendar, Hash, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react'
import type { ExcelLot } from './excelImportStore'

const nf = new Intl.NumberFormat('fr-FR')

interface Props {
  lot: ExcelLot
  onClose: () => void
}

export default function ExcelLotDetail({ lot, onClose }: Props) {
  const formatDate = (iso: string | null) => {
    if (!iso) return '—'
    return new Date(iso).toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const statutLabel: Record<string, string> = {
    brouillon: 'Brouillon',
    synchronise: 'Synchronisé',
    publie: 'Publié',
    annule: 'Annulé',
  }

  const statutColor: Record<string, string> = {
    brouillon: 'bg-amber-100 text-amber-800',
    synchronise: 'bg-blue-100 text-blue-800',
    publie: 'bg-emerald-100 text-emerald-800',
    annule: 'bg-slate-100 text-slate-600',
  }

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-white">
      {/* Header */}
      <div className="flex items-start gap-4 border-b border-line px-5 py-4">
        <button
          onClick={onClose}
          className="mt-0.5 rounded-lg p-1.5 text-muted hover:bg-canvas hover:text-ink"
          aria-label="Retour à la carte"
        >
          <ArrowLeft size={20} />
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3">
            <div className="grid size-9 place-items-center rounded-lg bg-blue-100 text-blue-700">
              <FileSpreadsheet size={18} />
            </div>
            <div>
              <h2 className="text-lg font-medium leading-tight">Détails de l’import Excel</h2>
              <p className="text-[13px] text-muted">
                Synthèse et métadonnées du fichier de données attributaires
              </p>
            </div>
          </div>
        </div>

        <span className={`shrink-0 rounded-full px-3 py-1 text-[12px] font-medium ${statutColor[lot.statut] ?? 'bg-slate-100 text-slate-600'}`}>
          Statut : {statutLabel[lot.statut] ?? lot.statut}
        </span>
      </div>

      {/* Contenu scrollable */}
      <div className="flex-1 overflow-y-auto p-6">
        {/* Métadonnées */}
        <section className="mb-8">
          <h3 className="mb-3 text-sm font-semibold text-ink">Métadonnées du lot</h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <MetaCard label="Nom du fichier" value={lot.fichier} />
            <MetaCard label="Format" value="XLSX" />
            <MetaCard label="Date de création" value={formatDate(lot.cree_le)} />
            <MetaCard label="Date de publication" value={formatDate(lot.publie_le)} />
          </div>
        </section>

        {/* Bilan */}
        <section>
          <h3 className="mb-3 text-sm font-semibold text-ink">
            Bilan du contrôle de validation
          </h3>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard
              value={lot.nb_parcelles}
              label="Parcelles"
              sublabel="Lignes du classeur parcelles"
              color="emerald"
              icon={<CheckCircle2 size={16} />}
            />
            <StatCard
              value={lot.nb_exploitants}
              label="Exploitants"
              sublabel="Lignes du classeur exploitants"
              color="blue"
              icon={<Hash size={16} />}
            />
            <StatCard
              value={lot.nb_denombrements}
              label="Dénombrements"
              sublabel="Lignes du classeur dénombrements"
              color="violet"
              icon={<Calendar size={16} />}
            />
            <StatCard
              value={lot.nb_erreurs}
              label="Erreurs"
              sublabel="Lignes rejetées"
              color="red"
              icon={<XCircle size={16} />}
            />
          </div>
        </section>

        {/* Informations complémentaires */}
        <section className="mt-8">
          <h3 className="mb-3 text-sm font-semibold text-ink">Informations complémentaires</h3>
          <div className="rounded-xl border border-line bg-canvas/50 p-4 text-[13px] text-muted">
            <ul className="space-y-1.5">
              <li>• Identifiant du lot : <span className="font-mono text-ink">#{lot.id}</span></li>
              <li>• Nombre de matches réalisés : <strong className="text-ink">{nf.format(lot.nb_matches)}</strong></li>
              {lot.synchronise_le && (
                <li>• Dernière synchronisation : {formatDate(lot.synchronise_le)}</li>
              )}
            </ul>
          </div>
        </section>
      </div>
    </div>
  )
}

// Petits composants internes
function MetaCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-line bg-white px-4 py-3">
      <div className="text-[11px] font-medium uppercase tracking-wide text-muted">{label}</div>
      <div className="mt-1 truncate text-[14px] font-medium text-ink" title={value}>
        {value || '—'}
      </div>
    </div>
  )
}

function StatCard({
  value,
  label,
  sublabel,
  color,
  icon,
}: {
  value: number
  label: string
  sublabel: string
  color: 'emerald' | 'blue' | 'violet' | 'red' | 'amber'
  icon: React.ReactNode
}) {
  const colors = {
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    blue: 'bg-blue-50 text-blue-700 border-blue-100',
    violet: 'bg-violet-50 text-violet-700 border-violet-100',
    red: 'bg-red-50 text-red-700 border-red-100',
    amber: 'bg-amber-50 text-amber-700 border-amber-100',
  }

  return (
    <div className={`rounded-xl border p-4 ${colors[color]}`}>
      <div className="flex items-center justify-between">
        <span className="text-2xl font-semibold">{nf.format(value)}</span>
        <span className="opacity-70">{icon}</span>
      </div>
      <div className="mt-1 text-[13px] font-medium">{label}</div>
      <div className="mt-0.5 text-[11px] opacity-80">{sublabel}</div>
    </div>
  )
}