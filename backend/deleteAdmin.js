/* eslint-disable no-undef */
// run manually to delete the seeded admin account

require('dotenv').config()
const { getPool, sql } = require('./db')

async function main() {
  const pool = await getPool()
  
  try {
    const result = await pool.request()
      .input('email', sql.NVarChar, 'admin@pakwheels.local')
      .query(`DELETE FROM Users WHERE email = @email AND role = 'admin'`)
    
    if (result.rowsAffected[0] > 0) {
      console.log('Successfully deleted the default admin user.')
    } else {
      console.log('No admin user found with that email address.')
    }
  } catch (err) {
    console.error('Error deleting admin user:', err)
  } finally {
    process.exit(0)
  }
}

main()