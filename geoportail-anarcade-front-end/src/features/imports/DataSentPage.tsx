import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, CheckCircle2, FileText, Loader2, Trash2, Undo2, Upload } from 'lucide-react'
import { useImports, type ImportedFile } from './importStore'
import ImportedDetail from './ImportedDetail'
import ImportedMap from './ImportedMap'

const nf = new Intl.NumberFormat('fr-FR')

const BADGE: Record<ImportedFile['statut'], { label: string; cls: string }> = {
  brouillon: { label: 'Brouillon', cls: 'bg-amber-100 text-amber-800' },
  publie: { label: 'Publié', cls: 'bg-brand-100 text-brand-700' },
  annule: { label: 'Annulé', cls: 'bg-line text-muted' },
}

export default function DataSentPage() {
  const qc = useQueryClient()
  const {
    files, features, selectedUid, loading, error, busyLot,
    select, refresh, publish, cancel, remove, openImport,
  } = useImports()

  useEffect(() => { void refresh() }, [refresh])

  const selected = features.find((f) => f.properties._uid === selectedUid) ?? null
  const selectedFile = files.find((f) => f.id === selected?.properties._fileId)

  // La carte principale, les compteurs et la page Données lisent la même base :
  // on invalide leur cache pour qu'ils voient les parcelles publiées ou retirées.
  const refreshPlatform = () => qc.invalidateQueries()

  const onPublish = async (f: ImportedFile) => {
    const n = f.valides + f.avertissements
    if (!window.confirm(`Publier ${nf.format(n)} parcelle(s) de « ${f.name} » dans la base ?\n${f.erreurs} en erreur seront ignorées.`)) return
    await publish(f.lotId)
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
        <button onClick={openImport}
          className="flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-700">
          <Upload size={16} /> Importer des fichiers
        </button>
      </div>

      {error && <p className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      {files.length === 0 ? (
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
                Importez des fichiers .geojson, .kml ou .zip (Shapefile) pour les contrôler et les publier.
              </p>
              <button onClick={openImport}
                className="mt-5 rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-700">
                Importer des données validées
              </button>
            </>
          )}
        </div>
      ) : (
        <div className={`grid grid-cols-1 gap-5 ${
          selected ? 'lg:grid-cols-[300px_1fr_380px]' : 'lg:grid-cols-[300px_1fr]'
        }`}>
          <section className="h-fit rounded-2xl border border-line bg-white p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold">Lots importés</h2>
              <span className="rounded-full bg-brand-100 px-2 py-0.5 text-[11px] font-medium text-brand-700">
                {files.length}
              </span>
            </div>

            <ul className="max-h-[calc(100vh-300px)] space-y-2.5 overflow-y-auto">
              {files.map((f) => {
                const busy = busyLot === f.lotId
                const publishable = f.statut === 'brouillon' && f.valides + f.avertissements > 0
                const b = BADGE[f.statut]
                return (
                  <li key={f.id} className="rounded-xl border border-line p-3">
                    <div className="flex items-start gap-2">
                      <span className="mt-1 size-3 shrink-0 rounded-sm" style={{ background: f.color }} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <FileText size={12} className="shrink-0 text-muted" />
                          <span className="truncate text-[13px] font-medium" title={f.name}>{f.name}</span>
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px]">
                          <span className={`rounded-full px-2 py-0.5 font-medium ${b.cls}`}>{b.label}</span>
                          <span className="text-muted">{nf.format(f.total)} parcelle{f.total > 1 ? 's' : ''}</span>
                        </div>
                        <div className="mt-2 space-y-0.5 text-[12px]">
                          <div className="flex items-center gap-1.5 text-brand-700">
                            <CheckCircle2 size={12} /> {nf.format(f.valides)} valide{f.valides > 1 ? 's' : ''}
                          </div>
                          {f.avertissements > 0 && (
                            <div className="flex items-center gap-1.5 text-amber-700">
                              <AlertTriangle size={12} /> {nf.format(f.avertissements)} avec avertissement
                            </div>
                          )}
                          {f.erreurs > 0 && (
                            <div className="flex items-center gap-1.5 text-red-700">
                              <AlertTriangle size={12} /> {nf.format(f.erreurs)} en erreur (ignorées)
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      {publishable && (
                        <button onClick={() => onPublish(f)} disabled={busy}
                          className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-brand-700 disabled:opacity-60">
                          {busy && <Loader2 size={13} className="animate-spin" />} Publier
                        </button>
                      )}
                      {f.statut === 'publie' && (
                        <button onClick={() => onCancel(f)} disabled={busy}
                          className="flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-[12px] font-semibold hover:bg-canvas disabled:opacity-60">
                          {busy ? <Loader2 size={13} className="animate-spin" /> : <Undo2 size={13} />} Annuler la publication
                        </button>
                      )}
                      {f.statut !== 'publie' && (
                        <button onClick={() => onRemove(f)} disabled={busy}
                          className="flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-[12px] font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60">
                          <Trash2 size={13} /> Supprimer
                        </button>
                      )}
                    </div>
                  </li>
                )
              })}
            </ul>
          </section>

          <div className="h-[calc(100vh-190px)] min-h-[520px] overflow-hidden rounded-2xl border border-line bg-white">
            <ImportedMap />
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
    </div>
  )
}