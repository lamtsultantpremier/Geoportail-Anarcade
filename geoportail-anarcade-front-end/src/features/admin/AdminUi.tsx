import { useEffect } from 'react'
import { X } from 'lucide-react'

export const CARD = 'rounded-2xl border border-line bg-white shadow-sm'
export const INPUT = 'w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-sm outline-none focus:border-red-500'
export const BTN_RED = 'flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50'
export const BTN_LINE = 'flex items-center gap-2 rounded-xl border border-line bg-white px-4 py-2.5 text-sm font-semibold hover:bg-slate-50 disabled:opacity-50'

export const ROLE_STYLE: Record<string, string> = {
  'Super-admin': 'border-red-200 bg-red-50 text-red-700',
  Admin: 'border-orange-200 bg-orange-50 text-orange-700',
  Superviseur: 'border-blue-200 bg-blue-50 text-blue-700',
  Enquêteur: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  Utilisateur: 'border-slate-200 bg-slate-50 text-slate-600',
  Client: 'border-violet-200 bg-violet-50 text-violet-700'
}

export const initials = (s: string) =>
  s.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase() || '?'

export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [onClose])
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" role="dialog" aria-modal="true"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">{title}</h2>
          <button onClick={onClose} aria-label="Fermer" className="rounded-lg p-1.5 text-muted hover:bg-slate-100"><X size={18} /></button>
        </div>
        {children}
      </div>
    </div>
  )
}

export const Label = ({ text, children }: { text: string; children: React.ReactNode }) => (
  <label className="block"><span className="mb-1 block text-[12px] font-semibold text-muted">{text}</span>{children}</label>
)

export const Err = ({ msg }: { msg?: string | null }) =>
  msg ? <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{msg}</p> : null