import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import client from '../api/client'
import toast from 'react-hot-toast'

export default function ForcePasswordChange() {
  const { user, login, token } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ newPassword: '', confirm: '' })
  const [loading, setLoading] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (form.newPassword !== form.confirm) {
      toast.error('Şifrələr uyğun gəlmir')
      return
    }
    setLoading(true)
    try {
      await client.post('/auth/force-change-password', { newPassword: form.newPassword })
      toast.success('Şifrə uğurla dəyişdirildi')
      if (user && token) {
        login(token, { ...user, mustChangePassword: false })
      }
      navigate(user?.role === 'executor' ? '/executor/dashboard' : '/legal-acts')
    } catch {
      // handled by interceptor
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">

        <div className="login-logo-wrap">
          <div className="login-logo-icon login-logo-icon--warning">
            <i className="bi bi-key-fill" />
          </div>
        </div>

        <div className="login-title">Şifrəni dəyişin</div>
        <div className="login-subtitle">İlk daxil olma üçün yeni şifrə müəyyən edin</div>

        <form onSubmit={handleSubmit} noValidate>
          <div className="login-field">
            <label className="login-label">Yeni şifrə</label>
            <div className="login-input-wrap">
              <span className="login-input-icon"><i className="bi bi-lock-fill" /></span>
              <input
                type={showNew ? 'text' : 'password'}
                className="login-input login-input--has-toggle"
                placeholder="Yeni şifrəni daxil edin"
                value={form.newPassword}
                onChange={e => setForm(p => ({ ...p, newPassword: e.target.value }))}
                required
                autoFocus
              />
              <button type="button" className="login-toggle-btn" onClick={() => setShowNew(s => !s)} tabIndex={-1}>
                <i className={`bi bi-${showNew ? 'eye-slash' : 'eye'}`} />
              </button>
            </div>
            <div className="login-hint">Min 8 simvol, böyük/kiçik hərf və xüsusi simvol</div>
          </div>

          <div className="login-field">
            <label className="login-label">Şifrəni təkrarlayın</label>
            <div className="login-input-wrap">
              <span className="login-input-icon"><i className="bi bi-shield-lock-fill" /></span>
              <input
                type={showConfirm ? 'text' : 'password'}
                className="login-input login-input--has-toggle"
                placeholder="Şifrəni yenidən daxil edin"
                value={form.confirm}
                onChange={e => setForm(p => ({ ...p, confirm: e.target.value }))}
                required
              />
              <button type="button" className="login-toggle-btn" onClick={() => setShowConfirm(s => !s)} tabIndex={-1}>
                <i className={`bi bi-${showConfirm ? 'eye-slash' : 'eye'}`} />
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
                <i className="bi bi-check2-circle me-2" />
                Şifrəni dəyiş
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
