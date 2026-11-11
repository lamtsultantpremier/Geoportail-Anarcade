import { useEffect, useState,useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Home, Loader2, Search, UserCheck, UserX ,ChevronDown, Download, FileSpreadsheet, FileText,UserX2} from 'lucide-react'
import { formatPhone, titleCase } from '../../lib/format'
import Pagination from '../exploitants/Pagination'
import GeoMultiSelect from '../denombrements/GeoMultiSelect'
import { BASE } from '../../lib/api'
import {
  PAGE_SIZES, useMenageGeo, useMenages, useMenageStats,useMenageSelectionStats,
  type MenageFilters, type MenageRow,
} from './useMenages'

const nf = new Intl.NumberFormat('fr-FR')
const GEO = ['region_id', 'departement_id', 'sous_prefecture_id', 'zone_id', 'localite_id'] as const
const KEYS = ['q', ...GEO] as const

const TONES = {
  orange: { bar: 'bg-orange-500', head: 'bg-orange-50', text: 'text-orange-700', cell: 'bg-orange-50/30' },
  green:  { bar: 'bg-emerald-500', head: 'bg-emerald-50', text: 'text-emerald-700', cell: 'bg-emerald-50/30' },
  blue:   { bar: 'bg-blue-500', head: 'bg-blue-50', text: 'text-blue-700', cell: 'bg-blue-50/30' },
  red:    { bar: 'bg-red-500', head: 'bg-red-50', text: 'text-red-700', cell: 'bg-red-50/30' },
} as const
type Tone = keyof typeof TONES

function YesNo({ value }: { value: string | null }) {
  if (!value) return null
  const yes = /^(oui|yes|true|1)$/i.test(value.trim())
  return (
    <span className={`rounded-md px-2 py-0.5 text-[12px] font-semibold ${
      yes ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-700'}`}>
      {yes ? 'Oui' : 'Non'}
    </span>
  )
}

interface Col { label: string; tone: Tone; mono?: boolean; cell: (r: MenageRow) => React.ReactNode }
const t = (get: (r: MenageRow) => string | null) => (r: MenageRow) => titleCase(get(r))

const COLS: Col[] = [
  { label: 'Code ménage', tone: 'orange', mono: true, cell: (r) => r.code_menage },
  { label: 'Nom chef', tone: 'orange', cell: t((r) => r.nom_chef) },
  { label: 'Prénom chef', tone: 'orange', cell: t((r) => r.prenom_chef) },
  { label: 'Contact chef', tone: 'orange', cell: (r) => formatPhone(r.contact_chef) },

  { label: 'Nb enfants', tone: 'green', cell: (r) => r.nb_enfants },
  { label: 'Nb femmes', tone: 'green', cell: (r) => r.nb_femmes },
  { label: 'Nb personne en charge', tone: 'green', cell: (r) => r.nb_personne_en_charge },
  { label: 'Nb personne ménage', tone: 'green', cell: (r) => r.nb_personne_menage },
  { label: 'Nb enfant scolarisé', tone: 'green', cell: (r) => r.nb_enfant_scolarise },

  { label: 'Type bâtiment', tone: 'blue', cell: t((r) => r.type_batiment) },
  { label: 'Matériaux murs', tone: 'blue', cell: t((r) => r.materiaux_murs) },
  { label: 'Matériaux toit', tone: 'blue', cell: t((r) => r.materiaux_toit) },
  { label: 'Type sanitaire', tone: 'blue', cell: t((r) => r.type_sanitaire) },
  { label: 'Source combustible', tone: 'blue', cell: t((r) => r.source_combustible) },
  { label: 'Source éclairage', tone: 'blue', cell: t((r) => r.source_eclairage) },
  { label: 'Source eau', tone: 'blue', cell: t((r) => r.source_eau) },

  { label: 'Nb exploitant', tone: 'red', cell: (r) => r.nb_exploitant },
  { label: 'A exploitant anacarde', tone: 'red', cell: (r) => <YesNo value={r.a_exploitant} /> },
  { label: 'Distance infr. santé', tone: 'red', cell: (r) => r.distance_sante },
  { label: 'Distance étab. scolaire', tone: 'red', cell: (r) => r.distance_ecole },

  { label: 'Quartier', tone: 'orange', cell: t((r) => r.quartier) },
  { label: 'Réseau accessible', tone: 'orange', cell: t((r) => r.reseau) },
  { label: 'Accès internet', tone: 'orange', cell: t((r) => r.internet) },
  { label: 'Infr. santé (quartier)', tone: 'orange', cell: t((r) => r.infr_sante) },
  { label: 'Structure bancaire', tone: 'orange', cell: t((r) => r.banque) },

  { label: 'Localité', tone: 'green', cell: t((r) => r.localite) },
  { label: 'Zone dénombrement', tone: 'green', mono: true, cell: (r) => r.zone },
  { label: 'Sous-préfecture', tone: 'green', cell: t((r) => r.sous_prefecture) },
  { label: 'Département', tone: 'green', cell: t((r) => r.departement) },
  { label: 'Région', tone: 'green', cell: t((r) => r.region) },
  { label: 'District', tone: 'green', cell: t((r) => r.district) },

  {
    label: 'Nb exploitants du ménage', tone: 'red',
    cell: (r) => (
      <span className={`rounded-md px-2 py-0.5 text-[12px] font-semibold ${
        r.nb_exploitants_reel > 0 ? 'bg-blue-100 text-blue-800' : 'bg-orange-100 text-orange-800'}`}>
        {r.nb_exploitants_reel}
      </span>
    ),
  },
]


