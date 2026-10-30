import type { ParcelDetail } from '../useParcelDetail'
import type { ExploitantDetail } from '../../exploitants/useExploitantDetail'

import { BASEMAPS } from '../../carte/basemaps'
import { renderMapImage } from '../../exploitants/pdf/mapImage'
// Télécharge la photo et la convertit en image lisible par le PDF.
// Retourne null au moindre problème : le PDF affiche alors une silhouette.

export interface PdfMapOptions {
  layers: Record<string, boolean>
  basemap: string
}
export async function loadPhoto(url: string): Promise<string | null> {
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    const blob = await res.blob()
    if (!blob.type.startsWith('image/')) return null

    if (/^image\/(jpe?g|png)$/.test(blob.type)) {
      return await new Promise((resolve) => {
        const r = new FileReader()
        r.onload = () => resolve(String(r.result))
        r.onerror = () => resolve(null)
        r.readAsDataURL(blob)
      })
    }
    const bmp = await createImageBitmap(blob)
    const canvas = document.createElement('canvas')
    canvas.width = bmp.width
    canvas.height = bmp.height
    canvas.getContext('2d')?.drawImage(bmp, 0, 0)
    return canvas.toDataURL('image/png')
  } catch {
    return null
  }
}

function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}

// ── Parcelle ──────────────────────────────────────────────────

export async function downloadParcelPdf(d: ParcelDetail) {
  const [{ pdf }, { default: ParcelPdf }] = await Promise.all([
    import('@react-pdf/renderer'),
    import('./ParcelPdf'),
  ])
  const photo = d.exploitant.photo_url ? await loadPhoto(d.exploitant.photo_url) : null
  const blob = await pdf(<ParcelPdf d={d} photo={photo} generatedAt={new Date()} />).toBlob()
  saveBlob(blob, `fiche_parcelle_${d.parcelle.code}.pdf`)
}

// ── Exploitant ────────────────────────────────────────────────

// async function buildExploitantPdf(d: ExploitantDetail): Promise<Blob> {
//   const [{ pdf }, { default: ExploitantPdf }] = await Promise.all([
//     import('@react-pdf/renderer'),
//     import('../../exploitants/pdf/ExploitantPdf'),
//   ])
//   const photo = d.exploitant.photo_url ? await loadPhoto(d.exploitant.photo_url) : null
//   return pdf(<ExploitantPdf d={d} photo={photo} generatedAt={new Date()} />).toBlob()
// }

async function buildExploitantPdf(
  d: ExploitantDetail,
  options: PdfMapOptions,
): Promise<Blob> {
  const [{ pdf }, { default: ExploitantPdf }] = await Promise.all([
    import('@react-pdf/renderer'),
    import('../../exploitants/pdf/ExploitantPdf'),
  ])

  const photo = d.exploitant.photo_url
    ? await loadPhoto(d.exploitant.photo_url)
    : null

  const basemap =
    BASEMAPS.find((b) => b.id === options.basemap) ?? BASEMAPS[0]

  const geometries = d.parcelles.map((pc) => pc.geometrie)

  const overviewMap = await renderMapImage(geometries, {
    basemap,
    width: 1600,
    height: 740,
    showParcels: options.layers.parcels,
  })

  const parcelMaps = Object.fromEntries(
    await Promise.all(
      d.parcelles
        .filter((pc) => pc.geometrie)
        .map(async (pc) => [
          String(pc.id),
          await renderMapImage([pc.geometrie], {
            basemap,
            width: 1200,
            height: 760,
            showParcels: options.layers.parcels,
          }),
        ]),
    ),
  ) as Record<string, string | null>

  return pdf(
    <ExploitantPdf
      d={d}
      photo={photo}
      generatedAt={new Date()}
      mapOptions={options}
      mapImages={{
        overview: overviewMap,
        parcels: parcelMaps,
      }}
    />,
  ).toBlob()
}

const exploitantFile = (d: ExploitantDetail) => `fiche_exploitant_${d.exploitant.code}.pdf`

export async function downloadExploitantPdf(
  d: ExploitantDetail,
  options: PdfMapOptions,
) {
  saveBlob(
    await buildExploitantPdf(d, options),
    exploitantFile(d),
  )
}

export async function openExploitantPdf(
  d: ExploitantDetail,
  options: PdfMapOptions,
) {
  const win = window.open('', '_blank')

  win?.document.write(
    '<p style="font-family:sans-serif;padding:24px;color:#555">Génération du PDF…</p>',
  )

  try {
    const blob = await buildExploitantPdf(d, options)

    if (win) {
      const url = URL.createObjectURL(blob)
      win.location.href = url
      setTimeout(() => URL.revokeObjectURL(url), 60_000)
    } else {
      saveBlob(blob, exploitantFile(d))
    }
  } catch (err) {
    win?.close()
    throw err
  }
}