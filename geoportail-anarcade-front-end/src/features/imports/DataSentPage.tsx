import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, CheckCircle2, FileText, Loader2, Trash2, Undo2, Upload } from 'lucide-react'
import { useImports, type ImportedFile } from './importStore'
import { useState } from 'react'
import ImportedDetail from './ImportedDetail'
import ImportedMap from './ImportedMap'
import ConfirmDialog from './ConfirmDialog'
import ExcelImportModal from './ExcelImportModal'
import { useExcelImports, type ExcelLot } from './excelImportStore'
import ExcelLotDetail from './ExcelLotDetail'

import { apiGet } from '../../lib/api'
import SyncButton from './sync/SyncButton'
import SyncConfirmDialog from './sync/SyncConfirmDialog'
import SyncProgressModal from './sync/SyncProgressModal'
import SyncResultModal from './sync/SyncResultModal'
import PublishConfirmDialog from './sync/PublishConfirmDialog'
import PublishProgressModal from './sync/PublishProgressModal'
import PublishResultModal from './sync/PublishResultModal'

import { type MatchRow } from './sync/SyncResultModal'

import ReplaceDialog from './ReplaceDialog'
import { fetchPreview, type Preview } from './useImportPreview'

import { useAuth,} from '../admin/auth'
import { apiSend } from '../../lib/api'
const nf = new Intl.NumberFormat('fr-FR')

const BADGE: Record<ImportedFile['statut'], { label: string; cls: string }> = {
  brouillon: { label: 'Brouillon', cls: 'bg-amber-100 text-amber-800' },
  publie: { label: 'Publié', cls: 'bg-brand-100 text-brand-700' },
  annule: { label: 'Annulé', cls: 'bg-line text-muted' },
}

