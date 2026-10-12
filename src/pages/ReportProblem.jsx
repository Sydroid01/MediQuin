import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { DEPTS, UNITS, PRIORITIES, PRIORITY_HELP } from '../data'
import { api } from '../api'
import { useApp } from '../AppContext'
import { Crumb, Empty, Field } from '../ui'

// Open to every signed-in role. /report-problem?unit=ER-01-003 opens the form with that unit already chosen.
export default function ReportProblem() {
  const { user, go, act } = useApp(), [sp] = useSearchParams(), pre = UNITS.find(u => u.code === sp.get('unit'))
  const first = DEPTS.flatMap((D, di) => D[2].map(it => `${di}|${it}`))[0]
  const [eq, setEq] = useState(pre ? `${pre.d}|${pre.item}` : first), [code, setCode] = useState(pre ? pre.code : '')
  const [f, setF] = useState({ issue: '', priority: 'Medium', room: '' }), [err, setErr] = useState('')
  const set = k => e => setF({ ...f, [k]: e.target.value })
  if (!first) return <><Crumb>Report a Problem</Crumb><h1>Report a problem</h1><Empty>No equipment has been set up yet.</Empty></>

  const cut = eq.indexOf('|'), d = +eq.slice(0, cut), item = eq.slice(cut + 1)
  const units = UNITS.filter(u => u.d === d && u.item === item), c = units.some(u => u.code === code) ? code : units[0]?.code || ''
  const submit = async () => {
    if (!c) { setErr('That equipment has no units yet. Choose another equipment.'); return }
    if (f.issue.trim().length < 5) { setErr('Describe what is wrong with the equipment.'); return }
    setErr('')
    const res = await act(() => api('/repairs', { method: 'POST', body: { code: c, issue: f.issue.trim(), priority: f.priority, room: f.room.trim() } }),
      x => `Repair request ${x.id} submitted`, setErr)
    if (res) user.role === 'Staff' ? go('myrep') : go('rep', res.id)
  }
  return <><Crumb>Report a Problem</Crumb><h1>Report a problem</h1>
    <p className="sub">Tell us which equipment has a problem and what is wrong. If it is unsafe to use, choose Critical and stop using it.</p>
    <div className="card"><div className="f">
      <Field l="Reported by" id="rb"><input id="rb" className="ro" readOnly value={`${user.name} (${user.id})`} /></Field>
      <Field l="Equipment" id="re"><select id="re" value={eq} onChange={e => setEq(e.target.value)}>
        {DEPTS.map((D, di) => D[2].length > 0 && <optgroup key={D[0]} label={D[0]}>{D[2].map(it => <option key={it} value={`${di}|${it}`}>{it}</option>)}</optgroup>)}</select></Field>
      <Field l="Product code (which unit?)" id="rc"><select id="rc" value={c} onChange={e => setCode(e.target.value)}>
        {units.length ? units.map(u => <option key={u.code} value={u.code}>{u.code} · {u.st}</option>) : <option value="">No units</option>}</select></Field>
      <Field l="Where is it? (room or location)" id="rr"><input id="rr" placeholder="e.g. ER-204" value={f.room} onChange={set('room')} /></Field>
      <Field l="Repair priority" id="rp"><select id="rp" value={f.priority} onChange={set('priority')}>
        {PRIORITIES.map(p => <option key={p}>{p}</option>)}</select><small className="mut">{PRIORITY_HELP[f.priority]}</small></Field>
      <Field l="Describe the issue" id="ri" w><textarea id="ri" rows="4" maxLength={1000} value={f.issue} onChange={set('issue')}
        placeholder="What happened? What is not working? Any error message, noise or damage you noticed?" /></Field>
    </div><div className="err">{err}</div><button className="btn" onClick={submit}>Submit repair request</button></div></>
}
