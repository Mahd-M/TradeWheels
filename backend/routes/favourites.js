/* global require, module */
const express = require('express')
const router = express.Router()
const { sql, getPool } = require('../db')
const { requireAuth } = require('../middleware')
const { HOVER_IMAGE_JOIN, HOVER_IMAGE_SELECT } = require('../utils/carQuery')

router.get('/', requireAuth, async (req, res) => {
  try {
    const pool = await getPool()
    const result = await pool.request()
      .input('userId', sql.Int, req.user.id)
      .query(`
        SELECT Cars.*, ${HOVER_IMAGE_SELECT} FROM Favourites
        JOIN Cars ON Favourites.carId = Cars.id
        ${HOVER_IMAGE_JOIN}
        WHERE Favourites.userId = @userId
      `)
    res.json(result.recordset)
  } catch (err) {
    res.status(503).json({ error: err.message })
  }
})

router.post('/', requireAuth, async (req, res) => {
  try {
    const { carId } = req.body
    const pool = await getPool()
    await pool.request()
      .input('userId', sql.Int, req.user.id)
      .input('carId', sql.Int, carId)
      .query('INSERT INTO Favourites (userId, carId) VALUES (@userId, @carId)')
    res.status(201).json({ message: 'Added to favourites' })
  } catch (err) {
    res.status(503).json({ error: err.message })
  }
})

// scoped by userId too, not just carId - otherwise anyone logged in could
// delete another user's favourite just by knowing the car id
router.delete('/:carId', requireAuth, async (req, res) => {
  try {
    const pool = await getPool()
    await pool.request()
      .input('userId', sql.Int, req.user.id)
      .input('carId', sql.Int, req.params.carId)
      .query('DELETE FROM Favourites WHERE userId = @userId AND carId = @carId')
    res.json({ message: 'Removed from favourites' })
  } catch (err) {
    res.status(503).json({ error: err.message })
  }
})

module.exports = router