/* global require, module */
const express = require('express')
const router = express.Router()
const { sql, getPool } = require('../db')
const { requireAdmin } = require('../middleware')

router.get('/reports', requireAdmin, async (req, res) => {
  try {
    const pool = await getPool()
    const result = await pool.request().query(`
      SELECT 
        Comments.id AS commentId,
        Comments.content,
        Comments.carId,
        Users.name AS commenterName,
        COUNT(CommentReports.id) AS reportCount
      FROM CommentReports
      JOIN Comments ON CommentReports.commentId = Comments.id
      JOIN Users ON Comments.userId = Users.id
      GROUP BY Comments.id, Comments.content, Comments.carId, Users.name
      ORDER BY reportCount DESC
    `)
    res.json(result.recordset)
  } catch (err) {
    res.status(503).json({ error: err.message })
  }
})

router.delete('/reports/:commentId', requireAdmin, async (req, res) => {
  try {
    const pool = await getPool()
    await pool.request()
      .input('commentId', sql.Int, req.params.commentId)
      .query('DELETE FROM CommentReports WHERE commentId = @commentId')
    res.json({ message: 'Reports dismissed' })
  } catch (err) {
    res.status(503).json({ error: err.message })
  }
})

module.exports = router