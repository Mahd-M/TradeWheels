/* global require, module, process */
const express = require('express')
const router = express.Router()
const { sql, getPool } = require('../db')
// pulls from backend/auth.js, not this file - same name, different folder
const { hashPassword, comparePassword, signToken, verifyToken, COOKIE_NAME } = require('../auth')

function setAuthCookie(res, token) {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000
  })
}

router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email and password are required' })
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' })
    }

    const pool = await getPool()

    const existing = await pool.request()
      .input('email', sql.NVarChar, email)
      .query('SELECT id FROM Users WHERE email = @email')

    if (existing.recordset.length > 0) {
      return res.status(409).json({ error: 'An account with that email already exists' })
    }

    const passwordHash = await hashPassword(password)

    const result = await pool.request()
      .input('name', sql.NVarChar, name)
      .input('email', sql.NVarChar, email)
      .input('passwordHash', sql.NVarChar, passwordHash)
      .query(`
        INSERT INTO Users (name, email, passwordHash, role)
        OUTPUT INSERTED.id, INSERTED.name, INSERTED.email, INSERTED.role
        VALUES (@name, @email, @passwordHash, 'user')
      `)

    const user = result.recordset[0]
    const token = signToken(user)
    setAuthCookie(res, token)

    res.status(201).json({ user })
  } catch (err) {
    res.status(503).json({ error: err.message })
  }
})

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' })
    }

    const pool = await getPool()
    const result = await pool.request()
      .input('email', sql.NVarChar, email)
      .query('SELECT id, name, email, passwordHash, role FROM Users WHERE email = @email')

    const user = result.recordset[0]

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' })
    }

    const valid = await comparePassword(password, user.passwordHash)
    if (!valid) {
      return res.status(401).json({ error: 'Invalid email or password' })
    }

    const token = signToken(user)
    setAuthCookie(res, token)

    res.json({ user: { id: user.id, name: user.name, email: user.email, role: user.role } })
  } catch (err) {
    res.status(503).json({ error: err.message })
  }
})

router.post('/logout', (req, res) => {
  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax'
  })
  res.json({ message: 'Logged out' })
})

router.get('/me', async (req, res) => {
  try {
    const token = req.cookies[COOKIE_NAME]
    if (!token) return res.status(401).json({ error: 'Not logged in' })

    const payload = verifyToken(token)

    const pool = await getPool()
    const result = await pool.request()
      .input('id', sql.Int, payload.id)
      .query('SELECT id, name, email, role FROM Users WHERE id = @id')

    const user = result.recordset[0]
    if (!user) return res.status(401).json({ error: 'Not logged in' })

    res.json({ user })
  } catch {
    res.status(401).json({ error: 'Not logged in' })
  }
})

module.exports = router