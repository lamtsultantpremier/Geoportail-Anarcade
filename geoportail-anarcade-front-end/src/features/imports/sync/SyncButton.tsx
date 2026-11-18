import { RefreshCw } from 'lucide-react'

interface Props {
  visible: boolean          // true seulement si SIG + Excel présents
  syncDone: boolean         // true après synchronisation réussie
  onSyncClick: () => void
  onPublishClick: () => void
}

export default function SyncButton({ visible, syncDone, onSyncClick, onPublishClick }: Props) {
  if (!visible && !syncDone) return null

  if (syncDone) {
    return (
      <button
        onClick={onPublishClick}
        className="flex items-center gap-2 rounded-lg bg-orange-400 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
      >
        Publier
      </button>
    )
  }

  return (
    <button
      onClick={onSyncClick}
      className="flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-700 transition-colors hover:bg-blue-100"
      title="Synchroniser les données SIG et Excel"
    >
      <RefreshCw size={16} />
      Synchroniser
    </button>
  )
}