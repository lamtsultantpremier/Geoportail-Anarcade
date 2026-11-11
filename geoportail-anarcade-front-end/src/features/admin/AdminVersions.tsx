import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Loader2, Package, Plus, X } from 'lucide-react'
import { apiGet, apiSend } from '../../lib/api'
import { CARD, Err, INPUT, Label } from './AdminUi'

interface V { id: number; numero: string; type: string; environnement: string; date: string; notes: string }

const TYPES: Record<string, { label: string; cls: string }> = {
  majeure: { label: 'MAJEURE', cls: 'border-red-200 bg-red-50 text-red-700' },
  mineure: { label: 'MINEURE', cls: 'border-orange-200 bg-orange-50 text-orange-700' },
  patch: { label: 'PATCH', cls: 'border-emerald-200 bg-emerald-50 text-emerald-700' },
}
const ENVS: Record<string, { label: string; cls: string }> = {
  production: { label: 'Production', cls: 'border-emerald-200 bg-emerald-50 text-emerald-700' },
  preproduction: { label: 'Préproduction', cls: 'border-orange-200 bg-orange-50 text-orange-700' },
  developpement: { label: 'Développement', cls: 'border-slate-800 bg-slate-900 text-white' },
  archivee: { label: 'Archivée', cls: 'border-slate-200 bg-slate-100 text-slate-600' },
}
const today = () => new Date().toISOString().slice(0, 10)
const EMPTY = { numero: '', type: 'majeure', date: today(), environnement: 'production', notes: '' }
const fmtDate = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString('fr-FR')

