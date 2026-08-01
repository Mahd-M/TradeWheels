/* global require, module */
const express = require('express')
const router = express.Router()
const { sql, getPool } = require('../db')
const { requireAuth, attachUserIfPresent } = require('../middleware')
const { HOVER_IMAGE_JOIN, HOVER_IMAGE_SELECT } = require('../utils/carQuery')

// must mount before routes/cars.js - otherwise "featured"/"trending"/etc
// get matched by cars.js's GET /:id and blow up binding as sql.Int

router.get('/featured', async (req, res) => {
  try {
    const limit = Math.min(20, Math.max(1, parseInt(req.query.limit) || 6))
    const excludeIds = [].concat(req.query.exclude || []).map(Number).filter(Number.isInteger)

    const pool = await getPool()
    const request = pool.request().input('limit', sql.Int, limit)

    let excludeClause = ''
    if (excludeIds.length) {
      excludeIds.forEach((id, i) => request.input(`exclude${i}`, sql.Int, id))
      excludeClause = `WHERE Cars.id NOT IN (${excludeIds.map((_, i) => `@exclude${i}`).join(', ')})`
    }

    const result = await request.query(`
      SELECT TOP (@limit) Cars.*, Users.name AS ownerName, ${HOVER_IMAGE_SELECT}
      FROM Cars
      LEFT JOIN Users ON Cars.ownerId = Users.id
      ${HOVER_IMAGE_JOIN}
      ${excludeClause}
      ORDER BY NEWID()
    `)
    res.json(result.recordset)
  } catch (err) {
    res.status(503).json({ error: err.message })
  }
})

router.get('/trending', async (req, res) => {
  try {
    const limit = Math.min(20, Math.max(1, parseInt(req.query.limit) || 6))
    const windowDays = Math.min(30, Math.max(1, parseInt(req.query.days) || 7))
    const pool = await getPool()

    const result = await pool.request()
      .input('limit', sql.Int, limit)
      .input('windowDays', sql.Int, windowDays)
      .query(`
        SELECT TOP (@limit) Cars.*, Users.name AS ownerName, v.recentViews, ${HOVER_IMAGE_SELECT}
        FROM Cars
        JOIN (
          SELECT carId, COUNT(*) AS recentViews
          FROM CarViews
          WHERE viewedAt >= DATEADD(DAY, -@windowDays, GETDATE())
          GROUP BY carId
        ) v ON v.carId = Cars.id
        LEFT JOIN Users ON Cars.ownerId = Users.id
        ${HOVER_IMAGE_JOIN}
        ORDER BY v.recentViews DESC
      `)

    res.json(result.recordset)
  } catch (err) {
    res.status(503).json({ error: err.message })
  }
})

