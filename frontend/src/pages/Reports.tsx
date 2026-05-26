import { useState, useEffect } from 'react'
import client from '../api/client'
import type { ReportStat, Department } from '../types'

export default function Reports() {
  const [stats, setStats] = useState<ReportStat[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [deptId, setDeptId] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    client.get('/departments').then(r => setDepartments(r.data.data ?? []))
    loadReport()
  }, [])

  const loadReport = async (dept?: string) => {
    setLoading(true)
    try {
      const res = await client.get('/reports', { params: dept ? { deptId: dept } : {} })
      setStats(res.data.data ?? [])
    } finally {
      setLoading(false)
    }
  }

  const handleFilter = () => loadReport(deptId || undefined)

  const exportExcel = () => {
    const params = deptId ? `?deptId=${deptId}` : ''
    window.open(`/api/reports/export-excel${params}`, '_blank')
  }

  const total = stats.reduce((s, r) => ({ total: s.total + r.total, executed: s.executed + r.executed }), { total: 0, executed: 0 })

  return (
    <>
      <div className="page-header">
        <div className="page-title">
          <i className="bi bi-bar-chart-line" />Hesabat
        </div>
      </div>

      {/* Filter */}
      <div className="card mb-3">
        <div className="card-body">
          <div className="row g-2 align-items-end">
            <div className="col-md-4">
              <label className="form-label">Şöbə</label>
              <select className="form-select form-select-sm" value={deptId} onChange={e => setDeptId(e.target.value)}>
                <option value="">Hamısı</option>
                {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div className="col-auto">
              <button className="btn btn-primary btn-sm" onClick={handleFilter} disabled={loading}>
                {loading ? <span className="spinner-border spinner-border-sm" /> : <i className="bi bi-funnel" />}
                Filtrə et
              </button>
            </div>
            <div className="col-auto">
              <button className="btn btn-success btn-sm" onClick={exportExcel}>
                <i className="bi bi-file-earmark-excel" /> Excel
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Stat cards */}
      <div className="row g-3 mb-3">
        {[
          { dot: '#0284c7', value: total.total, label: 'Ümumi tapşırıq' },
          { dot: '#16a34a', value: total.executed, label: 'İcra edilmiş' },
          { dot: '#d97706', value: stats.reduce((s, r) => s + r.pendingApproval, 0), label: 'Gözləmədə' },
          { dot: '#dc2626', value: stats.reduce((s, r) => s + r.overdue, 0), label: 'Vaxtı keçmiş' },
        ].map((s, i) => (
          <div key={i} className="col-md-3 col-6">
            <div className="stat-card">
              <div className="stat-dot" style={{ background: s.dot }} />
              <div className="stat-info">
                <div className="stat-value">{s.value}</div>
                <div className="stat-label">{s.label}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="card">
        <div className="table-responsive">
          <table className="table table-hover table-bordered mb-0">
            <thead>
              <tr>
                {['İcraçı','Şöbə','Ümumi','İcra olunub','Gözləmədə','Rədd edilib','Davam edir','Başlanmayıb','Vaxtı keçmiş','İcra faizi'].map((h,i) => (
                  <th key={i} style={{ background: '#1e3a5f', color: '#fff', textAlign: i >= 2 ? 'center' : undefined, padding: '6px 10px', fontSize: '.78rem', fontWeight: 700, border: '1px solid rgba(255,255,255,.15)', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={10} className="text-center py-4">
                  <div className="spinner-border spinner-border-sm" />
                </td></tr>
              ) : stats.map(row => (
                <tr key={row.executorId}>
                  <td className="fw-semibold">{row.executorName}</td>
                  <td>{row.departmentName}</td>
                  <td className="text-center">{row.total}</td>
                  <td className="text-center text-success fw-semibold">{row.executed}</td>
                  <td className="text-center text-warning">{row.pendingApproval}</td>
                  <td className="text-center text-danger">{row.rejected}</td>
                  <td className="text-center">{row.inProgress}</td>
                  <td className="text-center text-muted">{row.notStarted}</td>
                  <td className="text-center text-danger">{row.overdue}</td>
                  <td className="text-center" style={{ minWidth: 100 }}>
                    <div className="progress-thin mb-1">
                      <div className="progress-bar bg-success" style={{ width: `${row.executionRate}%` }} />
                    </div>
                    <small className="fw-semibold">{row.executionRate}%</small>
                  </td>
                </tr>
              ))}
              {!loading && stats.length === 0 && (
                <tr><td colSpan={10} className="text-center text-muted py-4">Məlumat yoxdur</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}
