import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { Department, Unit, User, Request, Repair, AuditLog, LoginAttempt, FLOW, UNIT_STATUS, REPAIR_STATUS, OPEN_REPAIR, PRIORITIES, CONDITIONS, nextSeq } from './models.js'
import { auth, allow, wrap, fail, hashPin, signToken, publicUser } from './auth.js'

const r = Router()
const s = (v, max = 200) => String(v ?? '').trim().slice(0, max)     // always a string, so query objects can't sneak in
const pad = (n, w) => String(n).padStart(w, '0')
const audit = (u, action, details = '') => AuditLog.create({ who: `${u.name} (${u.role})`, action, details })
const TITLES = ['Staff', 'Custodian', 'Admin']
const accessFor = t => ({ Custodian: 'Custodian', Admin: 'Admin' }[t] || 'Staff')
const isBusy = code => Request.exists({ code, rejected: false, status: { $ne: 'Returned' } })
const onLoan = code => Request.exists({ code, rejected: false, status: { $in: ['Preparing', 'Ready for Pickup', 'In Use'] } })   // unit is currently claimed by an approved request
const hasOpenRepair = code => Repair.exists({ code, status: { $in: OPEN_REPAIR } })
const who = u => `${u.name} (${u.role})`

const reqOut = x => ({ id: x.reqId, uid: x.uid, name: x.name, item: x.item, code: x.code, qty: x.qty, iso: x.iso,
  room: x.room, dept: x.dept, note: x.note, st: x.status, rej: x.rejected, walk: x.walkIn })

const repOut = x => ({ id: x.repairId, code: x.code, item: x.item, dept: x.dept, uid: x.reporterId, name: x.reporterName, room: x.room,
  issue: x.issue, pri: x.priority, st: x.status, tech: x.assignedTo, at: x.createdAt, done: x.resolvedAt,
  updates: x.updates.map(u => ({ t: u.at, by: u.by, ev: u.event, note: u.note })) })

const invOut = u => ({ code: u.code, dept: u.dept, item: u.item, status: u.status, serial: u.serialNumber || '', brand: u.brand || '', model: u.model || '',
  supplier: u.supplier || '', bought: u.purchaseDate || '', warranty: u.warrantyExpiry || '', cond: u.condition || 'Good' })

// Reads and checks the inventory fields of a unit (serial number, brand, model, supplier, dates, condition).
const isDay = v => { const d = new Date(v + 'T00:00:00Z'); return /^\d{4}-\d{2}-\d{2}$/.test(v) && !isNaN(d) && d.toISOString().slice(0, 10) === v }
async function unitDetails(b, ownCode) {
  const d = { serialNumber: s(b.serial, 60), brand: s(b.brand, 100), model: s(b.model, 100), supplier: s(b.supplier, 150),
    purchaseDate: s(b.bought, 10), warrantyExpiry: s(b.warranty, 10), condition: s(b.cond, 20) || 'Good' }
  if (!CONDITIONS.includes(d.condition)) fail('Choose a valid condition.')
  if (d.purchaseDate && !isDay(d.purchaseDate)) fail('Enter a valid date purchased.')
  if (d.warrantyExpiry && !isDay(d.warrantyExpiry)) fail('Enter a valid warranty expiration date.')
  if (d.purchaseDate && d.warrantyExpiry && d.warrantyExpiry < d.purchaseDate) fail('The warranty cannot expire before the purchase date.')
  if (d.serialNumber && await Unit.exists({ serialNumber: d.serialNumber, ...(ownCode && { code: { $ne: ownCode } }) })) fail('That serial number is already recorded for another unit.', 409)
  if (!d.serialNumber) d.serialNumber = undefined          // never store '' (the unique index would treat two blanks as duplicates)
  return d
}

// ---------- auth ----------
const loginLimit = rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, skipSuccessfulRequests: true, standardHeaders: true, legacyHeaders: false,
  message: { error: 'Too many sign-in attempts. Please wait a few minutes and try again.' } })