export default function DataSentPage() {

  
  
  const [selectedExcelLot, setSelectedExcelLot] = useState<ExcelLot | null>(null)
  const [pending, setPending] = useState<{ file: ImportedFile; preview: Preview } | null>(null)
  const qc = useQueryClient()
  const {
    files, features, selectedUid, loading, error, busyLot,
    select, refresh, publish, cancel, remove, openImport,
  } = useImports()

  

  const droits = useAuth((s) => s.user?.droits ?? [])
  const canPublish = droits.includes('publier')
  const canImport = droits.includes('importer')
  // const openExcelImport = useExcelImports((s) => s.openImport)

  const {
  lots: excelLots,
  refresh: refreshExcel,
  remove: removeExcel,
  busyLot: busyExcelLot,
  openImport: openExcelImport,
} = useExcelImports()

  useEffect(() => { void refresh() }, [refresh])

  // Charger les deux sources au montage
  useEffect(() => {
  void refresh()
  void refreshExcel()
}, [refresh, refreshExcel])

  // Dernier lot de chaque type (indépendants)
  const lastSigLot = files.length > 0 ? files[0] : null
  const lastExcelLot = excelLots.length > 0 ? excelLots[0] : null

  const selected = features.find((f) => f.properties._uid === selectedUid) ?? null
  const selectedFile = files.find((f) => f.id === selected?.properties._fileId)

  const [showSyncConfirm, setShowSyncConfirm] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [syncProgress, setSyncProgress] = useState(0)

  const [syncResult, setSyncResult] = useState<{
  matches: number
  nonMatches: number
  conflits: number
  aRemplacer: number
} | null>(null)

const [confirmDelete, setConfirmDelete] = useState<{
  type: 'sig' | 'excel'
  lot: ImportedFile | ExcelLot
} | null>(null)

const [syncDone, setSyncDone] = useState(false)

const [syncResultRows, setSyncResultRows] = useState<MatchRow[] | null>(null)
// const canSynchronize = Boolean(lastSigLot && lastExcelLot)
const hasMatches = Boolean(syncResultRows && syncResultRows.length > 0)

// Le lot Excel est considéré comme synchronisé s’il a le bon statut
// et au moins un match
const isExcelSynced =
  Boolean(lastExcelLot) &&
  (lastExcelLot!.statut === 'synchronise' || lastExcelLot!.statut === 'publie') &&
  (lastExcelLot!.nb_matches ?? 0) > 0

  // On peut publier uniquement si les deux lots sont là ET qu’il y a eu un matching
const canPublishSync = Boolean(lastSigLot && lastExcelLot && isExcelSynced)

// Bouton Synchroniser visible seulement s’il reste quelque chose à synchroniser
const canSynchronize = Boolean(lastSigLot && lastExcelLot && !isExcelSynced)

const [showPublishConfirm, setShowPublishConfirm] = useState(false)
const [isPublishing, setIsPublishing] = useState(false)
const [publishProgress, setPublishProgress] = useState(0)
const [publishEtape, setPublishEtape] = useState('')
const [publishResult, setPublishResult] = useState<{
  success: boolean
  message: string
  detail?: string
  bilans?: {
    menages?: { crees?: number; mis_a_jour?: number }
    exploitants?: { crees?: number; mis_a_jour?: number }
    parcelles?: { crees?: number; mis_a_jour?: number }
  }
} | null>(null)

const [loadingMatches, setLoadingMatches] = useState(false)

  // La carte principale, les compteurs et la page Données lisent la même base :
  // on invalide leur cache pour qu'ils voient les parcelles publiées ou retirées.
  const refreshPlatform = () => qc.invalidateQueries()

  const onPublish = async (f: ImportedFile) => {
  try {
    const preview = await fetchPreview(f.lotId)
    if (preview.doublons.length > 0) {
      setPending({ file: f, preview })          // demander confirmation parcelle par parcelle
      return
    }
    const n = preview.a_inserer
    if (!window.confirm(`Publier ${nf.format(n)} nouvelle(s) parcelle(s) de « ${f.name} » ?`)) return
    await publish(f.lotId, [])
    refreshPlatform()
  } catch (e) {
    window.alert(e instanceof Error ? e.message : 'Publication impossible.')
  }
}

const onConfirmReplace = async (rangs: number[]) => {
  if (!pending) return
  await publish(pending.file.lotId, rangs)
  setPending(null)
  refreshPlatform()
}
  const onCancel = async (f: ImportedFile) => {
    if (!window.confirm(`Retirer de la base les parcelles publiées depuis « ${f.name} » ?`)) return
    await cancel(f.lotId)
    refreshPlatform()
  }
  const onRemove = async (f: ImportedFile) => {
    if (!window.confirm(`Supprimer définitivement le lot « ${f.name} » ?`)) return
    await remove(f.lotId)
    // Réinitialisation de l'état de synchronisation
  setSyncDone(false)
  setSyncResultRows(null)
  }

  const onRemoveExcel = async (lot: ExcelLot) => {
  if (!window.confirm(`Supprimer définitivement le lot Excel « ${lot.fichier} » ?`)) return
  await removeExcel(lot.id)

  // Réinitialisation de l'état de synchronisation
  setSyncDone(false)
  setSyncResultRows(null)
}


  const askDeleteSig = (f: ImportedFile) => {
  setConfirmDelete({ type: 'sig', lot: f })
}

const askDeleteExcel = (lot: ExcelLot) => {
  setConfirmDelete({ type: 'excel', lot })
}

const executeDelete = async () => {
  if (!confirmDelete) return

  try {
    if (confirmDelete.type === 'sig') {
      const f = confirmDelete.lot as ImportedFile
      await remove(f.lotId)
    } else {
      const lot = confirmDelete.lot as ExcelLot
      await removeExcel(lot.id)
    }

    // Réinitialisation de l'état de synchronisation
    setSyncDone(false)
    setSyncResultRows(null)
  } finally {
    setConfirmDelete(null)
  }
}

  // Fonction de lancement (simulation pour l’instant)
const launchSynchronization = async () => {
  if (!lastSigLot || !lastExcelLot) return

  setShowSyncConfirm(false)
  setIsSyncing(true)
  setSyncProgress(0)

  try {
    // Petite animation de progression pendant l'appel
    const progressInterval = setInterval(() => {
      setSyncProgress((p) => (p < 90 ? p + 10 : p))
    }, 300)

    const data = await apiSend<{
      rows: MatchRow[]
      total_matches: number
    }>('POST', '/synchroniser/', {
      id_lot_sig: lastSigLot.lotId,
      id_lot_excel: lastExcelLot.id,
    })

    clearInterval(progressInterval)
    setSyncProgress(100)

    setSyncResultRows(data.rows)
    // on mémorise s’il y a des matches
    setSyncDone(data.rows.length > 0)
    // Rafraîchir les lots Excel pour mettre à jour le statut
   await refreshExcel()
  } catch (e) {
    window.alert(e instanceof Error ? e.message : 'Échec de la synchronisation.')
  } finally {
    setIsSyncing(false)
  }
}

const launchPublication = async () => {
  if (!lastSigLot || !lastExcelLot) return

  setShowPublishConfirm(false)
  setIsPublishing(true)
  setPublishProgress(0)
  setPublishEtape('Préparation…')

  const steps = [
    { p: 20, label: 'Insertion des ménages…' },
    { p: 45, label: 'Insertion des exploitants…' },
    { p: 75, label: 'Insertion des parcelles…' },
    { p: 90, label: 'Finalisation…' },
  ]

  try {
    let stepIndex = 0
    const timer = setInterval(() => {
      if (stepIndex < steps.length) {
        setPublishProgress(steps[stepIndex].p)
        setPublishEtape(steps[stepIndex].label)
        stepIndex++
      }
    }, 500)

    const data = await apiSend<{
      ok: boolean
      message: string
      menages: { crees?: number; mis_a_jour?: number }
      exploitants: { crees?: number; mis_a_jour?: number }
      parcelles: { crees?: number; mis_a_jour?: number }
      detail?: string
      erreur?: string
    }>('POST', '/synchroniser/publier/', {
      id_lot_sig: lastSigLot.lotId,
      id_lot_excel: lastExcelLot.id,
    })

    clearInterval(timer)
    setPublishProgress(100)
    setPublishEtape('Terminé')

    setPublishResult({
      success: true,
      message: 'Insertion réussie',
      bilans: {
        menages: data.menages,
        exploitants: data.exploitants,
        parcelles: data.parcelles,
      },
    })

    await refreshExcel()
    // optionnel : refreshPlatform()
  } catch (e) {
    setPublishResult({
      success: false,
      message: 'Échec de l’insertion',
      detail: e instanceof Error ? e.message : 'Une erreur est survenue.'
    })
  } finally {
    setIsPublishing(false)
  }
}

const openMatchDetail = async () => {
  if (!lastExcelLot) return
  setLoadingMatches(true)
  try {
    const data = await apiGet<{ rows: MatchRow[] }>(
      `/synchroniser/${lastExcelLot.id}/matches/`,
    )
    setSyncResultRows(data.rows)
  } catch (e) {
    window.alert(e instanceof Error ? e.message : 'Impossible de charger le détail.')
  } finally {
    setLoadingMatches(false)
  }
}

  const visible = features.length
  return (
    <div className="mx-auto max-w-[1600px]">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-normal">Données validées</h1>
            <p className="text-sm text-muted">
                {visible > 0
                ? `${nf.format(visible)} parcelle${visible > 1 ? 's' : ''} importée${visible > 1 ? 's' : ''}, dans ${files.filter((f) => f.statut !== 'annule').length} lot(s)`
                : 'Fichiers importés, contrôlés puis publiés dans la base'}
            </p>
          </div>

        {canImport && (
        
        <div className="flex items-center gap-3">
            <div className="flex flex-col items-end gap-2">
                <SyncButton
                      visible={canSynchronize || canPublishSync}
                      syncDone={canPublishSync}
                      onSyncClick={() => setShowSyncConfirm(true)}
                      onPublishClick={() => setShowPublishConfirm(true)}
                  />

              <div className="flex items-center gap-3">
                {/* Bouton Excel - Bleu */}
              <button
              onClick={openExcelImport}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
              >
              <Upload size={16} />
                Importer Excel
            </button>

          {/* Bouton SIG existant */}
          <button
              onClick={openImport}
              className="flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-700"
            >
              <Upload size={16} />
              Importer des fichiers
            </button>
             </div>
          </div>
          
        </div>
        )}
    </div>

      {error && <p className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      

    {!lastSigLot && !lastExcelLot ? (
  <div className="rounded-2xl border border-dashed border-line bg-white p-12 text-center">
    {loading ? (
      <Loader2 className="mx-auto animate-spin text-brand-600" />
    ) : (
      <>
        <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-brand-50 text-brand-700">
          <Upload size={24} />
        </div>
        <p className="mt-4 font-medium">Aucun fichier importé</p>
        <p className="mt-1 text-sm text-muted">
          Importez un fichier Excel ou des fichiers .geojson, .kml ou .zip (Shapefile).
        </p>
      </>
    )}
  </div>
) : (
  <div className={`grid grid-cols-1 gap-5 ${
    selected ? 'lg:grid-cols-[300px_1fr_380px]' : 'lg:grid-cols-[300px_1fr]'
  }`}>
    
    {/* ===== SECTION LOTS IMPORTÉS ===== */}
              <section className="h-fit rounded-2xl border border-line bg-white p-4">
  <div className="mb-3 flex items-center justify-between">
    <h2 className="text-sm font-semibold">Lots importés</h2>
    <span className="rounded-full bg-brand-100 px-2 py-0.5 text-[11px] font-medium text-brand-700">
      {(lastSigLot ? 1 : 0) + (lastExcelLot ? 1 : 0)}
    </span>
  </div>

  <ul className="space-y-3">
    {/* ---------- LOT SIG ---------- */}
    {lastSigLot && (
      <li className="rounded-xl border border-line p-3">
        <div className="flex items-start gap-2">
          <span
            className="mt-1 size-3 shrink-0 rounded-sm"
            style={{ background: lastSigLot.color }}
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <FileText size={12} className="shrink-0 text-muted" />
              <span className="truncate text-[13px] font-medium" title={lastSigLot.name}>
                {lastSigLot.name}
              </span>
            </div>

            <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px]">
              <span className={`rounded-full px-2 py-0.5 font-medium ${BADGE[lastSigLot.statut].cls}`}>
                {BADGE[lastSigLot.statut].label}
              </span>
              <span className="text-muted">
                {nf.format(lastSigLot.total)} parcelle{lastSigLot.total > 1 ? 's' : ''}
              </span>
              <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600">
                SIG
              </span>
            </div>

            <div className="mt-2 space-y-0.5 text-[12px]">
              <div className="flex items-center gap-1.5 text-brand-700">
                <CheckCircle2 size={12} />
                {nf.format(lastSigLot.valides)} valide{lastSigLot.valides > 1 ? 's' : ''}
              </div>
              {lastSigLot.avertissements > 0 && (
                <div className="flex items-center gap-1.5 text-amber-700">
                  <AlertTriangle size={12} />
                  {nf.format(lastSigLot.avertissements)} avertissement{lastSigLot.avertissements > 1 ? 's' : ''}
                </div>
              )}
              {lastSigLot.erreurs > 0 && (
                <div className="flex items-center gap-1.5 text-red-700">
                  <AlertTriangle size={12} />
                  {nf.format(lastSigLot.erreurs)} erreur{lastSigLot.erreurs > 1 ? 's' : ''}
                </div>
              )}
              {lastSigLot.doublons > 0 && (
                <div className="flex items-center gap-1.5 text-orange-700">
                  <AlertTriangle size={12} />
                  {nf.format(lastSigLot.doublons)} déjà existant{lastSigLot.doublons > 1 ? 's' : ''}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Actions SIG */}
        <div className="mt-3 flex flex-wrap gap-2">
          {/* A placer plus tard */}
          {/* {canPublish && lastSigLot.statut === 'brouillon' && (
            <button
              onClick={() => onPublish(lastSigLot)}
              disabled={busyLot === lastSigLot.lotId}
              className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
            >
              {busyLot === lastSigLot.lotId && <Loader2 size={13} className="animate-spin" />}
              Publier
            </button>
          )} */}

          {canPublish && lastSigLot.statut === 'publie' && (
            <button
              onClick={() => onCancel(lastSigLot)}
              disabled={busyLot === lastSigLot.lotId}
              className="flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-[12px] font-semibold hover:bg-canvas disabled:opacity-60"
            >
              {busyLot === lastSigLot.lotId ? <Loader2 size={13} className="animate-spin" /> : <Undo2 size={13} />}
              Annuler
            </button>
          )}

          {canImport && (
            <button
              onClick={() => askDeleteSig(lastSigLot)}
              disabled={busyLot === lastSigLot.lotId}
              className="flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-[12px] font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60"
            >
              <Trash2 size={13} />
              Supprimer
            </button>
          )}
        </div>
      </li>
    )}

    {/* ---------- LOT EXCEL ---------- */}
    {lastExcelLot && (
      <li className="rounded-xl border border-line p-3 cursor-pointer 
                     transition-colors hover:border-blue-300 hover:bg-blue-50/30" 
       onClick={() => setSelectedExcelLot(lastExcelLot)}>
        <div className="flex items-start gap-2">
          <span className="mt-1 size-3 shrink-0 rounded-sm bg-blue-500" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <FileText size={12} className="shrink-0 text-muted" />
              <span className="truncate text-[13px] font-medium" title={lastExcelLot.fichier}>
                {lastExcelLot.fichier}
              </span>
            </div>

            <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px]">
              <span className="rounded-full bg-blue-100 px-2 py-0.5 font-medium text-blue-800">
                {lastExcelLot.statut === 'brouillon' && 'Brouillon'}
                {lastExcelLot.statut === 'synchronise' && 'Synchronisé'}
                {lastExcelLot.statut === 'publie' && 'Publié'}
                {lastExcelLot.statut === 'annule' && 'Annulé'}
              </span>
              <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium text-blue-700">
                Excel
              </span>
            </div>

            <div className="mt-2 space-y-0.5 text-[12px] text-muted">
              <div>{nf.format(lastExcelLot.nb_parcelles)} parcelles</div>
              <div>{nf.format(lastExcelLot.nb_exploitants)} exploitants</div>
              <div>{nf.format(lastExcelLot.nb_denombrements)} dénombrements</div>
              {lastExcelLot.nb_erreurs > 0 && (
                <div className="text-red-700">
                  {nf.format(lastExcelLot.nb_erreurs)} erreur{lastExcelLot.nb_erreurs > 1 ? 's' : ''}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Action Excel (suppression indépendante) */}
        {/* <div className="mt-3 flex flex-wrap gap-2"> */}
          {/* {canImport && (
            <button
                onClick={(e) => {
                    e.stopPropagation()
                    askDeleteExcel(lastExcelLot)
                }}

              disabled={busyExcelLot === lastExcelLot.id}
              className="flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-[12px] font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60"
            >
              {busyExcelLot === lastExcelLot.id ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <Trash2 size={13} />
              )}
              Supprimer
            </button>
          )} */}
        {/* </div> */}
        {/* Actions Excel */}
        <div className="mt-3 flex flex-wrap gap-2">
            {/* Voir détail – uniquement après synchronisation réussie */}
            {isExcelSynced && (
              <button
                  onClick={(e) => {
                  e.stopPropagation()
                  openMatchDetail()
            }}
                  disabled={loadingMatches}
                  className="flex items-center gap-1.5 rounded-lg border border-line bg-slate-100 px-3 py-1.5 text-[12px] font-semibold text-slate-700 hover:bg-slate-200 disabled:opacity-60"
        >
      {loadingMatches ? (
        <Loader2 size={13} className="animate-spin" />
      ) : null}
      Voir détail
    </button>
  )}

  {canImport && (
    <button
      onClick={(e) => {
        e.stopPropagation()
        askDeleteExcel(lastExcelLot)
      }}
      disabled={busyExcelLot === lastExcelLot.id}
      className="flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-[12px] font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60"
    >
    {busyExcelLot === lastExcelLot.id ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <Trash2 size={13} />
              )}
      Supprimer
    </button>
  )}
</div>
      </li>
    )}

    {/* Aucun lot */}
    {!lastSigLot && !lastExcelLot && !loading && (
      <li className="py-8 text-center text-sm text-muted">
        Aucun lot importé
      </li>
    )}
  </ul>
</section>

    {/* Zone centrale : soit la carte, soit le détail Excel */}
<div className="h-[calc(100vh-190px)] min-h-[520px] overflow-hidden rounded-2xl border border-line bg-white">
  {selectedExcelLot ? (
    <ExcelLotDetail
      lot={selectedExcelLot}
      onClose={() => setSelectedExcelLot(null)}
    />
  ) : (
    <ImportedMap />
  )}
</div>

    {selected && (
      <ImportedDetail
        key={String(selected.properties._uid)}
        feature={selected}
        file={selectedFile}
        onClose={() => select(null)}
      />
    )}
  </div>
)}


        {pending && (
        <ReplaceDialog
          fileName={pending.file.name}
          preview={pending.preview}
          busy={busyLot === pending.file.lotId}
          onCancel={() => setPending(null)}
          onConfirm={onConfirmReplace}
        />
      )}
      <ExcelImportModal />
      <SyncConfirmDialog
          open={showSyncConfirm}
          onCancel={() => setShowSyncConfirm(false)}
          onConfirm={launchSynchronization}
      />

      <SyncProgressModal 
          open={isSyncing} 
          progress={syncProgress} />

    <SyncResultModal
          open={Boolean(syncResultRows)}
          rows={syncResultRows ?? []}
          onClose={() => setSyncResultRows(null)}
    />

    <ConfirmDialog
          open={Boolean(confirmDelete)}
          title="Confirmer la suppression"
          message={
          confirmDelete?.type === 'sig'
              ? `Supprimer définitivement le lot SIG « ${(confirmDelete.lot as ImportedFile).name} » ?`
              : `Supprimer définitivement le lot Excel « ${(confirmDelete?.lot as ExcelLot)?.fichier} » ?`
              }
          confirmLabel="Supprimer"
          danger
          busy={
            confirmDelete?.type === 'sig'
            ? busyLot === (confirmDelete.lot as ImportedFile).lotId
            : busyExcelLot === (confirmDelete?.lot as ExcelLot)?.id
            }
          onConfirm={executeDelete}
          onCancel={() => setConfirmDelete(null)}
          />

    <PublishConfirmDialog
        open={showPublishConfirm}
        onCancel={() => setShowPublishConfirm(false)}
        onConfirm={launchPublication} 
      />

    <PublishProgressModal
        open={isPublishing}
        progress={publishProgress}
        etape={publishEtape}
    />

  <PublishResultModal
        open={Boolean(publishResult)}
        success={publishResult?.success ?? false}
        message={publishResult?.message ?? ''}
        detail={publishResult?.detail}
        bilans={publishResult?.bilans}
        onClose={() => setPublishResult(null)}
  />

</div>

  )
}