router.get('/for-you', requireAuth, async (req, res) => {
  try {
    const limit = Math.min(20, Math.max(1, parseInt(req.query.limit) || 6))
    const pool = await getPool()
    const userId = req.user.id

    const collabResult = await pool.request()
      .input('userId', sql.Int, userId)
      .input('limit', sql.Int, limit)
      .query(`
        SELECT TOP (@limit) Cars.*, Users.name AS ownerName, cf.votes, ${HOVER_IMAGE_SELECT}
        FROM Cars
        JOIN (
          SELECT f.carId, COUNT(*) AS votes
          FROM Favourites f
          WHERE f.userId IN (
            SELECT DISTINCT f2.userId
            FROM Favourites f1
            JOIN Favourites f2 ON f2.carId = f1.carId AND f2.userId <> f1.userId
            WHERE f1.userId = @userId
          )
          AND f.carId NOT IN (SELECT carId FROM Favourites WHERE userId = @userId)
          GROUP BY f.carId
        ) cf ON cf.carId = Cars.id
        LEFT JOIN Users ON Cars.ownerId = Users.id
        ${HOVER_IMAGE_JOIN}
        WHERE Cars.ownerId IS NULL OR Cars.ownerId <> @userId
        ORDER BY cf.votes DESC
      `)

    const collaborative = collabResult.recordset
    if (collaborative.length >= limit) {
      return res.json({ cars: collaborative, basis: 'collaborative' })
    }

    const viewWindowDays = Math.min(90, Math.max(1, parseInt(req.query.days) || 7))

    const bodyTypeResult = await pool.request()
      .input('userId', sql.Int, userId)
      .input('windowDays', sql.Int, viewWindowDays)
      .query(`
        SELECT TOP 1 bodyType FROM (
          SELECT c.bodyType, 3 AS weight, f.createdAt AS activityAt
          FROM Favourites f JOIN Cars c ON c.id = f.carId WHERE f.userId = @userId
          UNION ALL
          SELECT c.bodyType, 1 AS weight, v.viewedAt AS activityAt
          FROM CarViews v JOIN Cars c ON c.id = v.carId
          WHERE v.userId = @userId AND v.viewedAt >= DATEADD(DAY, -@windowDays, GETDATE())
        ) signal
        GROUP BY bodyType
        ORDER BY SUM(weight) DESC, MAX(activityAt) DESC
      `)

    const makeResult = await pool.request()
      .input('userId', sql.Int, userId)
      .input('windowDays', sql.Int, viewWindowDays)
      .query(`
        SELECT TOP 1 make FROM (
          SELECT c.make, 3 AS weight, f.createdAt AS activityAt
          FROM Favourites f JOIN Cars c ON c.id = f.carId WHERE f.userId = @userId
          UNION ALL
          SELECT c.make, 1 AS weight, v.viewedAt AS activityAt
          FROM CarViews v JOIN Cars c ON c.id = v.carId
          WHERE v.userId = @userId AND v.viewedAt >= DATEADD(DAY, -@windowDays, GETDATE())
        ) signal
        GROUP BY make
        ORDER BY SUM(weight) DESC, MAX(activityAt) DESC
      `)

    const topBodyType = bodyTypeResult.recordset[0]?.bodyType || null
    const topMake = makeResult.recordset[0]?.make || null

    let profileCars = []
    if (topBodyType || topMake) {
      const excludeIds = collaborative.map((c) => c.id)
      const needed = limit - collaborative.length

      const request = pool.request()
        .input('userId', sql.Int, userId)
        .input('limit', sql.Int, needed)
        .input('bodyType', sql.NVarChar, topBodyType)
        .input('make', sql.NVarChar, topMake)

      let excludeClause = ''
      if (excludeIds.length) {
        excludeIds.forEach((id, i) => request.input(`exclude${i}`, sql.Int, id))
        excludeClause = `AND Cars.id NOT IN (${excludeIds.map((_, i) => `@exclude${i}`).join(', ')})`
      }

      const profileQueryResult = await request.query(`
        SELECT TOP (@limit) Cars.*, Users.name AS ownerName, ${HOVER_IMAGE_SELECT},
          (
            CASE WHEN @bodyType IS NOT NULL AND Cars.bodyType = @bodyType THEN 50 ELSE 0 END +
            CASE WHEN @make IS NOT NULL AND Cars.make = @make THEN 30 ELSE 0 END
          ) AS profileScore
        FROM Cars
        LEFT JOIN Users ON Cars.ownerId = Users.id
        ${HOVER_IMAGE_JOIN}
        WHERE Cars.id NOT IN (SELECT carId FROM Favourites WHERE userId = @userId)
          AND (Cars.ownerId IS NULL OR Cars.ownerId <> @userId)
          AND ((@bodyType IS NOT NULL AND Cars.bodyType = @bodyType) OR (@make IS NOT NULL AND Cars.make = @make))
          ${excludeClause}
        ORDER BY profileScore DESC, Cars.createdAt DESC
      `)
      profileCars = profileQueryResult.recordset
    }

    const combined = [...collaborative, ...profileCars]
    const basis =
      collaborative.length > 0 && profileCars.length > 0 ? 'mixed'
        : collaborative.length > 0 ? 'collaborative'
          : profileCars.length > 0 ? 'profile'
            : 'none'

    res.json({ cars: combined, basis })
  } catch (err) {
    res.status(503).json({ error: err.message })
  }
})

router.get('/recently-viewed-similar', requireAuth, async (req, res) => {
  try {
    const limit = Math.min(20, Math.max(1, parseInt(req.query.limit) || 6))
    const recentMinutes = Math.min(60, Math.max(1, parseInt(req.query.recentMinutes) || 5))
    const broadHours = Math.min(72, Math.max(1, parseInt(req.query.broadHours) || 24))
    const pool = await getPool()
    const userId = req.user.id

    const bodyTypeResult = await pool.request()
      .input('userId', sql.Int, userId)
      .input('recentMinutes', sql.Int, recentMinutes)
      .input('broadHours', sql.Int, broadHours)
      .query(`
        SELECT TOP 1 bodyType FROM (
          SELECT c.bodyType,
            (CASE WHEN v.viewedAt >= DATEADD(MINUTE, -@recentMinutes, GETDATE()) THEN 3 ELSE 0 END + 1) AS weight,
            v.viewedAt AS activityAt
          FROM CarViews v JOIN Cars c ON c.id = v.carId
          WHERE v.userId = @userId AND v.viewedAt >= DATEADD(HOUR, -@broadHours, GETDATE())
        ) signal
        GROUP BY bodyType
        ORDER BY SUM(weight) DESC, MAX(activityAt) DESC
      `)

    const makeResult = await pool.request()
      .input('userId', sql.Int, userId)
      .input('recentMinutes', sql.Int, recentMinutes)
      .input('broadHours', sql.Int, broadHours)
      .query(`
        SELECT TOP 1 make FROM (
          SELECT c.make,
            (CASE WHEN v.viewedAt >= DATEADD(MINUTE, -@recentMinutes, GETDATE()) THEN 3 ELSE 0 END + 1) AS weight,
            v.viewedAt AS activityAt
          FROM CarViews v JOIN Cars c ON c.id = v.carId
          WHERE v.userId = @userId AND v.viewedAt >= DATEADD(HOUR, -@broadHours, GETDATE())
        ) signal
        GROUP BY make
        ORDER BY SUM(weight) DESC, MAX(activityAt) DESC
      `)

    const topBodyType = bodyTypeResult.recordset[0]?.bodyType || null
    const topMake = makeResult.recordset[0]?.make || null

    if (!topBodyType && !topMake) {
      return res.json({ cars: [] })
    }

    const result = await pool.request()
      .input('userId', sql.Int, userId)
      .input('limit', sql.Int, limit)
      .input('bodyType', sql.NVarChar, topBodyType)
      .input('make', sql.NVarChar, topMake)
      .input('recentMinutes', sql.Int, recentMinutes)
      .query(`
        SELECT TOP (@limit) Cars.*, Users.name AS ownerName, ${HOVER_IMAGE_SELECT},
          (
            CASE WHEN @bodyType IS NOT NULL AND Cars.bodyType = @bodyType THEN 50 ELSE 0 END +
            CASE WHEN @make IS NOT NULL AND Cars.make = @make THEN 30 ELSE 0 END
          ) AS profileScore
        FROM Cars
        LEFT JOIN Users ON Cars.ownerId = Users.id
        ${HOVER_IMAGE_JOIN}
        WHERE (Cars.ownerId IS NULL OR Cars.ownerId <> @userId)
          AND ((@bodyType IS NOT NULL AND Cars.bodyType = @bodyType) OR (@make IS NOT NULL AND Cars.make = @make))
          AND Cars.id NOT IN (
            SELECT carId FROM CarViews
            WHERE userId = @userId AND viewedAt >= DATEADD(MINUTE, -@recentMinutes, GETDATE())
          )
        ORDER BY profileScore DESC, Cars.createdAt DESC
      `)

    res.json({ cars: result.recordset })
  } catch (err) {
    res.status(503).json({ error: err.message })
  }
})

