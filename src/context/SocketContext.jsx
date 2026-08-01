import { createContext, useState, useEffect, useContext } from 'react'
import { io } from 'socket.io-client'
import { SOCKET_URL } from '../constants/api'
import { useAuth } from './AuthContext'

const SocketContext = createContext()

export function SocketProvider({ children }) {
  const { user, loading: authLoading } = useAuth()
  const [socket, setSocket] = useState(null)
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    if (authLoading) return

    if (!user) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSocket(null)
      setConnected(false)
      return
    }

    const newSocket = io(SOCKET_URL, { withCredentials: true })

    newSocket.on('connect', () => setConnected(true))
    newSocket.on('disconnect', () => setConnected(false))

    setSocket(newSocket)

    return () => {
      newSocket.disconnect()
      newSocket.off()
    }
  }, [user, authLoading])

  return (
    <SocketContext.Provider value={{ socket, connected }}>
      {children}
    </SocketContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useSocket() {
  return useContext(SocketContext)
}

export { SocketContext }