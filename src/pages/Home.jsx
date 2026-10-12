import { UNITS, REQ, DEPTS, HERO, REPAIRS, REPAIR_OPEN } from '../data'
import { useApp } from '../AppContext'
import { TASKS, LATEST } from '../nav'
import { Ic } from '../ui'

export default function Home() {
  const { user, go } = useApp()
  const T = TASKS[user.role], c = s => UNITS.filter(u => u.st === s).length
  const rq = (user.role === 'Staff' ? REQ.filter(r => r.uid === user.id) : REQ).slice(0, 3), nv = LATEST[user.role]
  return <>
    <section className="hero"><div className="art"><svg viewBox="0 0 400 260" preserveAspectRatio="xMidYMid slice" aria-hidden="true" dangerouslySetInnerHTML={{ __html: HERO }} /></div>
      <div className="msg"><p>{c('Available')} of {UNITS.length} units are ready across {DEPTS.length} departments.</p>
        <a onClick={() => go(T[0][0])}>Start with {T[0][1]} →</a></div></section>
    <section className="panel">
      <div><h3>At a glance</h3><div className="box">{[['Available', 'Available'], ['In Use', 'In use'], ['Under Maintenance', 'In maintenance']].map(x =>
        <div className="row" key={x[0]}><span>{x[1]}</span><b>{c(x[0])}</b></div>)}
        <div className="row"><span>{user.role === 'Staff' ? 'Your open repairs' : 'Open repairs'}</span><b>{REPAIRS.filter(r => REPAIR_OPEN.includes(r.st)).length}</b></div></div></div>
      <div><h3>Your tasks</h3><div className="tiles">{T.map(t => <button key={t[0]} className="tile" onClick={() => go(t[0])}>
        <span className="ph"><Ic n={t[3]} /></span><b>{t[1]}</b><small>{t[2]}</small></button>)}</div></div>
      <div><h3>Requests</h3><div className="box blog">
        {rq.map(x => <a key={x.id} onClick={() => go(nv)}>{x.item}<i>{x.id} · {x.dt}</i></a>)}
        {!rq.length && <p className="sub" style={{ margin: 0 }}>No requests yet.</p>}
        <a onClick={() => go(nv)} style={{ border: 0 }}>View all updates</a></div></div>
    </section></>
}
