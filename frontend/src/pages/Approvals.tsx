import { useState, useCallback } from 'react'
import DataTable from '../components/DataTable'
import client from '../api/client'
import toast from 'react-hot-toast'
import type { ExecutorStatusLog, LegalAct, PageResponse } from '../types'

const thStyle: React.CSSProperties = {
  background: '#1e3a5f',
  color: '#fff',
  textAlign: 'center',
  padding: '6px 8px',
  fontSize: '.78rem',
  fontWeight: 700,
  whiteSpace: 'nowrap',
  border: '1px solid rgba(255,255,255,.15)',
  verticalAlign: 'middle',
}

export default function Approvals() {
  const [refreshKey, setRefreshKey] = useState(0)
  const [rejectModal, setRejectModal] = useState<{ open: boolean; id: number | null }>({ open: false, id: null })
  const [approveModal, setApproveModal] = useState<{ open: boolean; id: number | null }>({ open: false, id: null })
  const [rejectNote, setRejectNote] = useState('')
  const [approveNote, setApproveNote] = useState('')
  const [detail, setDetail] = useState<LegalAct | null>(null)

  const fetchData = useCallback(async (page: number, size: number): Promise<PageResponse<ExecutorStatusLog>> => {
    const res = await client.get('/approvals', { params: { page, size } })
    return res.data.data
  }, [])

  const openApprove = (id: number) => { setApproveModal({ open: true, id }); setApproveNote('') }

  const confirmApprove = async () => {
    await client.post(`/approvals/${approveModal.id}/approve`, approveNote ? { note: approveNote } : {})
    toast.success('Təsdiqləndi')
    setApproveModal({ open: false, id: null })
    setRefreshKey(k => k + 1)
  }

  const openReject = (id: number) => { setRejectModal({ open: true, id }); setRejectNote('') }

  const confirmReject = async () => {
    if (!rejectNote.trim()) { toast.error('İmtina səbəbi daxil edin'); return }
    await client.post(`/approvals/${rejectModal.id}/reject`, { note: rejectNote })
    toast.success('İmtina edildi')
    setRejectModal({ open: false, id: null })
    setRefreshKey(k => k + 1)
  }

  const loadDetail = async (log: ExecutorStatusLog) => {
    if (!log.legalAct?.id) return
    const res = await client.get(`/legal-acts/${log.legalAct.id}`)
    setDetail(res.data.data)
  }

  const renderDeadline = (row: ExecutorStatusLog) => {
    const d = row.legalAct?.executionDeadline
    if (!d) return <span className="text-muted">—</span>
    const isOverdue = new Date(d) < new Date()
    return <span style={{ color: isOverdue ? '#dc2626' : undefined, fontWeight: isOverdue ? 600 : undefined, whiteSpace: 'nowrap' }}>{d.substring(0, 10)}</span>
  }

  const columns = [
    {
      header: 'Növü',
      render: (row: ExecutorStatusLog) => row.legalAct?.actType?.name
        ? <span className="badge" style={{ background: '#1e3a5f', fontSize: '.74rem', whiteSpace: 'normal', lineHeight: 1.2 }}>{row.legalAct.actType.name}</span>
        : <span className="text-muted">—</span>,
    },
    {
      header: 'Nömrəsi',
      render: (row: ExecutorStatusLog) => (
        <span className="fw-semibold" style={{ cursor: 'pointer', color: '#1e3a5f' }} onClick={() => loadDetail(row)}>
          {row.legalAct?.legalActNumber}
        </span>
      ),
    },
    { header: 'Tarixi', render: (row: ExecutorStatusLog) => <span style={{ whiteSpace: 'nowrap', fontSize: '.78rem' }}>{row.legalAct?.legalActDate?.substring(0, 10) ?? '—'}</span> },
    { header: 'Qısa Məzmun', render: (row: ExecutorStatusLog) => <span style={{ fontSize: '.78rem' }}>{row.legalAct?.summary ?? '—'}</span> },
    { header: 'İcraçı', render: (row: ExecutorStatusLog) => `${row.user?.name ?? ''} ${row.user?.surname ?? ''}`.trim() || '—' },
    { header: 'İcra Qeydi', render: (row: ExecutorStatusLog) => row.executionNote?.note ?? '—' },
    { header: 'Göndərilmə Tarixi', render: (row: ExecutorStatusLog) => <span style={{ whiteSpace: 'nowrap', fontSize: '.78rem' }}>{new Date(row.createdAt).toLocaleDateString('az')}</span> },
    {
      header: 'Sənədlər',
      render: (row: ExecutorStatusLog) => row.attachments && row.attachments.length > 0
        ? <span className="badge bg-primary">{row.attachments.length} fayl</span>
        : <span className="badge bg-secondary">Yoxdur</span>,
    },
    { header: 'İcra Müddəti', render: renderDeadline },
    {
      header: 'Əməliyyat',
      render: (row: ExecutorStatusLog) => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3, alignItems: 'center' }} onClick={e => e.stopPropagation()}>
          <button className="btn btn-sm btn-info" style={{ width: 26, height: 26, padding: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8 }}
            title="Bax" onClick={() => loadDetail(row)}>
            <i className="bi bi-eye" style={{ fontSize: '.8rem' }} />
          </button>
          <button className="btn btn-sm btn-success" style={{ width: 26, height: 26, padding: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8 }}
            title="Təsdiqlə" onClick={() => openApprove(row.id)}>
            <i className="bi bi-check-lg" style={{ fontSize: '.8rem' }} />
          </button>
          <button className="btn btn-sm btn-danger" style={{ width: 26, height: 26, padding: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8 }}
            title="İmtina et" onClick={() => openReject(row.id)}>
            <i className="bi bi-x-lg" style={{ fontSize: '.8rem' }} />
          </button>
        </div>
      ),
    },
  ]

  // Custom thead renderer for dark header
  const customThead = (
    <thead>
      <tr>
        {columns.map((c, i) => <th key={i} style={thStyle}>{c.header}</th>)}
      </tr>
    </thead>
  )

  return (
    <>
      <div className="page-header">
        <div className="page-title"><i className="bi bi-check2-square" />Təsdiq Gözləyənlər</div>
      </div>

      <div className="row g-3">
        <div className={detail ? 'col-md-7' : 'col-12'}>
          <div className="card">
            <DataTable columns={columns} fetchData={fetchData as any} refreshKey={refreshKey} customThead={customThead} />
          </div>
        </div>

        {detail && (
          <div className="col-md-5">
            <div className="card">
              <div className="card-header d-flex justify-content-between align-items-center">
                <span>Akt #{detail.legalActNumber}</span>
                <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: '1.1rem', padding: 0 }}
                  onClick={() => setDetail(null)}>
                  <i className="bi bi-x-lg" />
                </button>
              </div>
              <div className="card-body" style={{ overflowY: 'auto', maxHeight: 'calc(100vh - 220px)' }}>
                <dl className="row small mb-3" style={{ rowGap: '.3rem' }}>
                  <dt className="col-5 text-muted fw-semibold">Növ</dt>
                  <dd className="col-7 mb-0">{detail.actType?.name ?? '—'}</dd>
                  <dt className="col-5 text-muted fw-semibold">Kim qəbul edib</dt>
                  <dd className="col-7 mb-0">{detail.issuedBy?.name ?? '—'}</dd>
                  <dt className="col-5 text-muted fw-semibold">Tarix</dt>
                  <dd className="col-7 mb-0">{detail.legalActDate?.substring(0, 10)}</dd>
                  <dt className="col-5 text-muted fw-semibold">Son tarix</dt>
                  <dd className="col-7 mb-0">{detail.executionDeadline?.substring(0, 10) ?? '—'}</dd>
                  <dt className="col-5 text-muted fw-semibold">Şöbə</dt>
                  <dd className="col-7 mb-0">{detail.organization?.name ?? '—'}</dd>
                  {detail.summary && (
                    <>
                      <dt className="col-5 text-muted fw-semibold">Xülasə</dt>
                      <dd className="col-7 mb-0">{detail.summary}</dd>
                    </>
                  )}
                </dl>

                {detail.executorLinks && detail.executorLinks.length > 0 && (
                  <>
                    <div className="fw-bold mb-2" style={{ fontSize: '.82rem', color: 'var(--primary)' }}>İcraçılar</div>
                    <ul className="list-unstyled small mb-3">
                      {detail.executorLinks.map(lnk => (
                        <li key={lnk.id} className="d-flex align-items-center gap-2 mb-1">
                          <span className={`badge ${lnk.role === 'main' ? 'bg-primary' : 'bg-secondary'}`}>
                            {lnk.role === 'main' ? 'Əsas' : 'Digər'}
                          </span>
                          <span>{lnk.executor?.name}</span>
                        </li>
                      ))}
                    </ul>
                  </>
                )}

                <div className="fw-bold mb-2" style={{ fontSize: '.82rem', color: 'var(--primary)' }}>Status Tarixi</div>
                <div className="timeline">
                  {detail.statusLogs?.map(log => (
                    <div className="timeline-item" key={log.id}>
                      <div className={`timeline-dot ${log.approvalStatus ?? ''}`} />
                      <div className="small">
                        <div className="fw-semibold">{log.executionNote?.note}</div>
                        {log.customNote && <div className="text-muted" style={{ fontStyle: 'italic' }}>{log.customNote}</div>}
                        <div className="text-muted" style={{ fontSize: '.72rem' }}>{new Date(log.createdAt).toLocaleString('az')}</div>
                        {log.approvalStatus && (
                          <span className={`badge badge-${log.approvalStatus} mt-1`}>
                            {log.approvalStatus === 'approved' ? 'Təsdiqləndi' :
                             log.approvalStatus === 'rejected' ? 'Rədd edildi' :
                             log.approvalStatus === 'pending' ? 'Gözləmədə' : log.approvalStatus}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                  {!detail.statusLogs?.length && <p className="text-muted small">Heç bir qeyd yoxdur</p>}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Approve modal */}
      {approveModal.open && (
        <div className="modal show d-block" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header" style={{ background: 'linear-gradient(135deg,#059669,#06d6a0)', color: '#fff' }}>
                <h5 className="modal-title"><i className="bi bi-check-circle me-2" />İcranı Təsdiqlə</h5>
                <button className="btn-close btn-close-white" onClick={() => setApproveModal({ open: false, id: null })} />
              </div>
              <div className="modal-body">
                <p>Bu sənədin icrasını təsdiqləmək istəyirsiniz?</p>
                <label className="form-label">Qeyd (ixtiyari)</label>
                <textarea className="form-control" rows={3} placeholder="Təsdiq qeydini yazın..."
                  value={approveNote} onChange={e => setApproveNote(e.target.value)} />
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary btn-sm" onClick={() => setApproveModal({ open: false, id: null })}>Ləğv et</button>
                <button className="btn btn-success btn-sm" onClick={confirmApprove}>
                  <i className="bi bi-check-lg me-1" />Təsdiqlə
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reject modal */}
      {rejectModal.open && (
        <div className="modal show d-block" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header" style={{ background: 'linear-gradient(135deg,#d63384,#ef476f)', color: '#fff' }}>
                <h5 className="modal-title"><i className="bi bi-x-circle me-2" />İcranı İmtina Et</h5>
                <button className="btn-close btn-close-white" onClick={() => setRejectModal({ open: false, id: null })} />
              </div>
              <div className="modal-body">
                <p className="text-danger fw-semibold">İcraçı yenidən status təyin edəcək.</p>
                <label className="form-label">İmtina səbəbi <span className="text-danger">*</span></label>
                <textarea className="form-control" rows={4} placeholder="İmtina səbəbini mütləq yazın..."
                  value={rejectNote} onChange={e => setRejectNote(e.target.value)} />
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary btn-sm" onClick={() => setRejectModal({ open: false, id: null })}>Ləğv et</button>
                <button className="btn btn-danger btn-sm" onClick={confirmReject}>
                  <i className="bi bi-x-lg me-1" />İmtina Et
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
