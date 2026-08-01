/* global require, module */
const express = require('express')
const router = express.Router()
const { sql, getPool } = require('../db')
const { requireAuth, requireConversationParticipant } = require('../middleware')

// mounted at /api - owns both /api/conversations/... and
// /api/users/:id/block|unblock, since blocking is pair-level state
// tied to conversations. socket events go out via req.app.get('io')
// to avoid a require cycle back to server.js

router.get('/conversations', requireAuth, async (req, res) => {
  try {
    const pool = await getPool()
    const result = await pool.request()
      .input('userId', sql.Int, req.user.id)
      .query(`
        SELECT
          c.id,
          c.carId,
          car.make AS carMake,
          car.model AS carModel,
          car.year AS carYear,
          c.createdAt,
          c.status,
          CAST(CASE WHEN c.user1Id = @userId THEN 1 ELSE 0 END AS BIT) AS isInitiator,
          CASE WHEN c.user1Id = @userId THEN c.user2Id ELSE c.user1Id END AS otherUserId,
          CASE WHEN c.user1Id = @userId THEN u2.name ELSE u1.name END AS otherUserName,
          lastMsg.content AS lastMessageContent,
          lastMsg.createdAt AS lastMessageAt,
          (SELECT COUNT(*) FROM Messages m
          WHERE m.conversationId = c.id AND m.senderId <> @userId AND m.isRead = 0) AS unreadCount
        FROM Conversations c
        JOIN Users u1 ON c.user1Id = u1.id
        JOIN Users u2 ON c.user2Id = u2.id
        LEFT JOIN Cars car ON c.carId = car.id
        OUTER APPLY (
          SELECT TOP 1 content, createdAt
          FROM Messages
          WHERE conversationId = c.id
          ORDER BY createdAt DESC
        ) lastMsg
        WHERE c.user1Id = @userId OR c.user2Id = @userId
        ORDER BY lastMsg.createdAt DESC
      `)
    res.json(result.recordset)
  } catch (err) {
    res.status(503).json({ error: err.message })
  }
})

router.get('/conversations/:id/messages', requireConversationParticipant, async (req, res) => {
  try {
    const conversationId = req.params.id
    const page = Math.max(1, parseInt(req.query.page) || 1)
    const pageSize = 20
    const offset = (page - 1) * pageSize

    const pool = await getPool()

    const countResult = await pool.request()
      .input('conversationId', sql.Int, conversationId)
      .query('SELECT COUNT(*) AS total FROM Messages WHERE conversationId = @conversationId')
    const totalPages = Math.max(1, Math.ceil(countResult.recordset[0].total / pageSize))

    const result = await pool.request()
      .input('conversationId', sql.Int, conversationId)
      .input('offset', sql.Int, offset)
      .input('pageSize', sql.Int, pageSize)
      .query(`
        SELECT id, senderId, content, isRead, createdAt
        FROM Messages
        WHERE conversationId = @conversationId
        ORDER BY createdAt DESC
        OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY
      `)

    const otherUserId = req.conversation.user1Id === req.user.id ? req.conversation.user2Id : req.conversation.user1Id

    const blockResult = await pool.request()
      .input('a', sql.Int, req.user.id)
      .input('b', sql.Int, otherUserId)
      .query(`
        SELECT blockerId FROM UserBlocks
        WHERE (blockerId = @a AND blockedId = @b)
           OR (blockerId = @b AND blockedId = @a)
      `)
    const block = blockResult.recordset[0]

    res.json({
      messages: result.recordset.reverse(),
      totalPages,
      currentPage: page,
      status: req.conversation.status,
      isInitiator: req.conversation.user1Id === req.user.id,
      otherUserId,
      autoAccepted: Boolean(req.conversation.autoAccepted),
      blockedByMe: Boolean(block && block.blockerId === req.user.id),
      blockedByThem: Boolean(block && block.blockerId === otherUserId)
    })
  } catch (err) {
    res.status(503).json({ error: err.message })
  }
})

