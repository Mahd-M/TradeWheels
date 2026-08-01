/* global require, module */
const express = require('express')
const router = express.Router()
const { sql, getPool } = require('../db')
const { requireAuth, requireCommentOwner, requireCommentOwnerOrAdmin, attachUserIfPresent } = require('../middleware')

// mounted at /api - owns both /api/cars/:id/comments and /api/comments/:id

router.get('/cars/:id/comments', attachUserIfPresent, async (req, res) => {
  try {
    const carId = req.params.id
    const page = Math.max(1, parseInt(req.query.page) || 1)
    const pageSize = 5
    const offset = (page - 1) * pageSize
    const currentUserId = req.user ? req.user.id : null

    const pool = await getPool()

    const countResult = await pool.request()
      .input('carId', sql.Int, carId)
      .query('SELECT COUNT(*) AS total FROM Comments WHERE carId = @carId AND parentId IS NULL')

    const totalComments = countResult.recordset[0].total
    const totalPages = Math.max(1, Math.ceil(totalComments / pageSize))

    const topLevelResult = await pool.request()
      .input('carId', sql.Int, carId)
      .input('offset', sql.Int, offset)
      .input('pageSize', sql.Int, pageSize)
      .input('currentUserId', sql.Int, currentUserId)
      .query(`
        SELECT c.id, c.content, c.createdAt, c.updatedAt, c.userId, c.parentId, c.isEdited, c.isDeleted,
               Users.name AS commenterName,
               CAST(CASE WHEN cr.id IS NULL THEN 0 ELSE 1 END AS BIT) AS reportedByMe
        FROM Comments c
        JOIN Users ON c.userId = Users.id
        LEFT JOIN CommentReports cr ON cr.commentId = c.id AND cr.reportedBy = @currentUserId
        WHERE c.carId = @carId AND c.parentId IS NULL
        ORDER BY c.createdAt DESC
        OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY
      `)

    const topLevelComments = topLevelResult.recordset
    const topLevelIds = topLevelComments.map((c) => c.id)

    let replies = []
    if (topLevelIds.length > 0) {
      const request = pool.request().input('currentUserId', sql.Int, currentUserId)
      const idParams = topLevelIds.map((id, i) => {
        request.input(`id${i}`, sql.Int, id)
        return `@id${i}`
      }).join(', ')

      const repliesResult = await request.query(`
        SELECT c.id, c.content, c.createdAt, c.updatedAt, c.userId, c.parentId, c.isEdited, c.isDeleted,
               Users.name AS commenterName,
               CAST(CASE WHEN cr.id IS NULL THEN 0 ELSE 1 END AS BIT) AS reportedByMe
        FROM Comments c
        JOIN Users ON c.userId = Users.id
        LEFT JOIN CommentReports cr ON cr.commentId = c.id AND cr.reportedBy = @currentUserId
        WHERE c.parentId IN (${idParams})
        ORDER BY c.createdAt ASC
      `)
      replies = repliesResult.recordset
    }

    const commentsWithReplies = topLevelComments.map((c) => ({
      ...c,
      replies: replies.filter((r) => r.parentId === c.id)
    }))

    res.json({ comments: commentsWithReplies, totalComments, totalPages, currentPage: page })
  } catch (err) {
    res.status(503).json({ error: err.message })
  }
})

router.post('/cars/:id/comments', requireAuth, async (req, res) => {
  try {
    const { content, parentId } = req.body
    const trimmed = content ? content.trim() : ''

    if (!trimmed) {
      return res.status(400).json({ error: 'Comment cannot be empty' })
    }
    if (trimmed.length > 1000) {
      return res.status(400).json({ error: 'Comment is too long (max 1000 characters)' })
    }

    const pool = await getPool()

    let validatedParentId = null
    if (parentId) {
      const parentCheck = await pool.request()
        .input('parentId', sql.Int, parentId)
        .input('carId', sql.Int, req.params.id)
        .query('SELECT id, parentId FROM Comments WHERE id = @parentId AND carId = @carId')

      const parent = parentCheck.recordset[0]
      if (!parent) return res.status(404).json({ error: 'Comment being replied to was not found' })
      if (parent.parentId !== null) return res.status(400).json({ error: 'Cannot reply to a reply' })
      validatedParentId = parent.id
    }
    const result = await pool.request()
      .input('carId', sql.Int, req.params.id)
      .input('userId', sql.Int, req.user.id)
      .input('content', sql.NVarChar, trimmed)
      .input('parentId', sql.Int, validatedParentId)
      .query(`
        INSERT INTO Comments (carId, userId, content, parentId)
        OUTPUT INSERTED.id, INSERTED.content, INSERTED.createdAt, INSERTED.userId, INSERTED.parentId
        VALUES (@carId, @userId, @content, @parentId)
      `)

    res.status(201).json(result.recordset[0])
  } catch (err) {
    res.status(503).json({ error: err.message })
  }
})

