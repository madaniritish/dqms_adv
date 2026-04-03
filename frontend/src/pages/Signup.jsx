import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { authAPI } from '../services/api'
import toast from 'react-hot-toast'

export default function Signup() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rollNumber, setRollNumber] = useState('')
  const [department, setDepartment] = useState('')
  const [loading, setLoading] = useState(false)

  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!name || !email || !password) {
      toast.error('Please fill in all required fields.')
      return
    }

    setLoading(true)
    try {
      await authAPI.register({ name, email: email.trim(), password, rollNumber: rollNumber.trim(), department: department.trim() })
      toast.success('Account created. Please sign in.')
      navigate('/login')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Signup failed.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-nitw-blue via-primary-800 to-primary-900 flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-white/5" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-white/5" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-white/3" />
      </div>

      <div className="w-full max-w-md animate-fade-in relative">
        <div className="text-center mb-8">
          <div className="w-20 h-20 rounded-2xl bg-nitw-gold flex items-center justify-center mx-auto mb-4 shadow-2xl">
            <span className="text-nitw-blue font-black text-2xl">NW</span>
          </div>
          <h1 className="text-3xl font-bold text-white">NITW Healthcare</h1>
          <p className="text-blue-300 mt-1">Create your student account</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="text-xl font-bold text-gray-900 mb-1">Sign Up</h2>
          <p className="text-gray-500 text-sm mb-6">Only student accounts are supported for signup.</p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="name" className="label">Full Name</label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input-field"
                autoComplete="name"
                disabled={loading}
              />
            </div>

            <div>
              <label htmlFor="email" className="label">Email Address</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field"
                autoComplete="email"
                placeholder="yourname@nitw.ac.in"
                disabled={loading}
              />
            </div>

            <div>
              <label htmlFor="password" className="label">Password</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field"
                autoComplete="new-password"
                placeholder="At least 6 characters"
                disabled={loading}
              />
            </div>

            <div>
              <label htmlFor="rollNumber" className="label">Roll Number</label>
              <input
                id="rollNumber"
                type="text"
                value={rollNumber}
                onChange={(e) => setRollNumber(e.target.value)}
                className="input-field"
                autoComplete="off"
                placeholder="e.g. 23CS1001"
                disabled={loading}
              />
            </div>

            <div>
              <label htmlFor="department" className="label">Department</label>
              <input
                id="department"
                type="text"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="input-field"
                autoComplete="off"
                placeholder="Computer Science"
                disabled={loading}
              />
            </div>

            <button type="submit" className="btn-primary w-full py-3 text-base" disabled={loading}>
              {loading ? <><div className="spinner" />Creating...</> : 'Create Account →'}
            </button>
          </form>

          <button
            type="button"
            onClick={() => navigate('/login')}
            className="mt-5 text-sm text-blue-700 hover:underline"
            disabled={loading}
          >
            Already have an account? Sign in
          </button>
        </div>

        <p className="text-center text-blue-300 text-xs mt-6">
          © 2024 NIT Warangal Healthcare Center. All rights reserved.
        </p>
      </div>
    </div>
  )
}