// Lockout: 5 wrong PINs from the same client (IP address) locks sign-in for 5 minutes.
// A PIN is the only thing identifying an account here, so attempts are tracked per client rather than per user.
const MAX_ATTEMPTS = 5, LOCK_MS = 5 * 60 * 1000
const lockedOut = (res, until) => {
  const retryAfter = Math.max(1, Math.ceil((until - Date.now()) / 1000))
  res.set('Retry-After', String(retryAfter))
  res.status(429).json({ error: 'Too many failed sign-in attempts. Try again in ' + (retryAfter > 60 ? Math.ceil(retryAfter / 60) + ' minute(s)' : retryAfter + ' second(s)') + '.', retryAfter })
}

r.post('/auth/login', loginLimit, wrap(async (req, res) => {
  const key = req.ip || 'unknown', now = Date.now()
  let rec = await LoginAttempt.findOne({ key })
  if (rec && (rec.lockedUntil ? rec.lockedUntil <= now : rec.expireAt <= now)) { await rec.deleteOne(); rec = null }   // lock or counting window is over
  if (rec?.lockedUntil) return lockedOut(res, rec.lockedUntil)

  const role = s(req.body?.role, 20), pin = s(req.body?.pin, 10)
  const u = /^\d{5}$/.test(pin) ? await User.findOne({ pinHash: hashPin(pin), role }) : null
  if (!u) {
    // $inc is atomic, so a burst of parallel guesses can't sneak past the limit.
    const a = await LoginAttempt.findOneAndUpdate({ key }, { $inc: { fails: 1 }, $set: { expireAt: new Date(now + LOCK_MS) } }, { new: true, upsert: true })
    if (a.fails >= MAX_ATTEMPTS) {
      const until = new Date(now + LOCK_MS)
      await LoginAttempt.updateOne({ key }, { $set: { lockedUntil: until, expireAt: until } })
      return lockedOut(res, until)
    }
    const left = MAX_ATTEMPTS - a.fails
    fail(`That PIN doesn't match the selected role. ${left} attempt${left === 1 ? '' : 's'} left before sign-in is locked for 5 minutes.`, 401)
  }
  await LoginAttempt.deleteOne({ key })
  await audit(u, 'Signed in')
  res.json({ token: signToken(u), user: publicUser(u) })
}))
r.get('/auth/me', auth, (req, res) => res.json({ user: publicUser(req.user) }))
r.post('/auth/logout', auth, wrap(async (req, res) => {
  await audit(req.user, 'Signed out')
  res.json({ ok: true })
}))

r.use(auth)   // everything below needs a signed-in user

// ---------- catalog ----------
r.get('/catalog', wrap(async (req, res) => {
  const [deps, units] = await Promise.all([Department.find().sort('order').lean(), Unit.find().sort('code').lean()])
  res.json({ departments: deps.map(d => ({ name: d.name, code: d.code, equipment: d.equipment })),
    units: units.map(u => ({ code: u.code, dept: u.dept, item: u.item, status: u.status })) })
}))

// ---------- requests ----------
function details(b, base = {}) {
  const d = { uid: s(b.uid ?? base.uid, 30), name: s(b.name ?? base.name, 100), qty: Math.floor(+b.qty), iso: s(b.iso, 30),
    room: s(b.room, 50), dept: s(b.dept, 100), note: s(b.note, 500) }
  if (!d.uid || !d.name || !d.room || !d.iso || !(d.qty >= 1 && d.qty <= 1000) || isNaN(new Date(d.iso)))
    fail('Fill in the staff ID, name, quantity, date and time needed, and room number.')
  return d
}
const availableUnit = async code => {
  const u = await Unit.findOne({ code: s(code) })
  if (!u) fail('That unit does not exist.', 404)
  if (u.status !== 'Available') fail('That unit is no longer available. Pick another one.', 409)
  return u
}

async function advance(x, actor) {
  const n = FLOW[FLOW.indexOf(x.status) + 1]
  if (x.rejected || !n) fail('This request cannot move forward.', 409)
  if (x.status === 'Requested') {
    // Claim the unit atomically so two custodians can't approve the same unit at once.
    const got = await Unit.findOneAndUpdate({ code: x.code, status: 'Available' }, { status: 'In Use' })
    if (!got) fail('That unit is no longer available. Reject this request and ask the staff member to pick another.', 409)
    await audit(actor, 'Request approved', `${x.reqId} approved for ${x.name}`)
  } else await audit(actor, 'Status changed', `${x.reqId}: ${x.status} → ${n}`)
  if (n === 'Returned') {
    await Unit.updateOne({ code: x.code, status: 'In Use' }, { status: 'Available' })   // leaves a unit that went Under Maintenance meanwhile alone
    await audit(actor, 'Return verified', `${x.code} returned by ${x.name}`)
  }
  x.status = n
  await x.save()
  return x
}

