import { useEffect, useRef, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { IoArrowBack } from 'react-icons/io5'
import { useAuth } from '../context/AuthContext'
import { useSocket } from '../context/SocketContext'
import { useMessages } from '../context/MessagesContext'
import { useConfirm } from '../context/ConfirmContext'
import { API_URL } from '../constants/api'

function Conversation() {
  const { id } = useParams()
  const conversationId = Number(id)
  const { user } = useAuth()
  const { socket } = useSocket()

  const { conversations, setActiveConversationId, markConversationRead, fetchConversations, updateConversationPreview } = useMessages()

  const { confirm, alertUser } = useConfirm()

  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [accessDenied, setAccessDenied] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [draft, setDraft] = useState('')
  const [error, setError] = useState('')
  const [status, setStatus] = useState(null)
  const [isInitiator, setIsInitiator] = useState(false)
  const [otherUserId, setOtherUserId] = useState(null)
  const [autoAccepted, setAutoAccepted] = useState(false)
  const [blockedByMe, setBlockedByMe] = useState(false)
  const [blockedByThem, setBlockedByThem] = useState(false)

  const bottomRef = useRef(null)
  const hasShownAutoAcceptNoticeRef = useRef(false)

  // Pulled from the inbox list MessagesContext already fetched
  const conversationMeta = conversations.find((c) => c.id === conversationId)

  useEffect(() => {
    // eslint-disable-next-line
    setLoading(true)
    setAccessDenied(false)
    fetch(`${API_URL}/conversations/${conversationId}/messages`, { credentials: 'include' })
      .then((res) => {
        if (res.status === 403 || res.status === 404) {
          setAccessDenied(true)
          throw new Error('access denied')
        }
        return res.json()
      })
      .then((data) => {
        setMessages(data.messages)
        setCurrentPage(data.currentPage)
        setTotalPages(data.totalPages)
        setStatus(data.status)
        setIsInitiator(data.isInitiator)
        setOtherUserId(data.otherUserId)
        setAutoAccepted(Boolean(data.autoAccepted))
        setBlockedByMe(Boolean(data.blockedByMe))
        setBlockedByThem(Boolean(data.blockedByThem))
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [conversationId])

  useEffect(() => {
    if (!socket) return
    socket.emit('join_conversation', conversationId)
    setActiveConversationId(conversationId)
    markConversationRead(conversationId)
    return () => {
      socket.emit('leave_conversation', conversationId)
      setActiveConversationId(null)
    }
  }, [socket, conversationId, setActiveConversationId, markConversationRead])

  useEffect(() => {
    if (!socket) return
    const handleNewMessage = (message) => {
      if (message.conversationId !== conversationId) return
      setMessages((prev) => [...prev, message])
    }
    socket.on('new_message', handleNewMessage)
    return () => socket.off('new_message', handleNewMessage)
  }, [socket, conversationId])

  useEffect(() => {
    if (!socket) return
    const handleStatusChange = ({ conversationId: changedId, status: newStatus }) => {
      if (changedId !== conversationId) return
      setStatus(newStatus)
    }
    socket.on('conversation_status_changed', handleStatusChange)
    return () => socket.off('conversation_status_changed', handleStatusChange)
  }, [socket, conversationId])

  // filtered on otherUserId, not conversationId - a block from a different
  // conversation with this person should still update this screen
  useEffect(() => {
    if (!socket || !otherUserId) return
    const handleBlockChange = ({ otherUserId: changedUserId, blocked }) => {
      if (changedUserId !== otherUserId) return
      setBlockedByThem(blocked)
    }
    socket.on('user_block_changed', handleBlockChange)
    return () => socket.off('user_block_changed', handleBlockChange)
  }, [socket, otherUserId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // one-time heads-up explaining why there's no Accept/Decline banner on an auto-accepted thread
  useEffect(() => {
    if (loading || hasShownAutoAcceptNoticeRef.current) return
    if (!isInitiator && autoAccepted && messages.length <= 1) {
      hasShownAutoAcceptNoticeRef.current = true
      alertUser({
        title: 'Already Connected',
        message: "You've already accepted a message request from this user on another listing, so this conversation opened automatically - no need to accept it separately. Use the Block button below if you'd rather not hear from them."
      })
    }
  }, [loading, isInitiator, autoAccepted, messages.length, alertUser])

  const loadOlderMessages = () => {
    const nextPage = currentPage + 1
    if (nextPage > totalPages) return
    fetch(`${API_URL}/conversations/${conversationId}/messages?page=${nextPage}`, { credentials: 'include' })
      .then((res) => res.json())
      .then((data) => {
        setMessages((prev) => [...data.messages, ...prev])
        setCurrentPage(data.currentPage)
      })
      .catch(() => {})
  }

  const isBlocked = blockedByMe || blockedByThem

  const isPendingState = status === 'pending' || (status === null && messages.length === 0)
  const isFirstPendingMessage = isPendingState && (isInitiator || status === null) && messages.length === 0
  const isFirstMessageOnEstablishedThread = autoAccepted && messages.length === 0
  const canSend = !isBlocked && (status === 'accepted' || isFirstPendingMessage)

  const handleSend = async () => {
    const trimmed = draft.trim()
    if (!trimmed || !socket || !canSend || loading) return

    if (isFirstMessageOnEstablishedThread) {
      await alertUser({
        title: 'Already Connected',
        message: "Your message request was already accepted since you two have an existing conversation - this will send right away, no waiting on approval."
      })
    } else if (isFirstPendingMessage) {
      const confirmed = await confirm({
        title: 'Send Message Request',
        message: "You can only send this one message until they accept your request - make sure it includes everything you want to say. You won't be able to send a follow-up until they respond.",
        confirmLabel: 'Send Request',
      })
      if (!confirmed) return
    }

    setError('')
    const messageContent = trimmed
    setDraft('')

    socket.emit('send_message', { conversationId, content: messageContent }, (response) => {
      if (response.error) {
        setError(response.error)
        setDraft(messageContent)
        return
      }
      setMessages((prev) => [...prev, response.message])
      updateConversationPreview(conversationId, response.message)
    })
  }

  const handleAccept = async () => {
    const res = await fetch(`${API_URL}/conversations/${conversationId}/accept`, {
      method: 'PUT',
      credentials: 'include'
    })
    if (res.ok) {
      setStatus('accepted')
      fetchConversations()
    }
  }

  const handleDecline = async () => {
    const confirmed = await confirm({
      title: 'Decline Message Request',
      message: 'Decline this message request? This will block the sender from contacting you until you unblock them.',
      confirmLabel: 'Decline',
      danger: true,
    })
    if (!confirmed) return

    const res = await fetch(`${API_URL}/conversations/${conversationId}/decline`, {
      method: 'PUT',
      credentials: 'include'
    })
    if (res.ok) {
      setStatus('declined')
      setBlockedByMe(true)
      fetchConversations()
    }
  }

  const handleBlock = async () => {
    const confirmed = await confirm({
      title: 'Block User',
      message: "Block this user? Neither of you will be able to send new messages to the other until you unblock them.",
      confirmLabel: 'Block',
      danger: true,
    })
    if (!confirmed) return

    const res = await fetch(`${API_URL}/users/${otherUserId}/block`, { method: 'PUT', credentials: 'include' })
    if (res.ok) setBlockedByMe(true)
  }

  const handleUnblock = async () => {
    const res = await fetch(`${API_URL}/users/${otherUserId}/unblock`, { method: 'PUT', credentials: 'include' })
    if (res.ok) {
      setBlockedByMe(false)
      if (status === 'declined') setStatus('accepted')
    }
  }

  if (loading) return <div className="text-center py-20 sm:py-32 px-4 text-gray-400">Loading conversation...</div>

  if (accessDenied) {
    return (
      <div className="text-center py-20 sm:py-32 px-4">
        <p className="text-xl font-semibold text-gray-700 mb-4">You don&apos;t have access to this conversation.</p>
        <Link to="/messages" className="text-green-700 underline">Back to Messages</Link>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-4 sm:py-8 flex flex-col h-[85vh] sm:h-[80vh]">

      <div className="flex items-center justify-between gap-3 pb-3 mb-3 border-b border-gray-200">
        <div className="flex items-center gap-3 min-w-0">
          <Link to="/messages" className="text-gray-400 hover:text-green-700 transition text-xl flex-shrink-0" aria-label="Back to Messages">
            <IoArrowBack />
          </Link>
          <div className="min-w-0">
            <p className="font-bold text-gray-800 truncate">
              {conversationMeta?.otherUserName || 'Conversation'}
            </p>
            {conversationMeta?.carMake && (
              <p className="text-xs text-green-700 truncate">
                Re: <Link to={`/cars/${conversationMeta.carId}`} className="hover:underline">
                  {conversationMeta.carYear} {conversationMeta.carMake} {conversationMeta.carModel}
                </Link>
              </p>
            )}
          </div>
        </div>

        {otherUserId && (
          <button
            onClick={blockedByMe ? handleUnblock : handleBlock}
            disabled={blockedByThem}
            title={blockedByThem ? "This user has blocked you - only they can undo it" : undefined}
            className={`flex-shrink-0 text-xs font-semibold px-3 py-1.5 rounded border transition ${
              blockedByThem
                ? 'border-gray-200 text-gray-300 cursor-not-allowed'
                : blockedByMe
                  ? 'border-gray-300 text-gray-600 hover:bg-gray-50'
                  : 'border-red-300 text-red-500 hover:bg-red-50'
            }`}
          >
            {blockedByThem ? 'Blocked' : blockedByMe ? 'Unblock' : 'Block'}
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto border border-gray-200 rounded-lg p-3 sm:p-4 space-y-3 bg-gray-50/50">
        {currentPage < totalPages && (
          <button onClick={loadOlderMessages} className="block mx-auto text-sm text-green-700 hover:underline mb-2">
            Load older messages
          </button>
        )}

        {messages.map((m) => {
          const isMine = m.senderId === user.id
          return (
            <div key={m.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-2 ${isMine ? 'bg-green-700 text-white rounded-br-sm' : 'bg-white border border-gray-200 text-gray-800 rounded-bl-sm'}`}>
                <p className="text-sm break-words">{m.content}</p>
                <p className={`text-[10px] mt-1 ${isMine ? 'text-green-100' : 'text-gray-400'}`}>
                  {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {error && <p className="text-red-500 text-sm mt-2">{error}</p>}

      {status === 'pending' && !isInitiator && (
        <div className="mt-3 border rounded-lg p-4 bg-yellow-50 border-yellow-200">
          <p className="text-sm text-gray-700 mb-3">
            This is a message request. Accept it to start replying, or decline to close it.
          </p>
          <div className="flex gap-2">
            <button onClick={handleAccept} className="flex-1 bg-green-700 text-white py-2 rounded hover:bg-green-600 transition font-medium">
              Accept
            </button>
            <button onClick={handleDecline} className="flex-1 border border-red-300 text-red-500 py-2 rounded hover:bg-red-50 transition font-medium">
              Decline
            </button>
          </div>
        </div>
      )}

      {blockedByThem && (
        <p className="text-sm text-gray-400 mt-3 text-center">This user has blocked you.</p>
      )}
      {status === 'declined' && !blockedByThem && (
        <p className="text-sm text-gray-400 mt-3 text-center">This message request was declined.</p>
      )}

      {canSend && (
        <div className="flex gap-2 mt-3">
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Type a message..."
            className="flex-1 border border-gray-300 rounded-lg px-4 py-2.5 outline-none transition focus:border-green-600 focus:ring-2 focus:ring-green-600/20"
          />
          <button onClick={handleSend} className="bg-green-700 text-white px-5 sm:px-6 py-2.5 rounded-lg hover:bg-green-600 transition font-medium flex-shrink-0">
            Send
          </button>
        </div>
      )}

      {status === 'pending' && isInitiator && messages.length > 0 && (
        <p className="text-xs text-gray-400 mt-2 text-center">Waiting for them to accept your message request.</p>
      )}
    </div>
  )
}

export default Conversation