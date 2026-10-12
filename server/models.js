import mongoose from 'mongoose'
const { Schema, model } = mongoose

export const FLOW = ['Requested', 'Preparing', 'Ready for Pickup', 'In Use', 'Returned']
export const UNIT_STATUS = ['Available', 'In Use', 'Under Maintenance']
export const ROLES = ['Staff', 'Custodian', 'Admin']
export const REPAIR_FLOW = ['Reported', 'Under Review', 'In Repair', 'Resolved']   // the steps a repair moves through
export const REPAIR_STATUS = [...REPAIR_FLOW, 'Dismissed']                         // Dismissed = closed without a repair (e.g. no fault found)
export const OPEN_REPAIR = ['Reported', 'Under Review', 'In Repair']
export const PRIORITIES = ['Low', 'Medium', 'High', 'Critical']
export const CONDITIONS = ['New', 'Good', 'Fair', 'Poor', 'Defective']

export const Department = model('Department', new Schema({
  name: { type: String, required: true, unique: true },
  code: { type: String, required: true, unique: true },
  order: { type: Number, default: 0 },
  equipment: { type: [String], default: [] },       // equipment type names, in display order
}))

export const Unit = model('Unit', new Schema({
  code: { type: String, required: true, unique: true, trim: true },
  dept: { type: String, required: true },           // Department.code
  item: { type: String, required: true },           // equipment type name
  status: { type: String, enum: UNIT_STATUS, default: 'Available' },
  // Inventory details (all optional). Dates are stored as 'YYYY-MM-DD' text.
  serialNumber: { type: String, trim: true, unique: true, sparse: true },   // left unset (never '') when blank, so the unique index ignores it
  brand: { type: String, default: '' },
  model: { type: String, default: '' },
  supplier: { type: String, default: '' },
  purchaseDate: { type: String, default: '' },
  warrantyExpiry: { type: String, default: '' },
  condition: { type: String, enum: CONDITIONS, default: 'Good' },
}, { timestamps: true }).index({ dept: 1, item: 1 }))

export const User = model('User', new Schema({
  empId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  pinHash: { type: String, required: true, unique: true },   // HMAC of the PIN, never the PIN itself
  dept: { type: String, required: true },
  role: { type: String, enum: ROLES, required: true },        // access level
  title: { type: String, required: true },                    // Staff, Custodian or Admin
  position: { type: String, default: '' },                    // only for Staff: their position or role
}, { timestamps: true }))

export const Request = model('Request', new Schema({
  reqId: { type: String, required: true, unique: true },
  uid: { type: String, required: true },
  name: { type: String, required: true },
  item: { type: String, required: true },
  code: { type: String, required: true, index: true },
  qty: { type: Number, default: 1 },
  iso: { type: String, required: true },            // date/time needed, as entered (datetime-local)
  room: { type: String, required: true },
  dept: { type: String, default: '' },
  note: { type: String, default: '' },
  status: { type: String, enum: FLOW, default: 'Requested' },
  rejected: { type: Boolean, default: false },
  walkIn: { type: Boolean, default: false },
}, { timestamps: true }).index({ uid: 1, createdAt: -1 }))

// A problem report for one unit. `updates` is the progress timeline shown to the reporter and the custodian.
const RepairUpdate = new Schema({
  by: { type: String, required: true },
  event: { type: String, default: '' },            // what changed, e.g. "Status: Reported → In Repair"
  note: { type: String, default: '' },
  at: { type: Date, default: Date.now },
}, { _id: false })

export const Repair = model('Repair', new Schema({
  repairId: { type: String, required: true, unique: true },
  code: { type: String, required: true, index: true },   // Unit.code
  item: { type: String, required: true },
  dept: { type: String, default: '' },                   // Department.code
  reporterId: { type: String, required: true },
  reporterName: { type: String, required: true },
  room: { type: String, default: '' },
  issue: { type: String, required: true },
  priority: { type: String, enum: PRIORITIES, default: 'Medium' },
  status: { type: String, enum: REPAIR_STATUS, default: 'Reported' },
  assignedTo: { type: String, default: '' },
  resolvedAt: { type: Date, default: null },
  updates: { type: [RepairUpdate], default: [] },
}, { timestamps: true }).index({ reporterId: 1, createdAt: -1 }))

// Append-only. The API exposes no route that edits or deletes these.
export const AuditLog = model('AuditLog', new Schema({
  who: String, action: String, details: { type: String, default: '' },
}, { timestamps: { createdAt: true, updatedAt: false } }).index({ createdAt: -1 }))

// Failed sign-in tracking, one document per client IP. Mongo's TTL index removes stale records automatically.
export const LoginAttempt = model('LoginAttempt', new Schema({
  key: { type: String, required: true, unique: true },
  fails: { type: Number, default: 0 },
  lockedUntil: { type: Date, default: null },
  expireAt: { type: Date, required: true, index: { expireAfterSeconds: 0 } },
}))

const Counter = model('Counter', new Schema({ _id: String, seq: { type: Number, default: 0 } }))
export const nextSeq = async name =>
  (await Counter.findOneAndUpdate({ _id: name }, { $inc: { seq: 1 } }, { new: true, upsert: true })).seq
export const setSeq = (name, seq) => Counter.updateOne({ _id: name }, { $set: { seq } }, { upsert: true })
