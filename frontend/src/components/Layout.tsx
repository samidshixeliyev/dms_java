import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import client from '../api/client'
import { useEffect, useState } from 'react'
import type { Announcement } from '../types'

export default function Layout() {
  const { user, logout, canManage, isAdmin, isExecutor } = useAuth()
  const navigate = useNavigate()
  const [announcements, setAnnouncements] = useState<Announcement[]>([])

  useEffect(() => {
    client.get('/announcements/active').then(r => setAnnouncements(r.data.data ?? []))
  }, [])

  const handleLogout = async () => {
    await client.post('/auth/logout').catch(() => {})
    logout()
    navigate('/login')
  }

  return (
    <div style={{ display: 'flex' }}>
      {/* Sidebar */}
      <nav className="sidebar">
        <div className="sidebar-brand">DMS <span>•</span> Sistem</div>
        <div className="sidebar-nav">
          {!isExecutor() && (
            <NavLink to="/legal-acts" className={({ isActive }) => 'sidebar-link' + (isActive ? ' active' : '')}>
              <i className="bi bi-file-earmark-text" /> Hüquqi Aktlar
            </NavLink>
          )}
          {(isExecutor() || isAdmin() || canManage()) && (
            <NavLink to="/executor/dashboard" className={({ isActive }) => 'sidebar-link' + (isActive ? ' active' : '')}>
              <i className="bi bi-list-check" /> İcraçı Paneli
            </NavLink>
          )}
          {canManage() && (
            <NavLink to="/approvals" className={({ isActive }) => 'sidebar-link' + (isActive ? ' active' : '')}>
              <i className="bi bi-check2-circle" /> Təsdiqləmələr
            </NavLink>
          )}
          {canManage() && (
            <NavLink to="/reports" className={({ isActive }) => 'sidebar-link' + (isActive ? ' active' : '')}>
              <i className="bi bi-bar-chart" /> Hesabatlar
            </NavLink>
          )}

          {isAdmin() && (
            <>
              <div className="sidebar-link" style={{ opacity: 0.5, fontSize: '0.7rem', letterSpacing: 1, paddingTop: '1.5rem', pointerEvents: 'none' }}>
                İDARƏETMƏ
              </div>
              <NavLink to="/users" className={({ isActive }) => 'sidebar-link' + (isActive ? ' active' : '')}>
                <i className="bi bi-people" /> İstifadəçilər
              </NavLink>
              <NavLink to="/departments" className={({ isActive }) => 'sidebar-link' + (isActive ? ' active' : '')}>
                <i className="bi bi-diagram-3" /> Şöbələr
              </NavLink>
              <NavLink to="/executors" className={({ isActive }) => 'sidebar-link' + (isActive ? ' active' : '')}>
                <i className="bi bi-person-badge" /> İcraçılar
              </NavLink>
              <NavLink to="/act-types" className={({ isActive }) => 'sidebar-link' + (isActive ? ' active' : '')}>
                <i className="bi bi-tags" /> Akt Növləri
              </NavLink>
              <NavLink to="/execution-notes" className={({ isActive }) => 'sidebar-link' + (isActive ? ' active' : '')}>
                <i className="bi bi-journal-check" /> İcra Qeydləri
              </NavLink>
              <NavLink to="/issuing-authorities" className={({ isActive }) => 'sidebar-link' + (isActive ? ' active' : '')}>
                <i className="bi bi-building" /> Göndərən Qurumlar
              </NavLink>
              <NavLink to="/activity-logs" className={({ isActive }) => 'sidebar-link' + (isActive ? ' active' : '')}>
                <i className="bi bi-clock-history" /> Fəaliyyət Jurnalı
              </NavLink>
              <NavLink to="/announcements" className={({ isActive }) => 'sidebar-link' + (isActive ? ' active' : '')}>
                <i className="bi bi-megaphone" /> Elanlar
              </NavLink>
            </>
          )}
        </div>
        <div style={{ padding: '1rem', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          <div style={{ fontSize: '0.8rem', opacity: 0.7, marginBottom: '0.5rem' }}>
            {user?.username} ({user?.role})
          </div>
          <button className="btn btn-sm w-100" style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', border: 'none' }} onClick={handleLogout}>
            <i className="bi bi-box-arrow-left me-2" />Çıxış
          </button>
        </div>
      </nav>

      {/* Main */}
      <div className="main-content">
        {announcements.length > 0 && (
          <div className="announcement-bar">
            <i className="bi bi-megaphone-fill me-2" />
            {announcements[0].title}: {announcements[0].message}
          </div>
        )}
        <div className="topbar">
          <span className="fw-semibold" style={{ color: 'var(--primary)' }}>
            Sənəd İdarəetmə Sistemi
          </span>
          <span className="text-muted small">{user?.username}</span>
        </div>
        <div className="page-container">
          <Outlet />
        </div>
      </div>
    </div>
  )
}
