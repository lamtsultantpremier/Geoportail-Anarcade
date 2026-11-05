import { useMemo, useState } from 'react'
import { Download } from 'lucide-react'
import { BASE } from '../../lib/api'
import { postDownload } from '../../lib/download'
import { titleCase } from '../../lib/format'
import CircoPicker, { type Tone } from './CircoPicker'
import FormatDialog from './FormatDialog'
import { ATTR_FORMATS, FORMATS, GEO_FORMATS, type Fmt } from './formats'
import { LEVEL_LABEL, computeStates, pickNodes, toFields, type TNode } from './tree'

// Classes écrites en entier : Tailwind ne génère pas les noms construits dynamiquement
export const TONES = {
  orange: { accent: 'accent-orange-500', badge: 'bg-orange-100 text-orange-800', ring: 'border-orange-400 ring-orange-200',
    bar: 'bg-orange-500', icon: 'bg-orange-100 text-orange-700' },
  green: { accent: 'accent-emerald-600', badge: 'bg-emerald-100 text-emerald-800', ring: 'border-emerald-500 ring-emerald-200',
    bar: 'bg-emerald-500', icon: 'bg-emerald-100 text-emerald-700' },
  blue: { accent: 'accent-blue-600', badge: 'bg-blue-100 text-blue-800', ring: 'border-blue-500 ring-blue-200',
    bar: 'bg-blue-500', icon: 'bg-blue-100 text-blue-700' },
  red: { accent: 'accent-red-500', badge: 'bg-red-100 text-red-800', ring: 'border-red-400 ring-red-200',
    bar: 'bg-red-500', icon: 'bg-red-100 text-red-700' },
} satisfies Record<string, Tone & { bar: string; icon: string }>

export interface Rubrique {
  id: 'decoupage' | 'parcelles' | 'menages' | 'exploitants' | 'denombrements'
  title: string
  subtitle: string
  geo: boolean
  tone: keyof typeof TONES
  icon: React.ReactNode
  note?: string
}

export default function RubriqueCard({ r, roots }: { r: Rubrique; roots: TNode[] }) {
  const t = TONES[r.tone]
  const [checked, setChecked] = useState<Set<string>>(new Set())
  const [statuts, setStatuts] = useState<string[]>(['correcte', 'incorrecte'])
  const [dialog, setDialog] = useState<TNode | null>(null)

  const picked = useMemo(() => pickNodes(roots, computeStates(roots, checked)), [roots, checked])
  const formats = r.geo ? GEO_FORMATS : ATTR_FORMATS
  const statutsOk = r.id !== 'parcelles' || statuts.length > 0

  const run = (fmt: Fmt, nodes: TNode[]) => {
    const fields: Record<string, string> = { rubrique: r.id, fmt, ...toFields(nodes) }
    if (r.id === 'parcelles') fields.statuts = statuts.join(',')
    postDownload(`${BASE}/sig/export/`, fields)
  }
  const toggleStatut = (s: string) =>
    setStatuts((l) => (l.includes(s) ? l.filter((x) => x !== s) : [...l, s]))

  return (
    <section className="relative rounded-2xl border border-line bg-white">
      <span className={`absolute inset-y-4 left-0 w-1.5 rounded-r ${t.bar}`} />
      <header className="flex items-center gap-4 border-b border-line px-6 py-5">
        <span className={`grid size-11 shrink-0 place-items-center rounded-xl ${t.icon}`}>{r.icon}</span>
        <div>
          <h2 className="text-lg font-semibold">{r.title}</h2>
          <p className="text-[13px] text-muted">{r.subtitle}</p>
        </div>
      </header>

      <div className="flex flex-wrap items-start gap-x-6 gap-y-4 px-6 py-5">
        <div className="flex min-w-[320px] flex-1 items-start gap-5">
          <span className="w-28 shrink-0 pt-3 font-semibold text-blue-950">Circonscriptions</span>
          <CircoPicker roots={roots} checked={checked} onChange={setChecked} tone={t} onDownloadNode={setDialog} />
        </div>

        <div>
          <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted">
            {r.geo ? 'Télécharger la sélection au format SIG' : 'Télécharger les attributs de la sélection'}
          </div>
          <div className="flex gap-2">
            {formats.map((f) => (
              <button key={f} disabled={picked.length === 0 || !statutsOk}
                onClick={() => run(f, picked)}
                title={picked.length === 0 ? 'Cochez au moins une circonscription' : `Télécharger en ${FORMATS[f].label}`}
                className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-40 ${FORMATS[f].btn}`}>
                <Download size={15} /> {FORMATS[f].label}
              </button>
            ))}
          </div>
        </div>

        {(r.id === 'parcelles' || r.note) && (
          <div className="w-full space-y-2 pl-[8.25rem]">
            {r.id === 'parcelles' && (
              <div className="flex flex-wrap items-center gap-4 text-[13px]">
                <span className="text-muted">Inclure :</span>
                {[['correcte', 'Parcelles correctes'], ['incorrecte', 'Parcelles incorrectes']].map(([k, l]) => (
                  <label key={k} className="flex items-center gap-2">
                    <input type="checkbox" checked={statuts.includes(k)} onChange={() => toggleStatut(k)}
                      className={`size-4 ${t.accent}`} /> {l}
                  </label>
                ))}
                {!statutsOk && <span className="text-red-700">Choisissez au moins un type.</span>}
              </div>
            )}
            {r.note && <p className="text-[12px] italic text-muted">{r.note}</p>}
          </div>
        )}
      </div>

      {dialog && (
        <FormatDialog
          title={`${LEVEL_LABEL[dialog.level]} ${titleCase(dialog.name)}`}
          subtitle={`${r.title} · tout le contenu de cette zone${dialog.children.length ? ' et de ses sous-zones' : ''}`}
          formats={formats}
          onClose={() => setDialog(null)}
          onPick={(f) => { run(f, [dialog]); setDialog(null) }}
        />
      )}
    </section>
  )
}