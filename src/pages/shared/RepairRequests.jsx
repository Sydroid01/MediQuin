import { useEffect, useState } from 'react'
import { Navigate, useParams } from 'react-router-dom'
import { REPAIRS, DEPTS, PRIORITIES, PRIORITY_HELP, CONDITIONS, REPAIR_OPEN } from '../../data'
import { api } from '../../api'
import { useApp } from '../../AppContext'
import { PATH } from '../../nav'
import { Badge, Crumb, Field, RepairSteps, Tbl, Timeline } from '../../ui'

const STATUSES = ['Reported', 'Under Review', 'In Repair', 'Resolved', 'Dismissed']
const RANK = { Critical: 0, High: 1, Medium: 2, Low: 3 }
const isOpen = x => REPAIR_OPEN.includes(x.st)

// Shared by Custodian and Admin.  /repairs = the list.  /repairs/REP-0003 = open that request to review and update it.
export default function RepairRequests() {
  const { go } = useApp(), { rid } = useParams(), x = REPAIRS.find(r => r.id === rid)
  const [q, setQ] = useState(''), [fs, setFs] = useState('open'), [fp, setFp] = useState('')
  useEffect(() => { if (rid) window.scrollTo({ top: 0 }) }, [rid])
  if (rid && !x) return <Navigate to={PATH.rep} replace />          // unknown request number

  const open = REPAIRS.filter(isOpen)
  const list = REPAIRS.filter(r => (fs === 'open' ? isOpen(r) : !fs || r.st === fs) && (!fp || r.pri === fp)
    && [r.id, r.code, r.item, r.name, r.issue].join(' ').toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => (isOpen(b) - isOpen(a)) || RANK[a.pri] - RANK[b.pri] || new Date(b.at) - new Date(a.at))
  return <><Crumb>Repair Requests</Crumb><h1>Repair requests</h1>
    <p className="sub"><b>{open.length}</b> open · <b>{open.filter(r => r.pri === 'Critical' || r.pri === 'High').length}</b> high or critical · <b>{REPAIRS.filter(r => r.st === 'In Repair').length}</b> in repair · <b>{REPAIRS.filter(r => r.st === 'Resolved').length}</b> resolved</p>
    {x && <RepairPanel key={x.id} x={x} />}
    <div className="bar">
      <input placeholder="Search request, equipment, code or reporter" value={q} onChange={e => setQ(e.target.value)} aria-label="Search" style={{ minWidth: 260 }} />
      <select value={fs} onChange={e => setFs(e.target.value)} aria-label="Status">
        <option value="open">Open requests</option><option value="">All requests</option>{STATUSES.map(s => <option key={s}>{s}</option>)}</select>
      <select value={fp} onChange={e => setFp(e.target.value)} aria-label="Priority"><option value="">All priorities</option>{PRIORITIES.map(p => <option key={p}>{p}</option>)}</select>
      <button className="btn sm" onClick={() => go('report')}>Report a problem</button>
    </div>
    <Tbl head={['Request', 'Equipment', 'Reported by', 'Issue', 'Priority', 'Status', '']} empty="No repair requests match. Change a filter to see more."
      rows={list.map(r => <tr key={r.id} className={r.id === rid ? 'sel' : ''}>
        <td>{r.id}</td><td>{r.item}<br /><small className="mut">{r.code}</small></td>
        <td>{r.name}<br /><small className="mut">{r.dt}</small></td>
        <td className="clip" title={r.issue}>{r.issue}</td>
        <td><Badge s={r.pri} /></td><td><Badge s={r.st} /></td>
        <td><button className="btn sm alt" onClick={() => go('rep', r.id)}>{isOpen(r) ? 'Manage' : 'View'}</button></td></tr>)} /></>
}

