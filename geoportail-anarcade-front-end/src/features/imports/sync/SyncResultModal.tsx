import { CheckCircle2, X } from 'lucide-react'

export interface MatchRow {
  // Données SIG
  name: string | null
  code: string | null
  superficie: number | null
  observatio: string | null

  // Données Excel
  code_exploitant: string | null
  code_menage: string | null

  // Statut du match (optionnel mais utile)
  statut?: 'matche' | 'a_remplacer' | 'conflit' | 'non_matche'
}

interface Props {
  open: boolean
  rows: MatchRow[]
  onClose: () => void
}

const nf = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 })

export default function SyncResultModal({ open, rows, onClose }: Props) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
      <div className="flex max-h-[90vh] w-full max-w-5xl flex-col rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-line px-6 py-4">
          <div className="flex items-start gap-3">
            <div className="grid size-10 place-items-center rounded-xl bg-emerald-100 text-emerald-700">
              <CheckCircle2 size={20} />
            </div>
            <div>
              <h2 className="text-lg font-medium">Résultat de la synchronisation</h2>
              <p className="mt-0.5 text-sm text-muted">
                Prévisualisation des parcelles matchées ({rows.length} ligne{rows.length > 1 ? 's' : ''})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted hover:bg-canvas"
            aria-label="Fermer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tableau */}
        <div className="flex-1 overflow-auto">
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 bg-slate-50 text-[12px] font-semibold uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-3">Name (SIG)</th>
                <th className="px-4 py-3">Code (SIG)</th>
                <th className="px-4 py-3">Superficie</th>
                <th className="px-4 py-3">Observation</th>
                <th className="px-4 py-3">Code Exploitant</th>
                <th className="px-4 py-3">Code Ménage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-muted">
                    Aucune correspondance trouvée
                  </td>
                </tr>
              ) : (
                rows.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/80">
                    <td className="px-4 py-2.5 font-medium">{row.name ?? '—'}</td>
                    <td className="px-4 py-2.5 font-mono text-[13px]">{row.code ?? '—'}</td>
                    <td className="px-4 py-2.5">
                      {row.superficie != null ? `${nf.format(row.superficie)} ha` : '—'}
                    </td>
                    <td className="max-w-[180px] truncate px-4 py-2.5 text-muted" title={row.observatio ?? ''}>
                      {row.observatio ?? '—'}
                    </td>
                    <td className="px-4 py-2.5 font-mono text-[13px]">{row.code_exploitant ?? '—'}</td>
                    <td className="px-4 py-2.5 font-mono text-[13px]">{row.code_menage ?? '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-line px-6 py-4">
          <p className="text-sm text-muted">
            {rows.length} parcelle{rows.length > 1 ? 's' : ''} matchée{rows.length > 1 ? 's' : ''}
          </p>
          <button
            onClick={onClose}
            className="rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  )
}