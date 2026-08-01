import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

import { API_URL } from '../constants/api'
import { useConfirm } from '../context/ConfirmContext'

function AdminReportsTable() {
  const [reportedComments, setReportedComments] = useState([])
  const [reportsLoading, setReportsLoading] = useState(true)
  const { confirm } = useConfirm()

  useEffect(() => {
    fetch(`${API_URL}/admin/reports`, { credentials: 'include' })
      .then((res) => res.json())
      .then((data) => {
        setReportedComments(data)
        setReportsLoading(false)
      })
      .catch(() => setReportsLoading(false))
  }, [])

  const handleDeleteComment = async (commentId) => {
    const confirmed = await confirm({
      title: 'Delete Comment',
      message: 'Delete this comment? This cannot be undone.',
      confirmLabel: 'Delete',
      danger: true,
    })
    if (!confirmed) return

    const res = await fetch(`${API_URL}/comments/${commentId}`, { method: 'DELETE', credentials: 'include' })
    if (res.ok) {
      setReportedComments((prev) => prev.filter((report) => report.commentId !== commentId))
    }
  }

  const handleDismissReport = async (commentId) => {
    const res = await fetch(`${API_URL}/admin/reports/${commentId}`, { method: 'DELETE', credentials: 'include' })
    if (res.ok) {
      setReportedComments((prev) => prev.filter((report) => report.commentId !== commentId))
    }
  }

  return (
    <div>
      <h2 className="text-lg sm:text-xl font-bold text-gray-800 mb-4">Reported Comments</h2>
      {reportsLoading ? (
        <p className="text-gray-400">Loading...</p>
      ) : reportedComments.length === 0 ? (
        <p className="text-gray-400">No reported comments.</p>
      ) : (
        <div className="space-y-3">
          {reportedComments.map((report) => (
            <div
              key={report.commentId}
              className="border border-gray-200 rounded-lg p-4 bg-white shadow-sm flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3"
            >
              <div className="min-w-0">
                <p className="text-sm text-gray-500 mb-1">
                  By {report.commenterName} ·{' '}
                  <Link to={`/cars/${report.carId}`} className="text-green-700 underline">
                    View listing
                  </Link>{' '}
                  · {report.reportCount} report{report.reportCount > 1 ? 's' : ''}
                </p>
                <p className="text-gray-700 break-words">{report.content}</p>
              </div>
              <div className="flex flex-shrink-0 gap-4 sm:gap-3 sm:ml-4 pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-100">
                <button
                  onClick={() => handleDismissReport(report.commentId)}
                  className="text-gray-500 hover:underline text-sm font-medium"
                >
                  Dismiss
                </button>
                <button
                  onClick={() => handleDeleteComment(report.commentId)}
                  className="text-red-500 hover:underline text-sm font-medium"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default AdminReportsTable