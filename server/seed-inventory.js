import 'dotenv/config'
import mongoose from 'mongoose'
import { backfillInventory } from './seed-data.js'

// For a database created before the inventory feature: adds SAMPLE serial numbers, brands, suppliers, dates and
// conditions to units that have none. Units that already have a serial number are never touched.
await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/mediquin', { serverSelectionTimeoutMS: 8000 })
console.log(`Added sample inventory details to ${await backfillInventory()} unit(s).`)
await mongoose.disconnect()
