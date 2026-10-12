import { Department, Unit, User, Request, Repair, AuditLog, setSeq, nextSeq } from './models.js'
import { hashPin } from './auth.js'

const DEPTS = [
  ['Emergency Department (ER) & Trauma', 'ER', ['Crash Cart / Emergency Resuscitation Cart', 'Defibrillator / AED', 'Portable Suction Machine', 'Spine Boards & Rigid Backboards', 'Emergency Transport Stretchers / Gurneys', 'Transport Monitor']],
  ['Intensive Care Unit (ICU) & Critical Care', 'ICU', ['Mechanical Ventilator', 'Multiparameter Patient Monitor', 'Infusion Pump & Syringe Pump', 'ICU Smart Bed', 'CRRT Machine', 'ABG Mobile Analyzer']],
  ['Operating Room (OR) & Surgery', 'OR', ['Electrocautery Unit (Bovie Machine)', 'Anesthesia Machine', 'C-Arm Fluoroscopy Machine', 'Major Surgical Instrument Cases / Trays', 'Laparoscopy Tower / Cart', 'Hydraulic / Electric Operating Table']],
  ['General Wards & Nursing Units', 'WRD', ['Manual & Electric Hospital Beds', 'Overbed Tables', 'IV Poles', 'Patient Wheelchairs', 'Portable Nebulizer Machine', 'Digital Blood Pressure Monitors', 'Bedside Commode Chairs']],
  ['Diagnostics, Radiology & Laboratory', 'DX', ['Portable X-Ray Machine', 'POCUS Machine', '12-Lead ECG / EKG Machine', 'Laboratory Centrifuge Machine', 'Medical Microscope', 'Automated Hematology Analyzer']],
  ['Respiratory Therapy & Pulmonary', 'RT', ['CPAP & BiPAP Machines', 'High-Flow Nasal Cannula (HFNC) System', 'Portable Oxygen Concentrator Cylinders', 'Peak Flow Meters']],
  ['Obstetrics, Gynecology & Pediatrics (OB-GYN / NICU)', 'OB', ['Fetal Monitor / CTG Machine', 'Neonatal Incubator', 'Infant Radiant Warmer', 'Phototherapy Light Unit', 'Specialized Labor & Delivery Bed']],
  ['Physical Therapy & Rehabilitation', 'PT', ['Adult Walkers and Walking Frames', 'Standing Crutches and Canes', 'Parallel Bars', 'Traction Equipment Unit', 'TENS Machine']],
  ['Central Sterile Services (CSSD) / Equipment Pool', 'SSD', ['Medical Autoclave / Steam Sterilizer', 'Ultrasonic Instrument Cleaner', 'Heavy-Duty Equipment Transport Trolleys', 'Staged Spare Infusion Pumps & Monitors']],
]

const USERS = [
  ['EMP-001', 'Aron Casa', '00001', 'Emergency Department (ER) & Trauma', 'Staff', 'Staff', 'Nurse'],
  ['EMP-002', 'Elizha Cruz', '00002', 'Intensive Care Unit (ICU) & Critical Care', 'Staff', 'Staff', 'Doctor'],
  ['EMP-101', 'Fleincy Dela Cruz', '20001', 'Central Sterile Services (CSSD) / Equipment Pool', 'Custodian', 'Custodian', ''],
  ['EMP-900', 'Aaron Vince Penetrante', '10001', 'Administration', 'Admin', 'Admin', ''],
]

// ---- Sample inventory details ----
// The brands are real manufacturers of that kind of equipment, but the models, serial numbers, dates and suppliers
// are RANDOMLY GENERATED demo data. Replace them with your hospital's real records (Equipment Inventory > Edit).
const SUPPLIERS = ['Philippine Medical Supplies', 'MedEquip Trading Corp.', 'Manila Biomedical Solutions', 'Visayas Healthcare Distributors', 'Pacific Hospital Equipment Inc.']
const BRANDS = {
  ER: ['Philips', 'ZOLL', 'Laerdal'], ICU: ['Dräger', 'Mindray', 'GE Healthcare'], OR: ['Medtronic', 'Stryker', 'Karl Storz'],
  WRD: ['Hill-Rom', 'Invacare', 'Omron'], DX: ['Siemens Healthineers', 'Fujifilm', 'Olympus'], RT: ['ResMed', 'Fisher & Paykel', 'Philips'],
  OB: ['Natus', 'Atom Medical', 'Dräger'], PT: ['Enraf-Nonius', 'Invacare', 'Drive Medical'], SSD: ['Getinge', 'STERIS', 'Tuttnauer'],
}
const day = ms => new Date(ms).toISOString().slice(0, 10)
function sampleDetails(u, i) {
  let t = (i * 2654435761) >>> 0                          // tiny per-unit random generator, so a unit always gets the same details
  const rnd = () => (t = (t * 1664525 + 1013904223) >>> 0) / 4294967296
  const pick = a => a[Math.floor(rnd() * a.length)]
  const from = Date.UTC(2021, 0, 1), bought = from + Math.floor(rnd() * (Date.now() - from))
  const years = pick([1, 2, 2, 3, 3, 5]), w = new Date(bought)
  const c = rnd()
  return {
    serialNumber: `SN${day(bought).slice(0, 4)}-${u.code.replace(/-/g, '')}-${Math.floor(rnd() * 65536).toString(16).toUpperCase().padStart(4, '0')}`,
    brand: pick(BRANDS[u.dept] || ['Generic']), model: `${u.item.replace(/[^A-Za-z]/g, '').slice(0, 2).toUpperCase()}-${100 + Math.floor(rnd() * 900)}`,
    supplier: pick(SUPPLIERS), purchaseDate: day(bought), warrantyExpiry: day(Date.UTC(w.getUTCFullYear() + years, w.getUTCMonth(), w.getUTCDate())),
    condition: u.status === 'Under Maintenance' ? (c < .6 ? 'Poor' : 'Defective') : c < .15 ? 'New' : c < .7 ? 'Good' : c < .92 ? 'Fair' : 'Poor',
  }
}

