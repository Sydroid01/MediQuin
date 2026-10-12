import { REQ, FLOW } from '../../data'
import { useApp } from '../../AppContext'
import { Badge, Crumb, Empty, Tbl } from '../../ui'

export default function MyRequests() {
  const { user } = useApp()
  const r = REQ.filter(x => x.uid === user.id)
  return <><Crumb>Requested Equipment Status</Crumb><h1>Requested equipment status</h1>
    <p className="sub">Requested → Preparing → Ready for Pickup → In Use → Returned</p>
    {r.length ? <Tbl head={['Request', 'Equipment', 'Needed', 'Room', 'Progress']} empty="" rows={r.map(x => (
      <tr key={x.id}><td>{x.id}</td><td>{x.item}<br /><small style={{ color: 'var(--mut)' }}>{x.code}</small></td><td>{x.dt}</td><td>{x.room}</td>
        <td>{x.rej ? <Badge s="Rejected" /> : <div className="steps">{FLOW.map((s, i) => <i key={s} className={i <= FLOW.indexOf(x.st) ? 'on' : ''}>{s}</i>)}</div>}</td></tr>))} />
      : <Empty>You haven't requested anything yet. Use Request Equipment to start.</Empty>}</>
}
