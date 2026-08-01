/* eslint-disable no-undef */
// clustered favourites per user, drawn from the catalog by persona
// criteria (make/bodyType) instead of hardcoded ids. safe to re-run,
// skips (userId, carId) pairs already favourited via UQ_User_Car.

require('dotenv').config()
const { getPool, sql } = require('./db')
const { PERSONAS } = require('./personas')

async function main() {
  const pool = await getPool()
  let inserted = 0
  let skipped = 0

  for (const persona of PERSONAS) {
    const existing = await pool.request()
      .input('userId', sql.Int, persona.userId)
      .query('SELECT carId FROM Favourites WHERE userId = @userId')
    const existingIds = existing.recordset.map((r) => r.carId)

    const candidatesResult = await pool.request()
      .query(`SELECT TOP ${persona.favouriteCount * 3} id FROM Cars WHERE ${persona.where} ORDER BY NEWID()`)
    const candidates = candidatesResult.recordset
      .map((r) => r.id)
      .filter((id) => !existingIds.includes(id))
      .slice(0, persona.favouriteCount)

    for (const carId of candidates) {
      try {
        await pool.request()
          .input('userId', sql.Int, persona.userId)
          .input('carId', sql.Int, carId)
          .query('INSERT INTO Favourites (userId, carId) VALUES (@userId, @carId)')
        inserted += 1
      } catch (err) {
        if (err.message.includes('UQ_User_Car')) {
          skipped += 1
        } else {
          throw err
        }
      }
    }

    console.log(`User ${persona.userId} (${persona.label}): +${candidates.length}`)
  }

  console.log(`Done. Inserted ${inserted}, skipped ${skipped} duplicates.`)
  process.exit(0)
}

main().catch((err) => {
  console.error('Seeding failed:', err.message)
  process.exit(1)
})