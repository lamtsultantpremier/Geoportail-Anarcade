import { useEffect, useRef, useState } from 'react'
import { Check, ChevronDown, Search } from 'lucide-react'
import { titleCase } from '../../lib/format'
import type { GeoOption } from './useDenombrements'

export default function GeoMultiSelect({ label, allLabel, selected, options, loading, onChange }: {
  label: string
  allLabel: string
  selected: string[]
  options?: GeoOption[]
  loading: boolean
  onChange: (ids: string[]) => void
}) {
  const [open, setOpen] = useState(false)
  const [filter, setFilter] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onDown = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [])

  const toggle = (id: string) =>
    onChange(selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id])

  const name = (id: string) => titleCase(options?.find((o) => String(o.id) === id)?.nom)
  const summary =
    selected.length === 0 ? (loading ? 'Chargement…' : allLabel)
      : selected.length === 1 ? (name(selected[0]) || '1 sélectionné(e)')
        : `${selected.length} sélectionné(e)s`

  const shown = (options ?? []).filter((o) => o.nom.toLowerCase().includes(filter.trim().toLowerCase()))
  const allShownChecked = shown.length > 0 && shown.every((o) => selected.includes(String(o.id)))

  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open}
        className={`flex w-full min-w-[190px] items-center justify-between gap-2 rounded-xl border bg-white px-4 py-3 text-left text-sm ${
          open ? 'border-brand-600' : 'border-line'} ${selected.length ? 'font-semibold' : ''}`}>
        <span className="flex min-w-0 items-center gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-muted">{label}</span>
          <span className="truncate">{summary}</span>
        </span>
        <span className="flex items-center gap-1.5">
          {selected.length > 0 && (
            <span className="rounded-full bg-brand-600 px-1.5 text-[11px] font-semibold text-white">{selected.length}</span>
          )}
          <ChevronDown size={16} className={`text-brand-700 transition-transform ${open ? 'rotate-180' : ''}`} />
        </span>
      </button>

      {open && (
        <div className="absolute left-0 top-full z-30 mt-2 w-72 overflow-hidden rounded-xl border border-line bg-white shadow-lg">
          <div className="flex items-center gap-2 border-b border-line px-3 py-2">
            <Search size={14} className="text-muted" />
            <input autoFocus value={filter} onChange={(e) => setFilter(e.target.value)}
              placeholder="Filtrer la liste…"
              className="w-full bg-transparent text-sm outline-none placeholder:text-muted" />
          </div>

          {shown.length > 1 && (
            <button type="button"
              onClick={() => {
                const ids = shown.map((o) => String(o.id))
                onChange(allShownChecked
                  ? selected.filter((s) => !ids.includes(s))
                  : [...new Set([...selected, ...ids])])
              }}
              className="w-full border-b border-line px-3 py-2 text-left text-xs font-semibold text-brand-700 hover:bg-canvas">
              {allShownChecked ? 'Tout décocher' : `Tout cocher (${shown.length})`}
            </button>
          )}

          <ul className="max-h-64 overflow-y-auto py-1">
            {shown.map((o) => {
              const id = String(o.id)
              const on = selected.includes(id)
              return (
                <li key={o.id}>
                  <label className="flex cursor-pointer items-center gap-3 px-3 py-2 text-sm hover:bg-canvas">
                    <input type="checkbox" checked={on} onChange={() => toggle(id)} className="peer sr-only" />
                    <span className={`grid size-[18px] shrink-0 place-items-center rounded border peer-focus-visible:ring-2 peer-focus-visible:ring-brand-600 ${
                      on ? 'border-brand-600 bg-brand-600 text-white' : 'border-line bg-white'}`}>
                      {on && <Check size={13} strokeWidth={3} />}
                    </span>
                    <span className="truncate">{titleCase(o.nom)}</span>
                  </label>
                </li>
              )
            })}
            {shown.length === 0 && (
              <li className="px-3 py-4 text-center text-sm text-muted">{loading ? 'Chargement…' : 'Aucun résultat'}</li>
            )}
          </ul>
        </div>
      )}
    </div>
  )
}