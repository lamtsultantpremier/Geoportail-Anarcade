export const BASE = import.meta.env.VITE_API_URL ?? '/api'
const TOKEN_KEY = 'geoportail.token'

export const getToken = () => { try { return localStorage.getItem(TOKEN_KEY) } catch { return null } }
export const setToken = (t: string | null) => {
  try { t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY) } catch { /* ignoré */ }
}

type Params = Record<string, string | number | undefined>

function headers(json = false) {
  const h: Record<string, string> = {}
  const t = getToken()
  if (t) h.Authorization = `Token ${t}`
  const imp = import.meta.env.VITE_IMPORT_TOKEN
  if (imp) h['X-Import-Token'] = imp
  if (json) h['Content-Type'] = 'application/json'
  return h
}

async function fail(res: Response): Promise<never> {
  let message = `Erreur ${res.status}`
  try { message = (await res.json()).detail ?? message } catch { /* corps vide */ }
  if (res.status === 401 && getToken()) {
    setToken(null)
    window.dispatchEvent(new Event('auth:expired'))
  }
  throw new Error(message)
}

export async function apiGet<T>(path: string, params: Params = {}, signal?: AbortSignal): Promise<T> {
  const qs = new URLSearchParams()
  Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== '') qs.set(k, String(v)) })
  const query = qs.toString()
  const res = await fetch(`${BASE}${path}${query ? `?${query}` : ''}`, { headers: headers(), signal })
  if (!res.ok) await fail(res)
  return res.json() as Promise<T>
}

export async function apiSend<T>(
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE', path: string, body?: unknown,
): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method, headers: headers(body !== undefined),
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) await fail(res)
  return (res.status === 204 ? undefined : await res.json()) as T
}

// Télécharge un fichier protégé par le jeton
export async function downloadAuth(path: string, filename: string) {
  const res = await fetch(`${BASE}${path}`, { headers: headers() })
  if (!res.ok) await fail(res)
  const url = URL.createObjectURL(await res.blob())
  const a = document.createElement('a')
  a.href = url; a.download = filename
  document.body.appendChild(a); a.click(); a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}