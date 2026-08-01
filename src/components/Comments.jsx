import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import { useConfirm } from '../context/ConfirmContext'

import { API_URL } from '../constants/api'

import Pagination from './Pagination'

function Comments({ carId }) {
  const { user, isAdmin } = useAuth()
  const { confirm, alertUser } = useConfirm()

  const [comments, setComments] = useState([])
  const [totalPages, setTotalPages] = useState(1)
  const [currentPage, setCurrentPage] = useState(1)
  const [loading, setLoading] = useState(true)

  const [newComment, setNewComment] = useState('')
  const [posting, setPosting] = useState(false)
  const [error, setError] = useState('')

  const [replyingToId, setReplyingToId] = useState(null)
  const [replyContent, setReplyContent] = useState('')

  const [editingId, setEditingId] = useState(null)
  const [editContent, setEditContent] = useState('')

  const fetchPage = useCallback((page) => {
    setLoading(true)
    fetch(`${API_URL}/cars/${carId}/comments?page=${page}`, { credentials: 'include' })
      .then((res) => res.json())
      .then((data) => {
        setComments(data.comments)
        setTotalPages(data.totalPages)
        setCurrentPage(data.currentPage)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [carId])

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { fetchPage(1) }, [fetchPage])

  const goToPage = (page) => {
    if (page < 1 || page > totalPages || page === currentPage) return
    fetchPage(page)
  }

  const handlePost = async () => {
    if (!newComment.trim()) return
    setPosting(true)
    setError('')
    try {
      const res = await fetch(`${API_URL}/cars/${carId}/comments`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newComment })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to post comment')
      setNewComment('')
      fetchPage(1) // new comment surfaces at the top, so jump to page 1
    } catch (err) {
      setError(err.message)
    } finally {
      setPosting(false)
    }
  }

  const handleReply = async (parentId) => {
    if (!replyContent.trim()) return
    try {
      const res = await fetch(`${API_URL}/cars/${carId}/comments`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: replyContent, parentId })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to post reply')

      // Fabricated flags are safe here: a brand-new reply can't yet be edited/deleted/reported
      setComments((prev) => prev.map((c) =>
        c.id === parentId
          ? { ...c, replies: [...c.replies, { ...data, commenterName: user.name, isEdited: false, isDeleted: false, reportedByMe: false }] }
          : c
      ))
      setReplyingToId(null)
      setReplyContent('')
    } catch (err) {
      await alertUser({ title: 'Error', message: err.message, danger: true })
    }
  }

  const handleEdit = async (id, isReply, parentId) => {
    if (!editContent.trim()) return
    try {
      const res = await fetch(`${API_URL}/comments/${id}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: editContent })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to edit comment')

      setComments((prev) => prev.map((c) => {
        if (!isReply && c.id === id) return { ...c, content: data.content, isEdited: true }
        if (isReply && c.id === parentId) {
          return { ...c, replies: c.replies.map((r) => r.id === id ? { ...r, content: data.content, isEdited: true } : r) }
        }
        return c
      }))
      setEditingId(null)
      setEditContent('')
    } catch (err) {
      await alertUser({ title: 'Error', message: err.message, danger: true })
    }
  }

  const handleDelete = async (id, isReply, parentId) => {
    const confirmed = await confirm({
      title: 'Delete Comment',
      message: 'Delete this comment?',
      confirmLabel: 'Delete',
      danger: true,
    })
    if (!confirmed) return

    const res = await fetch(`${API_URL}/comments/${id}`, { method: 'DELETE', credentials: 'include' })
    if (!res.ok) return
    const data = await res.json()

    if (isReply) {
      setComments((prev) => prev.map((c) =>
        c.id === parentId ? { ...c, replies: c.replies.filter((r) => r.id !== id) } : c
      ))
      return
    }

    if (data.softDeleted) {
      setComments((prev) => prev.map((c) =>
        c.id === id ? { ...c, isDeleted: true, content: '[deleted]' } : c
      ))
      return
    }

    // re-fetch instead of trusting the closed-over comments.length
    const res2 = await fetch(`${API_URL}/cars/${carId}/comments?page=${currentPage}`, { credentials: 'include' })
    const data2 = await res2.json()
    if (data2.comments.length === 0 && currentPage > 1) {
      fetchPage(currentPage - 1)
    } else {
      setComments(data2.comments)
      setTotalPages(data2.totalPages)
      setCurrentPage(data2.currentPage)
    }
  }

  const handleReport = async (id, isReply, parentId, alreadyReported) => {
    const res = await fetch(`${API_URL}/comments/${id}/report`, {
      method: alreadyReported ? 'DELETE' : 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: alreadyReported ? undefined : JSON.stringify({})
    })
    if (!res.ok) {
      const data = await res.json()
      await alertUser({ title: 'Error', message: data.error || 'Something went wrong', danger: true })
      return
    }

    const flip = (list) => list.map((c) => c.id === id ? { ...c, reportedByMe: !alreadyReported } : c)
    if (isReply) {
      setComments((prev) => prev.map((c) => c.id === parentId ? { ...c, replies: flip(c.replies) } : c))
    } else {
      setComments((prev) => flip(prev))
    }
  }

  const renderActions = (comment, isReply, parentId) => {
    const canEdit = user && user.id === comment.userId && !comment.isDeleted
    const canDelete = user && !comment.isDeleted && (isAdmin || user.id === comment.userId)
    const canCleanupDeleted = user && isAdmin && comment.isDeleted
    const canReport = user && user.id !== comment.userId && !comment.isDeleted

    if (comment.isDeleted && !canCleanupDeleted) return null

    return (
      <div className="flex gap-3 text-xs mt-2">
        {!isReply && user && !comment.isDeleted && (
          <button onClick={() => { setReplyingToId(comment.id); setReplyContent('') }} className="text-gray-400 hover:text-green-700">
            Reply
          </button>
        )}
        {canEdit && (
          <button onClick={() => { setEditingId(comment.id); setEditContent(comment.content) }} className="text-gray-400 hover:text-blue-600">
            Edit
          </button>
        )}
        {canReport && (
          <button
            onClick={async () => {
              const isUnreporting = comment.reportedByMe
              if (isUnreporting) {
                handleReport(comment.id, isReply, parentId, comment.reportedByMe)
                return
              }

              const confirmed = await confirm({
                title: 'Report Comment',
                message: 'Do you want to report this comment?',
                confirmLabel: 'Report',
              })
              if (confirmed) {
                handleReport(comment.id, isReply, parentId, comment.reportedByMe)
              }
            }}
            className="text-gray-400 hover:text-yellow-600"
          >
            {comment.reportedByMe ? 'Unreport' : 'Report'}
          </button>
        )}
        {(canDelete || canCleanupDeleted) && (
          <button onClick={() => handleDelete(comment.id, isReply, parentId)} className="text-red-400 hover:text-red-600">
            Delete
          </button>
        )}
      </div>
    )
  }

  const renderComment = (comment, isReply = false, parentId = null) => (
    <div key={comment.id} className={isReply ? 'ml-8 mt-3 border-l-2 pl-4' : 'border rounded p-4'}>
      <p className="font-semibold text-gray-800 text-sm">
        {comment.isDeleted ? 'Deleted comment' : comment.commenterName}
      </p>
      <p className="text-xs text-gray-400">
        {new Date(comment.createdAt).toLocaleDateString()}
        {comment.isEdited && !comment.isDeleted && ' (edited)'}
      </p>

      {editingId === comment.id ? (
        <div className="mt-2">
          <textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleEdit(comment.id, isReply, parentId)}
            rows={3}
            className="w-full border rounded px-3 py-2 outline-none focus:border-green-600 resize-none text-sm"
          />
          <div className="flex gap-2 mt-1">
            <button onClick={() => handleEdit(comment.id, isReply, parentId)} className="text-xs bg-green-700 text-white px-3 py-1 rounded hover:bg-green-600">
              Save
            </button>
            <button onClick={() => setEditingId(null)} className="text-xs text-gray-500 hover:underline">
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <p className={`mt-2 ${comment.isDeleted ? 'text-gray-400 italic' : 'text-gray-600'}`}>{comment.content}</p>
      )}

      {renderActions(comment, isReply, parentId)}

      {replyingToId === comment.id && (
        <div className="mt-3 ml-8">
          <textarea
            value={replyContent}
            onChange={(e) => setReplyContent(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleReply(comment.id)}
            placeholder="Write a reply..."
            rows={2}
            className="w-full border rounded px-3 py-2 outline-none focus:border-green-600 resize-none text-sm"
          />
          <div className="flex gap-2 mt-1">
            <button onClick={() => handleReply(comment.id)} className="text-xs bg-green-700 text-white px-3 py-1 rounded hover:bg-green-600">
              Post Reply
            </button>
            <button onClick={() => { setReplyingToId(null); setReplyContent('') }} className="text-xs text-gray-500 hover:underline">
              Cancel
            </button>
          </div>
        </div>
      )}

      {!isReply && comment.replies?.map((reply) => renderComment(reply, true, comment.id))}
    </div>
  )

  return (
    <div className="mt-10 border-t pt-8">
      <h2 className="text-xl font-bold text-gray-800 mb-4">Comments</h2>

      {user ? (
        <div className="mb-6">
          <textarea
            value={newComment}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handlePost()}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Ask a question or share your thoughts..."
            rows={3}
            className="w-full border rounded px-4 py-2 outline-none focus:border-green-600 resize-none"
          />
          {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
          <button
            onClick={handlePost}
            
            disabled={posting}
            className="mt-2 bg-green-700 text-white px-4 py-2 rounded hover:bg-green-600 transition text-sm font-medium disabled:opacity-50"
          >
            {posting ? 'Posting...' : 'Post Comment'}
          </button>
        </div>
      ) : (
        <p className="text-sm text-gray-500 mb-6">Log in to leave a comment.</p>
      )}

      {loading ? (
        <p className="text-gray-400 text-sm">Loading comments...</p>
      ) : comments.length === 0 ? (
        <p className="text-gray-400 text-sm">No comments yet. Be the first to comment.</p>
      ) : (
        <div className="space-y-4">{comments.map((comment) => renderComment(comment))}</div>
      )}

      <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={goToPage} />
    </div>
  )
}

export default Comments