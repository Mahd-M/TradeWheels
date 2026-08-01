import { Link } from 'react-router-dom'
import { useMessages } from '../context/MessagesContext'

function Messages() {
  const { conversations } = useMessages()

  if (conversations.length === 0) {
    return (
      <div className="text-center py-32">
        <p className="text-5xl mb-4">💬</p>
        <h2 className="text-2xl font-bold text-gray-700 mb-2">No conversations yet</h2>
        <p className="text-gray-400 mb-6">Message a seller from any car listing to start chatting</p>
        <Link to="/cars" className="bg-green-700 text-white px-6 py-2 rounded hover:bg-green-600 transition font-medium inline-block">
          Browse Cars
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Messages</h1>

      <div className="space-y-2">
        {conversations.map((c) => (
          <Link
            key={c.id}
            to={`/messages/${c.id}`}
            className="flex items-center justify-between border border-gray-200 rounded-lg p-4 hover:bg-gray-50 hover:border-gray-300 transition shadow-sm"
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-semibold text-gray-800">{c.otherUserName}</p>
                {c.status === 'pending' && (
                  <span className="text-xs font-semibold text-yellow-700 bg-yellow-100 px-2 py-0.5 rounded flex-shrink-0">
                    {c.isInitiator ? 'Pending' : 'Message request'}
                  </span>
                )}
                {c.status === 'declined' && (
                  <span className="text-xs font-semibold text-gray-400 bg-gray-100 px-2 py-0.5 rounded flex-shrink-0">
                    Declined
                  </span>
                )}
              </div>
              {c.carMake && (
                <p className="text-xs text-green-700 mb-1">
                  Re: <Link to={`/cars/${c.carId}`} className="hover:underline">
                    {c.carYear} {c.carMake} {c.carModel}
                  </Link>
                </p>
              )}
              <p className="text-sm text-gray-500 truncate">
                {c.lastMessageContent || 'No messages yet'}
              </p>
            </div>
            {c.unreadCount > 0 && (
              <span className="ml-4 flex-shrink-0 bg-yellow-400 text-black text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                {c.unreadCount}
              </span>
            )}
          </Link>
        ))}
      </div>
    </div>
  )
}

export default Messages