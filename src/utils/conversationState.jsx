export function getConversationInvitationState(conversation, currentUserId) {
  const { status, user1Id } = conversation
  const isInitiator = currentUserId === user1Id

  return {
    isInitiator,
    canSendMessage: status === 'accepted' || (status === 'pending' && isInitiator),
    showInvitationActions: status === 'pending' && !isInitiator,
    showPendingNotice: status === 'pending' && isInitiator,
    showDeclinedNotice: status === 'declined',
  }
}