// Fills in sample details for units that have none yet (used by `npm run seed:inventory` on a database created before this feature).
export async function backfillInventory() {
  const units = await Unit.find({ serialNumber: { $exists: false } }).sort('code').lean()
  if (!units.length) return 0
  await Unit.bulkWrite(units.map((u, i) => ({ updateOne: { filter: { _id: u._id }, update: { $set: sampleDetails(u, i + 1) } } })))
  return units.length
}

async function seedCatalog() {
  await Department.insertMany(DEPTS.map((d, i) => ({ name: d[0], code: d[1], order: i, equipment: d[2] })))
  let seed = 7                                   // same pseudo-random generator as the prototype, so the units match
  const rnd = () => (seed = (seed * 9301 + 49297) % 233280) / 233280
  const units = []
  DEPTS.forEach(d => d[2].forEach((item, ii) => {
    const n = item === 'Portable Suction Machine' ? 30 : 4 + Math.floor(rnd() * 9)
    for (let k = 1; k <= n; k++) {
      const r = rnd()
      units.push({ code: `${d[1]}-${String(ii + 1).padStart(2, '0')}-${String(k).padStart(3, '0')}`, dept: d[1], item,
        status: r < 0.72 ? 'Available' : r < 0.9 ? 'In Use' : 'Under Maintenance' })
    }
  }))
  units.forEach((u, i) => Object.assign(u, sampleDetails(u, i + 1)))
  await Unit.insertMany(units)
  await setSeq('tc', 20)                         // next new equipment type gets prefix ...-21-
  await seedRepairs(units)
  return units.length
}

// A few sample repair requests so the new pages aren't empty on a fresh database.
async function seedRepairs(units) {
  const find = f => units.find(f)
  const a = find(u => u.dept === 'ER' && u.status === 'Available'), b = find(u => u.status === 'Under Maintenance'), c = find(u => u.dept === 'ICU' && u.status === 'Available')
  const nurse = 'Aron Casa (Staff)', doc = 'Elizha Cruz (Staff)', cust = 'Fleincy Dela Cruz (Custodian)'
  const make = async (u, reporter, rid, issue, priority, room, status, updates, extra = {}) => Repair.create({
    repairId: 'REP-' + String(await nextSeq('rep')).padStart(4, '0'), code: u.code, item: u.item, dept: u.dept, reporterId: rid, reporterName: reporter.split(' (')[0],
    room, issue, priority, status, updates: [{ by: reporter, event: 'Problem reported' }, ...updates], ...extra })
  if (a) await make(a, nurse, 'EMP-001', 'The wheel lock on one side will not hold, so the unit rolls when parked.', 'High', 'ER-12', 'Reported', [])
  if (b) await make(b, nurse, 'EMP-001', 'Powers on but shuts off after a few minutes of use.', 'Critical', 'Equipment room', 'In Repair', [
    { by: cust, event: 'Status: Reported → Under Review; Assigned to Biomed Tech Ramos', note: 'Checking the battery and power cable.' },
    { by: cust, event: 'Status: Under Review → In Repair', note: 'Battery needs replacing. Part ordered from the supplier.' }], { assignedTo: 'Biomed Tech Ramos' })
  if (c) await make(c, doc, 'EMP-002', 'Alarm volume is very low and hard to hear from the nurses’ station.', 'Medium', 'ICU-05', 'Resolved', [
    { by: cust, event: 'Status: Reported → Resolved; Condition set to Good', note: 'Speaker connector was loose. Reseated and tested.' }], { resolvedAt: new Date() })
  if (c) await Unit.updateOne({ code: c.code }, { condition: 'Good' })
}

async function seedUsers() {
  await User.insertMany(USERS.map(u => ({ empId: u[0], name: u[1], pinHash: hashPin(u[2]), dept: u[3], role: u[4], title: u[5], position: u[6] })))
}

// Runs on every server start. Only fills empty collections, so it never overwrites real data.
// Older databases used the titles Nurse / Doctor / Technician / Other staff. Fold them (and the short-lived
// "Staff in General") into "Staff", keeping Nurse / Doctor / Technician as the position.
async function migrateTitles() {
  for (const old of ['Nurse', 'Doctor', 'Technician'])
    await User.updateMany({ title: old }, { $set: { title: 'Staff', position: old } })
  await User.updateMany({ title: { $in: ['Other staff', 'Staff in General'] } }, { $set: { title: 'Staff' } })
}

export async function seedIfEmpty() {
  await migrateTitles()
  if (!(await Department.estimatedDocumentCount())) console.log(`Seeded ${await seedCatalog()} equipment units.`)
  if (!(await User.estimatedDocumentCount())) { await seedUsers(); console.log('Seeded demo users.') }
}

// Wipes everything and starts over. Only used by `npm run seed:reset`.
export async function resetAndSeed() {
  await Promise.all([Department, Unit, User, Request, Repair, AuditLog].map(m => m.deleteMany({})))
  await setSeq('req', 0)
  await setSeq('rep', 0)
  await seedIfEmpty()
}
