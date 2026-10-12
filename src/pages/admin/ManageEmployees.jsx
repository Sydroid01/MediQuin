import { useState } from 'react'
import { DEPTS, USERS } from '../../data'
import { api } from '../../api'
import { useApp } from '../../AppContext'
import { Crumb, Field, Tbl } from '../../ui'

const ROLES = ['Staff', 'Custodian', 'Admin']
const GENERAL = 'Staff'
const enc = encodeURIComponent

export default function ManageEmployees() {
  const { user, act } = useApp()
  const [f, setF] = useState(null), [isNew, setNew] = useState(false), [err, setErr] = useState(''), [cf, setCf] = useState(null)
  const [q, setQ] = useState(''), [fDept, setFDept] = useState(''), [fRole, setFRole] = useState('')
  const open = u => {
    setF(u ? { ...u, pin: '', position: u.position || '' } : { id: '', name: '', pin: '', dept: DEPTS[0][0], title: GENERAL, position: '' })
    setNew(!u); setErr('')
  }
  const set = k => e => setF({ ...f, [k]: e.target.value })
  const save = async () => {
    const name = f.name.trim()
    if (!name) { setErr('Enter a name.'); return }
    if (isNew ? !/^\d{5}$/.test(f.pin) : f.pin && !/^\d{5}$/.test(f.pin)) { setErr(isNew ? 'Enter a PIN of exactly 5 digits.' : 'Leave the PIN blank to keep it, or enter exactly 5 digits.'); return }
    if (f.title === GENERAL && !f.position.trim()) { setErr('Enter the position or role of the staff member.'); return }
    setErr('')
    const body = { id: f.id.trim(), name, pin: f.pin, dept: f.dept, title: f.title, position: f.title === GENERAL ? f.position.trim() : '' }
    const res = await act(() => isNew ? api('/employees', { method: 'POST', body }) : api(`/employees/${enc(f.id)}`, { method: 'PATCH', body }), 'Employee saved', setErr)
    if (res) setF(null)
  }
  const del = async id => {
    if (cf !== id) { setCf(id); return }
    await act(() => api(`/employees/${enc(id)}`, { method: 'DELETE' }), 'Employee deleted')
    setCf(null)
  }
  const needle = q.trim().toLowerCase()
  const shown = USERS.filter(x => (!needle || x.name.toLowerCase().includes(needle) || x.id.toLowerCase().includes(needle))
    && (!fDept || x.dept === fDept) && (!fRole || x.title === fRole))
  return <><Crumb>Manage Employees</Crumb><h1>Manage employees</h1><p className="sub">Add, edit and remove hospital staff.</p>
    <div className="bar"><button className="btn" onClick={() => open(null)}>Add employee</button></div>
    <div className="bar">
      <input type="search" aria-label="Search employees by name or ID" placeholder="Search by name or ID" value={q} onChange={e => setQ(e.target.value)} />
      <select aria-label="Filter by department" value={fDept} onChange={e => setFDept(e.target.value)}>
        <option value="">All departments</option>{[...DEPTS.map(d => d[0]), 'Administration'].map(d => <option key={d}>{d}</option>)}</select>
      <select aria-label="Filter by role" value={fRole} onChange={e => setFRole(e.target.value)}>
        <option value="">All roles</option>{ROLES.map(r => <option key={r}>{r}</option>)}</select>
      {(q || fDept || fRole) && <button className="btn sm alt" onClick={() => { setQ(''); setFDept(''); setFRole('') }}>Clear</button>}
    </div>
    {f && <div className="card" style={{ marginBottom: 18 }}><div className="f">
      <Field l="Name" id="en"><input id="en" value={f.name} onChange={set('name')} /></Field>
      <Field l="ID number" id="ei"><input id="ei" value={f.id} onChange={set('id')} readOnly={!isNew} className={isNew ? '' : 'ro'} placeholder={isNew ? 'Leave blank to auto-generate' : ''} /></Field>
      <Field l={isNew ? '5-digit PIN' : 'New 5-digit PIN (optional)'} id="ep"><input id="ep" inputMode="numeric" maxLength={5} autoComplete="off" value={f.pin} onChange={set('pin')} placeholder={isNew ? '' : 'Leave blank to keep the current PIN'} /></Field>
      <Field l="Hospital department" id="ed"><select id="ed" value={f.dept} onChange={set('dept')}>
        {[...DEPTS.map(d => d[0]), 'Administration'].map(d => <option key={d}>{d}</option>)}</select></Field>
      <Field l="Role" id="er"><select id="er" value={f.title} onChange={set('title')}>{ROLES.map(r => <option key={r}>{r}</option>)}</select></Field>
      {f.title === GENERAL && <Field l="Position or role of the staff" id="epos"><input id="epos" maxLength={60} value={f.position} onChange={set('position')} placeholder="e.g. Nurse, Doctor, Radiology Aide" /></Field>}
    </div><div className="err">{err}</div>
      <button className="btn" onClick={save}>Save employee</button> <button className="btn alt" onClick={() => setF(null)}>Cancel</button></div>}
    <Tbl head={['ID', 'Name', 'Department', 'Role', '']} empty={USERS.length ? 'No employees match your search or filters.' : 'No employees.'} rows={shown.map(x => (
      <tr key={x.id}><td>{x.id}</td><td>{x.name}</td><td>{x.dept}</td>
        <td>{x.title}{x.title === GENERAL && x.position ? ` – ${x.position}` : ''}<br /><small style={{ color: 'var(--mut)' }}>Access: {x.role}</small></td>
        <td style={{ whiteSpace: 'nowrap' }}><button className="btn sm alt" onClick={() => open(x)}>Edit</button>{' '}
          <button className="btn sm bad" disabled={x.id === user.id} onClick={() => del(x.id)}>{cf === x.id ? 'Confirm delete' : 'Delete'}</button></td></tr>))} /></>
}