function RepairPanel({ x }) {
  const { act, go } = useApp(), open = isOpen(x), dept = DEPTS.find(d => d[1] === x.dept)
  const [f, setF] = useState({ status: x.st, priority: x.pri, tech: x.tech, note: '', cond: 'Good' }), [err, setErr] = useState('')
  const set = k => e => setF({ ...f, [k]: e.target.value })
  const save = async () => {
    const body = {}
    if (f.status !== x.st) body.status = f.status
    if (f.priority !== x.pri) body.priority = f.priority
    if (f.tech.trim() !== x.tech) body.assignedTo = f.tech.trim()
    if (f.note.trim()) body.note = f.note.trim()
    if (!Object.keys(body).length) { setErr('Change the status or priority, or add a progress note.'); return }
    if (f.status === 'Resolved') body.condition = f.cond
    setErr('')
    const res = await act(() => api(`/repairs/${x.id}/update`, { method: 'POST', body }), 'Repair updated', setErr)
    if (res) setF(p => ({ ...p, note: '' }))
  }
  return <div className="card" style={{ marginBottom: 18 }}>
    <div className="bar" style={{ marginBottom: 10 }}><h2 style={{ margin: 0 }}>{x.id}</h2><Badge s={x.st} /><Badge s={x.pri} />
      <button className="btn sm alt" onClick={() => go('rep')}>Close</button></div>
    <div style={{ marginBottom: 14 }}><RepairSteps st={x.st} /></div>
    <div className="f">
      <Field l="Equipment" id="d1"><input id="d1" className="ro" readOnly value={x.item} /></Field>
      <Field l="Product code" id="d2"><input id="d2" className="ro" readOnly value={x.code} /></Field>
      <Field l="Department" id="d3"><input id="d3" className="ro" readOnly value={dept ? dept[0] : x.dept} /></Field>
      <Field l="Location" id="d4"><input id="d4" className="ro" readOnly value={x.room || '—'} /></Field>
      <Field l="Reported by" id="d5"><input id="d5" className="ro" readOnly value={`${x.name} (${x.uid})`} /></Field>
      <Field l="Reported on" id="d6"><input id="d6" className="ro" readOnly value={x.dt} /></Field>
      <Field l="Issue described" id="d7" w><textarea id="d7" className="ro" readOnly rows="3" value={x.issue} /></Field>
    </div>
    {open ? <><h2>Update this repair</h2><div className="f">
      <Field l="Status" id="u1"><select id="u1" value={f.status} onChange={set('status')}>{STATUSES.map(s => <option key={s}>{s}</option>)}</select></Field>
      <Field l="Priority" id="u2"><select id="u2" value={f.priority} onChange={set('priority')}>
        {PRIORITIES.map(p => <option key={p}>{p}</option>)}</select><small className="mut">{PRIORITY_HELP[f.priority]}</small></Field>
      <Field l="Assigned technician" id="u3"><input id="u3" maxLength={100} placeholder="Name of the person or company fixing it" value={f.tech} onChange={set('tech')} /></Field>
      {f.status === 'Resolved' && <Field l="Equipment condition after repair" id="u4"><select id="u4" value={f.cond} onChange={set('cond')}>
        {CONDITIONS.map(c => <option key={c}>{c}</option>)}</select></Field>}
      <Field l="Progress note (shown to the reporter)" id="u5" w><textarea id="u5" rows="2" maxLength={500} value={f.note} onChange={set('note')}
        placeholder="e.g. Waiting for a replacement battery from the supplier." /></Field>
    </div>
      <p className="sub" style={{ marginTop: 8 }}>In Repair marks the unit Under Maintenance, so nobody can borrow it. Moving the request out of that stage puts the unit back in service.</p>
      <div className="err">{err}</div><button className="btn" onClick={save}>Save update</button></>
      : <>{x.tech && <p className="sub">Technician: {x.tech}</p>}<p className="sub">This request is closed{x.done ? ` (${new Date(x.done).toLocaleString()})` : ''}. If the problem comes back, report it again.</p></>}
    <h2>Progress history</h2><Timeline items={x.upd} />
  </div>
}
