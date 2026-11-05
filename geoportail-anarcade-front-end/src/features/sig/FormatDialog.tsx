import { useEffect } from 'react'
import { Download, X } from 'lucide-react'
import { FORMATS, type Fmt } from './formats'

export default function FormatDialog({ title, subtitle, formats, onPick, onClose }: {
  title: string; subtitle: string; formats: Fmt[]; onPick: (f: Fmt) => void; onClose: () => void
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" role="dialog" aria-modal="true"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-lg font-medium">Choisir le format</h2>
            <p className="mt-1 break-words text-[13px] font-semibold">{title}</p>
            <p className="text-[12px] text-muted">{subtitle}</p>
          </div>
          <button onClick={onClose} aria-label="Fermer" className="rounded-lg p-1.5 text-muted hover:bg-canvas">
            <X size={18} />
          </button>
        </div>
        <div className="mt-4 space-y-2">
          {formats.map((f) => (
            <button key={f} onClick={() => onPick(f)}
              className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left ${FORMATS[f].btn}`}>
              <Download size={18} className="shrink-0" />
              <span>
                <span className="block text-sm font-semibold">{FORMATS[f].label}</span>
                <span className="block text-[11px] opacity-80">{FORMATS[f].hint}</span>
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}