router.put('/comments/:id', requireCommentOwner, async (req, res) => {
  try {
    const { content } = req.body
    const trimmed = content ? content.trim() : ''
    if (!trimmed) return res.status(400).json({ error: 'Comment cannot be empty' })
    if (trimmed.length > 1000) return res.status(400).json({ error: 'Comment is too long (max 1000 characters)' })

    const pool = await getPool()
    const result = await pool.request()
      .input('id', sql.Int, req.params.id)
      .input('content', sql.NVarChar, trimmed)
      .query(`
        UPDATE Comments
        SET content = @content, isEdited = 1, updatedAt = GETDATE()
        OUTPUT INSERTED.id, INSERTED.content, INSERTED.isEdited, INSERTED.updatedAt
        WHERE id = @id
      `)
    res.json(result.recordset[0])
  } catch (err) {
    res.status(503).json({ error: err.message })
  }
})

router.delete('/comments/:id', requireCommentOwnerOrAdmin, async (req, res) => {
  try {
    const pool = await getPool()

    const childCheck = await pool.request()
      .input('id', sql.Int, req.params.id)
      .query('SELECT COUNT(*) AS replyCount FROM Comments WHERE parentId = @id')

    const hasReplies = childCheck.recordset[0].replyCount > 0

    if (hasReplies) {
      await pool.request()
        .input('id', sql.Int, req.params.id)
        .query(`UPDATE Comments SET content = '[deleted]', isDeleted = 1 WHERE id = @id`)
      return res.json({ message: 'Comment deleted', softDeleted: true })
    }

    await pool.request()
      .input('id', sql.Int, req.params.id)
      .query('DELETE FROM Comments WHERE id = @id')
    res.json({ message: 'Comment deleted', softDeleted: false })
  } catch (err) {
    res.status(503).json({ error: err.message })
  }
})

router.post('/comments/:id/report', requireAuth, async (req, res) => {
  try {
    const { reason } = req.body
    const pool = await getPool()

    const commentResult = await pool.request()
      .input('id', sql.Int, req.params.id)
      .query('SELECT userId FROM Comments WHERE id = @id')

    const comment = commentResult.recordset[0]
    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' })
    }
    if (comment.userId === req.user.id) {
      return res.status(400).json({ error: 'You cannot report your own comment' })
    }

    await pool.request()
      .input('commentId', sql.Int, req.params.id)
      .input('reportedBy', sql.Int, req.user.id)
      .input('reason', sql.NVarChar, reason || null)
      .query('INSERT INTO CommentReports (commentId, reportedBy, reason) VALUES (@commentId, @reportedBy, @reason)')

    res.status(201).json({ message: 'Comment reported' })
  } catch (err) {
    if (err.message.includes('UQ_Report_Comment_User')) {
      return res.status(409).json({ error: 'You already reported this comment' })
    }
    res.status(503).json({ error: err.message })
  }
})

router.delete('/comments/:id/report', requireAuth, async (req, res) => {
  try {
    const pool = await getPool()
    await pool.request()
      .input('commentId', sql.Int, req.params.id)
      .input('reportedBy', sql.Int, req.user.id)
      .query('DELETE FROM CommentReports WHERE commentId = @commentId AND reportedBy = @reportedBy')
    res.json({ message: 'Report withdrawn' })
  } catch (err) {
    res.status(503).json({ error: err.message })
  }
})

module.exports = router