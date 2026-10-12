import crypto from 'crypto'
import jwt from 'jsonwebtoken'
import { User } from './models.js'

export class HttpError extends Error { constructor(status, msg) { super(msg); this.status = status } }
export const fail = (msg, status = 400) => { throw new HttpError(status, msg) }
export const wrap = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next)

// PINs are stored as a keyed hash (HMAC-SHA256 with a server-side secret), so the database never holds a PIN.
export const hashPin = pin => crypto.createHmac('sha256', process.env.PIN_PEPPER).update(String(pin)).digest('hex')

export const signToken = u => jwt.sign({ sub: u.empId, role: u.role }, process.env.JWT_SECRET, { expiresIn: '12h' })

// Checks the token, then reloads the user from the database so deleted users or role changes take effect immediately.
export const auth = wrap(async (req, res, next) => {
  const h = req.headers.authorization || ''
  let payload
  try { payload = jwt.verify(h.replace(/^Bearer /, ''), process.env.JWT_SECRET) } catch { fail('Please sign in again.', 401) }
  const user = await User.findOne({ empId: String(payload.sub) })
  if (!user) fail('Please sign in again.', 401)
  req.user = user
  next()
})

export const allow = (...roles) => (req, res, next) =>
  roles.includes(req.user.role) ? next() : res.status(403).json({ error: 'You do not have permission to do that.' })

export const publicUser = u => ({ id: u.empId, name: u.name, dept: u.dept, role: u.role, title: u.title, position: u.position || '' })
