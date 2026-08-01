/* global require, module */
const { verifyToken, COOKIE_NAME } = require('./auth')
const { sql, getPool } = require('./db')

function requireAuth(req, res, next) {
  try {
    const token = req.cookies[COOKIE_NAME]
    if (!token) return res.status(401).json({ error: 'Not logged in' })
    req.user = verifyToken(token)
    next()
  } catch {
    return res.status(401).json({ error: 'Invalid or expired session' })
  }
}

function requireAdmin(req, res, next) {
  requireAuth(req, res, () => {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' })
    }
    next()
  })
}

function requireOwnerOrAdmin(req, res, next) {
  requireAuth(req, res, async () => {
    try {
      const pool = await getPool()
      const result = await pool.request()
        .input('id', sql.Int, req.params.id)
        .query('SELECT ownerId FROM Cars WHERE id = @id')

      const car = result.recordset[0]
      if (!car) {
        return res.status(404).json({ error: 'Car not found' })
      }

      if (req.user.role !== 'admin' && car.ownerId !== req.user.id) {
        return res.status(403).json({ error: 'You can only modify your own listings' })
      }

      next()
    } catch (err) {
      res.status(503).json({ error: err.message })
    }
  })
}

function requireCommentOwnerOrAdmin(req, res, next) {
  requireAuth(req, res, async () => {
    try {
      const pool = await getPool()
      const result = await pool.request()
        .input('id', sql.Int, req.params.id)
        .query('SELECT userId FROM Comments WHERE id = @id')

      const comment = result.recordset[0]
      if (!comment) {
        return res.status(404).json({ error: 'Comment not found' })
      }

      if (req.user.role !== 'admin' && comment.userId !== req.user.id) {
        return res.status(403).json({ error: 'You can only delete your own comments' })
      }

      next()
    } catch (err) {
      res.status(503).json({ error: err.message })
    }
  })
}

function requireCommentOwner(req, res, next) {
  requireAuth(req, res, async () => {
    try {
      const pool = await getPool()
      const result = await pool.request()
        .input('id', sql.Int, req.params.id)
        .query('SELECT userId FROM Comments WHERE id = @id')

      const comment = result.recordset[0]
      if (!comment) return res.status(404).json({ error: 'Comment not found' })
      if (comment.userId !== req.user.id) {
        return res.status(403).json({ error: 'You can only edit your own comments' })
      }
      next()
    } catch (err) {
      res.status(503).json({ error: err.message })
    }
  })
}

function attachUserIfPresent(req, res, next) {
  const token = req.cookies[COOKIE_NAME]
  if (token) {
    try {
      req.user = verifyToken(token)
    } catch {
      // invalid/expired token - treat as logged out, don't block
    }
  }
  next()
}

function requireConversationParticipant(req, res, next) {
  requireAuth(req, res, async () => {
    try {
      const pool = await getPool()
      const result = await pool.request()
        .input('id', sql.Int, req.params.id)
        .query('SELECT user1Id, user2Id, status, autoAccepted FROM Conversations WHERE id = @id')

      const conversation = result.recordset[0]
      if (!conversation) {
        return res.status(404).json({ error: 'Conversation not found' })
      }

      if (conversation.user1Id !== req.user.id && conversation.user2Id !== req.user.id) {
        return res.status(403).json({ error: 'You are not part of this conversation' })
      }

      req.conversation = conversation
      next()
    } catch (err) {
      res.status(503).json({ error: err.message })
    }
  })
}

module.exports = { requireAuth, requireAdmin, requireOwnerOrAdmin, requireCommentOwnerOrAdmin, requireCommentOwner, attachUserIfPresent, requireConversationParticipant }

