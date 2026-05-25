import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import client from '../api/client'
import { useEffect, useState } from 'react'
import type { Announcement } from '../types'
import toast from 'react-hot-toast'

export default function Layout() {
  const { user, logout, canManage, isAdmin, isExecutor } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [pendingCount, setPendingCount] = useState(0)
  const [showChangePwModal, setShowChangePwModal] = useState(false)
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })
  const [changingPw, setChangingPw] = useState(false)

  useEffect(() => {
    client.get('/announcements/active').then(r => setAnnouncements(r.data.data ?? [])).catch(() => {})
  }, [])

  useEffect(() => {
    if (canManage()) {
      client.get('/approvals/count').then(r => setPendingCount(r.data.data ?? 0)).catch(() => {})
    }
  }, [location.pathname])

  const handleLogout = async () => {
    await client.post('/auth/logout').catch(() => {})
    logout()
    navigate('/login')
  }

  const openChangePw = () => {
    setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
    setShowChangePwModal(true)
  }

  const submitChangePw = async () => {
    if (!pwForm.currentPassword || !pwForm.newPassword) {
      toast.error('Bütün sahələri doldurun')
      return
    }
    if (pwForm.newPassword !== pwForm.confirmPassword) {
      toast.error('Yeni şifrələr uyğun gəlmir')
      return
    }
    setChangingPw(true)
    try {
      await client.post('/auth/change-password', {
        currentPassword: pwForm.currentPassword,
        newPassword: pwForm.newPassword,
      })
      toast.success('Şifrə uğurla dəyişdirildi')
      setShowChangePwModal(false)
    } catch {
      toast.error('Cari şifrə səhvdir')
    } finally {
      setChangingPw(false)
    }
  }

  const roleLabel = (role?: string) => {
    if (role === 'admin') return 'Administrator'
    if (role === 'manager') return 'Rəhbər'
    if (role === 'executor') return 'İcraçı'
    return role ?? ''
  }

  const avatarInitial = (user?.username ?? 'U')[0].toUpperCase()

  return (
    <div className="app-wrapper">
      {/* ── Sidebar ─────────────────────────────── */}
      <aside className="sidebar">

        {/* Brand */}
        <div className="sidebar-brand-block">
          <div className="sidebar-brand-icon">
            <i className="bi bi-shield-lock-fill" />
          </div>
          <div>
            <div className="sidebar-brand-title">DMS</div>
            <div className="sidebar-brand-sub">Sənəd İdarəetmə</div>
          </div>
        </div>

        {/* User */}
        <div className="sidebar-user-block">
          <div className="sidebar-avatar">{avatarInitial}</div>
          <div className="sidebar-user-info">
            <div className="sidebar-user-name">{user?.username}</div>
            <div className="sidebar-user-role">{roleLabel(user?.role)}</div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="sidebar-nav">

          {/* Section: Əsas */}
          <div className="sidebar-section-label">Əsas</div>

          {!isExecutor() && (
            <NavLink to="/legal-acts" className={({ isActive }) => 'sidebar-link' + (isActive ? ' active' : '')}>
              <i className="bi bi-file-text" />
              <span>Hüquqi Aktlar</span>
            </NavLink>
          )}

          <NavLink to="/executor/dashboard" className={({ isActive }) => 'sidebar-link' + (isActive ? ' active' : '')}>
            <i className="bi bi-kanban" />
            <span>İcraçı Paneli</span>
          </NavLink>

          {canManage() && (
            <NavLink to="/approvals" className={({ isActive }) => 'sidebar-link' + (isActive ? ' active' : '')}>
              <i className="bi bi-check2-square" />
              <span>Təsdiq Gözləyənlər</span>
              {pendingCount > 0 && <span className="sidebar-badge">{pendingCount}</span>}
            </NavLink>
          )}

          {canManage() && (
            <NavLink to="/reports" className={({ isActive }) => 'sidebar-link' + (isActive ? ' active' : '')}>
              <i className="bi bi-bar-chart-line" />
              <span>Hesabat</span>
            </NavLink>
          )}

          {/* Section: Kataloqlar — admin only */}
          {isAdmin() && (
            <>
              <div className="sidebar-section-label">Kataloqlar</div>

              <NavLink to="/act-types" className={({ isActive }) => 'sidebar-link' + (isActive ? ' active' : '')}>
                <i className="bi bi-bookmark" />
                <span>Sənəd növləri</span>
              </NavLink>

              <NavLink to="/issuing-authorities" className={({ isActive }) => 'sidebar-link' + (isActive ? ' active' : '')}>
                <i className="bi bi-building-check" />
                <span>Kim qəbul edib</span>
              </NavLink>

              <NavLink to="/departments" className={({ isActive }) => 'sidebar-link' + (isActive ? ' active' : '')}>
                <i className="bi bi-diagram-3" />
                <span>İdarələr</span>
              </NavLink>

              <NavLink to="/executors" className={({ isActive }) => 'sidebar-link' + (isActive ? ' active' : '')}>
                <i className="bi bi-people" />
                <span>Rəhbərlər</span>
              </NavLink>

              <NavLink to="/execution-notes" className={({ isActive }) => 'sidebar-link' + (isActive ? ' active' : '')}>
                <i className="bi bi-sticky" />
                <span>İcra qeydləri</span>
              </NavLink>
            </>
          )}

          {/* Section: Admin — admin only */}
          {isAdmin() && (
            <>
              <div className="sidebar-section-label">Admin</div>

              <NavLink to="/users" className={({ isActive }) => 'sidebar-link' + (isActive ? ' active' : '')}>
                <i className="bi bi-person-gear" />
                <span>İstifadəçilər</span>
              </NavLink>

              <NavLink to="/activity-logs" className={({ isActive }) => 'sidebar-link' + (isActive ? ' active' : '')}>
                <i className="bi bi-journal-text" />
                <span>Aktivlik Jurnalı</span>
              </NavLink>

              <NavLink to="/announcements" className={({ isActive }) => 'sidebar-link' + (isActive ? ' active' : '')}>
                <i className="bi bi-megaphone" />
                <span>Elanlar</span>
              </NavLink>
            </>
          )}
        </nav>

        {/* Footer buttons */}
        <div className="sidebar-footer">
          <button
            className="sidebar-footer-btn"
            onClick={openChangePw}
            title="Şifrəni dəyiş"
          >
            <i className="bi bi-key" />
            <span>Şifrəni dəyiş</span>
          </button>
          <button className="sidebar-footer-btn sidebar-footer-btn--logout" onClick={handleLogout} title="Çıxış">
            <i className="bi bi-box-arrow-right" />
            <span>Çıxış</span>
          </button>
        </div>
      </aside>

      {/* Change password modal */}
      {showChangePwModal && (
        <div className="modal show d-block" style={{ background: 'rgba(0,0,0,0.5)', zIndex: 1060 }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title"><i className="bi bi-key me-2" />Şifrəni Dəyiş</h5>
                <button className="btn-close" onClick={() => setShowChangePwModal(false)} />
              </div>
              <div className="modal-body">
                <div className="mb-3">
                  <label className="form-label">Cari şifrə *</label>
                  <input type="password" className="form-control form-control-sm"
                    value={pwForm.currentPassword}
                    onChange={e => setPwForm(p => ({ ...p, currentPassword: e.target.value }))} />
                </div>
                <div className="mb-3">
                  <label className="form-label">Yeni şifrə *</label>
                  <input type="password" className="form-control form-control-sm"
                    value={pwForm.newPassword}
                    onChange={e => setPwForm(p => ({ ...p, newPassword: e.target.value }))} />
                </div>
                <div className="mb-3">
                  <label className="form-label">Yeni şifrəni təkrar daxil edin *</label>
                  <input type="password" className="form-control form-control-sm"
                    value={pwForm.confirmPassword}
                    onChange={e => setPwForm(p => ({ ...p, confirmPassword: e.target.value }))} />
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary btn-sm" onClick={() => setShowChangePwModal(false)}>Ləğv et</button>
                <button className="btn btn-primary btn-sm" onClick={submitChangePw} disabled={changingPw}>
                  {changingPw ? <span className="spinner-border spinner-border-sm me-1" /> : <i className="bi bi-check-lg me-1" />}
                  Yadda saxla
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Main area ───────────────────────────── */}
      <div className="main-content">

        {/* Announcement ticker */}
        {announcements.length > 0 && (
          <div className="announcement-bar">
            <div className="announcement-label">
              <i className="bi bi-megaphone-fill" />
              Elan
            </div>
            <div className="announcement-ticker-wrap">
              <div className="announcement-ticker">
                {[...announcements, ...announcements].map((a, i) => (
                  <span key={i} className="announcement-item">
                    <strong>{a.title}</strong>
                    {a.message ? ` — ${a.message}` : ''}
                    <span className="announcement-sep">•</span>
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Topbar */}
        <header className="topbar">
          <div className="topbar-left">
            <span className="topbar-title">Sənəd İdarəetmə Sistemi</span>
          </div>
          <div className="topbar-right">
            <div className="topbar-user">
              <div className="topbar-avatar">{avatarInitial}</div>
              <div className="topbar-user-info">
                <span className="topbar-username">{user?.username}</span>
                <span className="topbar-role">{roleLabel(user?.role)}</span>
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <div className="page-container">
          <Outlet />
        </div>
      </div>
    </div>
  )
}
