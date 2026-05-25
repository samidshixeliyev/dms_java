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

  const total = stats.reduce((s, r) => ({ total: s.total + r.total, executed: s.executed + r.executed }), { total: 0, executed: 0 })

  return (
    <>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h5 className="mb-0 fw-bold" style={{ color: 'var(--primary)' }}>
          <i className="bi bi-bar-chart me-2" />Hesabatlar
        </h5>
      </div>

      <div className="card mb-3">
        <div className="card-body">
          <div className="row g-2 align-items-end">
            <div className="col-md-4">
              <label className="form-label form-label-sm">Şöbə</label>
              <select className="form-select form-select-sm" value={deptId} onChange={e => setDeptId(e.target.value)}>
                <option value="">Hamısı</option>
                {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div className="col-md-2">
              <button className="btn btn-primary btn-sm" onClick={handleFilter} disabled={loading}>
                {loading ? <span className="spinner-border spinner-border-sm me-1" /> : null}
                Filtrə et
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="row g-3 mb-3">
        <div className="col-md-3">
          <div className="card text-center border-0" style={{ background: '#e0f2fe' }}>
            <div className="card-body py-3">
              <div className="fs-4 fw-bold" style={{ color: 'var(--primary)' }}>{total.total}</div>
              <div className="small text-muted">Ümumi tapşırıq</div>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card text-center border-0" style={{ background: '#dcfce7' }}>
            <div className="card-body py-3">
              <div className="fs-4 fw-bold text-success">{total.executed}</div>
              <div className="small text-muted">İcra edilmiş</div>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card text-center border-0" style={{ background: '#fef9c3' }}>
            <div className="card-body py-3">
              <div className="fs-4 fw-bold text-warning">{stats.reduce((s, r) => s + r.pendingApproval, 0)}</div>
              <div className="small text-muted">Gözləmədə</div>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card text-center border-0" style={{ background: '#fee2e2' }}>
            <div className="card-body py-3">
              <div className="fs-4 fw-bold text-danger">{stats.reduce((s, r) => s + r.overdue, 0)}</div>
              <div className="small text-muted">Vaxtı keçmiş</div>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover table-sm mb-0">
              <thead>
                <tr>
                  <th>İcraçı</th>
                  <th>Şöbə</th>
                  <th className="text-center">Ümumi</th>
                  <th className="text-center">İcra olunub</th>
                  <th className="text-center">Gözləmədə</th>
                  <th className="text-center">Rədd edilib</th>
                  <th className="text-center">Davam edir</th>
                  <th className="text-center">Vaxtı keçmiş</th>
                  <th className="text-center">İcra faizi</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={9} className="text-center py-4">
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
                    <td className="text-center text-danger">{row.overdue}</td>
                    <td className="text-center">
                      <div className="progress" style={{ height: 6, minWidth: 60 }}>
                        <div className="progress-bar bg-success" style={{ width: `${row.executionRate}%` }} />
                      </div>
                      <small>{row.executionRate}%</small>
                    </td>
                  </tr>
                ))}
                {!loading && stats.length === 0 && (
                  <tr><td colSpan={9} className="text-center text-muted py-4">Məlumat yoxdur</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  )
}
