// AdminGuard.tsx
import { useEffect } from 'react'
import { Link ,Navigate} from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { useAuth } from '../admin/auth'
import AdminLogin from './AdminLogin'
import {firstAllowed} from './auth'
export default function AdminGuard({ children }: { children: React.ReactNode }) {
  const { user, ready, load, logout, clear } = useAuth()

  useEffect(() => { void load() }, [load])
  useEffect(() => {
    window.addEventListener('auth:expired', clear)
    return () => window.removeEventListener('auth:expired', clear)
  }, [clear])

  if (!ready) return <div className="grid min-h-screen place-items-center"><Loader2 className="animate-spin text-red-600" /></div>
  if (!user) return <AdminLogin />
  // if (!user.droits.includes('acces_admin')) {
  //   return (
  //     <div className="grid min-h-screen place-items-center p-6">
  //       <div className="max-w-sm rounded-2xl border border-line bg-white p-8 text-center shadow-sm">
  //         <h1 className="text-xl font-bold text-red-700">Accès refusé</h1>
  //         <p className="mt-2 text-sm text-muted">Le rôle « {user.role} » n'a pas accès au back-office.</p>
  //         <div className="mt-5 flex justify-center gap-3 text-sm">
  //           <Link to="/" className="font-semibold text-blue-700">Retour au géoportail</Link>
  //           <button onClick={logout} className="font-semibold text-red-700">Se déconnecter</button>
  //         </div>
  //       </div>
  //     </div>
  //   )
  // }
  if (!user.droits.includes('acces_admin')) {
    return <Navigate to={firstAllowed(user.droits) ?? '/'} replace />
  }
  return <>{children}</>
}