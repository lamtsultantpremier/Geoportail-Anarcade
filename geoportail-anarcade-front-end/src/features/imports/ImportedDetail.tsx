import { useState } from 'react'
import { Check, Download, Minus, X } from 'lucide-react'
import { Row, Rows, SectionTitle } from '../../components/ui/Rows'
import { areaHa } from '../../lib/geo'
import { formatHa } from '../../lib/format'
import type { ImportedFile } from './importStore'
import { KIND_LABEL, type PolyFeature } from './parseGeoFile'

type Tab = 'details' | 'historique' | 'qualite'

const polysOf = (f: PolyFeature) =>
  f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates

const attributes = (f: PolyFeature) =>
  Object.entries(f.properties).filter(([k, v]) => !k.startsWith('_') && v !== null && v !== '')

const show = (v: unknown) => (typeof v === 'object' ? JSON.stringify(v) : String(v))

function exportFeature(f: PolyFeature) {
  const props = Object.fromEntries(Object.entries(f.properties).filter(([k]) => !k.startsWith('_')))
  const blob = new Blob(
    [JSON.stringify({ type: 'FeatureCollection', features: [{ ...f, properties: props }] })],
    { type: 'application/geo+json' },
  )
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${String(f.properties._label).replace(/[^\w-]+/g, '_')}.geojson`
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}

export default function ImportedDetail({ feature, file, onClose }: {
  feature: PolyFeature
  file?: ImportedFile
  onClose: () => void
}) {
  const [tab, setTab] = useState<Tab>('details')
  const polys = polysOf(feature)
  const rings = polys.flatMap((p) => p)
  const ha = typeof feature.properties._ha === 'number' ? feature.properties._ha : areaHa(feature.geometry)
  const vertices = rings.reduce((s, r) => s + Math.max(r.length - 1, 0), 0)
  const attrs = attributes(feature)
  const messages = (feature.properties._messages ?? []) as { niveau: string; texte: string }[]
  const statut = String(feature.properties._status ?? 'valide')

  const checks = [
    { label: 'Contours fermés', ok: rings.every((r) => r.length > 0 && r[0][0] === r[r.length - 1][0] && r[0][1] === r[r.length - 1][1]) },
    { label: 'Au moins 3 sommets par contour', ok: rings.every((r) => r.length >= 4) },
    { label: 'Superficie supérieure à zéro', ok: ha > 0 },
    { label: 'Superficie plausible (moins de 500 ha)', ok: ha > 0 && ha < 500 },
    { label: 'Attributs renseignés', ok: attrs.length > 0 },
    { label: 'Identifiant de parcelle reconnu', ok: !String(feature.properties._label).startsWith('Parcelle ') },
  ]
  const passed = checks.filter((c) => c.ok).length

  const tabs: { key: Tab; label: string }[] = [
    { key: 'details', label: 'Détails' },
    { key: 'historique', label: 'Historique' },
    { key: 'qualite', label: 'Qualité' },
  ]

  return (
    <aside className="flex max-h-[calc(100vh-190px)] min-h-[520px] flex-col overflow-hidden rounded-2xl border border-line bg-white">
      <div className="p-5 pb-3">
        <div className="flex items-start justify-between">
          <div className="min-w-0">
            <div className="text-base font-semibold">Fiche parcelle</div>
            <div className="mt-0.5 break-all font-mono text-[12px] text-muted">{String(feature.properties._label)}</div>
          </div>
          <button onClick={onClose} aria-label="Fermer" className="rounded-lg bg-canvas p-1.5 text-muted hover:bg-line">
            <X size={16} />
          </button>
        </div>
      </div>

      <div className="flex gap-6 border-b border-line px-5">
        {tabs.map(({ key, label }) => (
          <button key={key} onClick={() => setTab(key)}
            className={`-mb-px border-b-2 pb-3 pt-1 text-xs font-medium ${
              tab === key ? 'border-brand-600 text-ink' : 'border-transparent text-muted hover:text-ink'
            }`}>
            {label}
          </button>
        ))}
      </div>

      <div className="flex-1 space-y-6 overflow-y-auto p-5">
        {tab === 'details' && (
          <>
            <section>
              <SectionTitle>Géométrie</SectionTitle>
              <Rows>
                <Row label="Superficie" value={formatHa(Number(ha.toFixed(2)))} />
                <Row label="Sommets" value={vertices} />
                <Row label="Polygones" value={polys.length} />
              </Rows>
            </section>
            <section>
              <SectionTitle>Attributs du fichier</SectionTitle>
              {attrs.length === 0 ? (
                <p className="text-sm italic text-muted">Aucun attribut dans le fichier.</p>
              ) : (
                <Rows>{attrs.map(([k, v]) => <Row key={k} label={k} value={show(v)} />)}</Rows>
              )}
            </section>
          </>
        )}

        {tab === 'historique' && (
          <section>
            <SectionTitle>Import</SectionTitle>
                <Rows>
                    <Row label="Fichier" value={file?.name} />
                    <Row label="Format" value={file?.format} />
                    <Row label="Importé le" value={file ? new Date(file.addedAt).toLocaleString('fr-FR') : null} />
                    <Row label="Statut du lot" value={
                         file?.statut === 'publie' ? 'Publié dans la base'
                        : file?.statut === 'annule' ? 'Publication annulée' : 'Brouillon (non publié)'} />
                    <Row label="Publié le" value={file?.publishedAt ? new Date(file.publishedAt).toLocaleString('fr-FR') : null} />
            </Rows>
          </section>
        )}

        {tab === 'qualite' && (
          <section>
                <SectionTitle>Contrôles du serveur</SectionTitle>
                {messages.length === 0 ? (
                        <p className="rounded-lg bg-brand-50 p-3 text-[13px] text-brand-700">
                            Aucun problème détecté : parcelle valide.
                        </p>
                ) : (
                <ul className="space-y-2">
                    {messages.map((m, i) => (
                    <li key={i} className={`rounded-lg p-3 text-[13px] ${
                        m.niveau === 'erreur' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-800'
                    }`}>
                    <strong className="mr-1">{m.niveau === 'erreur' ? 'Erreur' : 'Avertissement'} :</strong>
                    {m.texte}
                </li>
                ))}
            </ul>
            )}
            <p className="mt-2 text-[12px] text-muted">
                Résultat : {statut === 'erreur' ? 'ne sera pas publiée' : statut === 'avertissement' ? 'publiable avec réserves' : 'publiable'}.
            </p>
        </section>
        )}
      </div>

      <div className="flex gap-3 border-t border-line p-4">
        {/* <button onClick={onRemoveFile}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-canvas px-4 py-2.5 text-sm font-semibold hover:bg-line">
          <Trash2 size={15} /> Retirer le fichier
        </button> */}
        <button onClick={() => exportFeature(feature)}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700">
          <Download size={15} /> Exporter
        </button>
      </div>
    </aside>
  )
}