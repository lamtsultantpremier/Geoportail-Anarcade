import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileText, Lightbulb, Loader2, UploadCloud, X } from 'lucide-react'
import { useImports } from './importStore'
import { ACCEPT, kindOf, parseGeoFile,codeOf } from './parseGeoFile'
import { apiSend } from '../../lib/api'

interface Entry { key: string; file: File; error?: string }

const fmtSize = (n: number) =>
  n < 1024 ? `${n} o` : n < 1024 ** 2 ? `${(n / 1024).toFixed(0)} Ko` : `${(n / 1024 ** 2).toFixed(1)} Mo`

export default function ImportModal() {
  const open = useImports((s) => s.importOpen)
  const close = useImports((s) => s.closeImport)
  return open ? <Body onClose={close} /> : null
}

function Body({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate()
//   const addBatch = useImports((s) => s.addBatch)
const refresh = useImports((s) => s.refresh)
  const [entries, setEntries] = useState<Entry[]>([])
  const [rejected, setRejected] = useState<string[]>([])
  const [dragging, setDragging] = useState(false)
  const [busy, setBusy] = useState(false)
  const input = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !busy) onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [busy, onClose])

  const add = (list: FileList | File[]) => {
    const next = [...entries]
    const bad: string[] = []
    for (const f of Array.from(list)) {
      if (!kindOf(f.name)) { bad.push(f.name); continue }
      if (next.some((e) => e.file.name === f.name && e.file.size === f.size)) continue
      next.push({ key: `${f.name}-${f.size}-${next.length}`, file: f })
    }
    setEntries(next)
    setRejected(bad)
  }

  const remove = (key: string) => setEntries((l) => l.filter((e) => e.key !== key))

const submit = async () => {
  setBusy(true)
  const failures = new Map<string, string>()
  let ok = 0

  for (const e of entries) {            // un fichier après l'autre : ménage le serveur
    try {
      const parsed = await parseGeoFile(e.file)
      await apiSend('POST', '/imports/', {
        fichier: e.file.name,
        format: parsed.kind,
        items: parsed.features.map((f) => ({
          code: codeOf(f.properties),
          properties: f.properties,
          geometry: f.geometry,
        })),
      })
      ok++
    } catch (err) {
      failures.set(e.key, err instanceof Error ? err.message : 'Échec de l\'envoi.')
    }
  }

  if (ok > 0) await refresh()
  setBusy(false)

  if (failures.size === 0) {
    onClose()
    navigate('/data-sent')
    return
  }
  // On garde seulement les fichiers en échec, avec leur message
  setEntries(entries
    .filter((e) => failures.has(e.key))
    .map((e) => ({ ...e, error: failures.get(e.key) })))
}

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4"
      onMouseDown={(e) => { if (e.target === e.currentTarget && !busy) onClose() }}
      role="dialog" aria-modal="true" aria-label="Importer des données validées"
    >
      <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h2 className="text-lg font-medium">Importer des données validées</h2>
            <p className="text-[13px] text-muted">Plusieurs fichiers possibles à la fois.</p>
          </div>
          <button onClick={onClose} disabled={busy} aria-label="Fermer"
            className="rounded-lg p-1.5 text-muted hover:bg-canvas disabled:opacity-40">
            <X size={18} />
          </button>
        </div>

        {/* Zone de dépôt */}
        <div
          onClick={() => input.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => { e.preventDefault(); setDragging(false); add(e.dataTransfer.files) }}
          className={`cursor-pointer rounded-2xl border-2 border-dashed px-6 py-10 text-center transition-colors ${
            dragging ? 'border-brand-600 bg-brand-50' : 'border-line bg-canvas/60 hover:border-brand-300'
          }`}
        >
          <div className="mx-auto grid size-16 place-items-center rounded-2xl bg-brand-100 text-brand-700">
            <UploadCloud size={28} />
          </div>
          <p className="mt-4 font-semibold">Glissez-déposez vos fichiers ici</p>
          <p className="text-sm text-muted">ou cliquez pour parcourir</p>
          <div className="mt-4 flex justify-center gap-2">
            {['.geojson', '.kml', '.zip'].map((x) => (
              <span key={x} className="rounded-lg border border-line bg-white px-3 py-1 text-xs font-semibold text-muted">{x}</span>
            ))}
          </div>
          <input
            ref={input} type="file" multiple accept={ACCEPT} className="hidden"
            onChange={(e) => { if (e.target.files) add(e.target.files); e.target.value = '' }}
          />
        </div>

        <div className="mt-4 flex items-start gap-2 rounded-xl border border-brand-100 bg-brand-50/60 px-4 py-3 text-[13px] text-ink/80">
          <Lightbulb size={15} className="mt-0.5 shrink-0 text-amber-500" />
          <span>Pour un Shapefile, fournissez un <strong>.zip</strong> contenant .shp, .dbf, .shx et .prj.</span>
        </div>

        {rejected.length > 0 && (
          <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-[13px] text-red-700">
            Format refusé : {rejected.join(', ')}. Seuls .geojson, .kml et .zip sont acceptés.
          </p>
        )}

        {entries.length > 0 && (
          <ul className="mt-4 max-h-48 divide-y divide-line overflow-y-auto rounded-xl border border-line">
            {entries.map((e) => (
              <li key={e.key} className="flex items-start gap-3 px-3 py-2.5">
                <FileText size={16} className="mt-0.5 shrink-0 text-brand-700" />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] font-medium">{e.file.name}</div>
                  <div className="text-[11px] text-muted">{fmtSize(e.file.size)}</div>
                  {e.error && <div className="mt-0.5 text-[12px] text-red-700">{e.error}</div>}
                </div>
                <button onClick={() => remove(e.key)} disabled={busy} aria-label={`Retirer ${e.file.name}`}
                  className="rounded p-1 text-muted hover:bg-canvas disabled:opacity-40">
                  <X size={14} />
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-5 flex justify-end gap-3">
          <button onClick={onClose} disabled={busy}
            className="rounded-xl bg-canvas px-5 py-2.5 text-sm font-semibold hover:bg-line disabled:opacity-50">
            Annuler
          </button>
          <button onClick={submit} disabled={busy || entries.length === 0}
            className="flex items-center gap-2 rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50">
            {busy && <Loader2 size={16} className="animate-spin" />}
            Importer{entries.length > 0 ? ` (${entries.length})` : ''}
          </button>
        </div>
      </div>
    </div>
  )
}