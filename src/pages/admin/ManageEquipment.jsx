import { useState } from 'react'
import { DEPTS, UNITS } from '../../data'
import { api } from '../../api'
import { useApp } from '../../AppContext'
import { DeptGrid, useDrill } from '../../components/Catalog'
import { Badge, Crumb, Field, Tbl } from '../../ui'

const enc = encodeURIComponent

// Which department / equipment type is open is kept in the URL (?dept=ER&item=...), so a reload stays on it.
export default function ManageEquipment() {
  const { toast, act } = useApp(), { d, D, e, pick } = useDrill()
  const [ed, setEd] = useState(null), [cf, setCf] = useState(null)
  const [tmp, setTmp] = useState(''), [nn, setNn] = useState(''), [nq, setNq] = useState(1)
  // Runs one API call, then closes any open edit/confirm state (kept open if the server refused, so the message can be read).
  const run = async (fn, ok) => { const r = await act(fn, ok); setCf(null); if (r) setEd(null); return r }
  const nav = (dept, item) => { pick(dept, item); setEd(null); setCf(null) }
  const head = <><Crumb>Manage Equipment</Crumb><h1>Manage equipment</h1>
    <p className="sub">Add, edit and delete equipment and its units. Start with a department.</p></>
  if (d === null) return <>{head}<DeptGrid onPick={i => nav(DEPTS[i][1])} /></>
  const back = <div className="crumb"><a onClick={() => nav()}>Departments</a> / {D[0]}{e && ` / ${e}`}</div>

  if (!e) {
    const addT = async () => {
      const n = nn.trim(), q = Math.floor(+nq)
      if (!n) return toast('Enter an equipment name'); if (D[2].includes(n)) return toast('That equipment already exists here')
      if (!(q >= 0 && q <= 100)) return toast('Quantity must be 0 to 100')
      if (await run(() => api(`/departments/${D[1]}/equipment`, { method: 'POST', body: { name: n, qty: q } }), 'Equipment added')) setNn('')
    }
    const rename = i => {
      const old = D[2][i], n = tmp.trim()
      if (!n) return toast('Enter an equipment name'); if (n !== old && D[2].includes(n)) return toast('That equipment already exists here')
      run(() => api(`/departments/${D[1]}/equipment`, { method: 'PATCH', body: { from: old, to: n } }), 'Equipment updated')
    }
    const delT = i => {
      const it = D[2][i]; if (cf !== 't' + i) return setCf('t' + i)
      run(() => api(`/departments/${D[1]}/equipment?name=${enc(it)}`, { method: 'DELETE' }), 'Equipment deleted')
    }
    return <>{head}{back}
      <div className="card" style={{ marginBottom: 16 }}><div className="f">
        <Field l="New equipment name" id="an"><input id="an" placeholder="e.g. Portable Suction Machine" value={nn} onChange={x => setNn(x.target.value)} /></Field>
        <Field l="Quantity (units to create)" id="aq"><input id="aq" type="number" min="0" max="100" value={nq} onChange={x => setNq(x.target.value)} /></Field>
      </div><div style={{ marginTop: 12 }}><button className="btn" onClick={addT}>Add equipment</button></div></div>
      <Tbl head={['Equipment', 'Quantity', 'Available', '']} empty="No equipment in this department yet. Add one above." rows={D[2].map((it, i) => {
        const us = UNITS.filter(u => u.d === d && u.item === it), on = ed === 't' + i
        return <tr key={it}><td>{on ? <input value={tmp} onChange={x => setTmp(x.target.value)} aria-label="Equipment name" /> : it}</td>
          <td>{us.length}</td><td>{us.filter(u => u.st === 'Available').length}</td>
          <td style={{ whiteSpace: 'nowrap' }}>{on ? <><button className="btn sm" onClick={() => rename(i)}>Save</button>{' '}<button className="btn sm alt" onClick={() => setEd(null)}>Cancel</button></> : <>
            <button className="btn sm" onClick={() => nav(D[1], it)}>Open units</button>{' '}
            <button className="btn sm alt" onClick={() => { setEd('t' + i); setTmp(it); setCf(null) }}>Edit</button>{' '}
            <button className="btn sm bad" onClick={() => delT(i)}>{cf === 't' + i ? 'Confirm delete' : 'Delete'}</button></>}</td></tr>
      })} /></>
  }

  const us = UNITS.filter(u => u.d === d && u.item === e)
  const setSt = (c, s) => run(() => api(`/units/${enc(c)}`, { method: 'PATCH', body: { status: s } }), 'Status updated')
  const addU = () => run(() => api('/units', { method: 'POST', body: { dept: D[1], item: e } }), 'Unit added')
  const saveU = old => {
    const n = tmp.trim(); if (!n) return toast('Enter a product code'); if (n !== old && UNITS.some(u => u.code === n)) return toast('That product code is already in use')
    run(() => api(`/units/${enc(old)}`, { method: 'PATCH', body: { code: n } }), 'Unit updated')
  }
  const delU = c => {
    if (cf !== 'u' + c) return setCf('u' + c)
    run(() => api(`/units/${enc(c)}`, { method: 'DELETE' }), 'Unit deleted')
  }
  return <>{head}{back}
    <div className="card" style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
      <span><b>{e}</b> has a quantity of <b>{us.length}</b>.</span><button className="btn sm" onClick={addU}>Add unit</button></div>
    <Tbl head={['Product code', 'Status', 'Reason', 'Change status', '']} empty="No units yet. Add a unit to start." rows={us.map(u => {
      const on = ed === 'u' + u.code
      return <tr key={u.code}><td>{on ? <input value={tmp} onChange={x => setTmp(x.target.value)} aria-label="Product code" /> : u.code}</td>
        <td>{u.st === 'Available' ? <Badge s="Available" /> : <span className="badge s-Rejected">Not Available</span>}</td>
        <td>{u.st === 'Available' ? '—' : u.st}</td>
        <td><select style={{ width: 'auto', padding: '4px 8px' }} value={u.st} onChange={x => setSt(u.code, x.target.value)} aria-label={`Status of ${u.code}`}>
          {['Available', 'In Use', 'Under Maintenance'].map(s => <option key={s}>{s}</option>)}</select></td>
        <td style={{ whiteSpace: 'nowrap' }}>{on ? <><button className="btn sm" onClick={() => saveU(u.code)}>Save</button>{' '}<button className="btn sm alt" onClick={() => setEd(null)}>Cancel</button></> : <>
          <button className="btn sm alt" onClick={() => { setEd('u' + u.code); setTmp(u.code); setCf(null) }}>Edit</button>{' '}
          <button className="btn sm bad" onClick={() => delU(u.code)}>{cf === 'u' + u.code ? 'Confirm delete' : 'Delete'}</button></>}</td></tr>
    })} /></>
}
