import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

function ProtectedRoute({ children, adminOnly = false }) {
  const { user, loading, isAdmin } = useAuth()
  const location = useLocation()

  if (loading) {
    return <div className="text-center py-32 text-gray-400">Loading...</div>
  }

  if (!user) {
    const message = location.pathname === '/favourites'
      ? 'Login required to access Favourites'
      : location.pathname === '/sell'
        ? 'Login required to Post an add'
        : 'Login required to access this page'

    return <Navigate to="/login" state={{ from: location, message }} replace />
  }

  if (adminOnly && !isAdmin) {
    return <Navigate to="*" replace />
  }

  return children
}

export default ProtectedRoute