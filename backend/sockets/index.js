/* global require, module */
const cookie = require('cookie')
const { sql, getPool } = require('../db')
const { verifyToken, COOKIE_NAME } = require('../auth')

// handshake auth + all connection event handlers live here, called once from server.js
function registerSocketHandlers(io) {
  io.use((socket, next) => {
    try {
      const rawCookie = socket.handshake.headers.cookie
      if (!rawCookie) return next(new Error('Not authenticated'))

      const parsedCookies = cookie.parse(rawCookie)
      const token = parsedCookies[COOKIE_NAME]
      if (!token) return next(new Error('Not authenticated'))

      const payload = verifyToken(token)
      socket.userId = payload.id
      socket.userRole = payload.role
      next()
    } catch {
      next(new Error('Not authenticated'))
    }
  })

  io.on('connection', (socket) => {
    socket.join(`user:${socket.userId}`)

    socket.on('join_conversation', async (conversationId) => {
      try {
        const pool = await getPool()
        const result = await pool.request()
          .input('id', sql.Int, conversationId)
          .query('SELECT user1Id, user2Id FROM Conversations WHERE id = @id')

        const conversation = result.recordset[0]
        if (!conversation) return

        const isParticipant = conversation.user1Id === socket.userId || conversation.user2Id === socket.userId
        if (!isParticipant) return

        socket.join(`conversation:${conversationId}`)
      } catch (err) {
        console.error('join_conversation failed:', err.message)
      }
    })

    socket.on('send_message', async ({ conversationId, content }, callback) => {
      const ack = typeof callback === 'function' ? callback : () => { }

      try {
        const trimmed = content ? content.trim() : ''
        if (!trimmed) return ack({ error: 'Message cannot be empty' })
        if (trimmed.length > 2000) return ack({ error: 'Message is too long (max 2000 characters)' })

        const pool = await getPool()

        const convResult = await pool.request()
          .input('id', sql.Int, conversationId)
          .query('SELECT user1Id, user2Id, status FROM Conversations WHERE id = @id')

        const conversation = convResult.recordset[0]
        if (!conversation) return ack({ error: 'Conversation not found' })

        const isParticipant = conversation.user1Id === socket.userId || conversation.user2Id === socket.userId
        if (!isParticipant) return ack({ error: 'You are not part of this conversation' })

        const otherUserId = conversation.user1Id === socket.userId
          ? conversation.user2Id
          : conversation.user1Id

        // block check first, regardless of this conversation's status - blocks are pair-level, not per-thread
        const blockCheck = await pool.request()
          .input('a', sql.Int, socket.userId)
          .input('b', sql.Int, otherUserId)
          .query(`
            SELECT 1 FROM UserBlocks
            WHERE (blockerId = @a AND blockedId = @b)
               OR (blockerId = @b AND blockedId = @a)
          `)
        if (blockCheck.recordset.length > 0) {
          return ack({ error: 'You cannot send messages here - one of you has blocked the other.' })
        }

        if (conversation.status === 'declined') {
          return ack({ error: 'This message request was declined' })
        }
        if (conversation.status === 'pending') {
          if (conversation.user2Id === socket.userId) {
            return ack({ error: 'Accept the message request before replying' })
          }

          if (conversation.user1Id === socket.userId) {
            const existingCount = await pool.request()
              .input('conversationId', sql.Int, conversationId)
              .query('SELECT COUNT(*) AS messageCount FROM Messages WHERE conversationId = @conversationId')

            if (existingCount.recordset[0].messageCount > 0) {
              return ack({ error: 'You can only send one message until your request is accepted.' })
            }
          }
        }

        const insertResult = await pool.request()
          .input('conversationId', sql.Int, conversationId)
          .input('senderId', sql.Int, socket.userId)
          .input('content', sql.NVarChar, trimmed)
          .query(`
            INSERT INTO Messages (conversationId, senderId, content)
            OUTPUT INSERTED.id, INSERTED.conversationId, INSERTED.senderId, INSERTED.content, INSERTED.isRead, INSERTED.createdAt
            VALUES (@conversationId, @senderId, @content)
          `)

        const message = insertResult.recordset[0]

        socket.to(`conversation:${conversationId}`).emit('new_message', message)
        socket.to(`user:${otherUserId}`).emit('inbox_update', { conversationId, message })

        ack({ message })
      } catch (err) {
        ack({ error: err.message })
      }
    })

    socket.on('leave_conversation', (conversationId) => {
      socket.leave(`conversation:${conversationId}`)
    })
  })
}

module.exports = { registerSocketHandlers }