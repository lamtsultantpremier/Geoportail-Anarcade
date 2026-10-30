export const BASE = import.meta.env.VITE_API_URL ?? '/api'
type Params = Record<string, string | number | undefined>

export async function apiGet<T>(path: string, params: Params = {}, signal?: AbortSignal): Promise<T> {
  const qs = new URLSearchParams()
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== '') qs.set(k, String(v))
  })
  const query = qs.toString()
  const res = await fetch(`${BASE}${path}${query ? `?${query}` : ''}`, { signal })
  if (!res.ok) throw new Error(`API ${res.status} sur ${path}`)
  return res.json() as Promise<T>
}

export async function apiSend<T>(
  method: 'POST' | 'DELETE', path: string, body?: unknown,
): Promise<T> {
  const headers: Record<string, string> = {}
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  const token = import.meta.env.VITE_IMPORT_TOKEN
  if (token) headers['X-Import-Token'] = token

  const res = await fetch(`${BASE}${path}`, {
    method, headers, body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) {
    let message = `Erreur ${res.status}`
    try { message = (await res.json()).detail ?? message } catch { /* corps vide */ }
    throw new Error(message)
  }
  return (res.status === 204 ? undefined : await res.json()) as T
}

