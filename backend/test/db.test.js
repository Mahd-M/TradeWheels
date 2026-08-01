/* eslint-disable no-undef */
const test = require('node:test')
const assert = require('node:assert/strict')

process.env.DB_USER = 'bad-user'
process.env.DB_PASSWORD = 'bad-password'
process.env.DB_SERVER = '127.0.0.1'
process.env.DB_NAME = 'test-db'
process.env.DB_PORT = '1433'

const db = require('../db')

test('database bootstrap should not crash when SQL Server is unavailable', async () => {
  const status = await db.getDatabaseStatus()

  assert.equal(typeof status.connected, 'boolean')
  assert.equal(status.connected, false)
  assert.ok(status.error)
})