router.get('/:id/similar', async (req, res) => {
  try {
    const carId = req.params.id
    const limit = Math.min(20, Math.max(1, parseInt(req.query.limit) || 6))
    const pool = await getPool()

    const sourceResult = await pool.request()
      .input('id', sql.Int, carId)
      .query('SELECT bodyType, make, transmission, fuelType, price FROM Cars WHERE id = @id')

    const source = sourceResult.recordset[0]
    if (!source) {
      return res.status(404).json({ error: 'Car not found' })
    }

    const result = await pool.request()
      .input('id', sql.Int, carId)
      .input('limit', sql.Int, limit)
      .input('bodyType', sql.NVarChar, source.bodyType)
      .input('make', sql.NVarChar, source.make)
      .input('transmission', sql.NVarChar, source.transmission)
      .input('fuelType', sql.NVarChar, source.fuelType)
      .input('price', sql.BigInt, source.price)
      .query(`
        SELECT TOP (@limit) Cars.*, Users.name AS ownerName, ${HOVER_IMAGE_SELECT},
          (
            CASE WHEN Cars.bodyType = @bodyType THEN 40 ELSE 0 END +
            CASE WHEN Cars.make = @make THEN 30 ELSE 0 END +
            CASE WHEN Cars.transmission = @transmission THEN 10 ELSE 0 END +
            CASE WHEN Cars.fuelType = @fuelType THEN 10 ELSE 0 END +
            CASE WHEN Cars.price BETWEEN @price * 0.7 AND @price * 1.3 THEN 10 ELSE 0 END
          ) AS similarityScore
        FROM Cars
        LEFT JOIN Users ON Cars.ownerId = Users.id
        ${HOVER_IMAGE_JOIN}
        WHERE Cars.id <> @id
        ORDER BY similarityScore DESC, ABS(Cars.price - @price) ASC
      `)

    res.json(result.recordset)
  } catch (err) {
    res.status(503).json({ error: err.message })
  }
})

router.post('/:id/view', attachUserIfPresent, async (req, res) => {
  try {
    const carId = req.params.id
    const userId = req.user ? req.user.id : null
    const pool = await getPool()

    const carCheck = await pool.request()
      .input('carId', sql.Int, carId)
      .query('SELECT id, ownerId FROM Cars WHERE id = @carId')

    const car = carCheck.recordset[0]
    if (!car) {
      return res.status(404).json({ error: 'Car not found' })
    }

    if (userId && car.ownerId === userId) {
      return res.status(200).json({ message: 'View not counted (own listing)' })
    }

    if (userId) {
      const recent = await pool.request()
        .input('carId', sql.Int, carId)
        .input('userId', sql.Int, userId)
        .query(`
          SELECT TOP 1 id FROM CarViews
          WHERE carId = @carId AND userId = @userId
            AND viewedAt >= DATEADD(MINUTE, -30, GETDATE())
        `)
      if (recent.recordset[0]) {
        return res.status(200).json({ message: 'View already recorded recently' })
      }
    }

    await pool.request()
      .input('carId', sql.Int, carId)
      .input('userId', sql.Int, userId)
      .query('INSERT INTO CarViews (carId, userId) VALUES (@carId, @userId)')

    res.status(201).json({ message: 'View recorded' })
  } catch (err) {
    res.status(503).json({ error: err.message })
  }
})

module.exports = router