function postDownload(url: string, fields: Record<string, string>) {
  const form = document.createElement('form')
  form.method = 'POST'
  form.action = url
  Object.entries(fields).forEach(([k, v]) => {
    const input = document.createElement('input')
    input.type = 'hidden'; input.name = k; input.value = v
    form.appendChild(input)
  })
  document.body.appendChild(form)
  form.submit()
  form.remove()
}

function ExportMenu({ filters, count, selected }: {
  filters: MenageFilters; count: number; selected: number[]
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
    if (selected.length > 0) fields.ids = selected.join(',')
    else KEYS.forEach((k) => { if (filters[k]) fields[k] = filters[k] })
    postDownload(`${BASE}/menages/export/`, fields)
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
              ? <><strong className="text-ink">{nf.format(selected.length)}</strong> ménage{selected.length > 1 ? 's' : ''} sélectionné{selected.length > 1 ? 's' : ''}</>
              : <><strong className="text-ink">{nf.format(count)}</strong> ménage{count > 1 ? 's' : ''} du filtre actif (aucune ligne cochée)</>}
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

function Kpi({ icon, label, value, caption, tone }: {
  icon: React.ReactNode; label: string; value?: number; caption: string; tone: Tone
}) {
  const c = TONES[tone]
  return (
    <div className="relative overflow-hidden rounded-2xl border border-line bg-white p-5">
      <span className={`absolute inset-y-0 left-0 w-1.5 ${c.bar}`} />
      <div className="flex items-start justify-between">
        <span className="text-[13px] font-medium text-ink/70">{label}</span>
        <span className={`grid size-9 place-items-center rounded-lg ${c.head} ${c.text}`}>{icon}</span>
      </div>
      <div className="mt-4 text-3xl font-semibold leading-none">{value === undefined ? '…' : nf.format(value)}</div>
      <div className="mt-2 text-[13px] text-muted">{caption}</div>
    </div>
  )
}

export default function MenagesPage() {
  const [params, setParams] = useSearchParams()
  const page = Math.max(1, Number(params.get('page')) || 1)
  const pageSize = PAGE_SIZES.includes(Number(params.get('page_size'))) ? Number(params.get('page_size')) : 25

  const filters: MenageFilters = {
    q: params.get('q') ?? '',
    region_id: params.get('region_id') ?? '',
    departement_id: params.get('departement_id') ?? '',
    sous_prefecture_id: params.get('sous_prefecture_id') ?? '',
    zone_id: params.get('zone_id') ?? '',
    localite_id: params.get('localite_id') ?? '',
  }
  const list_ = (k: typeof GEO[number]) => (filters[k] ? filters[k].split(',') : [])

  const [text, setText] = useState(filters.q)
  useEffect(() => { setText(filters.q) }, [filters.q])

  const list = useMenages(filters, page, pageSize)
  const stats = useMenageStats(filters)

  const [selected, setSelected] = useState<Set<number>>(new Set())
const selIds = [...selected]
const selStats = useMenageSelectionStats(selIds)
const hasSel = selected.size > 0
const shown = hasSel ? selStats.data : stats.data      // indicateurs affichés

const rows = list.data?.results ?? []
const toggleRow = (id: number) =>
  setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })
