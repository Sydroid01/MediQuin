import { REQ } from '../../data'
import { useApp } from '../../AppContext'
import { Crumb, Empty } from '../../ui'

export default function RequestQueue() {
  const { go } = useApp()
  const q = REQ.filter(r => r.st === 'Requested' && !r.rej)
  return <><Crumb>Request Queue</Crumb><h1>Request queue</h1><p className="sub">Open a request to review and approve it.</p>
    {q.length ? <div className="grid">{q.map(x => (
      <button key={x.id} className="dcard" onClick={() => go('perm', x.id)}><b>{x.name} requested {x.item}</b>
        <small>{x.id} · needed {x.dt} · Room {x.room}</small></button>))}</div>
      : <Empty>The queue is clear. New staff requests appear here.</Empty>}</>
}
