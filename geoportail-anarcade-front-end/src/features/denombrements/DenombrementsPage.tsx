import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Check, ChevronDown, ClipboardList, Download, FileSpreadsheet, FileText, Home, Loader2, Search, Users } from 'lucide-react'
import { BASE } from '../../lib/api'
import { formatPhone, titleCase } from '../../lib/format'
import Pagination from '../exploitants/Pagination'
import {
  PAGE_SIZES, useDenombOptions, useDenombrements, useDenombStats,
  type DenombFilters, type DenombRow,
} from './useDenombrements'

import GeoMultiSelect from './GeoMultiSelect'
import { useDenombGeo } from './useDenombrements'

const nf = new Intl.NumberFormat('fr-FR')

const GEO = ['region_id', 'departement_id', 'sous_prefecture_id', 'localite_id'] as const
const KEYS = ['q', 'statut', 'milieu_id', ...GEO] as const

// ── Statut ────────────────────────────────────────────────────
function StatusBadge({ value }: { value: string | null }) {
  if (!value) return null
  const v = value.toLowerCase()
  const [dot, cls] =
    v.startsWith('valid') ? ['bg-emerald-600', 'bg-emerald-100 text-emerald-800']
      : v.includes('v\u00e9rifier') || v.includes('verifier') ? ['bg-amber-500', 'bg-amber-100 text-amber-800']
        : ['bg-gray-500', 'bg-gray-100 text-gray-700']
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-semibold ${cls}`}>
      <span className={`size-1.5 rounded-full ${dot}`} /> {value}
    </span>
  )
}

// ── Colonnes ──────────────────────────────────────────────────
interface Col { label: string; cell: (r: DenombRow) => React.ReactNode; mono?: boolean ,tone: Tone}

// Couleurs par groupe : bande, fond d'en-tête, texte d'en-tête, fond léger des cellules
const TONES = {
  red:    { bar: 'bg-red-500',    head: 'bg-red-50',    text: 'text-red-700',    cell: 'bg-red-50/30' },
  orange: { bar: 'bg-orange-500', head: 'bg-orange-50', text: 'text-orange-700', cell: 'bg-orange-50/30' },
  blue:   { bar: 'bg-blue-500',   head: 'bg-blue-50',   text: 'text-blue-700',   cell: 'bg-blue-50/30' },
  violet: { bar: 'bg-violet-500', head: 'bg-violet-50', text: 'text-violet-700', cell: 'bg-violet-50/30' },
  pink:   { bar: 'bg-pink-500',   head: 'bg-pink-50',   text: 'text-pink-700',   cell: 'bg-pink-50/30' },
  teal:   { bar: 'bg-teal-500',   head: 'bg-teal-50',   text: 'text-teal-700',   cell: 'bg-teal-50/30' },
} as const

type Tone = keyof typeof TONES

const COLS: Col[] = [
  { label: 'ID', mono: true,tone:'orange' ,cell: (r) => r.id },
  { label: 'UUID', mono: true,tone:'orange' ,cell: (r) => r.uuid },
  { label: 'N° questionnaire', mono: true,tone:'orange', cell: (r) => r.num_questionnaire },
  { label: 'Date enquête', tone:'orange',cell: (r) => r.date_enquete },
  {
    label: 'Enquêteur',
    tone:'orange',
    cell: (r) => (r.enqueteur_nom || r.enqueteur_contact) ? (
      <>
        <div className="font-medium">{titleCase(r.enqueteur_nom) || '—'}</div>
        <div className="text-[12px] text-muted">{formatPhone(r.enqueteur_contact) || '—'}</div>
      </>
    ) : null,
  },
  { label: 'Coordonnées GPS', tone:'orange',mono: true, cell: (r) => r.gps },
  { label: 'District', tone:'orange',cell: (r) => titleCase(r.district) },
  { label: 'Région', tone:'orange',cell: (r) => titleCase(r.region) },
  { label: 'Département',tone:'orange', cell: (r) => titleCase(r.departement) },
  { label: 'Sous-préfecture', tone:'orange',cell: (r) => titleCase(r.sous_prefecture) },
  { label: 'Secteur administratif',tone:'orange', cell: (r) => titleCase(r.secteur) },
  { label: 'Zone dénombrement',tone:'orange' ,mono: true, cell: (r) => r.zone },
  { label: 'Localité',tone:'orange' ,cell: (r) => titleCase(r.localite) },
  { label: 'Quartier / Campement',tone:'orange', cell: (r) => titleCase(r.quartier) },
  { label: 'Milieu résidence',tone:'orange', cell: (r) => titleCase(r.milieu) },
  { label: 'Code ménage',tone:'orange' ,mono: true, cell: (r) => r.code_menage },
  { label: 'Nb exploitants',tone:'orange' ,cell: (r) => r.nb_exploitants },
  { label: 'A exploitant', tone:'orange',cell: (r) => r.a_exploitant },
  { label: 'Nom chef ménage',tone:'orange', cell: (r) => titleCase(r.nom_chef) },
  { label: 'Prénom chef ménage',tone:'orange' ,cell: (r) => titleCase(r.prenom_chef) },
  { label: 'Contact chef ménage',tone:'orange' ,cell: (r) => formatPhone(r.contact_chef) },
  { label: 'Exploitant présent ?', tone:'orange',cell: (r) => r.exploitant_present },
  { label: 'Représentant ?',tone:'orange' ,cell: (r) => r.est_representant },
  { label: 'Nom représentant',tone:'orange', cell: (r) => titleCase(r.nom_representant) },
  { label: 'Prénom représentant',tone:'orange', cell: (r) => titleCase(r.prenom_representant) },
  { label: 'Contact représentant',tone:'orange', cell: (r) => formatPhone(r.contact_representant) },
  { label: 'Statut', tone:'orange',cell: (r) => <StatusBadge value={r.statut} /> },
  {
    label: 'Source',
    tone:'orange',
    cell: (r) => r.source && (
      <span className="rounded-md bg-canvas px-2 py-1 text-[12px] text-muted">{r.source}</span>
    ),
  },
  { label: 'Créé le',tone:'orange' ,cell: (r) => r.cree_le },
]

// ── Indicateur ────────────────────────────────────────────────
function Kpi({ icon, label, value, caption }: {
  icon: React.ReactNode; label: string; value?: number; caption: string
}) {
  return (
    <div className="rounded-2xl border border-line bg-white p-5">
      <div className="flex items-start justify-between">
        <span className="text-[13px] font-medium text-ink/70">{label}</span>
        <span className="grid size-9 place-items-center rounded-lg bg-brand-50 text-brand-700">{icon}</span>
      </div>
      <div className="mt-4 text-3xl font-semibold leading-none">{value === undefined ? '…' : nf.format(value)}</div>
      <div className="mt-2 text-[13px] text-muted">{caption}</div>
    </div>
  )
}

// ── Export ───────────────────────────────────────

function postDownload(url: string, fields: Record<string, string>) {
  const form = document.createElement('form')
  form.method = 'POST'
  form.action = url
  Object.entries(fields).forEach(([k, v]) => {
    const input = document.createElement('input')
    input.type = 'hidden'
    input.name = k
    input.value = v
    form.appendChild(input)
  })
  document.body.appendChild(form)
  form.submit()
  form.remove()
}

function ExportMenu({ filters, count, selected }: {
  filters: DenombFilters; count: number; selected: number[]
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const onDown = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [])

  const n = selected.length > 0 ? selected.length : count

  const run = (fmt: 'xlsx' | 'csv') => {
    const fields: Record<string, string> = { fmt }
    if (selected.length > 0) fields.ids = selected.join(',')     // sélection : seules ces fiches
    else KEYS.forEach((k) => { if (filters[k]) fields[k] = filters[k] })  // sinon : le filtre actif
    postDownload(`${BASE}/denombrements/export/`, fields)
    setOpen(false)
  }
  const item = 'flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-canvas'

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen((o) => !o)} disabled={n === 0}
        className="flex items-center gap-2 rounded-lg bg-brand-600 px-5 py-3 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50">
        <Download size={16} /> Exporter
        <span className="rounded-full bg-white/20 px-2 text-[12px]">{nf.format(n)}</span>
        <ChevronDown size={14} />
      </button>
      {open && (
        <div className="absolute right-0 top-full z-20 mt-2 w-80 overflow-hidden rounded-xl border border-line bg-white shadow-lg">
          <div className="border-b border-line px-4 py-2.5 text-[12px] text-muted">
            {selected.length > 0
              ? <><strong className="text-ink">{nf.format(selected.length)}</strong> fiche{selected.length > 1 ? 's' : ''} sélectionnée{selected.length > 1 ? 's' : ''}</>
              : <><strong className="text-ink">{nf.format(count)}</strong> fiche{count > 1 ? 's' : ''} du filtre actif (aucune ligne cochée)</>}
          </div>
          <button onClick={() => run('xlsx')} className={item}>
            <FileSpreadsheet size={18} className="mt-0.5 shrink-0 text-emerald-600" />
            <span><span className="block text-[13px] font-medium">Excel (.xlsx)</span>
              <span className="block text-[11px] text-muted">Téléphones conservés avec leur 0.</span></span>
          </button>
          <button onClick={() => run('csv')} className={`${item} border-t border-line`}>
            <FileText size={18} className="mt-0.5 shrink-0 text-blue-600" />
            <span><span className="block text-[13px] font-medium">CSV (.csv)</span>
              <span className="block text-[11px] text-muted">Lisible par tout logiciel.</span></span>
          </button>
        </div>
      )}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────
const selectCls = 'rounded-xl border border-line bg-white px-4 py-3 text-sm outline-none focus:border-brand-600'

export default function DenombrementsPage() {
  const [params, setParams] = useSearchParams()
  const page = Math.max(1, Number(params.get('page')) || 1)
  const pageSize = PAGE_SIZES.includes(Number(params.get('page_size'))) ? Number(params.get('page_size')) : 25

  const filters: DenombFilters = {
        q: params.get('q') ?? '',
        statut: params.get('statut') ?? '',
        milieu_id: params.get('milieu_id') ?? '',
        region_id: params.get('region_id') ?? '',
        departement_id: params.get('departement_id') ?? '',
        sous_prefecture_id: params.get('sous_prefecture_id') ?? '',
        localite_id: params.get('localite_id') ?? ''}

const list_ = (k: typeof GEO[number]) => (filters[k] ? filters[k].split(',') : [])

  const [text, setText] = useState(filters.q)
  useEffect(() => { setText(filters.q) }, [filters.q])

  const list = useDenombrements(filters, page, pageSize)
  const stats = useDenombStats(filters)
  const options = useDenombOptions()

  const [selected, setSelected] = useState<Set<number>>(new Set())
  const toggleRow = (id: number) =>
        setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })
  const rows = list.data?.results ?? []
  const pageAllChecked = rows.length > 0 && rows.every((r) => selected.has(r.id))
  const togglePage = () =>
  setSelected((s) => {
    const n = new Set(s)
    rows.forEach((r) => (pageAllChecked ? n.delete(r.id) : n.add(r.id)))
    return n
  })

  const geoParams = (upTo: number) =>
  Object.fromEntries(GEO.slice(0, upTo).filter((k) => filters[k]).map((k) => [k, filters[k]]))

const regions = useDenombGeo('regions', {})
const departements = useDenombGeo('departements', geoParams(1))
const sousPrefs = useDenombGeo('sous-prefectures', geoParams(2))
const localites = useDenombGeo('localites', geoParams(3))

  

  const update = (patch: Record<string, string>) => {
    const next = new URLSearchParams(params)
    next.delete('page')
    Object.entries(patch).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)))
    setParams(next)
  }

const changeGeo = (key: typeof GEO[number], ids: string[]) => {
  const patch: Record<string, string> = { [key]: ids.join(',') }
  GEO.slice(GEO.indexOf(key) + 1).forEach((k) => { patch[k] = '' })
  update(patch)
}



  const goTo = (p: number) => {
    const next = new URLSearchParams(params)
    if (p > 1) next.set('page', String(p)); else next.delete('page')
    setParams(next)
  }
  const submit = (e: React.FormEvent) => { e.preventDefault(); update({ q: text.trim() }) }
  const reset = () => { setText(''); setParams(new URLSearchParams()) }

  const count = list.data?.count ?? 0
  const pageCount = Math.max(1, Math.ceil(count / pageSize))
  const from = count === 0 ? 0 : (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, count)
  const active = KEYS.some((k) => filters[k])

  return (
    <div className="w-full">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold">Dénombrements</h1>
          <p className="mt-1 text-sm text-muted">Consultez, recherchez et explorez les fiches de dénombrement des ménages.</p>
        </div>
       <ExportMenu filters={filters} count={count} selected={[...selected]} />
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi icon={<ClipboardList size={16} />} label="Opérations de Dénombrements" value={stats.data?.fiches} caption="Selon les filtres actifs" />
        <Kpi icon={<Home size={16} />} label="Ménages avec exploitant" value={stats.data?.avec_exploitant} caption="Déclarés par le ménage" />
        <Kpi icon={<Home size={16} />} label="Ménages sans exploitant" value={stats.data?.sans_exploitant} caption="Déclarés dans le ménage" />
        {/* <Kpi icon={<Check size={16} />} label="Enquêtes validées" value={stats.data?.validees} caption="Statut de la fiche" /> */}
        <Kpi icon={<Users size={16} />} label="Exploitants recensés" value={stats.data?.exploitants} caption="Somme des effectifs déclarés par le ménage" />
        
      </div>

      <section className="rounded-2xl border border-line bg-white">
        <div className="flex flex-wrap items-center gap-3 p-4">
          <form onSubmit={submit} role="search" className="flex min-w-[260px] flex-1 items-center gap-3 rounded-xl border border-line bg-white px-4">
            <Search size={16} className="shrink-0 text-muted" />
            <input value={text} onChange={(e) => setText(e.target.value)}
              placeholder="Rechercher un nom, questionnaire, localité, UUID… (Entrée)"
              className="w-full bg-transparent py-3 text-sm outline-none placeholder:text-muted"
              aria-label="Rechercher un dénombrement" />
            {list.isFetching && <Loader2 size={16} className="shrink-0 animate-spin text-brand-600" />}
          </form>

            <GeoMultiSelect label="Région" allLabel="Toutes" selected={list_('region_id')}
                    options={regions.data} loading={regions.isLoading}
                    onChange={(ids) => changeGeo('region_id', ids)} />
            <GeoMultiSelect label="Département" allLabel="Tous" selected={list_('departement_id')}
                    options={departements.data} loading={departements.isLoading}
                    onChange={(ids) => changeGeo('departement_id', ids)} />
            <GeoMultiSelect label="Sous-préf." allLabel="Toutes" selected={list_('sous_prefecture_id')}
                    options={sousPrefs.data} loading={sousPrefs.isLoading}
                    onChange={(ids) => changeGeo('sous_prefecture_id', ids)} />
            <GeoMultiSelect label="Localité" allLabel="Toutes" selected={list_('localite_id')}
                    options={localites.data} loading={localites.isLoading}
                    onChange={(ids) => changeGeo('localite_id', ids)} />

          <select className={selectCls} value={filters.statut} onChange={(e) => update({ statut: e.target.value })}>
            <option value="">Tous les statuts</option>
            {options.data?.statuts.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select className={selectCls} value={filters.milieu_id} onChange={(e) => update({ milieu_id: e.target.value })}>
            <option value="">Tous les milieux</option>
            {options.data?.milieux.map((m) => <option key={m.id_milieu} value={m.id_milieu}>{titleCase(m.lib_mil)}</option>)}
          </select>
          {active && <button onClick={reset} className="px-2 text-sm font-semibold text-brand-700">Réinitialiser</button>}
        </div>
       
        <div className={`overflow-x-auto border-y border-line ${list.isFetching ? 'opacity-60' : ''}`}>
           {selected.size > 0 && (
            <div className="flex items-center justify-between gap-3 bg-brand-50 px-4 py-2.5 text-[13px]">
                    <span><strong>{nf.format(selected.size)}</strong> fiche{selected.size > 1 ? 's' : ''} sélectionnée{selected.size > 1 ? 's' : ''} · l'export ne contiendra que celles-ci</span>
                    <button onClick={() => setSelected(new Set())} className="font-semibold text-brand-700 underline">
                    Tout désélectionner
                </button>
            </div>
            )}
          <table className="w-max min-w-full text-left text-sm">
            <thead>
            <tr>
                <th className="sticky left-[44px] z-10 w-11 min-w-[44px] bg-canvas px-3 py-4">
                        <input type="checkbox" checked={pageAllChecked} onChange={togglePage}
                        aria-label="Sélectionner les fiches de cette page" className="size-4 accent-[#1f6b45]" />
                </th>
                {COLS.map((c, i) => {
                const t = TONES[c.tone]
                return (
                <th key={c.label}
                     className={`relative whitespace-nowrap px-4 pb-4 pt-5 text-[12px] font-bold uppercase tracking-wide ${t.head} ${t.text} ${
                            i === 0 ? 'sticky left-0 z-10' : ''}`}>
                    <span className={`absolute inset-x-0 top-0 h-1.5 ${t.bar}`} />
                    {c.label}
                </th>
                 )
                })}
            </tr>
        </thead>
            <tbody className="divide-y divide-line">
              {list.isLoading && Array.from({ length: 6 }).map((_, i) => (
                <tr key={i}><td colSpan={COLS.length +1} className="px-4 py-4"><div className="h-5 animate-pulse rounded bg-line" /></td></tr>
              ))}
              {list.isError && (
                <tr><td colSpan={COLS.length +1} className="px-4 py-10 text-center text-red-700">
                  Impossible de charger les dénombrements. Le serveur Django est-il lancé ?
                </td></tr>
              )}
              {!list.isLoading && !list.isError && list.data?.results.length === 0 && (
                <tr><td colSpan={COLS.length+1} className="px-4 py-10 text-center text-muted">
                  Aucune fiche ne correspond à cette recherche ou à ces filtres.
                </td></tr>
              )}
              {list.data?.results.map((r) => (
                <tr key={r.id} className="group hover:bg-canvas/50">
                   <td className="sticky left-0 z-[1] w-11 min-w-[44px] bg-white px-3 py-3.5">
                        <input type="checkbox" checked={selected.has(r.id)} onChange={() => toggleRow(r.id)}
                        aria-label={`Sélectionner la fiche ${r.id}`} className="size-4 accent-[#1f6b45]" />
                    </td>
                  {COLS.map((c, i) => {
                    const v = c.cell(r)
                    const empty = v === null || v === undefined || v === '' || v === false
                    return (
                      <td key={c.label}
                         className={`whitespace-nowrap px-4 py-3.5 align-middle ${TONES[c.tone].cell} ${
    c.mono ? 'font-mono text-[12px]' : ''} ${
    i === 0 ? 'sticky left-0 z-[1] bg-white font-semibold' : ''}`}>
                        {empty ? <span className="text-muted">—</span> : v}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 p-4">
          <div className="flex items-center gap-4 text-sm text-muted">
            <span>{count > 0 ? `Affichage de ${nf.format(from)} à ${nf.format(to)} sur ${nf.format(count)} fiches` : '\u00A0'}</span>
            <label className="flex items-center gap-2">
              Par page
              <select value={pageSize} onChange={(e) => update({ page_size: e.target.value })}
                className="rounded-lg border border-line bg-white px-2 py-1 text-sm text-ink">
                {PAGE_SIZES.map((n) => <option key={n}>{n}</option>)}
              </select>
            </label>
          </div>
          {count > pageSize && <Pagination page={page} pageCount={pageCount} onChange={goTo} disabled={list.isFetching} />}
        </div>
      </section>
    </div>
  )
}