const pageAllChecked = rows.length > 0 && rows.every((r) => selected.has(r.id))
const togglePage = () =>
  setSelected((s) => {
    const n = new Set(s)
    rows.forEach((r) => (pageAllChecked ? n.delete(r.id) : n.add(r.id)))
    return n
  })

  const geoParams = (upTo: number) =>
    Object.fromEntries(GEO.slice(0, upTo).filter((k) => filters[k]).map((k) => [k, filters[k]]))
  const regions = useMenageGeo('regions', {})
  const departements = useMenageGeo('departements', geoParams(1))
  const sousPrefs = useMenageGeo('sous-prefectures', geoParams(2))
  const zones = useMenageGeo('zones', geoParams(3))
  const localites = useMenageGeo('localites', geoParams(4))

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
                    <h1 className="text-3xl font-semibold">Ménages</h1>
                    <p className="mt-1 text-sm text-muted">Consultez et explorez les ménages recensés, avec leur logement, leur composition et leur localisation.</p>
                </div>
                <ExportMenu filters={filters} count={count} selected={selIds} />
        </div>
      <div className="mb-6 grid grid-cols-1 gap-2 md:grid-cols-4">
       <Kpi tone="blue" icon={<Home size={16} />} label="Total ménages" value={shown?.total}
            caption={hasSel ? 'Ménages sélectionnés' : 'Ménages correspondant aux filtres actifs'} />
        <Kpi tone="green" icon={<Home size={16} />} label="Ménages avec Au moins un exploitant" value={shown?.avec}
            caption={hasSel ? 'Dans la sélection' : 'Au moins un exploitant enregistré'} />
        <Kpi tone="orange" icon={<Home size={16} />} label="Ménages Avec plusieurs exploitants" value={shown?.avec_plusieurs}
            caption={hasSel ? 'Dans la sélection' : 'Avec plusieurs exploitants enregistrés'} />
        <Kpi tone="red" icon={<UserX2 size={16} />} label="Total exploitants" value={shown?.exploitants}
            caption={hasSel ? 'Dans la sélection' : 'Total d\'exploitant dans tous les ménages confondus'} />
      </div>

      <section className="rounded-2xl border border-line bg-white">
        <div className="flex flex-wrap items-center gap-3 p-4">
          <form onSubmit={submit} role="search" className="flex min-w-[260px] flex-1 items-center gap-3 rounded-xl border border-line bg-white px-4">
            <Search size={16} className="shrink-0 text-muted" />
            <input value={text} onChange={(e) => setText(e.target.value)}
              placeholder="Code ménage, nom ou prénom d'un exploitant… (Entrée)"
              className="w-full bg-transparent py-3 text-sm outline-none placeholder:text-muted"
              aria-label="Rechercher un ménage" />
            {list.isFetching && <Loader2 size={16} className="shrink-0 animate-spin text-brand-600" />}
          </form>

          <GeoMultiSelect label="Région" allLabel="Toutes" selected={list_('region_id')}
            options={regions.data} loading={regions.isLoading} onChange={(ids) => changeGeo('region_id', ids)} />
          <GeoMultiSelect label="Département" allLabel="Tous" selected={list_('departement_id')}
            options={departements.data} loading={departements.isLoading} onChange={(ids) => changeGeo('departement_id', ids)} />
          <GeoMultiSelect label="Sous-préf." allLabel="Toutes" selected={list_('sous_prefecture_id')}
            options={sousPrefs.data} loading={sousPrefs.isLoading} onChange={(ids) => changeGeo('sous_prefecture_id', ids)} />
          <GeoMultiSelect label="Zone dénomb." allLabel="Toutes" selected={list_('zone_id')}
            options={zones.data} loading={zones.isLoading} onChange={(ids) => changeGeo('zone_id', ids)} />
          <GeoMultiSelect label="Localité" allLabel="Toutes" selected={list_('localite_id')}
            options={localites.data} loading={localites.isLoading} onChange={(ids) => changeGeo('localite_id', ids)} />

          {active && <button onClick={reset} className="px-2 text-sm font-semibold text-brand-700">Réinitialiser</button>}
        </div>

        {hasSel && (
            <div className="flex items-center justify-between gap-3 bg-brand-50 px-4 py-2.5 text-[13px]">
                <span><strong>{nf.format(selected.size)}</strong> ménage{selected.size > 1 ? 's' : ''} sélectionné{selected.size > 1 ? 's' : ''} · indicateurs et export portent sur cette sélection</span>
                <button onClick={() => setSelected(new Set())} className="font-semibold text-brand-700 underline">
                    Tout désélectionner
                </button>
            </div>
            )}
        <div className={`overflow-x-auto border-y border-line ${list.isFetching ? 'opacity-60' : ''}`}>
          <table className="w-max min-w-full text-left text-sm">
            <thead>
              <tr>
                  <th className="sticky left-0 z-10 w-11 min-w-[44px] bg-canvas px-3 py-4">
                       <input type="checkbox" checked={pageAllChecked} onChange={togglePage}
                        aria-label="Sélectionner les ménages de cette page" className="size-4 accent-[#1f6b45]" />
                  </th>
                {COLS.map((c, i) => {
                  const k = TONES[c.tone]
                  return (
                    <th key={c.label}
                      className={`relative whitespace-nowrap px-4 pb-4 pt-5 text-[12px] font-bold uppercase tracking-wide ${k.head} ${k.text} ${
                        i === 0 ? 'sticky left-0 z-10' : ''}`}>
                      <span className={`absolute inset-x-0 top-0 h-1.5 ${k.bar}`} />
                      {c.label}
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {list.isLoading && Array.from({ length: 6 }).map((_, i) => (
                <tr key={i}><td colSpan={COLS.length + 1} className="px-4 py-4"><div className="h-5 animate-pulse rounded bg-line" /></td></tr>
              ))}
              {list.isError && (
                <tr><td colSpan={COLS.length} className="px-4 py-10 text-center text-red-700">
                  Impossible de charger les ménages. Le serveur Django est-il lancé ?
                </td></tr>
              )}
              {!list.isLoading && !list.isError && list.data?.results.length === 0 && (
                <tr><td colSpan={COLS.length} className="px-4 py-10 text-center text-muted">
                  Aucun ménage ne correspond à cette recherche ou à ces filtres.
                </td></tr>
              )}
              {list.data?.results.map((r) => (
                <tr key={r.id} className="hover:bg-canvas/50">
                    <td className="sticky left-[44px] z-[1] w-11 min-w-[44px] bg-white px-3 py-3.5">
                        <input type="checkbox" checked={selected.has(r.id)} onChange={() => toggleRow(r.id)}
                        aria-label={`Sélectionner le ménage ${r.code_menage}`} className="size-4 accent-[#1f6b45]" />
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
            <span>{count > 0 ? `Affichage de ${nf.format(from)} à ${nf.format(to)} sur ${nf.format(count)} ménages` : '\u00A0'}</span>
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