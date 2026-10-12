import { Link } from 'react-router-dom'
import { ICON, REPAIR_FLOW } from './data'
export const Ic = ({ n }) => <svg viewBox="0 0 24 24" dangerouslySetInnerHTML={{ __html: ICON[n] }} />
export const Badge = ({ s }) => <span className={`badge s-${s.replace(/ /g, '-')}`}>{s}</span>
export const Crumb = ({ children }) => <div className="crumb"><Link to="/">Dashboard</Link> / {children}</div>
export const Empty = ({ children }) => <div className="card empty">{children}</div>
export const Field = ({ l, id, w, children }) => <div className={w ? 'w' : ''}><label htmlFor={id}>{l}</label>{children}</div>
export const Tbl = ({ head, rows, empty }) => (
  <div className="tw"><table>
    <thead><tr>{head.map((h, i) => <th key={i}>{h}</th>)}</tr></thead>
    <tbody>{rows.length ? rows : <tr><td colSpan={head.length} className="empty">{empty}</td></tr>}</tbody>
  </table></div>
)

// Repair progress: Reported > Under Review > In Repair > Resolved (a repair closed without a fix shows as "Dismissed").
export const RepairSteps = ({ st }) => st === 'Dismissed' ? <Badge s="Dismissed" /> :
  <div className="steps">{REPAIR_FLOW.map((s, i) => <i key={s} className={i <= REPAIR_FLOW.indexOf(st) ? 'on' : ''}>{s}</i>)}</div>

// Progress history of a repair, newest first. items = [{ ev, note, by, dt }]
export const Timeline = ({ items }) => <ol className="tl">{[...items].reverse().map((u, i) => (
  <li key={i}><b>{u.ev || 'Note added'}</b>{u.note && <p>{u.note}</p>}<small>{u.by} · {u.dt}</small></li>))}</ol>