r.get('/requests', wrap(async (req, res) => {
  const q = req.user.role === 'Staff' ? { uid: req.user.empId } : {}
  res.json((await Request.find(q).sort({ createdAt: -1, _id: -1 }).limit(1000)).map(reqOut))
}))

r.post('/requests', allow('Staff'), wrap(async (req, res) => {
  const u = await availableUnit(req.body?.code)
  const d = details({ ...req.body, dept: s(req.body?.dept) || req.user.dept }, { uid: req.user.empId, name: req.user.name })
  const x = await Request.create({ ...d, uid: req.user.empId, name: req.user.name, reqId: 'REQ-' + pad(await nextSeq('req'), 4), item: u.item, code: u.code })
  await audit(req.user, 'Request submitted', `${x.reqId}: ${u.item} (${u.code}) for room ${d.room}`)
  res.status(201).json(reqOut(x))
}))

r.post('/requests/walkin', allow('Custodian'), wrap(async (req, res) => {
  const u = await availableUnit(req.body?.code), d = details(req.body)
  const x = await Request.create({ ...d, reqId: 'REQ-' + pad(await nextSeq('req'), 4), item: u.item, code: u.code, walkIn: true })
  await audit(req.user, 'Walk-in request recorded', `${x.reqId}: ${u.item} (${u.code}) for ${d.name}`)
  try { await advance(x, req.user) } catch (e) { await x.deleteOne(); throw e }   // don't leave a half-made request behind
  res.status(201).json(reqOut(x))
}))

// Moves a request to its next stage. While it is still "Requested", the custodian may correct details first.
r.post('/requests/:id/advance', allow('Custodian'), wrap(async (req, res) => {
  const x = await Request.findOne({ reqId: s(req.params.id) })
  if (!x) fail('Request not found.', 404)
  if (x.status === 'Requested' && !x.rejected && Object.keys(req.body || {}).length) Object.assign(x, details(req.body, x))
  res.json(reqOut(await advance(x, req.user)))
}))

r.post('/requests/:id/reject', allow('Custodian'), wrap(async (req, res) => {
  const x = await Request.findOne({ reqId: s(req.params.id) })
  if (!x) fail('Request not found.', 404)
  if (x.status !== 'Requested' || x.rejected) fail('Only open requests can be rejected.', 409)
  x.rejected = true
  await x.save()
  await audit(req.user, 'Request rejected', `${x.reqId} for ${x.name}`)
  res.json(reqOut(x))
}))

// ---------- units (admin) ----------
r.post('/units', allow('Admin'), wrap(async (req, res) => {
  const dept = s(req.body?.dept), item = s(req.body?.item)
  if (!(await Department.exists({ code: dept, equipment: item }))) fail('Unknown department or equipment.', 404)
  const have = await Unit.find({ dept, item }).sort('code').lean()
  let prefix, max = 0
  if (have.length) {
    prefix = have[0].code.slice(0, have[0].code.lastIndexOf('-'))
    have.forEach(u => { max = Math.max(max, +u.code.slice(u.code.lastIndexOf('-') + 1) || 0) })
  } else prefix = `${dept}-${await nextSeq('tc')}`
  const u = await Unit.create({ code: `${prefix}-${pad(max + 1, 3)}`, dept, item, ...(await unitDetails(req.body || {})) })
  await audit(req.user, 'Unit added', `${u.code} (${item})`)
  res.status(201).json({ code: u.code })
}))

r.patch('/units/:code', allow('Admin'), wrap(async (req, res) => {
  const u = await Unit.findOne({ code: s(req.params.code) })
  if (!u) fail('Unit not found.', 404)
  const status = req.body?.status, code = s(req.body?.code, 40)
  if (status !== undefined) {
    if (!UNIT_STATUS.includes(status)) fail('Invalid status.')
    await audit(req.user, 'Unit status changed', `${u.code}: ${u.status} → ${status}`)
    u.status = status
  }
  if (req.body?.code !== undefined && code !== u.code) {
    if (!code) fail('Enter a product code.')
    if (await Unit.exists({ code })) fail('That product code is already in use.', 409)
    await Request.updateMany({ code: u.code }, { code })
    await Repair.updateMany({ code: u.code }, { code })
    await audit(req.user, 'Unit code changed', `${u.code} → ${code}`)
    u.code = code
  }
  await u.save()
  res.json({ code: u.code, status: u.status })
}))

