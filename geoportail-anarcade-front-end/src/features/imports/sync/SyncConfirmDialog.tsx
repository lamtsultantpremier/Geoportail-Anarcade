interface Props {
  open: boolean
  onCancel: () => void
  onConfirm: () => void
}

export default function SyncConfirmDialog({ open, onCancel, onConfirm }: Props) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <h2 className="text-lg font-medium">Confirmer la synchronisation</h2>
        <p className="mt-2 text-sm text-muted">
          Êtes-vous sûr de vouloir effectuer la synchronisation entre le lot SIG et le lot Excel ?
        </p>

        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="rounded-xl bg-canvas px-5 py-2.5 text-sm font-semibold hover:bg-line"
          >
            Annuler
          </button>
          <button
            onClick={onConfirm}
            className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Oui, synchroniser
          </button>
        </div>
      </div>
    </div>
  )
}