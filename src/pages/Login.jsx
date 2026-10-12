import { useEffect, useState } from 'react'
import { api, setToken } from '../api'
import { loadData } from '../data'

export default function Login({ onLogin }) {
  const [role, setRole] = useState('Staff'), [pin, setPin] = useState(''), [err, setErr] = useState(''), [busy, setBusy] = useState(false)
  const [until, setUntil] = useState(0), [now, setNow] = useState(Date.now())   // lockout end time (ms) and a ticking clock
  const left = Math.max(0, Math.ceil((until - now) / 1000)), locked = left > 0

  useEffect(() => {
    if (!until) return
    const id = setInterval(() => {
      const t = Date.now(); setNow(t)
      if (t >= until) { setUntil(0); setErr('') }
    }, 500)
    return () => clearInterval(id)
  }, [until])

  const submit = async () => {
    if (busy || locked) return
    setBusy(true); setErr('')
    try {
      const { token, user } = await api('/auth/login', { method: 'POST', body: { role, pin: pin.trim() } })
      setToken(token)
      await loadData(user.role)
      onLogin(user)
    } catch (e) {
      setToken(null); setPin(''); setBusy(false)
      if (e.status === 429 && e.retryAfter) { setNow(Date.now()); setUntil(Date.now() + e.retryAfter * 1000) }
      setErr(e.message)
    }
  }
  const clock = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`
  return <div className="login"><div className="card"><h1>Sign in</h1><p className="sub">Select your role and enter your 5-digit PIN.</p>
    <label htmlFor="lr">Role</label>
    <select id="lr" value={role} disabled={locked} onChange={e => setRole(e.target.value)}><option>Staff</option><option>Custodian</option><option>Admin</option></select>
    <div style={{ height: 14 }} /><label htmlFor="lp">PIN</label>
    <input id="lp" type="password" inputMode="numeric" maxLength={5} autoComplete="off" placeholder="•••••" value={pin} disabled={locked}
      onChange={e => setPin(e.target.value)} onKeyDown={e => e.key === 'Enter' && submit()} />
    <div className="err">{locked ? `Too many failed attempts. Try again in ${clock}.` : err}</div>
    <button className="btn" style={{ width: '100%', marginTop: 6 }} disabled={busy || locked} onClick={submit}>
      {locked ? `Locked – try again in ${clock}` : busy ? 'Signing in…' : 'Sign in'}</button></div></div>
}
