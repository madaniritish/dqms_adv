import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPass, setShowPass] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!email || !password) { toast.error('Please fill in all fields.'); return }
    setLoading(true)
    try {
      const user = await login(email.trim(), password)
      toast.success(`Welcome, ${user.name}!`)
      if (user.role === 'student') navigate('/student')
      else if (user.role === 'staff') navigate('/staff')
      else if (user.role === 'doctor') navigate('/doctor')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-nitw-blue via-primary-800 to-primary-900 flex items-center justify-center p-4">
      {/* Background circles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-white/5" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-white/5" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-white/3" />
      </div>

      <div className="w-full max-w-md animate-fade-in relative">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 rounded-2xl bg-nitw-gold flex items-center justify-center mx-auto mb-4 shadow-2xl">
            <span className="text-nitw-blue font-black text-2xl">NW</span>
          </div>
          <h1 className="text-3xl font-bold text-white">NITW Healthcare</h1>
          <p className="text-blue-300 mt-1">Digital Queue Management System</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="text-xl font-bold text-gray-900 mb-1">Sign In</h2>
          <p className="text-gray-500 text-sm mb-6">Use your NITW institute email</p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="email" className="label">Email Address</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="yourname@nitw.ac.in"
                className="input-field"
                autoComplete="email"
                disabled={loading}
              />
            </div>

            <div>
              <label htmlFor="password" className="label">Password</label>
              <div className="relative">
                <input
                  id="password"
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="input-field pr-12"
                  autoComplete="current-password"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-sm"
                >
                  {showPass ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            <button type="submit" className="btn-primary w-full py-3 text-base" disabled={loading}>
              {loading ? <><div className="spinner" />Signing in...</> : 'Sign In →'}
            </button>
          </form>

          {/* Info */}
          <div className="mt-6 p-4 bg-blue-50 rounded-xl border border-blue-100">
            <p className="text-xs font-semibold text-blue-700 mb-2">Access by Role:</p>
            <div className="space-y-1 text-xs text-blue-600">
              <p>🎓 <strong>Students</strong> — @student.nitw.ac.in</p>
              <p>🏥 <strong>Staff/Doctors</strong> — @nitw.ac.in</p>
            </div>
          </div>
        </div>

        <p className="text-center text-blue-300 text-xs mt-6">
          © 2024 NIT Warangal Healthcare Center. All rights reserved.
        </p>
      </div>
    </div>
  )
}
