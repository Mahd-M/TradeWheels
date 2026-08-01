/* eslint-disable no-undef */
// run manually to create an admin account

require('dotenv').config()
const { hashPassword } = require('./auth')
const { getPool, sql } = require('./db')

async function main() {
  const passwordHash = await hashPassword('a strongpassword')
  const pool = await getPool()
  await pool.request()
    .input('name', sql.NVarChar, 'Admin')
    .input('email', sql.NVarChar, 'Admin@local.com')
    .input('passwordHash', sql.NVarChar, passwordHash)
    .query(`INSERT INTO Users (name, email, passwordHash, role) VALUES (@name, @email, @passwordHash, 'admin')`)
  console.log('Admin created')
  process.exit(0)
}

main()