import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { DEPTS, INV, CONDITIONS, UNIT_STATUSES, warrantyState, fmtDay } from '../../data'
import { api } from '../../api'
import { useApp } from '../../AppContext'
import { PATH } from '../../nav'
import { Badge, Crumb, Field, Tbl } from '../../ui'

const enc = encodeURIComponent
const BLANK = { code: '', eq: '', serial: '', brand: '', model: '', supplier: '', bought: '', warranty: '', cond: 'Good', status: 'Available' }
const deptOf = c => DEPTS.find(d => d[1] === c)

// Medical equipment inventory: one row per physical unit. Admin can add and edit; Custodian can only view.
export default function EquipmentInventory() {
  const { user, act } = useApp(), nav = useNavigate(), admin = user.role === 'Admin'
  const [q, setQ] = useState(''), [fd, setFd] = useState(''), [fs, setFs] = useState(''), [fc, setFc] = useState(''), [fw, setFw] = useState(''), [limit, setLimit] = useState(100)
  const [f, setF] = useState(null), [err, setErr] = useState('')                   // f = the add/edit form (null = closed); f.code is '' when adding
  const pairs = DEPTS.flatMap(D => D[2].map(it => ({ dept: D[1], item: it, label: `${it} (${D[1]})` })))
  const suppliers = [...new Set(['Philippine Medical Supplies', ...INV.map(u => u.supplier).filter(Boolean)])].sort()

  const wState = u => warrantyState(u.warranty)
  const list = INV.filter(u => (!fd || u.dept === fd) && (!fs || u.status === fs) && (!fc || u.cond === fc) && (!fw || wState(u) === fw)
    && [u.item, u.code, u.serial, u.brand, u.model, u.supplier].join(' ').toLowerCase().includes(q.toLowerCase()))
  const n = s => INV.filter(u => wState(u) === s).length

  const open = u => {
    setErr(''); window.scrollTo({ top: 0 })
    setF(u ? { ...BLANK, ...u, eq: `${u.dept}|${u.item}` } : { ...BLANK, eq: pairs[0] ? `${pairs[0].dept}|${pairs[0].item}` : '' })
  }
  const set = k => e => setF({ ...f, [k]: e.target.value })
  const save = async () => {
    const adding = !f.code, cut = f.eq.indexOf('|')
    if (adding && cut < 0) { setErr('Choose the equipment. Add equipment types under Manage Equipment first.'); return }
    if (f.bought && f.warranty && f.warranty < f.bought) { setErr('The warranty cannot expire before the date purchased.'); return }
    const sn = f.serial.trim()
    if (sn && INV.some(u => u.serial === sn && u.code !== f.code)) { setErr('That serial number is already recorded for another unit.'); return }
    setErr('')
    const d = { serial: sn, brand: f.brand.trim(), model: f.model.trim(), supplier: f.supplier.trim(), bought: f.bought, warranty: f.warranty, cond: f.cond }
    const res = await act(() => adding ? api('/units', { method: 'POST', body: { dept: f.eq.slice(0, cut), item: f.eq.slice(cut + 1), ...d } })
      : api(`/inventory/${enc(f.code)}`, { method: 'PATCH', body: { ...d, status: f.status } }), r => adding ? `Added ${r.code}` : 'Inventory details saved', setErr)
    if (res) setF(null)
  }

  return <><Crumb>Equipment Inventory</Crumb><h1>Equipment inventory</h1>
    <p className="sub">{INV.length} units · <b>{n('Active')}</b> under warranty · <b>{n('Expiring Soon')}</b> expiring within 90 days · <b>{n('Expired')}</b> out of warranty.
      {admin ? ' To rename or delete equipment, use Manage Equipment.' : ' View only. Ask an Admin to change inventory details.'}</p>
    {admin && <div className="bar"><button className="btn" onClick={() => open(null)}>Add equipment unit</button></div>}
    {f && <div className="card" style={{ marginBottom: 18 }}><h2 style={{ marginTop: 0 }}>{f.code ? `Edit ${f.code}` : 'Add equipment unit'}</h2><div className="f">
      <Field l="Equipment name" id="ie">{f.code ? <input id="ie" className="ro" readOnly value={f.item} /> :
        <select id="ie" value={f.eq} onChange={set('eq')}>{pairs.map(p => <option key={p.label} value={`${p.dept}|${p.item}`}>{p.label}</option>)}</select>}</Field>
      <Field l="Equipment ID (product code)" id="ii"><input id="ii" className="ro" readOnly value={f.code || ''} placeholder="Assigned automatically when saved" /></Field>
      <Field l="Serial number" id="is"><input id="is" maxLength={60} value={f.serial} onChange={set('serial')} placeholder="Manufacturer's serial number" /></Field>
      <Field l="Brand" id="ib"><input id="ib" maxLength={100} value={f.brand} onChange={set('brand')} /></Field>
      <Field l="Model" id="im"><input id="im" maxLength={100} value={f.model} onChange={set('model')} /></Field>
      <Field l="Supplier" id="ip"><input id="ip" list="suppliers" maxLength={150} value={f.supplier} onChange={set('supplier')} placeholder="e.g. Philippine Medical Supplies" />
        <datalist id="suppliers">{suppliers.map(s => <option key={s} value={s} />)}</datalist></Field>
      <Field l="Date purchased" id="id"><input id="id" type="date" value={f.bought} onChange={set('bought')} /></Field>
      <Field l="Warranty expiration" id="iw"><input id="iw" type="date" value={f.warranty} min={f.bought || undefined} onChange={set('warranty')} /></Field>
      <Field l="Condition" id="ic"><select id="ic" value={f.cond} onChange={set('cond')}>{CONDITIONS.map(c => <option key={c}>{c}</option>)}</select></Field>
      {f.code && <Field l="Status" id="it"><select id="it" value={f.status} onChange={set('status')}>{UNIT_STATUSES.map(s => <option key={s}>{s}</option>)}</select></Field>}
    </div><div className="err">{err}</div>
      <button className="btn" onClick={save}>Save</button> <button className="btn alt" onClick={() => setF(null)}>Cancel</button></div>}

    <div className="bar">
      <input placeholder="Search name, ID, serial, brand, model, supplier" value={q} onChange={e => { setQ(e.target.value); setLimit(100) }} aria-label="Search" style={{ minWidth: 280 }} />
      <select value={fd} onChange={e => setFd(e.target.value)} aria-label="Department"><option value="">All departments</option>{DEPTS.map(d => <option key={d[1]} value={d[1]}>{d[0]}</option>)}</select>
      <select value={fs} onChange={e => setFs(e.target.value)} aria-label="Status"><option value="">All statuses</option>{UNIT_STATUSES.map(s => <option key={s}>{s}</option>)}</select>
      <select value={fc} onChange={e => setFc(e.target.value)} aria-label="Condition"><option value="">All conditions</option>{CONDITIONS.map(c => <option key={c}>{c}</option>)}</select>
      <select value={fw} onChange={e => setFw(e.target.value)} aria-label="Warranty"><option value="">Any warranty</option>
        {['Active', 'Expiring Soon', 'Expired', 'No warranty info'].map(s => <option key={s}>{s}</option>)}</select>
    </div>
    <div className="inv"><Tbl head={['ID', 'Equipment', 'Serial no.', 'Brand / Model', 'Supplier', 'Purchased', 'Warranty until', 'Condition / Status', '']} empty="No equipment matches. Clear a filter to see more."
      rows={list.slice(0, limit).map(u => {
        const w = wState(u)
        return <tr key={u.code}>
          <td className="nowrap">{u.code}</td><td>{u.item}<br /><small className="mut">{deptOf(u.dept)?.[1] || u.dept}</small></td>
          <td>{u.serial || '—'}</td><td>{u.brand || '—'}{u.model && <><br /><small className="mut">{u.model}</small></>}</td>
          <td>{u.supplier || '—'}</td><td className="nowrap">{fmtDay(u.bought)}</td>
          <td className="nowrap">{fmtDay(u.warranty)}{u.warranty && <><br /><Badge s={w} /></>}</td>
          <td><div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-start' }}><Badge s={u.cond} /><Badge s={u.status} /></div></td>
          <td><div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-start' }}>
            {admin && <button className="btn sm alt" onClick={() => open(u)}>Edit</button>}
            <button className="btn sm alt nowrap" title="Report a problem with this unit" aria-label={`Report a problem with ${u.code}`} onClick={() => nav(`${PATH.report}?unit=${enc(u.code)}`)}>Report</button></div></td></tr>
      })} /></div>
    <p className="sub" style={{ marginTop: 8 }}>Showing {Math.min(limit, list.length)} of {list.length} units.{' '}
      {list.length > limit && <a onClick={() => setLimit(limit + 100)}>Show more</a>}</p></>
}
