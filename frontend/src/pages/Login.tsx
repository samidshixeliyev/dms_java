import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import client from '../api/client'
import type { AuthUser } from '../types'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ username: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await client.post('/auth/login', form)
      const { token, user } = res.data.data
      login(token, user as AuthUser)
      if (user.mustChangePassword) {
        navigate('/force-password-change')
      } else if (user.role === 'executor') {
        navigate('/executor/dashboard')
      } else {
        navigate('/legal-acts')
      }
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'İstifadəçi adı və ya şifrə yanlışdır')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">

        {/* Logo */}
        <div className="login-logo-wrap">
          <div className="login-logo-icon">
            <i className="bi bi-shield-lock-fill" />
          </div>
        </div>

        <div className="login-title">DMS</div>
        <div className="login-subtitle">Sənəd İdarəetmə Sistemi</div>

        {error && (
          <div className="login-error">
            <i className="bi bi-exclamation-triangle-fill me-2" />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          {/* Username */}
          <div className="login-field">
            <label className="login-label">İstifadəçi adı</label>
            <div className="login-input-wrap">
              <span className="login-input-icon"><i className="bi bi-person-fill" /></span>
              <input
                type="text"
                className="login-input"
                placeholder="İstifadəçi adını daxil edin"
                value={form.username}
                onChange={e => setForm(p => ({ ...p, username: e.target.value }))}
                required
                autoFocus
                autoComplete="username"
              />
            </div>
          </div>

          {/* Password */}
          <div className="login-field">
            <label className="login-label">Şifrə</label>
            <div className="login-input-wrap">
              <span className="login-input-icon"><i className="bi bi-lock-fill" /></span>
              <input
                type={showPassword ? 'text' : 'password'}
                className="login-input login-input--has-toggle"
                placeholder="Şifrəni daxil edin"
                value={form.password}
                onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                required
                autoComplete="current-password"
              />
              <button
                type="button"
                className="login-toggle-btn"
                onClick={() => setShowPassword(s => !s)}
                tabIndex={-1}
              >
                <i className={`bi bi-${showPassword ? 'eye-slash' : 'eye'}`} />
              </button>
            </div>
          </div>

          <button type="submit" className="login-submit-btn" disabled={loading}>
            {loading ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status" />
                Gözləyin...
              </>
            ) : (
              <>
                <i className="bi bi-box-arrow-in-right me-2" />
                Daxil ol
              </>
            )}
          </button>
        </form>

        <div className="login-footer">
          &copy; {new Date().getFullYear()} DMS &mdash; Sənəd İdarəetmə Sistemi
        </div>
      </div>
    </div>
  )
}
