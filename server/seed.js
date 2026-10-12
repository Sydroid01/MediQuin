import 'dotenv/config'
import mongoose from 'mongoose'
import { seedIfEmpty, resetAndSeed } from './seed-data.js'

if (!process.env.PIN_PEPPER) { console.error('Missing PIN_PEPPER. Copy .env.example to .env first.'); process.exit(1) }
const reset = process.argv.includes('--reset')
await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/mediquin', { serverSelectionTimeoutMS: 8000 })
if (reset) { await resetAndSeed(); console.log('Database wiped and re-seeded.') } else { await seedIfEmpty(); console.log('Seed check done (empty collections only).') }
await mongoose.disconnect()
