import { useEffect, useRef, useState } from 'react'
import { Check, Layers } from 'lucide-react'
import { useUi } from '../../lib/store'
import { BASEMAPS } from './basemaps'

export default function BasemapSwitcher() {
  const { basemap, setBasemap } = useUi()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [])

  return (
    <div ref={ref} className="absolute right-[10px] top-[84px] z-10">
      <button
        onClick={() => setOpen((o) => !o)}
        title="Changer le fond de carte"
        aria-label="Changer le fond de carte"
        aria-expanded={open}
        className="grid size-[29px] place-items-center rounded bg-white text-ink shadow-[0_0_0_2px_rgba(0,0,0,0.1)] hover:bg-canvas"
      >
        <Layers size={16} />
      </button>

      {open && (
        <div className="absolute 
                right-0 top-9 max-h-[340px] w-60 overflow-y-auto rounded-xl border border-line bg-white p-2 shadow-lg">
          <div className="px-2 pb-1.5 pt-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
            Fond de carte
          </div>
          {BASEMAPS.map((b) => (
            <button
              key={b.id}
              onClick={() => { setBasemap(b.id); setOpen(false) }}
              className={`flex w-full items-center gap-3 rounded-lg p-2 text-left hover:bg-canvas ${
                basemap === b.id ? 'bg-brand-50' : ''
              }`}
            >
              <span className="size-10 shrink-0 rounded-md border border-black/10" style={{ background: b.preview }} />
              <span className="min-w-0 flex-1">
                <span className="block text-[13px] font-medium">{b.label}</span>
                <span className="block truncate text-[11px] text-muted">{b.description}</span>
              </span>
              {basemap === b.id && <Check size={15} className="shrink-0 text-brand-700" />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}