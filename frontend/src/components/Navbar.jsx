import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useSocket } from '../context/SocketContext'
import toast from 'react-hot-toast'

const studentLinks = [
  { to: '/student', label: 'Dashboard', icon: '🏠' },
  { to: '/student/queue/status', label: 'My Queue', icon: '📋' },
  { to: '/student/queue/join', label: 'Join Queue', icon: '➕' },
  { to: '/student/timetable', label: 'Timetable', icon: '📅' },
  { to: '/student/history', label: 'History', icon: '🕓' },
]

const staffLinks = [
  { to: '/staff', label: 'Live Queue', icon: '📋' },
  { to: '/staff/emergency', label: 'Emergency', icon: '🚨' },
  { to: '/staff/noshow', label: 'No-Show', icon: '⚠️' },
]

const doctorLinks = [
  { to: '/doctor', label: 'Queue', icon: '👨‍⚕️' },
]

export default function Navbar() {
  const { user, logout } = useAuth()
  const { connected } = useSocket()
  const location = useLocation()
  const navigate = useNavigate()

  const links = user?.role === 'student' ? studentLinks
    : user?.role === 'staff' ? staffLinks
    : doctorLinks

  const handleLogout = async () => {
    await logout()
    toast.success('Logged out successfully.')
    navigate('/login')
  }

  return (
    <header className="bg-nitw-blue shadow-lg sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-nitw-gold flex items-center justify-center font-bold text-nitw-blue text-sm">NW</div>
            <div className="hidden sm:block">
              <p className="text-white font-bold text-sm leading-tight">NITW Healthcare</p>
              <p className="text-blue-300 text-xs">Digital Queue System</p>
            </div>
          </div>

          {/* Nav Links */}
          <nav className="hidden md:flex items-center gap-1">
            {links.map(({ to, label, icon }) => (
              <Link
                key={to}
                to={to}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200
                  ${location.pathname === to
                    ? 'bg-white/20 text-white'
                    : 'text-blue-200 hover:text-white hover:bg-white/10'
                  }`}
              >
                <span>{icon}</span>{label}
              </Link>
            ))}
          </nav>

          {/* Right */}
          <div className="flex items-center gap-3">
            {/* Connection indicator */}
            <div className="flex items-center gap-1.5">
              <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`} />
              <span className="text-xs text-blue-200 hidden sm:block">{connected ? 'Live' : 'Offline'}</span>
            </div>

            {/* Role Badge */}
            <span className="hidden sm:block px-2 py-1 bg-nitw-gold/20 text-nitw-gold text-xs font-semibold rounded-full capitalize">
              {user?.role}
            </span>

            {/* User & Logout */}
            <div className="flex items-center gap-2">
              <span className="text-white text-sm font-medium hidden sm:block truncate max-w-32">{user?.name}</span>
              <button
                onClick={handleLogout}
                className="text-blue-200 hover:text-white text-sm px-3 py-1.5 rounded-lg hover:bg-white/10 transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>

        {/* Mobile nav */}
        <div className="md:hidden flex gap-1 pb-2 overflow-x-auto">
          {links.map(({ to, label, icon }) => (
            <Link
              key={to}
              to={to}
              className={`flex-shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors
                ${location.pathname === to ? 'bg-white/20 text-white' : 'text-blue-200 hover:text-white hover:bg-white/10'}`}
            >
              {icon} {label}
            </Link>
          ))}
        </div>
      </div>
    </header>
  )
}
