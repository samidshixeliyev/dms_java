import { useState, useEffect } from 'react'
import client from '../api/client'
import type { ReportStat, Department } from '../types/index'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, Tooltip as PieTooltip,
} from 'recharts'

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

  const totals = stats.reduce(
    (s, r) => ({
      total: s.total + r.total,
      executed: s.executed + r.executed,
      pendingApproval: s.pendingApproval + r.pendingApproval,
      rejected: s.rejected + r.rejected,
      inProgress: s.inProgress + r.inProgress,
      notStarted: s.notStarted + r.notStarted,
      overdue: s.overdue + r.overdue,
    }),
    { total: 0, executed: 0, pendingApproval: 0, rejected: 0, inProgress: 0, notStarted: 0, overdue: 0 }
  )

  // Group stats by department for the bar chart
  const barData = Object.values(
    stats.reduce((acc, r) => {
      if (!acc[r.departmentName]) {
        acc[r.departmentName] = { dept: r.departmentName, executed: 0, pending: 0, overdue: 0, total: 0 }
      }
      acc[r.departmentName].executed += r.executed
      acc[r.departmentName].pending += r.pendingApproval + r.inProgress
      acc[r.departmentName].overdue += r.overdue
      acc[r.departmentName].total += r.total
      return acc
    }, {} as Record<string, { dept: string; executed: number; pending: number; overdue: number; total: number }>)
  )

  const pieData = [
    { name: 'İcra olunub',  value: totals.executed,        fill: '#16a34a' },
    { name: 'Gözləmədə',   value: totals.pendingApproval, fill: '#f59e0b' },
    { name: 'Rədd edilib',  value: totals.rejected,        fill: '#dc2626' },
    { name: 'Davam edir',   value: totals.inProgress,      fill: '#3b82f6' },
    { name: 'Başlanmayıb',  value: totals.notStarted,      fill: '#94a3b8' },
  ].filter(d => d.value > 0)

  const RADIAN = Math.PI / 180
  const renderLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
    if (percent < 0.05) return null
    const r = innerRadius + (outerRadius - innerRadius) * 0.5
    const x = cx + r * Math.cos(-midAngle * RADIAN)
    const y = cy + r * Math.sin(-midAngle * RADIAN)
    return <text x={x} y={y} fill="#fff" textAnchor="middle" dominantBaseline="central" style={{ fontSize: '.72rem', fontWeight: 700 }}>{`${(percent * 100).toFixed(0)}%`}</text>
  }

  return (
    <>
      <div className="page-header">
        <div className="page-title"><i className="bi bi-bar-chart-line" />Hesabat</div>
      </div>

      {/* Filter */}
      <div className="card mb-3">
        <div className="card-body py-2">
          <div className="d-flex align-items-center gap-2 flex-wrap">
            <label className="fw-semibold text-muted" style={{ fontSize: '.82rem' }}>Şöbə:</label>
            <select className="form-select form-select-sm" style={{ maxWidth: 220 }} value={deptId} onChange={e => setDeptId(e.target.value)}>
              <option value="">Hamısı</option>
              {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
            <button className="btn btn-primary btn-sm" onClick={handleFilter} disabled={loading}>
              {loading ? <span className="spinner-border spinner-border-sm me-1" /> : <i className="bi bi-funnel me-1" />}
              Filtrə et
            </button>
            <button className="btn btn-success btn-sm" onClick={exportExcel}>
              <i className="bi bi-file-earmark-excel me-1" />Excel
            </button>
          </div>
        </div>
      </div>

      {/* Stat cards */}
      <div className="row g-3 mb-3">
        {[
          { dot: '#0284c7', value: totals.total,         label: 'Ümumi tapşırıq' },
          { dot: '#16a34a', value: totals.executed,      label: 'İcra olunub' },
          { dot: '#f59e0b', value: totals.pendingApproval, label: 'Gözləmədə' },
          { dot: '#dc2626', value: totals.overdue,       label: 'Vaxtı keçmiş' },
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

      {/* Charts */}
      {stats.length > 0 && (
        <div className="row g-3 mb-3">
          <div className="col-md-8">
            <div className="card">
              <div className="card-body">
                <div className="fw-semibold mb-3" style={{ fontSize: '.85rem', color: 'var(--primary)' }}>Şöbələr üzrə</div>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={barData} margin={{ top: 4, right: 8, left: -16, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="dept" tick={{ fontSize: 10 }} interval={0} angle={-15} textAnchor="end" height={48} />
                    <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                    <Tooltip contentStyle={{ fontSize: '.78rem' }} />
                    <Legend wrapperStyle={{ fontSize: '.78rem' }} />
                    <Bar dataKey="executed" name="İcra olunub" fill="#16a34a" radius={[3,3,0,0]} />
                    <Bar dataKey="pending"  name="Gözləmədə"  fill="#f59e0b" radius={[3,3,0,0]} />
                    <Bar dataKey="overdue"  name="Vaxtı keçmiş" fill="#dc2626" radius={[3,3,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
          <div className="col-md-4">
            <div className="card h-100">
              <div className="card-body d-flex flex-column">
                <div className="fw-semibold mb-3" style={{ fontSize: '.85rem', color: 'var(--primary)' }}>Ümumi bölgü</div>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={85} dataKey="value" labelLine={false} label={renderLabel}>
                      {pieData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                    </Pie>
                    <PieTooltip contentStyle={{ fontSize: '.78rem' }} formatter={(v, n) => [v, n]} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="d-flex flex-column gap-1 mt-2">
                  {pieData.map((d, i) => (
                    <div key={i} className="d-flex align-items-center gap-2" style={{ fontSize: '.75rem' }}>
                      <div style={{ width: 10, height: 10, borderRadius: 2, background: d.fill, flexShrink: 0 }} />
                      <span className="text-muted">{d.name}</span>
                      <span className="fw-semibold ms-auto">{d.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="card">
        <div className="table-responsive">
          <table className="table table-hover table-bordered mb-0">
            <thead>
              <tr>
                <th style={{ background: '#1e3a5f', color: '#fff', textAlign: 'center', padding: '4px 6px', fontSize: '.72rem', fontWeight: 700, border: '1px solid rgba(255,255,255,.15)', whiteSpace: 'nowrap' }}>#</th>
                {['İcraçı','Şöbə','Ümumi','İcra olunub','Gözləmədə','Rədd edilib','Davam edir','Başlanmayıb','Vaxtı keçmiş','İcra faizi'].map((h,i) => (
                  <th key={i} style={{ background: '#1e3a5f', color: '#fff', textAlign: i >= 2 ? 'center' : undefined, padding: '6px 10px', fontSize: '.78rem', fontWeight: 700, border: '1px solid rgba(255,255,255,.15)', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={11} className="text-center py-4">
                  <div className="spinner-border spinner-border-sm" />
                </td></tr>
              ) : stats.map((row, i) => (
                <tr key={row.executorId}>
                  <td className="text-center text-muted" style={{ fontSize: '.72rem' }}>{i + 1}</td>
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
                <tr><td colSpan={11} className="text-center text-muted py-4">Məlumat yoxdur</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}
