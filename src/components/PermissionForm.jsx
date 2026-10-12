import { useState } from 'react'
import { DEPTS, UNITS, USERS, FLOW } from '../data'
import { api } from '../api'
import { useApp } from '../AppContext'
import { Field } from '../ui'

const unitOpts = v => { const [d, i] = v.split('|'); return UNITS.filter(u => u.d === +d && u.item === i && u.st === 'Available').map(u => u.code) }

// Moves a request to its next stage on the server (which also updates the unit's status and the audit log).
// `edits` are optional corrections to the request details, accepted only while it is still "Requested".
const advance = (act, id, edits, onErr) =>
  act(() => api(`/requests/${id}/advance`, { method: 'POST', body: edits }), x => x.st === 'Preparing' ? 'Request approved' : 'Status: ' + x.st, onErr)

// x = the existing staff request, or undefined for a walk-in.
export default function PermissionForm({ x }) {
  const { go, act } = useApp()
  const open = !x || x.st === 'Requested', nx = x && FLOW[FLOW.indexOf(x.st) + 1]
  const [f, setF] = useState(x ? { uid: x.uid, name: x.name, qty: x.qty, iso: x.iso, room: x.room, dept: x.dept, note: x.note || '' }
    : { uid: '', name: '', qty: 1, iso: '', room: '', dept: DEPTS[0][0], note: '' })
  const [eq, setEq] = useState('0|' + DEPTS[0][2][0]), [code, setCode] = useState(''), [err, setErr] = useState('')
  const set = k => e => setF({ ...f, [k]: e.target.value }), ro = open ? {} : { readOnly: true, className: 'ro' }
  const opts = unitOpts(eq), c = opts.includes(code) ? code : opts[0] || ''
  const setId = e => {
    const v = e.target.value, u = USERS.find(y => y.id.toLowerCase() === v.trim().toLowerCase())
    setF({ ...f, uid: v, ...(u ? { name: u.name, dept: DEPTS.some(d => d[0] === u.dept) ? u.dept : f.dept } : {}) })
  }
  const save = async () => {
    const q = +f.qty
    if (!f.uid.trim() || !f.name.trim() || !f.room.trim() || !f.iso || q < 1) { setErr('Fill in the staff ID, name, quantity, date and time needed, and room number.'); return }
    const d = { uid: f.uid.trim(), name: f.name.trim(), qty: q, iso: f.iso, room: f.room.trim(), dept: f.dept, note: f.note }
    setErr('')
    if (x) { await advance(act, x.id, d, setErr); return }
    if (!c) { setErr('No units of this equipment are available. Choose another equipment.'); return }
    const res = await act(() => api('/requests/walkin', { method: 'POST', body: { ...d, code: c } }), 'Request approved', setErr)
    if (res) go('perm', res.id)
  }
  const reject = async () => { if (await act(() => api(`/requests/${x.id}/reject`, { method: 'POST' }), 'Request rejected')) go('queue') }
  return <div className="card"><div className="f">
    <Field l="Staff ID number" id="pi"><input id="pi" value={f.uid} onChange={x ? set('uid') : setId} {...ro} /></Field>
    <Field l="Name" id="pn"><input id="pn" value={f.name} onChange={set('name')} {...ro} /></Field>
    {x ? <>
      <Field l="Equipment requested" id="pe"><input id="pe" className="ro" readOnly value={x.item} /></Field>
      <Field l="Product code" id="pc"><input id="pc" className="ro" readOnly value={x.code} /></Field></> : <>
      <Field l="Equipment requested" id="pe"><select id="pe" value={eq} onChange={e => setEq(e.target.value)}>
        {DEPTS.map((d, di) => <optgroup key={d[0]} label={d[0]}>{d[2].map(it => <option key={it} value={`${di}|${it}`}>{it}</option>)}</optgroup>)}</select></Field>
      <Field l="Product code (available units)" id="pc"><select id="pc" value={c} onChange={e => setCode(e.target.value)}>
        {opts.length ? opts.map(o => <option key={o}>{o}</option>) : <option value="">No units available</option>}</select></Field></>}
    <Field l="Quantity" id="pq"><input id="pq" type="number" min="1" value={f.qty} onChange={set('qty')} {...ro} /></Field>
    <Field l="Date and time needed" id="pd"><input id="pd" type="datetime-local" value={f.iso} onChange={set('iso')} {...ro} /></Field>
    <Field l="Room number" id="pr"><input id="pr" value={f.room} onChange={set('room')} {...ro} /></Field>
    <Field l="Hospital department" id="pp"><select id="pp" value={f.dept} disabled={!open} onChange={set('dept')}>
      {DEPTS.map(d => <option key={d[0]}>{d[0]}</option>)}</select></Field>
    <Field l="Other important details" id="pt" w><textarea id="pt" rows="2" value={f.note} onChange={set('note')} {...ro} /></Field>
  </div><div className="err">{err}</div>
    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
      {open ? <><button className="btn" onClick={save}>{x ? 'Approve request' : 'Approve walk-in request'}</button>
        {x && <button className="btn bad" onClick={reject}>Reject</button>}</>
        : nx && <button className="btn" onClick={() => advance(act, x.id)}>Mark as {nx}</button>}
    </div></div>
}
