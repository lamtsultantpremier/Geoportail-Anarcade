import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronDown, ChevronRight, Download, Search } from 'lucide-react'
import { titleCase } from '../../lib/format'
import {
  LEVEL_LABEL, childBadge, collectLeaves, computeStates, pickNodes,
  type State, type TNode,
} from './tree'

const MAX_ROWS = 800

export interface Tone { accent: string; badge: string; ring: string }

function TriCheck({ state, onChange, accent, label }: {
  state: State; onChange: () => void; accent: string; label: string
}) {
  const ref = useRef<HTMLInputElement>(null)
  useEffect(() => { if (ref.current) ref.current.indeterminate = state === 1 }, [state])
  return (
    <input ref={ref} type="checkbox" checked={state === 2} onChange={onChange}
      aria-label={label} className={`size-4 shrink-0 ${accent}`} />
  )
}

export default function CircoPicker({ roots, checked, onChange, tone, onDownloadNode }: {
  roots: TNode[]
  checked: Set<string>
  onChange: (next: Set<string>) => void
  tone: Tone
  onDownloadNode: (n: TNode) => void
}) {
  const [open, setOpen] = useState(false)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [query, setQuery] = useState('')
  const box = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onDown = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [])

  const states = useMemo(() => computeStates(roots, checked), [roots, checked])
  const picked = useMemo(() => pickNodes(roots, states), [roots, states])

  // Recherche : garde les nœuds qui correspondent et leurs ancêtres
  const keep = useMemo(() => {
    const s = query.trim().toLowerCase()
    if (!s) return null
    const set = new Set<string>()
    const walk = (n: TNode): boolean => {
      let any = n.name.toLowerCase().includes(s)
      for (const c of n.children) if (walk(c)) any = true
      if (any) set.add(n.key)
      return any
    }
    roots.forEach(walk)
    return set
  }, [roots, query])

  const { rows, truncated } = useMemo(() => {
    const out: TNode[] = []
    const go = (n: TNode) => {
      if (keep && !keep.has(n.key)) return
      out.push(n)
      if (keep || expanded.has(n.key)) n.children.forEach(go)
    }
    roots.forEach(go)
    return { rows: out.slice(0, MAX_ROWS), truncated: out.length > MAX_ROWS }
  }, [roots, expanded, keep])

  const toggleNode = (n: TNode) => {
    const next = new Set(checked)
    const leaves = collectLeaves(n)
    if (states.get(n.key) === 2) leaves.forEach((k) => next.delete(k))
    else leaves.forEach((k) => next.add(k))
    onChange(next)
  }
  const toggleOpen = (n: TNode) =>
    setExpanded((s) => { const x = new Set(s); x.has(n.key) ? x.delete(n.key) : x.add(n.key); return x })

  // Dépliage jusqu'aux sous-préfectures (localités et quartiers : à la main, ils sont très nombreux)
  const expandAll = () => {
    const x = new Set<string>()
    const go = (n: TNode) => { if (n.children.length && n.depth < 3) { x.add(n.key); n.children.forEach(go) } }
    roots.forEach(go)
    setExpanded(x)
  }
  const checkAll = () => onChange(new Set(roots.flatMap((r) => collectLeaves(r))))

  const summary = picked.length === 0
    ? 'Sélectionner les circonscriptions…'
    : `${picked.length} circonscription(s) sélectionnée(s)`
  const pill = 'rounded-full bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-800 hover:bg-blue-100'

  return (
    <div ref={box} className="relative min-w-0 flex-1">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open}
        className={`flex w-full items-center justify-between rounded-xl border bg-white px-4 py-3 text-left text-sm ${
          open ? `${tone.ring} ring-2` : 'border-line'} ${picked.length ? 'font-semibold' : 'text-muted'}`}>
        <span className="truncate">{summary}</span>
        <ChevronDown size={16} className={`shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full z-30 mt-2 overflow-hidden rounded-xl border border-line bg-white shadow-xl">
          <div className="flex flex-wrap items-center gap-2 border-b border-line p-3">
            <button className={pill} onClick={checkAll}>Tout cocher</button>
            <button className={pill} onClick={expandAll} title="Déplie jusqu'aux sous-préfectures">Tout déplier</button>
            <button className={pill} onClick={() => setExpanded(new Set())}>Tout replier</button>
            <button className={pill} onClick={() => onChange(new Set())}>Tout décocher</button>
            <label className="ml-auto flex min-w-[180px] items-center gap-2 rounded-lg border border-line px-3 py-1.5">
              <Search size={14} className="text-muted" />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Chercher une zone…"
                className="w-full bg-transparent text-sm outline-none placeholder:text-muted" />
            </label>
          </div>

          <ul className="max-h-96 overflow-y-auto py-1">
            {rows.map((n) => {
              const s = states.get(n.key) ?? 0
              const badge = childBadge(n)
              const isOpen = keep ? true : expanded.has(n.key)
              return (
                <li key={n.key} style={{ paddingLeft: 12 + n.depth * 24 }}
                  className="flex items-center gap-2 py-1.5 pr-3 hover:bg-canvas/70">
                  {n.children.length > 0 ? (
                    <button onClick={() => toggleOpen(n)} aria-label={isOpen ? 'Replier' : 'Déplier'}
                      className="grid size-5 shrink-0 place-items-center rounded text-muted hover:bg-line">
                      {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </button>
                  ) : <span className="size-5 shrink-0" />}

                  <TriCheck state={s} accent={tone.accent} onChange={() => toggleNode(n)}
                    label={`${LEVEL_LABEL[n.level]} ${n.name}`} />

                  <button onClick={() => toggleNode(n)}
                    className={`min-w-0 truncate text-left text-sm ${n.depth === 0 ? 'font-bold' : n.depth < 3 ? 'font-medium' : 'text-ink/70'}`}>
                    {LEVEL_LABEL[n.level]} {titleCase(n.name)}
                  </button>

                  {badge && <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${tone.badge}`}>{badge}</span>}

                  <button onClick={() => onDownloadNode(n)} title={`Télécharger tout le contenu de ${n.name}`}
                    className="ml-auto flex shrink-0 items-center gap-1 rounded-lg border border-line px-2 py-1 text-[11px] font-semibold hover:bg-canvas">
                    <Download size={12} /> Tout
                  </button>
                </li>
              )
            })}
            {rows.length === 0 && <li className="px-4 py-6 text-center text-sm text-muted">Aucune zone trouvée.</li>}
            {truncated && (
              <li className="px-4 py-3 text-center text-[12px] text-muted">
                Liste limitée à {MAX_ROWS} lignes : repliez des zones ou affinez la recherche.
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  )
}