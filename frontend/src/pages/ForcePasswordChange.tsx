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
      // Update user in context
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
        <h5 className="fw-bold mb-1" style={{ color: 'var(--primary)' }}>Şifrəni dəyişin</h5>
        <p className="text-muted small mb-4">İlk daxil olma üçün yeni şifrə müəyyən edin</p>
        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label className="form-label fw-medium">Yeni şifrə</label>
            <input type="password" className="form-control"
              value={form.newPassword}
              onChange={e => setForm(p => ({ ...p, newPassword: e.target.value }))}
              required />
            <div className="form-text">Min 8 simvol, böyük/kiçik hərf və xüsusi simvol</div>
          </div>
          <div className="mb-4">
            <label className="form-label fw-medium">Şifrəni təkrarlayın</label>
            <input type="password" className="form-control"
              value={form.confirm}
              onChange={e => setForm(p => ({ ...p, confirm: e.target.value }))}
              required />
          </div>
          <button type="submit" className="btn btn-primary w-100" disabled={loading}>
            {loading ? <span className="spinner-border spinner-border-sm me-2" /> : null}
            Şifrəni dəyiş
          </button>
        </form>
      </div>
    </div>
  )
}
