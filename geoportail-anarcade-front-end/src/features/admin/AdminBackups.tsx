import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Database, Download, Loader2, Trash2 } from 'lucide-react'
import { apiGet, apiSend, downloadAuth } from '../../lib/api'
import { BTN_RED, CARD, Err } from './AdminUi'

interface B { nom: string; taille: number; date: string }
const size = (n: number) => (n < 1024 ** 2 ? `${(n / 1024).toFixed(0)} Ko` : n < 1024 ** 3 ? `${(n / 1024 ** 2).toFixed(1)} Mo` : `${(n / 1024 ** 3).toFixed(2)} Go`)

export default function AdminBackups() {
  const qc = useQueryClient()
  const [err, setErr] = useState<string | null>(null)
  const q = useQuery({ queryKey: ['admin-backups'], queryFn: ({ signal }) => apiGet<B[]>('/admin-api/sauvegardes/', {}, signal) })
  const done = () => { setErr(null); qc.invalidateQueries({ queryKey: ['admin-backups'] }) }
  const fail = (e: unknown) => setErr(e instanceof Error ? e.message : 'Échec.')

  const create = useMutation({ mutationFn: () => apiSend('POST', '/admin-api/sauvegardes/'), onSuccess: done, onError: fail })
  const del = useMutation({ mutationFn: (n: string) => apiSend('DELETE', `/admin-api/sauvegardes/${n}/`), onSuccess: done, onError: fail })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Sauvegardes</h1>
        <button className={BTN_RED} onClick={() => create.mutate()} disabled={create.isPending}>
          {create.isPending ? <Loader2 size={16} className="animate-spin" /> : <Database size={16} />} Créer une sauvegarde
        </button>
      </div>
      <Err msg={err} />
      <section className={CARD}>
        <ul className="divide-y divide-line">
          {q.data?.map((b) => (
            <li key={b.nom} className="flex items-center gap-4 px-6 py-4">
              <span className="grid size-10 place-items-center rounded-xl bg-blue-50 text-blue-700"><Database size={18} /></span>
              <div className="flex-1"><div className="font-mono text-[13px] font-bold">{b.nom}</div>
                <div className="text-[12px] text-muted">{new Date(b.date).toLocaleString('fr-FR')} · {size(b.taille)}</div></div>
              <button onClick={() => downloadAuth(`/admin-api/sauvegardes/${b.nom}/`, b.nom).catch(fail)}
                aria-label="Télécharger" className="grid size-9 place-items-center rounded-lg border border-line hover:bg-slate-50"><Download size={15} /></button>
              <button onClick={() => window.confirm(`Supprimer ${b.nom} ?`) && del.mutate(b.nom)}
                aria-label="Supprimer" className="grid size-9 place-items-center rounded-lg border border-line text-red-600 hover:bg-red-50"><Trash2 size={15} /></button>
            </li>
          ))}
          {q.data?.length === 0 && <li className="p-10 text-center text-muted">Aucune sauvegarde.</li>}
        </ul>
      </section>
      <div className="rounded-2xl border border-orange-200 bg-orange-50 p-5 text-[13px] text-orange-900">
        <strong>Restauration</strong> (volontairement hors interface) : sur le serveur, <code className="rounded bg-white px-1.5 py-0.5">pg_restore -c -d NOM_BASE sauvegarde.dump</code>. Arrête l'application avant de restaurer.
      </div>
    </div>
  )
}