r.delete('/units/:code', allow('Admin'), wrap(async (req, res) => {
  const code = s(req.params.code)
  if (await isBusy(code)) fail("Can't delete: this unit has an active request.", 409)
  if (await hasOpenRepair(code)) fail("Can't delete: this unit has an open repair request.", 409)
  const del = await Unit.deleteOne({ code })
  if (!del.deletedCount) fail('Unit not found.', 404)
  await audit(req.user, 'Unit deleted', code)
  res.json({ ok: true })
}))

// ---------- equipment types (admin) ----------
r.post('/departments/:code/equipment', allow('Admin'), wrap(async (req, res) => {
  const dept = await Department.findOne({ code: s(req.params.code) }), name = s(req.body?.name, 120), qty = Math.floor(+req.body?.qty)
  if (!dept) fail('Department not found.', 404)
  if (!name) fail('Enter an equipment name.')
  if (dept.equipment.includes(name)) fail('That equipment already exists here.', 409)
  if (!(qty >= 0 && qty <= 100)) fail('Quantity must be 0 to 100.')
  const prefix = `${dept.code}-${await nextSeq('tc')}`
  dept.equipment.push(name)
  await dept.save()
  if (qty) await Unit.insertMany(Array.from({ length: qty }, (_, k) => ({ code: `${prefix}-${pad(k + 1, 3)}`, dept: dept.code, item: name })))
  await audit(req.user, 'Equipment added', `${name} × ${qty} in ${dept.name}`)
  res.status(201).json({ ok: true })
}))

r.patch('/departments/:code/equipment', allow('Admin'), wrap(async (req, res) => {
  const dept = await Department.findOne({ code: s(req.params.code) }), from = s(req.body?.from, 120), to = s(req.body?.to, 120)
  if (!dept || !dept.equipment.includes(from)) fail('Equipment not found.', 404)
  if (!to) fail('Enter an equipment name.')
  if (to !== from && dept.equipment.includes(to)) fail('That equipment already exists here.', 409)
  const codes = (await Unit.find({ dept: dept.code, item: from }, 'code').lean()).map(u => u.code)
  await Unit.updateMany({ dept: dept.code, item: from }, { item: to })
  await Request.updateMany({ code: { $in: codes } }, { item: to })
  await Repair.updateMany({ code: { $in: codes } }, { item: to })
  dept.equipment[dept.equipment.indexOf(from)] = to
  await dept.save()
  await audit(req.user, 'Equipment renamed', `${from} → ${to}`)
  res.json({ ok: true })
}))

r.delete('/departments/:code/equipment', allow('Admin'), wrap(async (req, res) => {
  const dept = await Department.findOne({ code: s(req.params.code) }), name = s(req.query.name, 120)
  if (!dept || !dept.equipment.includes(name)) fail('Equipment not found.', 404)
  const codes = (await Unit.find({ dept: dept.code, item: name }, 'code').lean()).map(u => u.code)
  if (await Request.exists({ code: { $in: codes }, rejected: false, status: { $ne: 'Returned' } })) fail("Can't delete: a unit has an active request.", 409)
  if (await Repair.exists({ code: { $in: codes }, status: { $in: OPEN_REPAIR } })) fail("Can't delete: a unit has an open repair request.", 409)
  await Unit.deleteMany({ dept: dept.code, item: name })
  dept.equipment = dept.equipment.filter(e => e !== name)
  await dept.save()
  await audit(req.user, 'Equipment deleted', name)
  res.json({ ok: true })
}))

// ---------- inventory (Admin edits, Custodian views) ----------
r.get('/inventory', allow('Admin', 'Custodian'), wrap(async (req, res) => {
  res.json((await Unit.find().sort('code').lean()).map(invOut))
}))

