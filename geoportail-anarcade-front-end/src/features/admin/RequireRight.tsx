import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { Loader2, Lock } from 'lucide-react'
import { firstAllowed, useAuth } from './auth'

export default function RequireRight({ droit, superOnly, children }: {
  droit?: string; superOnly?: boolean; children: React.ReactNode
}) {
  const { user, ready, login,justLoggedOut } = useAuth()
  const [u, setU] = useState('')
  const [p, setP] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  if (!ready) return <div className="grid place-items-center p-16"><Loader2 className="animate-spin text-brand-600" /></div>

  const allowed = user && (superOnly ? user.role === 'Super-admin' : !droit || user.droits.includes(droit))
  if (allowed) return <>{children}</>

  // Connecté sans le droit : on le renvoie vers une page autorisée, sans message
  if (user) {
    const home = firstAllowed(user.droits)
    return home ? <Navigate to={home} replace /> : (
      <div className="mx-auto max-w-md p-10 text-center text-sm text-muted">
        Aucune page n'est disponible pour votre compte. Contactez un administrateur.
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
    <form onSubmit={submit} className="mx-auto w-full max-w-md space-y-4 rounded-2xl border border-line bg-white p-8">

      <div className="flex flex-col items-center gap-2 text-center">
      <Lock size={18} className="mt-0.5 shrink-0 text-red-600" />
      
      {justLoggedOut ? (
        <span>Connexion requise</span>
      ) : (
        <div className="leading-snug">
          <div>Bienvenue sur la Plateforme d'anacarde</div>
          <div className="mt-1 text-sm font-normal text-muted">
            Connectez-vous avant de continuer.
          </div>
        </div>
      )}
    </div>

      {err && <p className="rounded-lg bg-red-50 p-2.5 text-sm text-red-700">{err}</p>}
      <input value={u} onChange={(e) => setU(e.target.value)} placeholder="Identifiant" autoComplete="username"
        className="w-full rounded-xl border border-line px-4 py-2.5 text-sm" />
      <input value={p} onChange={(e) => setP(e.target.value)} type="password" placeholder="Mot de passe"
        autoComplete="current-password" className="w-full rounded-xl border border-line px-4 py-2.5 text-sm" />
      <button disabled={busy || !u || !p}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
        {busy && <Loader2 size={16} className="animate-spin" />} Se connecter
      </button>
    </form>
  )
}