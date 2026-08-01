/* global require, process, module */
require('dotenv').config()
const sql = require('mssql')

const config = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER,
  database: process.env.DB_NAME,
  port: Number(process.env.DB_PORT) || 1433,
  options: {
    encrypt: false,
    trustServerCertificate: true
  }
}

let poolPromise = null
let databaseStatus = { connected: false, error: null }

async function connectToDatabase() {
  try {
    const pool = await new sql.ConnectionPool(config).connect()
    databaseStatus = { connected: true, error: null }
    console.log('Connected to SQL Server')
    return pool
  } catch (err) {
    databaseStatus = { connected: false, error: err.message }
    console.error('Database connection failed:', err.message)
    return null
  }
}

poolPromise = connectToDatabase()

async function getDatabaseStatus() {
  if (databaseStatus.connected) {
    return databaseStatus
  }

  const pool = await poolPromise
  return {
    connected: Boolean(pool),
    error: pool ? null : databaseStatus.error || 'Database unavailable'
  }
}

async function getPool() {
  const pool = await poolPromise
  if (!pool) {
    throw new Error(databaseStatus.error || 'Database unavailable. Start SQL Server and verify backend/.env settings.')
  }
  return pool
}

module.exports = { sql, poolPromise, getDatabaseStatus, getPool }