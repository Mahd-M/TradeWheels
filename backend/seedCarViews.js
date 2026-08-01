/* eslint-disable no-undef */
// trending/popular views go to anonymous visitors (userId = null) since
// /api/cars/trending only COUNT(*)s per carId and doesn't care whose
// view it was. per-persona view history is seeded separately below,
// using the same PERSONAS criteria as seedFavourites.js so browsing
// history matches each test account's declared taste.

require('dotenv').config()
const { getPool, sql } = require('./db')
const { PERSONAS } = require('./personas')

const TRENDING_SEARCH = [
  { make: 'Honda', model: 'Civic' },
  { make: 'Toyota', model: 'Corolla' },
  { make: 'Suzuki', model: 'Alto' },
  { make: 'Kia', model: 'Sportage' },
  { make: 'Ferrari', model: 'SF90' },
]

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function hoursAgo(hours) {
  return new Date(Date.now() - hours * 60 * 60 * 1000)
}

async function insertRows(pool, rows) {
  const CHUNK_SIZE = 200
  for (let start = 0; start < rows.length; start += CHUNK_SIZE) {
    const chunk = rows.slice(start, start + CHUNK_SIZE)
    const request = pool.request()
    const values = chunk.map((row, i) => {
      request.input(`carId${i}`, sql.Int, row.carId)
      request.input(`userId${i}`, sql.Int, row.userId)
      request.input(`viewedAt${i}`, sql.DateTime, row.viewedAt)
      return `(@carId${i}, @userId${i}, @viewedAt${i})`
    }).join(', ')
    await request.query(`INSERT INTO CarViews (carId, userId, viewedAt) VALUES ${values}`)
  }
}

async function main() {
  const pool = await getPool()

  const allCarsResult = await pool.request().query('SELECT id FROM Cars')
  const allCarIds = allCarsResult.recordset.map((r) => r.id)

  const trendingCarIds = []
  for (const { make, model } of TRENDING_SEARCH) {
    const result = await pool.request()
      .input('make', sql.NVarChar, make)
      .input('model', sql.NVarChar, model)
      .query('SELECT TOP 1 id FROM Cars WHERE make = @make AND model = @model ORDER BY NEWID()')
    if (result.recordset[0]) trendingCarIds.push(result.recordset[0].id)
  }

  const shuffled = [...allCarIds].sort(() => Math.random() - 0.5)
  const popularCarIds = shuffled
    .filter((id) => !trendingCarIds.includes(id))
    .slice(0, Math.round(allCarIds.length * 0.1))

  const rows = []

  // aggregate signal: anonymous views for trending/popular
  trendingCarIds.forEach((carId) => {
    const viewCount = randomInt(15, 35)
    for (let i = 0; i < viewCount; i += 1) {
      rows.push({ carId, userId: null, viewedAt: hoursAgo(randomInt(0, 24)) })
    }
  })

  popularCarIds.forEach((carId) => {
    const viewCount = randomInt(2, 8)
    for (let i = 0; i < viewCount; i += 1) {
      rows.push({ carId, userId: null, viewedAt: hoursAgo(randomInt(24, 168)) })
    }
  })

  // per-persona signal: real userId, spread over ~21 days so it reads
  // as organic browsing instead of a single burst
  for (const persona of PERSONAS) {
    const candidatesResult = await pool.request()
      .query(`SELECT TOP ${persona.viewCount * 2} id FROM Cars WHERE ${persona.where} ORDER BY NEWID()`)
    const candidateIds = candidatesResult.recordset.map((r) => r.id).slice(0, persona.viewCount)

    candidateIds.forEach((carId) => {
      const visits = randomInt(1, 3)
      for (let i = 0; i < visits; i += 1) {
        rows.push({ carId, userId: persona.userId, viewedAt: hoursAgo(randomInt(1, 24 * 21)) })
      }
    })
  }

  await insertRows(pool, rows)

  const totalResult = await pool.request().query('SELECT COUNT(*) AS total FROM CarViews')
  const anonymousCount = rows.filter((r) => r.userId === null).length
  const personaCount = rows.length - anonymousCount
  console.log(`Seeded ${rows.length} CarViews rows: ${anonymousCount} anonymous (trending/popular) + ${personaCount} persona-aligned.`)
  console.log(`Total CarViews rows now: ${totalResult.recordset[0].total}`)
  process.exit(0)
}

main().catch((err) => {
  console.error('Seeding failed:', err.message)
  process.exit(1)
})