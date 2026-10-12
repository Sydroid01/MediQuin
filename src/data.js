import { api } from './api'
export const ICON={users:'<circle cx="9" cy="7" r="4"/><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"/>',
eq:'<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>',clip:'<rect x="8" y="2" width="8" height="4" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>',
ok:'<path d="M22 11.1V12a10 10 0 1 1-5.9-9.1"/><path d="m9 11 3 3L22 4"/>',list:'<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
search:'<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',clock:'<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',shield:'<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/>',
wrench:'<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>',
alert:'<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4M12 17h.01"/>',
box:'<path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5M12 22V12"/>'};
export const FLOW=["Requested","Preparing","Ready for Pickup","In Use","Returned"];
export const REPAIR_FLOW=["Reported","Under Review","In Repair","Resolved"];      // progress steps; a repair can also end as "Dismissed"
export const REPAIR_OPEN=["Reported","Under Review","In Repair"];
export const PRIORITIES=["Low","Medium","High","Critical"];
export const PRIORITY_HELP={Low:"Minor issue, equipment still usable",Medium:"Works, but not properly",High:"Affects patient care, fix soon",Critical:"Unsafe or unusable, fix immediately"};
export const CONDITIONS=["New","Good","Fair","Poor","Defective"];
export const UNIT_STATUSES=["Available","In Use","Under Maintenance"];

// Warranty state from an expiry date (YYYY-MM-DD): "No warranty info", "Expired", "Expiring Soon" (within 90 days) or "Active".
export const warrantyState=iso=>{
  if(!iso)return"No warranty info"
  const days=(new Date(iso+"T23:59:59")-Date.now())/864e5
  return days<0?"Expired":days<=90?"Expiring Soon":"Active"
}
export const fmtDay=iso=>iso?new Date(iso+"T00:00:00").toLocaleDateString(undefined,{year:"numeric",month:"short",day:"numeric"}):"—";

// Live copies of what is stored in MongoDB. The server is the source of truth; loadData() refreshes these
// arrays in place, so components can keep reading them directly and re-render after a refresh.
export const DEPTS = [], UNITS = [], REQ = [], LOG = [], USERS = [], REPAIRS = [], INV = []
const fill = (arr, rows) => { arr.length = 0; arr.push(...rows) }
export const clearData = () => [DEPTS, UNITS, REQ, LOG, USERS, REPAIRS, INV].forEach(a => fill(a, []))

let latest = 0
export async function loadData(role) {
  const me = ++latest
  const staff = role === 'Admin' || role === 'Custodian', admin = role === 'Admin'
  const [cat, reqs, users, logs, reps, inv] = await Promise.all([
    api('/catalog'), api('/requests'), staff ? api('/employees') : [], admin ? api('/logs') : [], api('/repairs'), staff ? api('/inventory') : []])
  if (me !== latest) return                       // a newer refresh already ran; drop this stale one
  const at = Object.fromEntries(cat.departments.map((d, i) => [d.code, i]))
  fill(DEPTS, cat.departments.map(d => [d.name, d.code, d.equipment]))
  fill(UNITS, cat.units.map(u => ({ code: u.code, d: at[u.dept], item: u.item, st: u.status })))
  fill(REQ, reqs.map(x => ({ ...x, dt: new Date(x.iso).toLocaleString() })))
  fill(USERS, users)
  fill(LOG, logs.map(l => ({ ...l, t: new Date(l.t).toLocaleString() })))
  fill(REPAIRS, reps.map(x => ({ ...x, dt: new Date(x.at).toLocaleString(), upd: x.updates.map(u => ({ ...u, dt: new Date(u.t).toLocaleString() })) })))
  fill(INV, inv)
}

export const HERO=`<rect y="200" width="400" height="60" fill="#b9d6c4" opacity=".5"/><rect x="250" y="55" width="115" height="85" fill="#fff" stroke="#66686b" stroke-width="3"/><polyline points="262,100 288,100 298,72 312,124 324,100 352,100" fill="none" stroke="#1f7a4a" stroke-width="3"/><path d="M307 140v60M278 200h58" stroke="#66686b" stroke-width="4"/><rect x="28" y="115" width="14" height="90" fill="#66686b"/><rect x="42" y="152" width="175" height="30" fill="#fff" stroke="#66686b" stroke-width="3"/><rect x="50" y="138" width="45" height="14" fill="#e9eef1" stroke="#66686b" stroke-width="2"/><path d="M60 182v23M200 182v23M226 40v165M200 205h52" stroke="#66686b" stroke-width="4"/><path d="M226 40h-22" stroke="#66686b" stroke-width="3"/><rect x="190" y="44" width="28" height="42" fill="#cfe8f7" stroke="#2d7ea8" stroke-width="2"/>`;