export default function AdminVersions() {
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [form, setForm] = useState(EMPTY)
  const [err, setErr] = useState<string | null>(null)

  const q = useQuery({ queryKey: ['admin-versions'], queryFn: ({ signal }) => apiGet<V[]>('/admin-api/versions/', {}, signal) })
  const versions = q.data ?? []
  const prod = versions.find((v) => v.environnement === 'production')

  const close = () => { setOpen(false); setEditId(null); setErr(null) }
  const openNew = () => { setEditId(null); setForm({ ...EMPTY, date: today() }); setErr(null); setOpen(true) }
  const openEdit = (v: V) => {
    setEditId(v.id); setErr(null); setOpen(true)
    setForm({ numero: v.numero, type: v.type, date: v.date, environnement: v.environnement, notes: v.notes })
  }
  useEffect(() => {
    if (!open) return
    const k = (e: KeyboardEvent) => e.key === 'Escape' && close()
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [open])

  const done = () => qc.invalidateQueries({ queryKey: ['admin-versions'] })
  const save = useMutation({
    mutationFn: () => editId ? apiSend('PATCH', `/admin-api/versions/${editId}/`, form) : apiSend('POST', '/admin-api/versions/', form),
    onSuccess: () => { done(); close() },
    onError: (e) => setErr(e instanceof Error ? e.message : 'Échec.'),
  })
  const del = useMutation({
    mutationFn: (id: number) => apiSend('DELETE', `/admin-api/versions/${id}/`),
    onSuccess: done, onError: (e) => window.alert(e instanceof Error ? e.message : 'Échec.'),
  })
  const set = (k: keyof typeof EMPTY, v: string) => setForm((f) => ({ ...f, [k]: v }))

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-3 text-3xl font-bold"><Package className="text-orange-500" /> Versions de l'application</h1>
          <p className="mt-1 text-sm text-muted">
            Suivi des versions et évolutions de l'application Anacarde
            {prod && <> · en production : <strong className="font-mono text-ink">{prod.numero}</strong></>}
          </p>
        </div>
        <button onClick={openNew} className="flex items-center gap-2 rounded-xl bg-black px-5 py-3 text-sm font-semibold text-white shadow-lg hover:bg-slate-800">
          <Plus size={16} /> Ajouter une version
        </button>
      </div>

      {open && (
        <section className={`${CARD} overflow-hidden`}>
          <header className="flex items-center justify-between bg-black px-6 py-4 text-white">
            <h2 className="font-bold">{editId ? 'Modifier la version' : 'Nouvelle version'}</h2>
            <button onClick={close} aria-label="Fermer" className="grid size-9 place-items-center rounded-lg bg-white/10 hover:bg-white/20"><X size={18} /></button>
          </header>
          <form onSubmit={(e) => { e.preventDefault(); save.mutate() }}>
            <div className="grid gap-5 p-6 md:grid-cols-2">
              <div className="md:col-span-2"><Err msg={err} /></div>
              <Label text="Numéro de version *">
                <input className={INPUT} value={form.numero} onChange={(e) => set('numero', e.target.value)} placeholder="Ex. v2.4.2" required />
              </Label>
              <Label text="Type *">
                <select className={INPUT} value={form.type} onChange={(e) => set('type', e.target.value)}>
                  <option value="majeure">Majeure</option><option value="mineure">Mineure</option><option value="patch">Patch</option>
                </select>
              </Label>
              <Label text="Date de sortie *">
                <input className={INPUT} type="date" value={form.date} onChange={(e) => set('date', e.target.value)} required />
              </Label>
              <Label text="Environnement *">
                <select className={INPUT} value={form.environnement} onChange={(e) => set('environnement', e.target.value)}>
                  {Object.entries(ENVS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </Label>
              <div className="md:col-span-2">
                <Label text="Notes / changelog">
                  <textarea className={`${INPUT} min-h-[110px] resize-y`} value={form.notes}
                    onChange={(e) => set('notes', e.target.value)} placeholder="Décrivez les changements de cette version…" />
                </Label>
              </div>
              {form.environnement === 'production' && prod && prod.id !== editId && (
                <p className="rounded-xl bg-orange-50 p-3 text-[13px] text-orange-800 md:col-span-2">
                  {prod.numero} est actuellement en production : elle passera en « Archivée ».
                </p>
              )}
            </div>
            <footer className="flex justify-end gap-3 border-t border-line bg-slate-50 px-6 py-4">
              <button type="button" onClick={close} className="rounded-xl border border-line bg-white px-5 py-2.5 text-sm font-semibold hover:bg-slate-50">Annuler</button>
              <button disabled={save.isPending} className="flex items-center gap-2 rounded-xl bg-black px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50">
                {save.isPending && <Loader2 size={16} className="animate-spin" />} Enregistrer
              </button>
            </footer>
          </form>
        </section>
      )}

      <section className={CARD}>
        <div className="flex items-center justify-between border-b border-line px-6 py-5">
          <h2 className="text-lg font-bold">Liste des versions</h2>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-[12px] font-semibold text-slate-600">
            {versions.length} version{versions.length > 1 ? 's' : ''}
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead className="bg-slate-50 text-[12px] uppercase tracking-wide text-muted">
              <tr><th className="px-6 py-3.5">Version</th><th className="px-3">Type</th><th className="px-3">Environnement</th>
                <th className="px-3">Date</th><th className="px-3">Notes</th><th className="px-6 text-right">Actions</th></tr>
            </thead>
            <tbody className="divide-y divide-line">
              {versions.map((v) => {
                const t = TYPES[v.type], e = ENVS[v.environnement]
                return (
                  <tr key={v.id}>
                    <td className="px-6 py-3.5">
                      <span className={`rounded-lg px-3 py-1.5 font-mono text-[13px] font-bold text-white ${v.environnement === 'production' ? 'bg-gradient-to-r from-red-600 to-orange-500' : 'bg-slate-900'}`}>{v.numero}</span>
                    </td>
                    <td className="px-3"><span className={`rounded-md border px-2.5 py-1 text-[11px] font-bold ${t?.cls}`}>{t?.label ?? v.type}</span></td>
                    <td className="px-3"><span className={`rounded-full border px-3 py-1 text-[12px] font-semibold ${e?.cls}`}>{e?.label ?? v.environnement}</span></td>
                    <td className="whitespace-nowrap px-3 text-muted">{fmtDate(v.date)}</td>
                    <td className="max-w-md truncate px-3 text-muted" title={v.notes}>{v.notes || '—'}</td>
                    <td className="px-6">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => openEdit(v)} className="rounded-lg border border-line px-3 py-1.5 text-[13px] font-medium hover:bg-slate-50">Éditer</button>
                        <button onClick={() => window.confirm(`Supprimer la version ${v.numero} ?`) && del.mutate(v.id)}
                          className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-[13px] font-medium text-red-700 hover:bg-red-100">Suppr.</button>
                      </div>
                    </td>
                  </tr>
                )
              })}
              {q.isLoading && <tr><td colSpan={6} className="p-10 text-center"><Loader2 className="mx-auto animate-spin text-red-600" /></td></tr>}
              {q.isError && <tr><td colSpan={6} className="p-10 text-center text-red-700">Impossible de charger les versions.</td></tr>}
              {q.data && versions.length === 0 && <tr><td colSpan={6} className="p-10 text-center text-muted">Aucune version enregistrée. Ajoute la première.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}