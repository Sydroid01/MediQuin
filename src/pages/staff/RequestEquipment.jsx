import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { DEPTS, UNITS } from '../../data'
import { api } from '../../api'
import { useApp } from '../../AppContext'
import Catalog from '../../components/Catalog'
import { Crumb, Field } from '../../ui'

export default function RequestEquipment() {
  const { user, go, act } = useApp()
  const [sp, setSp] = useSearchParams(), sel = sp.get('unit')      // the chosen unit is kept in the URL (?unit=...)
  const setSel = code => setSp(p => { const n = new URLSearchParams(p); n.set('unit', code); return n }, { replace: true })
  const [err, setErr] = useState('')
  const [f, setF] = useState({ qty: 1, dt: '', room: '', dept: user.dept, note: '' })
  const found = UNITS.find(x => x.code === sel), u = found && found.st === 'Available' ? found : null
  const set = k => e => setF({ ...f, [k]: e.target.value })
  const submit = async () => {
    if (!f.dt || !f.room.trim() || +f.qty < 1) { setErr('Add the date and time needed, a room number and a quantity of at least 1.'); return }
    setErr('')
    const res = await act(() => api('/requests', { method: 'POST', body: { code: u.code, qty: +f.qty, iso: f.dt, room: f.room.trim(), dept: f.dept, note: f.note } }),
      x => `Request ${x.id} submitted`, setErr)
    if (res) go('my')
  }
  return <><Crumb>Request Equipment</Crumb><h1>Request equipment</h1>
    <p className="sub">Choose a department, an equipment type, then an available unit.</p>
    <Catalog mode="req" sel={sel} setSel={setSel} />
    {u && <><h2>Request details</h2><div className="card"><div className="f">
      <Field l="Staff ID" id="s1"><input id="s1" className="ro" readOnly value={user.id} /></Field>
      <Field l="Name" id="s2"><input id="s2" className="ro" readOnly value={user.name} /></Field>
      <Field l="Equipment" id="s3"><input id="s3" className="ro" readOnly value={`${u.item} · ${u.code}`} /></Field>
      <Field l="Quantity" id="q1"><input id="q1" type="number" min="1" value={f.qty} onChange={set('qty')} /></Field>
      <Field l="Date and time needed" id="dt"><input id="dt" type="datetime-local" value={f.dt} onChange={set('dt')} /></Field>
      <Field l="Room number" id="rm"><input id="rm" placeholder="e.g. ER-204" value={f.room} onChange={set('room')} /></Field>
      <Field l="Hospital department" id="dp"><select id="dp" value={f.dept} onChange={set('dept')}>
        {DEPTS.map(d => <option key={d[0]}>{d[0]}</option>)}</select></Field>
      <Field l="Other details" id="nt" w><textarea id="nt" rows="2" value={f.note} onChange={set('note')} placeholder="Patient care need, urgency, accessories…" /></Field>
    </div><div className="err">{err}</div><button className="btn" onClick={submit}>Submit request</button></div></>}
  </>
}
