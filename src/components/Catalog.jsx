import { useSearchParams } from 'react-router-dom'
import { DEPTS, UNITS } from '../data'
import { Badge, Tbl } from '../ui'

// Department / equipment drill-down lives in the URL (?dept=ER&item=...), so a reload keeps you where you were
// and the browser's Back button steps back up a level.
export function useDrill() {
  const [sp, setSp] = useSearchParams()
  const i = DEPTS.findIndex(x => x[1] === sp.get('dept')), D = DEPTS[i] || null
  const e = D && D[2].includes(sp.get('item')) ? sp.get('item') : null
  const pick = (dept, item) => setSp({ ...(dept && { dept }), ...(item && { item }) })
  return { d: D ? i : null, D, e, pick }
}

export const DeptGrid = ({ onPick }) => (
  <div className="grid">{DEPTS.map((x, i) => {
    const us = UNITS.filter(u => u.d === i)
    return <button key={x[0]} className="dcard" onClick={() => onPick(i)}><b>{x[0]}</b>
      <small>{x[2].length} equipment types · {us.filter(u => u.st === 'Available').length}/{us.length} available</small></button>
  })}</div>
)

// Department -> equipment -> unit browser. mode "req" adds a radio button to pick a unit.
export default function Catalog({ mode, sel, setSel }) {
  const { d, D, e, pick } = useDrill()
  if (d === null) return <DeptGrid onPick={i => pick(DEPTS[i][1])} />
  const back = <div className="crumb"><a onClick={() => pick()}>Departments</a> / {D[0]}{e && ` / ${e}`}</div>
  if (!e) return <>{back}<div className="grid">{D[2].map(it => {
    const us = UNITS.filter(u => u.item === it && u.d === d)
    return <button key={it} className="dcard" onClick={() => pick(D[1], it)}><b>{it}</b>
      <small>Quantity {us.length} · {us.filter(u => u.st === 'Available').length} available</small></button>
  })}</div></>
  const us = UNITS.filter(u => u.item === e && u.d === d)
  return <>{back}
    <div className="card" style={{ marginBottom: 16 }}><b>{e}</b> has a quantity of <b>{us.length}</b>.</div>
    <Tbl head={['', 'Product code', 'Status']} empty="No units." rows={us.map(u => (
      <tr key={u.code}>
        <td>{mode === 'req' && <input type="radio" name="u" style={{ width: 'auto' }} disabled={u.st !== 'Available'}
          checked={sel === u.code} onChange={() => setSel(u.code)} aria-label={`Select ${u.code}`} />}</td>
        <td>{u.code}</td><td><Badge s={u.st} /></td>
      </tr>))} /></>
}
