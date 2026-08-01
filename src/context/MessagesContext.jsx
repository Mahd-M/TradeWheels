import { createContext, useState, useEffect, useContext, useCallback, useRef, useMemo } from 'react'
import { API_URL } from '../constants/api'
import { useAuth } from './AuthContext'
import { useSocket } from './SocketContext'

const MessagesContext = createContext()

export function MessagesProvider({ children }) {
  const { user, loading: authLoading } = useAuth()
  const { socket } = useSocket()
  const [conversations, setConversations] = useState([])
  const activeConversationIdRef = useRef(null)

  const fetchConversations = useCallback(() => {
    if (!user) return
    fetch(`${API_URL}/conversations`, { credentials: 'include' })
      .then((res) => res.json())
      .then((data) => setConversations(data))
      .catch((err) => console.error('Failed to load conversations:', err))
  }, [user])


  useEffect(() => {
    if (authLoading) return
    if (!user) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setConversations([])
      return
    }
    fetchConversations()
  }, [user, authLoading, fetchConversations])



  useEffect(() => {
    if (!socket) return

    const handleInboxUpdate = ({ conversationId, message }) => {
      const isActive = activeConversationIdRef.current === conversationId

      setConversations((prev) => {
        const exists = prev.some((c) => c.id === conversationId)
        if (!exists) {
          fetchConversations() // new conversation we don't have locally yet
          return prev
        }
        return prev.map((c) =>
          c.id === conversationId
            ? {
              ...c,
              lastMessageContent: message.content,
              lastMessageAt: message.createdAt,
              // Don't bump the badge for a thread you're already looking at 
              // but the preview text above still needs to update regardless.
              unreadCount: isActive ? c.unreadCount : c.unreadCount + 1,
            }
            : c
        )
      })

      if (isActive) {
        fetch(`${API_URL}/conversations/${conversationId}/read`, {
          method: 'PUT',
          credentials: 'include'
        }).catch(() => { })
      }
    }

    socket.on('inbox_update', handleInboxUpdate)
    return () => socket.off('inbox_update', handleInboxUpdate)
  }, [socket, fetchConversations])

  const setActiveConversationId = useCallback((id) => {
    activeConversationIdRef.current = id
  }, [])

  const markConversationRead = useCallback(async (conversationId) => {
    setConversations((prev) => prev.map((c) => (c.id === conversationId ? { ...c, unreadCount: 0 } : c)))
    await fetch(`${API_URL}/conversations/${conversationId}/read`, { method: 'PUT', credentials: 'include' }).catch(() => { })
  }, [])

  const unreadTotal = conversations.reduce((sum, c) => sum + c.unreadCount, 0)


  // backend's socket.to(...) skips the sender, so the sender's own inbox row
  // needs patching manually here - Conversation.jsx calls this from the send ack
  const updateConversationPreview = useCallback((conversationId, message) => {
    setConversations((prev) => {
      const exists = prev.some((c) => c.id === conversationId)
      if (!exists) {
        fetchConversations()
        return prev
      }
      return prev.map((c) =>
        c.id === conversationId
          ? { ...c, lastMessageContent: message.content, lastMessageAt: message.createdAt }
          : c
      )
    })
  }, [fetchConversations])

  const value = useMemo(
  () => ({ conversations, unreadTotal, fetchConversations, setActiveConversationId, markConversationRead, updateConversationPreview }),
  [conversations, unreadTotal, fetchConversations, setActiveConversationId, markConversationRead, updateConversationPreview]
 )

  return <MessagesContext.Provider value={value}>{children}</MessagesContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useMessages() {
  return useContext(MessagesContext)
}

export { MessagesContext }