import { useState } from 'react'
import { AlertTriangle, Loader2 } from 'lucide-react'
import type { Preview } from './useImportPreview'

const nf = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 })
const ha = (n: number | null) => (n == null ? '—' : `${nf.format(n)} ha`)

export default function ReplaceDialog({ fileName, preview, busy, onCancel, onConfirm }: {
  fileName: string
  preview: Preview
  busy: boolean
  onCancel: () => void
  onConfirm: (rangsARemplacer: number[]) => void
}) {
  // Par défaut, rien n'est remplacé : l'utilisateur doit confirmer explicitement
  const [yes, setYes] = useState<Set<number>>(new Set())
  const toggle = (rang: number, value: boolean) =>
    setYes((s) => { const n = new Set(s); value ? n.add(rang) : n.delete(rang); return n })

  const n = preview.doublons.length
  const replacing = yes.size
  const keeping = n - replacing

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" role="dialog" aria-modal="true">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl bg-white shadow-2xl">
        <div className="p-6 pb-3">
          <div className="flex items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-amber-100 text-amber-700">
              <AlertTriangle size={20} />
            </span>
            <div>
              <h2 className="text-lg font-medium">Confirmation de remplacement</h2>
              <p className="mt-1 text-[13px] text-muted">
                {n} parcelle{n > 1 ? 's' : ''} de « {fileName} » existe{n > 1 ? 'nt' : ''} déjà dans la base.
                Voulez-vous remplacer {n > 1 ? 'chaque parcelle existante' : 'la parcelle existante'} par la nouvelle parcelle importée ?
              </p>
            </div>
          </div>

          <div className="mt-4 flex gap-2 text-[12px]">
            <button onClick={() => setYes(new Set(preview.doublons.map((d) => d.rang)))}
              className="rounded-lg border border-line px-3 py-1.5 font-medium hover:bg-canvas">Tout remplacer</button>
            <button onClick={() => setYes(new Set())}
              className="rounded-lg border border-line px-3 py-1.5 font-medium hover:bg-canvas">Tout conserver</button>
          </div>
        </div>

        <ul className="flex-1 divide-y divide-line overflow-y-auto border-y border-line">
          {preview.doublons.map((d) => {
            const on = yes.has(d.rang)
            return (
              <li key={d.rang} className="px-6 py-4">
                <div className="break-all font-mono text-[12px] font-semibold">{d.code}</div>
                <div className="mt-2 grid grid-cols-2 gap-3 text-[12px]">
                  <div className="rounded-lg bg-canvas p-2.5">
                    <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">Existante</div>
                    <div className="mt-1">{ha(d.existante?.superficie_ha ?? null)} · {d.existante?.annee ?? 'année —'}</div>
                  </div>
                  <div className="rounded-lg bg-brand-50 p-2.5">
                    <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-brand-700">Nouvelle (lot)</div>
                    <div className="mt-1">{ha(d.nouvelle.superficie_ha)} · {d.nouvelle.annee ?? 'année —'}</div>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button onClick={() => toggle(d.rang, true)}
                    className={`rounded-xl border px-3 py-2 text-left text-[12px] ${
                      on ? 'border-brand-600 bg-brand-50' : 'border-line hover:bg-canvas'}`}>
                    <strong className="block text-[13px]">Oui</strong>
                    Remplacer la parcelle existante.
                  </button>
                  <button onClick={() => toggle(d.rang, false)}
                    className={`rounded-xl border px-3 py-2 text-left text-[12px] ${
                      !on ? 'border-brand-600 bg-brand-50' : 'border-line hover:bg-canvas'}`}>
                    <strong className="block text-[13px]">Non</strong>
                    Conserver l'existante et ignorer la nouvelle.
                  </button>
                </div>
              </li>
            )
          })}
        </ul>

        <div className="p-6 pt-4">
          <p className="text-[13px] text-muted">
            À la publication : <strong className="text-ink">{preview.a_inserer - n < 0 ? 0 : preview.a_inserer}</strong> nouvelle(s)
            insérée(s), <strong className="text-ink">{replacing}</strong> remplacée(s),{' '}
            <strong className="text-ink">{keeping}</strong> conservée(s).
          </p>
          <div className="mt-4 flex justify-end gap-3">
            <button onClick={onCancel} disabled={busy}
              className="rounded-xl bg-canvas px-5 py-2.5 text-sm font-semibold hover:bg-line disabled:opacity-50">
              Annuler
            </button>
            <button onClick={() => onConfirm([...yes])} disabled={busy}
              className="flex items-center gap-2 rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60">
              {busy && <Loader2 size={16} className="animate-spin" />} Publier
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}