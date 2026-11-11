import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Loader2, Lock } from 'lucide-react'
import { firstAllowed, useAuth } from './auth'

export default function RequireRight({ droit, superOnly, children }: {
  droit?: string; superOnly?: boolean; children: React.ReactNode
}) {
  const { user, ready, login, logout } = useAuth()
  const [u, setU] = useState('')
  const [p, setP] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  if (!ready) return <div className="grid place-items-center p-16"><Loader2 className="animate-spin text-brand-600" /></div>

  const allowed = user && (superOnly ? user.role === 'Super-admin' : !droit || user.droits.includes(droit))
  if (allowed) return <>{children}</>

  if (user) {
    const home = firstAllowed(user.droits)
    return (
      <div className="mx-auto max-w-md rounded-2xl border border-line bg-white p-8 text-center">
        <Lock className="mx-auto text-red-600" />
        <h1 className="mt-3 text-xl font-semibold">Accès réservé</h1>
        <p className="mt-2 text-sm text-muted">Votre rôle « {user.role} » n'a pas accès à cette page.</p>
        <div className="mt-5 flex justify-center gap-4 text-sm">
          {home && <Link to={home} className="font-semibold text-blue-700">Aller à une page autorisée</Link>}
          <button onClick={logout} className="font-semibold text-red-700">Changer de compte</button>
        </div>
      </div>
    )
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true); setErr(null)
    try { await login(u.trim(), p) }
    catch (x) { setErr(x instanceof Error ? x.message : 'Connexion impossible.') }
    finally { setBusy(false) }
  }
  return (
    <form onSubmit={submit} className="mx-auto max-w-sm space-y-3 rounded-2xl border border-line bg-white p-8">
      <div className="flex items-center gap-2 font-semibold"><Lock size={18} className="text-red-600" /> Connexion requise</div>
      {err && <p className="rounded-lg bg-red-50 p-2.5 text-sm text-red-700">{err}</p>}
      <input value={u} onChange={(e) => setU(e.target.value)} placeholder="Identifiant" autoComplete="username"
        className="w-full rounded-xl border border-line px-3.5 py-2.5 text-sm" />
      <input value={p} onChange={(e) => setP(e.target.value)} type="password" placeholder="Mot de passe"
        autoComplete="current-password" className="w-full rounded-xl border border-line px-3.5 py-2.5 text-sm" />
      <button disabled={busy || !u || !p}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
        {busy && <Loader2 size={16} className="animate-spin" />} Se connecter
      </button>
    </form>
  )
}