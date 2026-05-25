import { useState, useCallback } from 'react'
import DataTable from '../components/DataTable'
import client from '../api/client'
import toast from 'react-hot-toast'
import type { ExecutorStatusLog, PageResponse } from '../types'

export default function Approvals() {
  const [refreshKey, setRefreshKey] = useState(0)
  const [rejectModal, setRejectModal] = useState<{ open: boolean; id: number | null }>({ open: false, id: null })
  const [rejectNote, setRejectNote] = useState('')

  const fetchData = useCallback(async (page: number, size: number): Promise<PageResponse<ExecutorStatusLog>> => {
    const res = await client.get('/approvals', { params: { page, size } })
    return res.data.data
  }, [])

  const approve = async (id: number) => {
    await client.post(`/approvals/${id}/approve`)
    toast.success('Təsdiqləndi')
    setRefreshKey(k => k + 1)
  }

  const openReject = (id: number) => { setRejectModal({ open: true, id }); setRejectNote('') }

  const confirmReject = async () => {
    if (!rejectNote.trim()) { toast.error('Rədd etmə səbəbi daxil edin'); return }
    await client.post(`/approvals/${rejectModal.id}/reject`, { note: rejectNote })
    toast.success('Rədd edildi')
    setRejectModal({ open: false, id: null })
    setRefreshKey(k => k + 1)
  }

  const columns = [
    {
      header: 'Akt nömrəsi',
      render: (row: ExecutorStatusLog) => <span className="fw-semibold">{row.legalAct?.legalActNumber}</span>,
    },
    { header: 'İcraçı', render: (row: ExecutorStatusLog) => `${row.user?.name ?? ''} ${row.user?.surname ?? ''}` },
    { header: 'İcra qeydi', render: (row: ExecutorStatusLog) => row.executionNote?.note },
    { header: 'Əlavə qeyd', render: (row: ExecutorStatusLog) => row.customNote ?? '-' },
    { header: 'Tarix', render: (row: ExecutorStatusLog) => new Date(row.createdAt).toLocaleDateString('az') },
    {
      header: '',
      render: (row: ExecutorStatusLog) => (
        <div className="d-flex gap-1">
          <button className="btn btn-sm btn-success py-0" onClick={() => approve(row.id)}>
            <i className="bi bi-check-lg" /> Təsdiqlə
          </button>
          <button className="btn btn-sm btn-danger py-0" onClick={() => openReject(row.id)}>
            <i className="bi bi-x-lg" /> Rədd et
          </button>
          {row.attachments && row.attachments.length > 0 && (
            <a href={`/api/executor/attachments/${row.attachments[0].id}/preview`}
               target="_blank" rel="noreferrer"
               className="btn btn-sm btn-outline-secondary py-0">
              <i className="bi bi-eye" />
            </a>
          )}
        </div>
      ),
    },
  ]

  return (
    <>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h5 className="mb-0 fw-bold" style={{ color: 'var(--primary)' }}>
          <i className="bi bi-check2-circle me-2" />Gözləmədə olan Təsdiqləmələr
        </h5>
      </div>

      <div className="card">
        <div className="card-body">
          <DataTable columns={columns} fetchData={fetchData as any} refreshKey={refreshKey} />
        </div>
      </div>

      {rejectModal.open && (
        <div className="modal show d-block" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Rədd etmə səbəbi</h5>
                <button className="btn-close" onClick={() => setRejectModal({ open: false, id: null })} />
              </div>
              <div className="modal-body">
                <textarea className="form-control" rows={4} placeholder="Rədd etmə səbəbini daxil edin..."
                  value={rejectNote} onChange={e => setRejectNote(e.target.value)} />
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary btn-sm" onClick={() => setRejectModal({ open: false, id: null })}>
                  Ləğv et
                </button>
                <button className="btn btn-danger btn-sm" onClick={confirmReject}>
                  Rədd et
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
