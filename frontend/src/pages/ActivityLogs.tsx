import { useCallback } from 'react'
import DataTable from '../components/DataTable'
import client from '../api/client'
import type { ActivityLog, PageResponse } from '../types'

export default function ActivityLogs() {
  const fetchData = useCallback(async (page: number, size: number, search: string): Promise<PageResponse<ActivityLog>> => {
    const res = await client.get('/activity-logs', { params: { page, size, search } })
    return res.data.data
  }, [])

  const actionBadge = (action: string) => {
    const map: Record<string, string> = { login: 'success', logout: 'secondary', create: 'primary', update: 'warning', delete: 'danger' }
    return <span className={`badge bg-${map[action] ?? 'secondary'}`}>{action}</span>
  }

  const columns = [
    { header: 'İstifadəçi', render: (row: ActivityLog) => `${row.user?.name ?? ''} ${row.user?.surname ?? ''} (${row.user?.username ?? 'sysyem'})` },
    { header: 'Əməliyyat', render: (row: ActivityLog) => actionBadge(row.action) },
    { header: 'Açıqlama', render: (row: ActivityLog) => row.description },
    { header: 'IP', render: (row: ActivityLog) => row.ipAddress ?? '-' },
    { header: 'Tarix', render: (row: ActivityLog) => new Date(row.createdAt).toLocaleString('az') },
  ]

  return (
    <>
      <div className="mb-3">
        <h5 className="mb-0 fw-bold" style={{ color: 'var(--primary)' }}>
          <i className="bi bi-clock-history me-2" />Fəaliyyət Jurnalı
        </h5>
      </div>
      <div className="card"><div className="card-body">
        <DataTable columns={columns} fetchData={fetchData} />
      </div></div>
    </>
  )
}
