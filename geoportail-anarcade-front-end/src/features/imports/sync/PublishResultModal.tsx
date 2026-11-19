import { CheckCircle2, XCircle } from 'lucide-react'

interface Bilan {
  crees?: number
  mis_a_jour?: number
  [key: string]: unknown
}

interface Props {
  open: boolean
  success: boolean
  message: string
  detail?: string
  bilans?: {
    menages?: Bilan
    exploitants?: Bilan
    parcelles?: Bilan
    parcelles_info:Bilan
    denombrements:Bilan
    pieces_justificatifs:Bilan
    enquetes:Bilan
  }
  onClose: () => void
}

export default function PublishResultModal({
  open,
  success,
  message,
  detail,
  bilans,
  onClose,
}: Props) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-start gap-3">
          <div
            className={`grid size-10 place-items-center rounded-xl ${
              success ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
            }`}
          >
            {success ? <CheckCircle2 size={20} /> : <XCircle size={20} />}
          </div>
          <div>
            <h2 className="text-lg font-medium">{message}</h2>
            {detail && <p className="mt-1 text-sm text-muted">{detail}</p>}
          </div>
        </div>

        {success && bilans && (
          <div className="mt-4 space-y-2 rounded-xl border border-line bg-canvas/50 p-3 text-[13px]">
            {bilans.enquetes && (
              <div>
                Enquêtes : {bilans.enquetes.crees ?? 0} créés,{' '}
                {bilans.enquetes.mis_a_jour ?? 0} mis à jour
              </div>
            )}
            {bilans.denombrements && (
              <div>
                Denombrements : {bilans.denombrements.crees ?? 0} créés,{' '}
                {bilans.denombrements.mis_a_jour ?? 0} mis à jour
              </div>
            )}
            {bilans.menages && (
              <div>
                Ménages : {bilans.menages.crees ?? 0} créés,{' '}
                {bilans.menages.mis_a_jour ?? 0} mis à jour
              </div>
            )}
            
            {bilans.exploitants && (
              <div>
                Exploitants : {bilans.exploitants.crees ?? 0} créés,{' '}
                {bilans.exploitants.mis_a_jour ?? 0} mis à jour
              </div>
            )}
            {bilans.pieces_justificatifs && (
              <div>
                Pieces Justificatives: {bilans.pieces_justificatifs.crees ?? 0} créés,{' '}
                {bilans.pieces_justificatifs.mis_a_jour ?? 0} mis à jour
              </div>
            )}
            {bilans.parcelles && (
              <div>
                Parcelles : {bilans.parcelles.crees ?? 0} créées,{' '}
                {bilans.parcelles.mis_a_jour ?? 0} mises à jour
              </div>
            )}
            {bilans.parcelles_info && (
              <div>
                Details des Parcelles : {bilans.parcelles_info.crees ?? 0} créées,{' '}
                {bilans.parcelles_info.mis_a_jour ?? 0} mises à jour
              </div>
            )}
          </div>
        )}

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  )
}