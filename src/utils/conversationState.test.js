import test from 'node:test'
import assert from 'node:assert/strict'
import { getConversationInvitationState } from './conversationState.jsx'

test('shows invitation actions only for the pending recipient', () => {
  const conversation = { status: 'pending', user1Id: 2, user2Id: 3 }

  const recipientState = getConversationInvitationState(conversation, 3)
  const initiatorState = getConversationInvitationState(conversation, 2)

  assert.equal(recipientState.showInvitationActions, true)
  assert.equal(recipientState.canSendMessage, false)
  assert.equal(initiatorState.showPendingNotice, true)
  assert.equal(initiatorState.canSendMessage, false)
})
