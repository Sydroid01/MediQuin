import { LOG } from '../../data'
import { Crumb, Tbl } from '../../ui'

export default function AuditLogs() {
  return <><Crumb>Audit Logs</Crumb><h1>Audit logs</h1>
    <p className="sub">Read-only record of every transaction. Entries can't be edited or deleted.</p>
    <Tbl head={['Time', 'User', 'Action', 'Details']} empty="No activity yet." rows={LOG.map((l, i) => <tr key={i}><td>{l.t}</td><td>{l.who}</td><td>{l.a}</td><td>{l.x}</td></tr>)} /></>
}
