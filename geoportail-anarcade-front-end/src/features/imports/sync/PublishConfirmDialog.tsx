interface Props {
  open: boolean
  onCancel: () => void
  onConfirm: () => void
}

export default function PublishConfirmDialog({ open, onCancel, onConfirm }: Props) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <h2 className="text-lg font-medium">Confirmer la publication</h2>
        <p className="mt-2 text-sm text-muted">
          Êtes-vous sûr de vouloir enregistrer ces données dans la base ?
          <br />
          <strong className="text-ink">Cette opération est irréversible.</strong>
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
            className="rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
          >
            Oui, enregistrer
          </button>
        </div>
      </div>
    </div>
  )
}