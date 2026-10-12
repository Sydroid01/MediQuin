import { Navigate, useParams } from 'react-router-dom'
import { REQ } from '../../data'
import { useApp } from '../../AppContext'
import PermissionForm from '../../components/PermissionForm'
import { Badge, Crumb, Tbl } from '../../ui'

// /custodian/permission = walk-in form.  /custodian/permission/REQ-0007 = review that request.
export default function EquipmentPermission() {
  const { go } = useApp(), { rid } = useParams(), x = REQ.find(r => r.id === rid)
  if (rid && !x) return <Navigate to="/custodian/permission" replace />      // unknown or removed request number
  return <><Crumb>Equipment Permission</Crumb><h1>Equipment permission</h1>
    <p className="sub">{x ? 'Filled in from the staff request. Review or correct any detail, then approve.' : 'Walk-in request? Enter the details here, then approve.'}</p>
    {x && <div className="bar"><button className="btn alt sm" onClick={() => go('perm')}>New walk-in request</button><Badge s={x.rej ? 'Rejected' : x.st} /></div>}
    <PermissionForm key={rid || 'new'} x={x} />
    <h2>Active requests</h2>
    <Tbl head={['Request', 'Staff', 'Equipment', 'Status', '']} empty="No active requests."
      rows={REQ.filter(r => !r.rej && r.st !== 'Returned').map(r => (
        <tr key={r.id}><td>{r.id}</td><td>{r.name}</td><td>{r.item} <small>({r.code})</small></td><td><Badge s={r.st} /></td>
          <td><button className="btn sm alt" onClick={() => go('perm', r.id)}>Open</button></td></tr>))} /></>
}
