import { Loader2 } from 'lucide-react'

interface Props {
  open: boolean
  progress: number
  etape?: string
}

export default function PublishProgressModal({ open, progress, etape }: Props) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-center gap-3">
          <Loader2 size={22} className="animate-spin text-brand-600" />
          <h2 className="text-lg font-medium">Enregistrement en cours…</h2>
        </div>
        <p className="mt-2 text-sm text-muted">
          {etape || 'Insertion des données dans les tables métier.'}
        </p>
        <div className="mt-5">
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-brand-600 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="mt-2 text-right text-sm font-medium text-brand-700">
            {progress}%
          </div>
        </div>
      </div>
    </div>
  )
}