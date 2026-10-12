import 'dotenv/config'
import express from 'express'
import helmet from 'helmet'
import cors from 'cors'
import mongoose from 'mongoose'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import routes from './routes.js'
import { seedIfEmpty } from './seed-data.js'

const prod = process.env.NODE_ENV === 'production'
const { JWT_SECRET, PIN_PEPPER } = process.env
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/mediquin'
const PORT = process.env.PORT || 4000

if (!JWT_SECRET || !PIN_PEPPER) { console.error('Missing JWT_SECRET or PIN_PEPPER. Copy .env.example to .env first.'); process.exit(1) }
if (prod && (JWT_SECRET.startsWith('dev-') || PIN_PEPPER.startsWith('dev-'))) {
  console.error('Refusing to start in production with the example secrets. Generate real ones (see README).'); process.exit(1)
}

const app = express()
app.disable('x-powered-by')
if (prod) app.set('trust proxy', 1)   // behind Render/Railway/nginx, so rate limiting sees the real client IP
app.use(helmet({ contentSecurityPolicy: { directives: { ...helmet.contentSecurityPolicy.getDefaultDirectives(), 'upgrade-insecure-requests': null } } }))
if (process.env.CLIENT_ORIGIN) app.use(cors({ origin: process.env.CLIENT_ORIGIN.split(',') }))
app.use(express.json({ limit: '100kb' }))

app.get('/api/health', (req, res) => res.json({ ok: true, db: mongoose.connection.readyState === 1 }))
app.use('/api', routes)
app.use('/api', (req, res) => res.status(404).json({ error: 'Not found' }))

// In production the built React app (dist/) is served by this same server.
const dist = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist')
if (fs.existsSync(dist)) {
  app.use(express.static(dist))
  app.get('*', (req, res) => res.sendFile(path.join(dist, 'index.html')))
}

app.use((err, req, res, next) => {
  if (err.status) return res.status(err.status).json({ error: err.message })
  if (err.code === 11000) return res.status(409).json({ error: 'That value already exists.' })
  console.error(err)
  res.status(500).json({ error: 'Something went wrong on the server.' })
})

try {
  await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 8000 })
} catch (e) {
  console.error(`\nCould not connect to MongoDB at ${MONGODB_URI.replace(/\/\/.*@/, '//***@')}\n${e.message}\n\nIs MongoDB running? See the README, step 3.`)
  process.exit(1)
}
console.log('Connected to MongoDB')
await Promise.all(Object.values(mongoose.models).map(m => m.init()))   // make sure unique indexes exist before serving
await seedIfEmpty()
app.listen(PORT, () => console.log(`MediQuin API on http://localhost:${PORT}`))
