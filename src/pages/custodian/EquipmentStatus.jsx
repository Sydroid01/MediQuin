import { useState } from 'react'
import { DEPTS, UNITS } from '../../data'
import { Badge, Crumb, Tbl } from '../../ui'

export default function EquipmentStatus() {
  const [q, setQ] = useState(''), [fd, setFd] = useState(''), [fs, setFs] = useState('')
  const us = UNITS.filter(u => (!fd || DEPTS[u.d][0] === fd) && (!fs || u.st === fs) && (u.item + u.code).toLowerCase().includes(q.toLowerCase())).slice(0, 80)
  return <><Crumb>View Equipment Status</Crumb><h1>Equipment status</h1>
    <p className="sub">Search by name or code, or filter by department and status.</p>
    <div className="bar">
      <input placeholder="Search equipment or code" value={q} onChange={e => setQ(e.target.value)} aria-label="Search" />
      <select value={fd} onChange={e => setFd(e.target.value)} aria-label="Department"><option value="">All departments</option>{DEPTS.map(d => <option key={d[0]}>{d[0]}</option>)}</select>
      <select value={fs} onChange={e => setFs(e.target.value)} aria-label="Status"><option value="">All statuses</option>{['Available', 'In Use', 'Under Maintenance'].map(s => <option key={s}>{s}</option>)}</select>
    </div>
    <Tbl head={['Code', 'Equipment', 'Department', 'Status']} empty="No equipment matches. Clear a filter to see more."
      rows={us.map(u => <tr key={u.code}><td>{u.code}</td><td>{u.item}</td><td>{DEPTS[u.d][1]}</td><td><Badge s={u.st} /></td></tr>)} />
    <p className="sub" style={{ marginTop: 8 }}>Showing up to 80 units.</p></>
}