// Saves the whole inventory form for one unit: serial number, brand, model, supplier, dates, condition, status.
r.patch('/inventory/:code', allow('Admin'), wrap(async (req, res) => {
  const u = await Unit.findOne({ code: s(req.params.code) })
  if (!u) fail('Unit not found.', 404)
  const d = await unitDetails(req.body || {}, u.code), st = req.body?.status
  if (st !== undefined && st !== u.status) {
    if (!UNIT_STATUS.includes(st)) fail('Invalid status.')
    await audit(req.user, 'Unit status changed', `${u.code}: ${u.status} → ${st}`)
    u.status = st
  }
  Object.assign(u, d)
  await u.save()
  await audit(req.user, 'Inventory details updated', `${u.code} (${u.item})`)
  res.json(invOut(u))
}))

// ---------- repair and service requests ----------
// Anyone signed in can report a problem. Staff only ever see their own reports.
r.get('/repairs', wrap(async (req, res) => {
  const q = req.user.role === 'Staff' ? { reporterId: req.user.empId } : {}
  res.json((await Repair.find(q).sort({ createdAt: -1, _id: -1 }).limit(1000)).map(repOut))
}))

r.post('/repairs', wrap(async (req, res) => {
  const u = await Unit.findOne({ code: s(req.body?.code) })
  if (!u) fail('Choose the equipment that has a problem.', 404)
  const issue = s(req.body?.issue, 1000), priority = s(req.body?.priority, 20), room = s(req.body?.room, 50)
  if (issue.length < 5) fail('Describe what is wrong with the equipment.')
  if (!PRIORITIES.includes(priority)) fail('Choose a priority.')
  const x = await Repair.create({ repairId: 'REP-' + pad(await nextSeq('rep'), 4), code: u.code, item: u.item, dept: u.dept,
    reporterId: req.user.empId, reporterName: req.user.name, room, issue, priority,
    updates: [{ by: who(req.user), event: 'Problem reported' }] })
  await audit(req.user, 'Repair reported', `${x.repairId}: ${u.item} (${u.code}), ${priority} priority`)
  res.status(201).json(repOut(x))
}))

// Custodian/Admin: change status or priority, assign a technician, add a progress note.
// Moving to "In Repair" marks the unit Under Maintenance; leaving that stage puts it back (Available, or In Use if it is on loan).
r.post('/repairs/:id/update', allow('Custodian', 'Admin'), wrap(async (req, res) => {
  const x = await Repair.findOne({ repairId: s(req.params.id) })
  if (!x) fail('Repair request not found.', 404)
  if (!OPEN_REPAIR.includes(x.status)) fail('This repair is already closed. Report a new problem if it comes back.', 409)
  const b = req.body || {}, changes = [], was = x.status
  if (b.status !== undefined && b.status !== x.status) {
    if (!REPAIR_STATUS.includes(b.status)) fail('Invalid status.')
    changes.push(`Status: ${x.status} → ${b.status}`); x.status = b.status
  }
  if (b.priority !== undefined && b.priority !== x.priority) {
    if (!PRIORITIES.includes(b.priority)) fail('Invalid priority.')
    changes.push(`Priority: ${x.priority} → ${b.priority}`); x.priority = b.priority
  }
  if (b.assignedTo !== undefined) {
    const t = s(b.assignedTo, 100)
    if (t !== x.assignedTo) { changes.push(t ? `Assigned to ${t}` : 'Technician unassigned'); x.assignedTo = t }
  }
  const unit = await Unit.findOne({ code: x.code }), cond = s(b.condition, 20)
  if (x.status === 'Resolved' && cond) {
    if (!CONDITIONS.includes(cond)) fail('Choose a valid condition.')
    if (unit && unit.condition !== cond) { changes.push(`Condition set to ${cond}`); unit.condition = cond }
  }
  const note = s(b.note, 500)
  if (!changes.length && !note) fail('Change the status or priority, or add a progress note.')

  if (unit) {
    if (x.status === 'In Repair' && unit.status !== 'Under Maintenance') {
      await audit(req.user, 'Unit status changed', `${unit.code}: ${unit.status} → Under Maintenance (repair ${x.repairId})`)
      unit.status = 'Under Maintenance'
    } else if (was === 'In Repair' && x.status !== 'In Repair' && unit.status === 'Under Maintenance'
      && !(await Repair.exists({ code: x.code, status: 'In Repair', _id: { $ne: x._id } }))) {
      const back = (await onLoan(x.code)) ? 'In Use' : 'Available'
      await audit(req.user, 'Unit status changed', `${unit.code}: Under Maintenance → ${back} (repair ${x.repairId})`)
      unit.status = back
    }
  }
  if (x.status === 'Resolved' || x.status === 'Dismissed') x.resolvedAt = new Date()
  x.updates.push({ by: who(req.user), event: changes.join('; '), note })
  await x.save()
  if (unit) await unit.save()
  await audit(req.user, 'Repair updated', `${x.repairId}: ${changes.join('; ') || 'note added'}`)
  res.json(repOut(x))
}))

