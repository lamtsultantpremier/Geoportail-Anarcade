// AdminLogin.tsx
import { useState } from 'react'
import { Loader2, Sprout } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '../admin/auth'
import { BTN_RED, Err, INPUT, Label } from './AdminUi'

export default function AdminLogin() {
  const login = useAuth((s) => s.login)
  const [u, setU] = useState('')
  const [p, setP] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true); setErr(null)
    try { await login(u.trim(), p) }
    catch (x) { setErr(x instanceof Error ? x.message : 'Connexion impossible.') }
    finally { setBusy(false) }
  }

  return (
    <div className="grid min-h-screen place-items-center bg-[#0b0d14] p-4">
      <form onSubmit={submit} className="w-full max-w-sm space-y-4 rounded-2xl border-t-4 border-red-600 bg-white p-8 shadow-2xl">
        <div className="flex items-center gap-3">
          <span className="grid size-12 place-items-center rounded-xl bg-gradient-to-br from-red-500 to-red-700 text-white"><Sprout size={24} /></span>
          <div><div className="text-lg font-bold">Anacarde Admin</div><div className="text-[13px] text-muted">Connexion au back-office</div></div>
        </div>
        <Err msg={err} />
        <Label text="Identifiant"><input className={INPUT} value={u} onChange={(e) => setU(e.target.value)} autoFocus autoComplete="username" /></Label>
        <Label text="Mot de passe"><input className={INPUT} type="password" value={p} onChange={(e) => setP(e.target.value)} autoComplete="current-password" /></Label>
        <button className={`${BTN_RED} w-full justify-center`} disabled={busy || !u || !p}>
          {busy && <Loader2 size={16} className="animate-spin" />} Se connecter
        </button>
        <Link to="/" className="block text-center text-[13px] text-muted hover:underline">← Retour au géoportail</Link>
      </form>
    </div>
  )
}