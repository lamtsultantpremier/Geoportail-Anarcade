import { useLocation } from 'react-router-dom'

export default function AdminPlaceholder() {
  const { pathname } = useLocation()
  const name = pathname.split('/').pop()?.replace(/-/g, ' ') ?? ''
  return (
    <div className="rounded-2xl border border-dashed border-line bg-white p-12 text-center">
      <h1 className="text-2xl font-bold capitalize">{name}</h1>
      <p className="mt-2 text-sm text-muted">Cette rubrique sera complétée prochainement.</p>
    </div>
  )
}