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
      <div className="page-header">
        <div className="page-title"><i className="bi bi-journal-text" />Aktivlik Jurnalı</div>
      </div>
      <div className="card">
        <DataTable columns={columns} fetchData={fetchData} />
      </div>
    </>
  )
}
