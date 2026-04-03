import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { authAPI } from '../services/api'
import toast from 'react-hot-toast'

export default function Signup() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('student')
  const [rollNumber, setRollNumber] = useState('')
  const [department, setDepartment] = useState('')
  const [specialization, setSpecialization] = useState('')
  const [qualification, setQualification] = useState('')
  const [loading, setLoading] = useState(false)

  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!name || !email || !password) {
      toast.error('Please fill in all required fields.')
      return
    }
    if (role === 'doctor' && !specialization.trim()) {
      toast.error('Please enter doctor specialization.')
      return
    }

    setLoading(true)
    try {
      const payload = {
        name,
        email: email.trim(),
        password,
        role,
        rollNumber: role === 'student' ? rollNumber.trim() : undefined,
        department: role === 'student' ? department.trim() : undefined,
        specialization: role === 'doctor' ? specialization.trim() : undefined,
        qualification: role === 'doctor' ? qualification.trim() : undefined,
      }

      await authAPI.register(payload)
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
          <p className="text-blue-300 mt-1">Create your account</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="text-xl font-bold text-gray-900 mb-1">Sign Up</h2>
          <p className="text-gray-500 text-sm mb-6">Choose your role and sign up.</p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="role" className="label">Role</label>
              <select
                id="role"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="input-field"
                disabled={loading}
              >
                <option value="student">Student</option>
                <option value="staff">Staff</option>
                <option value="doctor">Doctor</option>
              </select>
            </div>

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

            {role === 'student' && (
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
            )}

            {role === 'student' && (
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
            )}

            {role === 'doctor' && (
              <div>
                <label htmlFor="specialization" className="label">Specialization</label>
                <input
                  id="specialization"
                  type="text"
                  value={specialization}
                  onChange={(e) => setSpecialization(e.target.value)}
                  className="input-field"
                  autoComplete="off"
                  placeholder="e.g. Dentistry"
                  disabled={loading}
                />
              </div>
            )}

            {role === 'doctor' && (
              <div>
                <label htmlFor="qualification" className="label">Qualification</label>
                <input
                  id="qualification"
                  type="text"
                  value={qualification}
                  onChange={(e) => setQualification(e.target.value)}
                  className="input-field"
                  autoComplete="off"
                  placeholder="e.g. BDS, MDS"
                  disabled={loading}
                />
              </div>
            )}

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