router.post('/conversations', requireAuth, async (req, res) => {
  try {
    const { otherUserId, carId } = req.body

    if (!otherUserId) {
      return res.status(400).json({ error: 'otherUserId is required' })
    }
    if (otherUserId === req.user.id) {
      return res.status(400).json({ error: 'Cannot start a conversation with yourself' })
    }

    const pool = await getPool()
    const normalizedCarId = carId || null

    const existing = await pool.request()
      .input('userA', sql.Int, req.user.id)
      .input('userB', sql.Int, otherUserId)
      .query(`
        SELECT id, carId, status FROM Conversations
        WHERE (user1Id = @userA AND user2Id = @userB)
           OR (user1Id = @userB AND user2Id = @userA)
      `)

    const sameCarConversation = existing.recordset.find(
      (c) => (c.carId ?? null) === normalizedCarId
    )
    if (sameCarConversation) {
      return res.json({ id: sameCarConversation.id })
    }

    const blockResult = await pool.request()
      .input('userA', sql.Int, req.user.id)
      .input('userB', sql.Int, otherUserId)
      .query(`
        SELECT blockerId, blockedId FROM UserBlocks
        WHERE (blockerId = @userA AND blockedId = @userB)
           OR (blockerId = @userB AND blockedId = @userA)
      `)

    const block = blockResult.recordset[0]
    if (block) {
      const blockedByYou = block.blockerId === req.user.id
      return res.status(403).json({
        error: blockedByYou
          ? 'You have blocked this user. Unblock them to start a new conversation.'
          : 'You have been blocked by the owner of this car.',
        blockedByYou
      })
    }

    const alreadyAccepted = existing.recordset.some((c) => c.status === 'accepted')
    const initialStatus = alreadyAccepted ? 'accepted' : 'pending'

    const result = await pool.request()
      .input('user1Id', sql.Int, req.user.id)
      .input('user2Id', sql.Int, otherUserId)
      .input('carId', sql.Int, normalizedCarId)
      .input('status', sql.NVarChar, initialStatus)
      .input('autoAccepted', sql.Bit, alreadyAccepted ? 1 : 0)
      .query(`
        INSERT INTO Conversations (user1Id, user2Id, carId, status, autoAccepted)
        OUTPUT INSERTED.id
        VALUES (@user1Id, @user2Id, @carId, @status, @autoAccepted)
      `)

    res.status(201).json({ id: result.recordset[0].id })
  } catch (err) {
    res.status(503).json({ error: err.message })
  }
})

router.put('/conversations/:id/read', requireConversationParticipant, async (req, res) => {
  try {
    const pool = await getPool()
    await pool.request()
      .input('conversationId', sql.Int, req.params.id)
      .input('userId', sql.Int, req.user.id)
      .query(`
        UPDATE Messages
        SET isRead = 1
        WHERE conversationId = @conversationId AND senderId <> @userId AND isRead = 0
      `)
    res.json({ message: 'Marked as read' })
  } catch (err) {
    res.status(503).json({ error: err.message })
  }
})

router.put('/conversations/:id/accept', requireConversationParticipant, async (req, res) => {
  try {
    if (req.user.id === req.conversation.user1Id) {
      return res.status(403).json({ error: 'Only the recipient can accept a message request' })
    }

    const pool = await getPool()
    await pool.request()
      .input('id', sql.Int, req.params.id)
      .query(`UPDATE Conversations SET status = 'accepted' WHERE id = @id`)

    req.app.get('io').to(`user:${req.conversation.user1Id}`).emit('conversation_status_changed', {
      conversationId: Number(req.params.id),
      status: 'accepted'
    })

    res.json({ message: 'Message request accepted' })
  } catch (err) {
    res.status(503).json({ error: err.message })
  }
})

