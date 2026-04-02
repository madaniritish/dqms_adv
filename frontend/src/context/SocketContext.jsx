import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { io } from 'socket.io-client'
import { useAuth } from './AuthContext'
import toast from 'react-hot-toast'

const SocketContext = createContext(null)

export const SocketProvider = ({ children }) => {
  const { user, token } = useAuth()
  const socketRef = useRef(null)
  const [queueUpdate, setQueueUpdate] = useState(null)
  const [connected, setConnected] = useState(false)
  const socketUrl = import.meta.env.VITE_SOCKET_URL || '/'

  useEffect(() => {
    if (!token || !user) return

    const socket = io(socketUrl, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    })

    socketRef.current = socket

    socket.on('connect', () => {
      setConnected(true)
      socket.emit('register', user._id)
      // Join role room
      socket.emit('joinRoom', `room:${user.role}`)
      if (user.role === 'doctor') socket.emit('joinRoom', `doctor:${user._id}`)
    })

    socket.on('disconnect', () => setConnected(false))

    socket.on('queue:update', (data) => {
      setQueueUpdate(data)
    })

    socket.on('notification:next', (data) => {
      toast.success('🟢 It\'s your turn! Please arrive at the Healthcare Center NOW.', {
        duration: 8000,
        style: { background: '#16a34a', color: 'white', fontWeight: '600' },
      })
    })

    socket.on('notification:second', (data) => {
      toast('⚠️ You are SECOND in line. Start heading to the center!', {
        duration: 6000,
        icon: '⚠️',
        style: { background: '#d97706', color: 'white', fontWeight: '600' },
      })
    })

    socket.on('notification:emergency', (data) => {
      toast('🚨 Queue updated due to an emergency. Your position has changed.', {
        duration: 5000,
        icon: '🚨',
      })
    })

    socket.on('queue:empty', () => {
      toast('Queue is now empty.', { icon: '✅' })
    })

    return () => {
      socket.disconnect()
      setConnected(false)
    }
  }, [token, user, socketUrl])

  const emit = (event, data) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit(event, data)
    }
  }

  return (
    <SocketContext.Provider value={{ socket: socketRef.current, connected, queueUpdate, emit }}>
      {children}
    </SocketContext.Provider>
  )
}

export const useSocket = () => {
  const ctx = useContext(SocketContext)
  if (!ctx) throw new Error('useSocket must be used within SocketProvider')
  return ctx
}
