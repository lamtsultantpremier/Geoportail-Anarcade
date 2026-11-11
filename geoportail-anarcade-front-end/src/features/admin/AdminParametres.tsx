import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Loader2, Save } from 'lucide-react'
import { apiGet, apiSend } from '../../lib/api'
import { BTN_RED, CARD, Err, INPUT, Label } from './AdminUi'

interface P { cle: string; label: string; type: string; valeur: string }

export default function AdminParametres() {
  const qc = useQueryClient()
  const q = useQuery({ queryKey: ['admin-params'], queryFn: ({ signal }) => apiGet<P[]>('/admin-api/parametres/', {}, signal) })
  const [v, setV] = useState<Record<string, string>>({})
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null)

  useEffect(() => { if (q.data) setV(Object.fromEntries(q.data.map((p) => [p.cle, p.valeur]))) }, [q.data])

  const save = useMutation({
    mutationFn: () => apiSend('PUT', '/admin-api/parametres/', v),
    onSuccess: () => { setMsg({ ok: true, t: 'Paramètres enregistrés.' }); qc.invalidateQueries({ queryKey: ['admin-params'] }) },
    onError: (e) => setMsg({ ok: false, t: e instanceof Error ? e.message : 'Échec.' }),
  })

  if (!q.data) return <Loader2 className="animate-spin text-red-600" />
  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-3xl font-bold">Paramètres</h1>
      {msg && (msg.ok ? <p className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">{msg.t}</p> : <Err msg={msg.t} />)}
      <form className={`${CARD} space-y-4 p-6`} onSubmit={(e) => { e.preventDefault(); setMsg(null); save.mutate() }}>
        {q.data.map((p) => (
          <Label key={p.cle} text={p.label}>
            <input className={INPUT} value={v[p.cle] ?? ''} inputMode={p.type === 'texte' ? 'text' : 'decimal'}
              onChange={(e) => setV((s) => ({ ...s, [p.cle]: e.target.value }))} />
          </Label>
        ))}
        <button className={BTN_RED} disabled={save.isPending}>
          {save.isPending ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Enregistrer
        </button>
      </form>
      <p className="text-[13px] text-muted">Les seuils de superficie et de chevauchement s'appliquent aux prochains contrôles d'import.</p>
    </div>
  )
}