router.put('/conversations/:id/decline', requireConversationParticipant, async (req, res) => {
  try {
    if (req.user.id === req.conversation.user1Id) {
      return res.status(403).json({ error: 'Only the recipient can decline a message request' })
    }

    const pool = await getPool()
    await pool.request()
      .input('id', sql.Int, req.params.id)
      .query(`UPDATE Conversations SET status = 'declined' WHERE id = @id`)

    const otherUserId = req.conversation.user1Id

    await pool.request()
      .input('blockerId', sql.Int, req.user.id)
      .input('blockedId', sql.Int, otherUserId)
      .query(`
        IF NOT EXISTS (SELECT 1 FROM UserBlocks WHERE blockerId = @blockerId AND blockedId = @blockedId)
        INSERT INTO UserBlocks (blockerId, blockedId) VALUES (@blockerId, @blockedId)
      `)

    const io = req.app.get('io')
    io.to(`user:${otherUserId}`).emit('conversation_status_changed', {
      conversationId: Number(req.params.id),
      status: 'declined'
    })
    io.to(`user:${otherUserId}`).emit('user_block_changed', {
      otherUserId: req.user.id,
      blocked: true
    })

    res.json({ message: 'Message request declined' })
  } catch (err) {
    res.status(503).json({ error: err.message })
  }
})

router.put('/users/:id/block', requireAuth, async (req, res) => {
  try {
    const blockedId = Number(req.params.id)
    if (blockedId === req.user.id) {
      return res.status(400).json({ error: 'You cannot block yourself' })
    }

    const pool = await getPool()

    const reverseCheck = await pool.request()
      .input('blockerId', sql.Int, blockedId)
      .input('blockedId', sql.Int, req.user.id)
      .query('SELECT 1 FROM UserBlocks WHERE blockerId = @blockerId AND blockedId = @blockedId')

    if (reverseCheck.recordset.length > 0) {
      return res.status(403).json({ error: 'You cannot block this user while they have already blocked you' })
    }

    await pool.request()
      .input('blockerId', sql.Int, req.user.id)
      .input('blockedId', sql.Int, blockedId)
      .query(`
        IF NOT EXISTS (SELECT 1 FROM UserBlocks WHERE blockerId = @blockerId AND blockedId = @blockedId)
        INSERT INTO UserBlocks (blockerId, blockedId) VALUES (@blockerId, @blockedId)
      `)

    await pool.request()
      .input('userA', sql.Int, req.user.id)
      .input('userB', sql.Int, blockedId)
      .query(`
        UPDATE Conversations SET status = 'declined'
        WHERE status = 'pending' AND user1Id = @userB AND user2Id = @userA
      `)

    req.app.get('io').to(`user:${blockedId}`).emit('user_block_changed', { otherUserId: req.user.id, blocked: true })

    res.json({ message: 'User blocked' })
  } catch (err) {
    res.status(503).json({ error: err.message })
  }
})

router.put('/users/:id/unblock', requireAuth, async (req, res) => {
  try {
    const blockedId = Number(req.params.id)
    const pool = await getPool()

    const result = await pool.request()
      .input('blockerId', sql.Int, req.user.id)
      .input('blockedId', sql.Int, blockedId)
      .query('DELETE FROM UserBlocks WHERE blockerId = @blockerId AND blockedId = @blockedId')

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ error: 'You have not blocked this user' })
    }

    await pool.request()
      .input('userA', sql.Int, req.user.id)
      .input('userB', sql.Int, blockedId)
      .query(`
        UPDATE Conversations SET status = 'accepted'
        WHERE status = 'declined'
          AND ((user1Id = @userA AND user2Id = @userB) OR (user1Id = @userB AND user2Id = @userA))
      `)

    req.app.get('io').to(`user:${blockedId}`).emit('user_block_changed', { otherUserId: req.user.id, blocked: false })

    res.json({ message: 'User unblocked' })
  } catch (err) {
    res.status(503).json({ error: err.message })
  }
})

module.exports = router