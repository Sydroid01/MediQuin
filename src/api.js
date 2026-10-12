const BASE = import.meta.env.VITE_API_URL || '/api'

// The sign-in token lives in sessionStorage: it survives a page reload but is dropped when the tab closes
// (a safer default for shared hospital workstations than localStorage).
export const getToken = () => sessionStorage.getItem('mq_token')
export const setToken = t => t ? sessionStorage.setItem('mq_token', t) : sessionStorage.removeItem('mq_token')

export async function api(path, { method = 'GET', body } = {}) {
  const token = getToken()
  let res
  try {
    res = await fetch(BASE + path, {
      method,
      headers: { ...(body && { 'Content-Type': 'application/json' }), ...(token && { Authorization: `Bearer ${token}` }) },
      body: body && JSON.stringify(body),
    })
  } catch {
    throw Object.assign(new Error("Can't reach the server. Make sure the backend is running."), { status: 0 })
  }
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw Object.assign(new Error(data.error || 'Something went wrong. Please try again.'), { status: res.status, retryAfter: data.retryAfter })
  return data
}
