import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Loader2, Save } from 'lucide-react'
import { apiGet, apiSend } from '../../lib/api'
import { BTN_RED, CARD, Err, ROLE_STYLE } from './AdminUi'

interface Data { droits: { code: string; label: string }[]
  roles: { nom: string; modifiable: boolean; utilisateurs: number; droits: string[] }[] }

export default function AdminRoles() {
  const qc = useQueryClient()
  const q = useQuery({ queryKey: ['admin-roles'], queryFn: ({ signal }) => apiGet<Data>('/admin-api/roles/', {}, signal) })
  const [m, setM] = useState<Record<string, string[]>>({})
  const [msg, setMsg] = useState<string | null>(null)

  useEffect(() => {
    if (q.data) setM(Object.fromEntries(q.data.roles.map((r) => [r.nom, r.droits])))
  }, [q.data])

  const save = useMutation({
    mutationFn: () => {
      const { ['Super-admin']: _s, ...body } = m
      return apiSend('PUT', '/admin-api/roles/', body)
    },
    onSuccess: () => { setMsg('Permissions enregistrées.'); qc.invalidateQueries({ queryKey: ['admin-roles'] }) },
    onError: (e) => setMsg(e instanceof Error ? e.message : 'Échec.'),
  })

  const toggle = (role: string, code: string) =>
    setM((s) => ({ ...s, [role]: s[role].includes(code) ? s[role].filter((x) => x !== code) : [...s[role], code] }))

  if (!q.data) return <Loader2 className="animate-spin text-red-600" />
  const dirty = q.data.roles.some((r) => r.modifiable && [...(m[r.nom] ?? [])].sort().join() !== [...r.droits].sort().join())

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Rôles & permissions</h1>
        <button className={BTN_RED} onClick={() => { setMsg(null); save.mutate() }} disabled={!dirty || save.isPending}>
          {save.isPending ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Enregistrer
        </button>
      </div>
      {msg && <Err msg={msg} />}

      <div className="grid gap-4 md:grid-cols-4">
        {q.data.roles.map((r) => (
          <div key={r.nom} className={`${CARD} p-5`}>
            <span className={`rounded-full border px-3 py-1 text-[12px] font-semibold ${ROLE_STYLE[r.nom]}`}>{r.nom}</span>
            <div className="mt-4 text-3xl font-bold">{r.utilisateurs}</div>
            <div className="text-sm text-muted">utilisateur{r.utilisateurs > 1 ? 's' : ''}</div>
          </div>
        ))}
      </div>

      <section className={`${CARD} overflow-x-auto`}>
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-slate-50 text-[12px] uppercase tracking-wide text-muted">
            <tr><th className="px-6 py-3.5">Droit</th>
              {q.data.roles.map((r) => <th key={r.nom} className="px-3 text-center">{r.nom}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-line">
            {q.data.droits.map((d) => (
              <tr key={d.code}>
                <td className="px-6 py-3.5 font-medium">{d.label}<div className="font-mono text-[11px] text-muted">{d.code}</div></td>
                {q.data.roles.map((r) => (
                  <td key={r.nom} className="px-3 text-center">
                    <input type="checkbox" className="size-4 accent-red-600" disabled={!r.modifiable}
                      checked={(m[r.nom] ?? r.droits).includes(d.code)} onChange={() => toggle(r.nom, d.code)}
                      aria-label={`${r.nom} : ${d.label}`} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <p className="text-[13px] text-muted">Le rôle Super-admin dispose de tous les droits et n'est pas modifiable.</p>
    </div>
  )
}