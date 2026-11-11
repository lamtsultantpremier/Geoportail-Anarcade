import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, Pencil, Plus, Trash2, X } from 'lucide-react'
import { apiGet, apiSend } from '../../lib/api'
import { BTN_RED, CARD, Err, INPUT } from './AdminUi'

interface Ref { code: string; label: string; total: number }
interface Item { id: number; libelle: string }
const TABS = ['border-red-600 text-red-700', 'border-orange-500 text-orange-700', 'border-emerald-600 text-emerald-700', 'border-blue-600 text-blue-700']

export default function AdminReferentiels() {
  const qc = useQueryClient()
  const [code, setCode] = useState('campagnes')
  const [text, setText] = useState('')
  const [editId, setEditId] = useState<number | null>(null)
  const [editText, setEditText] = useState('')
  const [err, setErr] = useState<string | null>(null)

  const refs = useQuery({ queryKey: ['admin-refs'], queryFn: ({ signal }) => apiGet<Ref[]>('/admin-api/referentiels/', {}, signal) })
  const items = useQuery({ queryKey: ['admin-ref', code], queryFn: ({ signal }) => apiGet<Item[]>(`/admin-api/referentiels/${code}/`, {}, signal) })
  const done = () => { setErr(null); qc.invalidateQueries({ queryKey: ['admin-ref'] }); qc.invalidateQueries({ queryKey: ['admin-refs'] }) }
  const fail = (e: unknown) => setErr(e instanceof Error ? e.message : 'Échec.')

  const add = useMutation({ mutationFn: () => apiSend('POST', `/admin-api/referentiels/${code}/`, { libelle: text }),
    onSuccess: () => { setText(''); done() }, onError: fail })
  const rename = useMutation({ mutationFn: (id: number) => apiSend('PATCH', `/admin-api/referentiels/${code}/${id}/`, { libelle: editText }),
    onSuccess: () => { setEditId(null); done() }, onError: fail })
  const del = useMutation({ mutationFn: (id: number) => apiSend('DELETE', `/admin-api/referentiels/${code}/${id}/`),
    onSuccess: done, onError: fail })

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Référentiels</h1>
      <div className="flex flex-wrap gap-2">
        {refs.data?.map((r, i) => (
          <button key={r.code} onClick={() => { setCode(r.code); setErr(null); setEditId(null) }}
            className={`rounded-xl border-2 px-4 py-2.5 text-sm font-semibold ${code === r.code ? `bg-white ${TABS[i % 4]}` : 'border-transparent bg-white text-muted hover:text-ink'}`}>
            {r.label} <span className="ml-1 text-[12px] opacity-70">{r.total}</span>
          </button>
        ))}
      </div>
      <Err msg={err} />
      <section className={CARD}>
        <form onSubmit={(e) => { e.preventDefault(); if (text.trim()) add.mutate() }} className="flex gap-3 border-b border-line p-5">
          <input className={INPUT} value={text} onChange={(e) => setText(e.target.value)} placeholder="Nouvelle valeur…" />
          <button className={BTN_RED} disabled={!text.trim() || add.isPending}><Plus size={16} /> Ajouter</button>
        </form>
        <ul className="divide-y divide-line">
          {items.data?.map((it) => (
            <li key={it.id} className="flex items-center gap-3 px-5 py-3">
              <span className="w-12 font-mono text-[12px] text-muted">#{it.id}</span>
              {editId === it.id ? (
                <>
                  <input className={INPUT} value={editText} onChange={(e) => setEditText(e.target.value)} autoFocus />
                  <button aria-label="Valider" onClick={() => rename.mutate(it.id)} className="grid size-9 place-items-center rounded-lg bg-emerald-600 text-white"><Check size={15} /></button>
                  <button aria-label="Annuler" onClick={() => setEditId(null)} className="grid size-9 place-items-center rounded-lg border border-line"><X size={15} /></button>
                </>
              ) : (
                <>
                  <span className="flex-1 font-medium">{it.libelle}</span>
                  <button aria-label="Renommer" onClick={() => { setEditId(it.id); setEditText(it.libelle) }} className="grid size-9 place-items-center rounded-lg border border-line hover:bg-slate-50"><Pencil size={15} /></button>
                  <button aria-label="Supprimer" onClick={() => window.confirm(`Supprimer « ${it.libelle} » ?`) && del.mutate(it.id)} className="grid size-9 place-items-center rounded-lg border border-line text-red-600 hover:bg-red-50"><Trash2 size={15} /></button>
                </>
              )}
            </li>
          ))}
          {items.data?.length === 0 && <li className="p-8 text-center text-muted">Aucune valeur.</li>}
        </ul>
      </section>
      <p className="text-[13px] text-muted">Une valeur utilisée par des données ne peut pas être supprimée.</p>
    </div>
  )
}