// ---------- employees ----------
r.get('/employees', allow('Admin', 'Custodian'), wrap(async (req, res) => {
  res.json((await User.find().sort('empId')).map(u => ({ id: u.empId, name: u.name, dept: u.dept, role: u.role, title: u.title, position: u.position || '' })))
}))

async function employeeFields(b, isNew) {
  const name = s(b.name, 100), pin = s(b.pin, 10), title = s(b.title, 30), position = s(b.position, 60), dept = s(b.dept, 100)
  if (!name) fail('Enter a name.')
  if (isNew ? !/^\d{5}$/.test(pin) : pin && !/^\d{5}$/.test(pin)) fail('Enter a PIN of exactly 5 digits.')
  if (!TITLES.includes(title)) fail('Choose a valid role.')
  if (title === 'Staff' && !position) fail('Enter the position or role of the staff member.')
  if (dept !== 'Administration' && !(await Department.exists({ name: dept }))) fail('Choose a valid department.')
  return { name, pin, title, position: title === 'Staff' ? position : '', dept, role: accessFor(title) }
}
const pinTaken = async (pin, exceptId) => User.exists({ pinHash: hashPin(pin), ...(exceptId && { empId: { $ne: exceptId } }) })
const PIN_MSG = 'That PIN is already used by another employee. Choose a different one.'

r.post('/employees', allow('Admin'), wrap(async (req, res) => {
  const f = await employeeFields(req.body || {}, true)
  let empId = s(req.body?.id, 30)
  if (!empId) do { empId = 'EMP-' + (200 + await nextSeq('emp')) } while (await User.exists({ empId }))
  else if (await User.exists({ empId })) fail('That ID number already exists.', 409)
  if (await pinTaken(f.pin)) fail(PIN_MSG, 409)
  await User.create({ empId, name: f.name, pinHash: hashPin(f.pin), dept: f.dept, role: f.role, title: f.title, position: f.position })
  await audit(req.user, 'Employee added', f.name)
  res.status(201).json({ id: empId })
}))

r.patch('/employees/:id', allow('Admin'), wrap(async (req, res) => {
  const u = await User.findOne({ empId: s(req.params.id) })
  if (!u) fail('Employee not found.', 404)
  const f = await employeeFields(req.body || {}, false)
  if (u.empId === req.user.empId && f.role !== 'Admin') fail("You can't remove your own admin access.", 400)
  if (f.pin) { if (await pinTaken(f.pin, u.empId)) fail(PIN_MSG, 409); u.pinHash = hashPin(f.pin) }
  Object.assign(u, { name: f.name, dept: f.dept, role: f.role, title: f.title, position: f.position })
  await u.save()
  await audit(req.user, 'Employee updated', f.name)
  res.json({ ok: true })
}))

r.delete('/employees/:id', allow('Admin'), wrap(async (req, res) => {
  const u = await User.findOne({ empId: s(req.params.id) })
  if (!u) fail('Employee not found.', 404)
  if (u.empId === req.user.empId) fail("You can't delete your own account.", 400)
  await u.deleteOne()
  await audit(req.user, 'Employee deleted', u.name)
  res.json({ ok: true })
}))

// ---------- audit log (read-only) ----------
r.get('/logs', allow('Admin'), wrap(async (req, res) => {
  const rows = await AuditLog.find().sort({ createdAt: -1, _id: -1 }).limit(500).lean()
  res.json(rows.map(l => ({ t: l.createdAt, who: l.who, a: l.action, x: l.details })))
}))

export default r
