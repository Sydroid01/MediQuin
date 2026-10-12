import { useEffect, useRef, useState } from 'react'
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { loadData, clearData } from './data'
import { api, getToken, setToken } from './api'
import { AppContext } from './AppContext'
import { PATH, TASKS } from './nav'

import Login from './pages/Login'
import Home from './pages/Home'
import RequestEquipment from './pages/staff/RequestEquipment'
import MyRequests from './pages/staff/MyRequests'
import EquipmentList from './pages/staff/EquipmentList'
import RequestQueue from './pages/custodian/RequestQueue'
import EquipmentPermission from './pages/custodian/EquipmentPermission'
import EquipmentStatus from './pages/custodian/EquipmentStatus'
import ManageEmployees from './pages/admin/ManageEmployees'
import ManageEquipment from './pages/admin/ManageEquipment'
import AuditLogs from './pages/admin/AuditLogs'
import ReportProblem from './pages/ReportProblem'
import MyRepairs from './pages/staff/MyRepairs'
import RepairRequests from './pages/shared/RepairRequests'
import EquipmentInventory from './pages/shared/EquipmentInventory'

// The route table: [url, role (or list of roles) allowed to open it, page]. Each page is its own file under src/pages/.
// A role of null means any signed-in user.
const PAGES = [
  [PATH.req, 'Staff', RequestEquipment],
  [PATH.my, 'Staff', MyRequests],
  [PATH.list, 'Staff', EquipmentList],
  [PATH.queue, 'Custodian', RequestQueue],
  [PATH.perm + '/:rid?', 'Custodian', EquipmentPermission],
  [PATH.stat, 'Custodian', EquipmentStatus],
  [PATH.emp, 'Admin', ManageEmployees],
  [PATH.meq, 'Admin', ManageEquipment],
  [PATH.log, 'Admin', AuditLogs],
  [PATH.report, null, ReportProblem],
  [PATH.myrep, 'Staff', MyRepairs],
  [PATH.rep + '/:rid?', ['Custodian', 'Admin'], RepairRequests],
  [PATH.inv, ['Custodian', 'Admin'], EquipmentInventory],
]

// Not signed in -> /login (and come back here afterwards). Wrong role -> dashboard.
function Guard({ user, role, children }) {
  const loc = useLocation()
  if (!user) return <Navigate to="/login" replace state={{ from: loc }} />
  if (role && ![].concat(role).includes(user.role)) return <Navigate to="/" replace />
  return children
}

function LoginRoute({ user, onLogin }) {
  const from = useLocation().state?.from
  if (user) return <Navigate to={from ? from.pathname + from.search : '/'} replace />
  return <Login onLogin={onLogin} />
}

export default function App() {
  const [user, setUser] = useState(null), [msg, setMsg] = useState(''), [booting, setBooting] = useState(!!getToken())
  const [, tick] = useState(0), lock = useRef(false), navigate = useNavigate(), { pathname } = useLocation()
  const go = (key, id) => navigate(PATH[key] + (id ? '/' + encodeURIComponent(id) : ''))
  const toast = m => { setMsg(m); setTimeout(() => setMsg(''), 3200) }
  const logout = note => {
    setToken(null); clearData(); setUser(null)
    if (typeof note === 'string') toast(note)         // session expired: the guard sends you to /login and back here afterwards
    else navigate('/login', { replace: true })        // you clicked Logout: start clean
  }

  // Clicking Logout: record the sign-out in the audit log first (needs the token), then clear the session.
  const signOut = async () => {
    try { await api('/auth/logout', { method: 'POST' }) } catch { /* token already invalid: just sign out locally */ }
    logout()
  }

  // On a reload while signed in: restore the session from the token, load the data, then show the page in the URL.
  useEffect(() => {
    if (!getToken()) return
    api('/auth/me').then(async ({ user: u }) => { await loadData(u.role); setUser(u) })
      .catch(e => { if (e.status === 401) setToken(null); else toast(e.message) })
      .finally(() => setBooting(false))
  }, [])

  // Re-fetch from the database and re-render. Called after every change and every few seconds,
  // so a custodian sees new staff requests without reloading.
  const bump = async () => {
    try { await loadData(user.role) } catch (e) { if (e.status === 401) return logout('Your session ended. Please sign in again.') }
    tick(n => n + 1)
  }
  const bumpRef = useRef(bump); bumpRef.current = bump
  useEffect(() => {
    if (!user) return
    const id = setInterval(() => { if (!document.hidden && !lock.current) bumpRef.current() }, 10000)
    return () => clearInterval(id)
  }, [user])

  // Runs an API call: shows a toast on success or failure, refreshes the data, returns the response (or null on failure).
  // Ignores a second click while one call is still running, which prevents duplicate submissions.
  const act = async (fn, ok, onErr) => {
    if (lock.current) return null
    lock.current = true
    try {
      const res = await fn()
      if (ok) toast(typeof ok === 'function' ? ok(res) : ok)
      await bump()
      return res
    } catch (e) {
      if (e.status === 401) logout('Your session ended. Please sign in again.')
      else if (onErr) onErr(e.message); else toast(e.message)
      return null
    } finally { lock.current = false }
  }

  const ctx = { user, go, bump, toast, act }
  const plain = !user || pathname === '/' || pathname === '/login'
  return <AppContext.Provider value={ctx}>
    <div id="hd">
      <header>
        <div className="brand" onClick={() => user && go('home')}>
          <b className="logo"><svg viewBox="0 0 24 24"><path d="M9 3h6v6h6v6h-6v6H9v-6H3V9h6z" fill="#fff" /></svg></b><span>MediQuin</span></div>
        {user && <div className="who"><span className="role">{user.role}</span><span>{user.name}</span>
          <button className="btn alt sm" onClick={signOut}>Logout</button></div>}
      </header>
      {user && <nav aria-label="Main">
        <button className={pathname === '/' ? 'on' : ''} onClick={() => go('home')}>Home</button>
        {TASKS[user.role].map(t => <button key={t[0]} className={pathname.startsWith(PATH[t[0]]) ? 'on' : ''} onClick={() => go(t[0])}>{t[1]}</button>)}
      </nav>}
    </div>
    <main className={plain ? 'home' : ''}>
      {booting ? <p className="sub">Loading…</p> : <Routes>
        <Route path="/login" element={<LoginRoute user={user} onLogin={setUser} />} />
        <Route path="/" element={<Guard user={user}><Home /></Guard>} />
        {PAGES.map(([path, role, Page]) => <Route key={path} path={path} element={<Guard user={user} role={role}><Page /></Guard>} />)}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>}
    </main>
    {msg && <div className="toast">{msg}</div>}
  </AppContext.Provider>
}
