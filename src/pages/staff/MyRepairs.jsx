import { Fragment, useState } from 'react'
import { REPAIRS } from '../../data'
import { useApp } from '../../AppContext'
import { Badge, Crumb, Empty, RepairSteps, Tbl, Timeline } from '../../ui'

export default function MyRepairs() {
  const { user, go } = useApp(), [open, setOpen] = useState(null)
  const r = REPAIRS.filter(x => x.uid === user.id)
  return <><Crumb>My Repair Requests</Crumb><h1>My repair requests</h1>
    <p className="sub">Reported → Under Review → In Repair → Resolved. Open Details to see every update.</p>
    <div className="bar"><button className="btn sm" onClick={() => go('report')}>Report a problem</button></div>
    {r.length ? <Tbl head={['Request', 'Equipment', 'Problem', 'Priority', 'Progress', '']} empty="" rows={r.map(x => <Fragment key={x.id}>
      <tr><td>{x.id}<br /><small className="mut">{x.dt}</small></td>
        <td>{x.item}<br /><small className="mut">{x.code}</small></td>
        <td className="clip" title={x.issue}>{x.issue}</td>
        <td><Badge s={x.pri} /></td>
        <td><RepairSteps st={x.st} />{x.tech && <small className="mut">Technician: {x.tech}</small>}</td>
        <td><button className="btn sm alt" onClick={() => setOpen(open === x.id ? null : x.id)}>{open === x.id ? 'Hide' : 'Details'}</button></td></tr>
      {open === x.id && <tr><td colSpan={6}>
        <b>Problem</b><p style={{ margin: '2px 0 8px', whiteSpace: 'pre-wrap' }}>{x.issue}</p>
        {x.room && <p className="mut" style={{ margin: '0 0 8px' }}>Location: {x.room}</p>}
        <b>Progress</b><Timeline items={x.upd} /></td></tr>}
    </Fragment>)} />
      : <Empty>You haven't reported any problems. Use Report a Problem if equipment is faulty or damaged.</Empty>}</>
}
