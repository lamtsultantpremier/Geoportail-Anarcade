import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Loader2, Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { apiGet, apiSend } from '../../lib/api'
import type { Paginated } from '../exploitants/useExploitants'
import Pagination from '../exploitants/Pagination'
import { BTN_LINE, BTN_RED, CARD, Err, INPUT, Label, Modal, ROLE_STYLE, initials } from './AdminUi'
import { useAuth } from '../admin/auth'

interface U { id: number; username: string; prenom: string; nom_famille: string; nom: string; email: string
  role: string; actif: boolean; derniere_connexion: string | null }
const ROLES = ['Super-admin', 'Admin', 'Superviseur', 'Enquêteur','Client']
const AVATAR = ['bg-red-600', 'bg-blue-600', 'bg-emerald-600', 'bg-orange-500']
const EMPTY = { username: '', prenom: '', nom_famille: '', email: '', role: 'Enquêteur', password: '', actif: true }

export default function AdminUsers() {
  const qc = useQueryClient()
  const me = useAuth((s) => s.user)
  const [params, setParams] = useSearchParams()
  const [q, setQ] = useState('')
  const [term, setTerm] = useState('')
  const [page, setPage] = useState(1)
  const [edit, setEdit] = useState<U | 'new' | null>(params.get('nouveau') ? 'new' : null)
  const [form, setForm] = useState(EMPTY)
  const [err, setErr] = useState<string | null>(null)

  const list = useQuery({
    queryKey: ['admin-users', term, page],
    queryFn: ({ signal }) => apiGet<Paginated<U>>('/admin-api/utilisateurs/', { q: term, page, page_size: 10 }, signal),
    placeholderData: keepPreviousData,
  })
  const refresh = () => { qc.invalidateQueries({ queryKey: ['admin-users'] }); qc.invalidateQueries({ queryKey: ['admin-dashboard'] }) }

  useEffect(() => {
    if (edit === 'new') setForm(EMPTY)
    else if (edit) setForm({ username: edit.username, prenom: edit.prenom, nom_famille: edit.nom_famille,
      email: edit.email, role: edit.role, password: '', actif: edit.actif })
    setErr(null)
  }, [edit])

  const close = () => { setEdit(null); if (params.get('nouveau')) setParams({}) }

  const save = useMutation({
    mutationFn: () => {
      if (edit === 'new') return apiSend('POST', '/admin-api/utilisateurs/', form)
      const { username: _u, password, ...rest } = form
      return apiSend('PATCH', `/admin-api/utilisateurs/${(edit as U).id}/`, password ? { ...rest, password } : rest)
    },
    onSuccess: () => { refresh(); close() },
    onError: (e) => setErr(e instanceof Error ? e.message : 'Échec.'),
  })
  const toggle = useMutation({
    mutationFn: (u: U) => apiSend('PATCH', `/admin-api/utilisateurs/${u.id}/`, { actif: !u.actif }),
    onSuccess: refresh, onError: (e) => window.alert(e instanceof Error ? e.message : 'Échec.'),
  })
  const del = useMutation({
    mutationFn: (u: U) => apiSend('DELETE', `/admin-api/utilisateurs/${u.id}/`),
    onSuccess: refresh, onError: (e) => window.alert(e instanceof Error ? e.message : 'Échec.'),
  })

  const count = list.data?.count ?? 0
  const set = (k: keyof typeof EMPTY, v: string | boolean) => setForm((f) => ({ ...f, [k]: v }))

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-bold">Utilisateurs</h1>
        <button className={BTN_RED} onClick={() => setEdit('new')}><Plus size={16} /> Nouvel utilisateur</button>
      </div>

      <section className={CARD}>
        <div className="flex items-center gap-3 border-b border-line px-6 py-4">
          <form onSubmit={(e) => { e.preventDefault(); setTerm(q.trim()); setPage(1) }}
            className="flex items-center gap-2 rounded-xl border border-line px-3">
            <Search size={15} className="text-muted" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nom, identifiant, e-mail (Entrée)"
              className="w-72 bg-transparent py-2.5 text-sm outline-none" />
          </form>
          {list.isFetching && <Loader2 size={16} className="animate-spin text-red-600" />}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-slate-50 text-[12px] uppercase tracking-wide text-muted">
              <tr><th className="px-6 py-3.5">Utilisateur</th><th className="px-3">Rôle</th><th className="px-3">Statut</th>
                <th className="px-3">Dernière connexion</th><th className="px-3">Actions</th></tr>
            </thead>
            <tbody className="divide-y divide-line">
              {list.data?.results.map((u, i) => (
                <tr key={u.id}>
                  <td className="px-6 py-3.5">
                    <div className="flex items-center gap-3">
                      <span className={`grid size-10 place-items-center rounded-full text-[13px] font-bold text-white ${AVATAR[i % 4]}`}>{initials(u.nom)}</span>
                      <div><div className="font-semibold">{u.nom}</div><div className="text-[12px] text-muted">{u.username} · {u.email || 'sans e-mail'}</div></div>
                    </div>
                  </td>
                  <td className="px-3"><span className={`rounded-full border px-3 py-1 text-[12px] font-semibold ${ROLE_STYLE[u.role] ?? ROLE_STYLE.Utilisateur}`}>{u.role}</span></td>
                  <td className="px-3">
                    <button onClick={() => toggle.mutate(u)} disabled={u.id === me?.id} title="Activer / suspendre"
                      className={`rounded-full border px-3 py-1 text-[12px] font-semibold disabled:opacity-60 ${u.actif ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-orange-200 bg-orange-50 text-orange-700'}`}>
                      {u.actif ? '✓ Actif' : 'Suspendu'}
                    </button>
                  </td>
                  <td className="px-3 text-muted">{u.derniere_connexion ? new Date(u.derniere_connexion).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' }) : 'Jamais'}</td>
                  <td className="px-3">
                    <div className="flex gap-2">
                      <button onClick={() => setEdit(u)} aria-label="Modifier" className="grid size-9 place-items-center rounded-lg border border-line hover:bg-slate-50"><Pencil size={15} /></button>
                      <button onClick={() => window.confirm(`Supprimer ${u.username} ?`) && del.mutate(u)} disabled={u.id === me?.id}
                        aria-label="Supprimer" className="grid size-9 place-items-center rounded-lg border border-line text-red-600 hover:bg-red-50 disabled:opacity-40"><Trash2 size={15} /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {list.data?.results.length === 0 && <tr><td colSpan={5} className="px-6 py-10 text-center text-muted">Aucun utilisateur.</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 text-sm text-muted">
          <span><strong className="text-ink">{count}</strong> utilisateur{count > 1 ? 's' : ''}</span>
          {count > 10 && <Pagination page={page} pageCount={Math.ceil(count / 10)} onChange={setPage} disabled={list.isFetching} />}
        </div>
      </section>

      {edit && (
        <Modal title={edit === 'new' ? 'Nouvel utilisateur' : `Modifier ${edit.username}`} onClose={close}>
          <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); save.mutate() }}>
            <Err msg={err} />
            <Label text="Identifiant"><input className={INPUT} value={form.username} disabled={edit !== 'new'} onChange={(e) => set('username', e.target.value)} /></Label>
            <div className="grid grid-cols-2 gap-3">
              <Label text="Prénom"><input className={INPUT} value={form.prenom} onChange={(e) => set('prenom', e.target.value)} /></Label>
              <Label text="Nom"><input className={INPUT} value={form.nom_famille} onChange={(e) => set('nom_famille', e.target.value)} /></Label>
            </div>
            <Label text="E-mail"><input className={INPUT} type="email" value={form.email} onChange={(e) => set('email', e.target.value)} /></Label>
            <Label text="Rôle">
              <select className={INPUT} value={form.role} onChange={(e) => set('role', e.target.value)}>
                {ROLES.filter((r) => r !== 'Super-admin' || me?.role === 'Super-admin').map((r) => <option key={r}>{r}</option>)}
              </select>
            </Label>
            <Label text={edit === 'new' ? 'Mot de passe (8 caractères minimum)' : 'Nouveau mot de passe (laisser vide pour ne pas changer)'}>
              <input className={INPUT} type="password" autoComplete="new-password" value={form.password} onChange={(e) => set('password', e.target.value)} />
            </Label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="size-4 accent-red-600" checked={form.actif} onChange={(e) => set('actif', e.target.checked)} /> Compte actif</label>
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" className={BTN_LINE} onClick={close}>Annuler</button>
              <button className={BTN_RED} disabled={save.isPending}>{save.isPending && <Loader2 size={16} className="animate-spin" />} Enregistrer</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}