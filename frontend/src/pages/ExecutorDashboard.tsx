import { useState, useCallback } from 'react'
import DataTable from '../components/DataTable'
import client from '../api/client'
import toast from 'react-hot-toast'
import type { LegalAct, ExecutionNote, PageResponse } from '../types'
import { useEffect } from 'react'
import { useAuth } from '../context/AuthContext'

export default function ExecutorDashboard() {
  const { user } = useAuth()
  const [selectedAct, setSelectedAct] = useState<LegalAct | null>(null)
  const [showStatusModal, setShowStatusModal] = useState(false)
  const [notes, setNotes] = useState<ExecutionNote[]>([])
  const [refreshKey, setRefreshKey] = useState(0)
  const [form, setForm] = useState({ executionNoteId: '', customNote: '' })
  const [files, setFiles] = useState<File[]>([])
  const [saving, setSaving] = useState(false)
  const [detail, setDetail] = useState<LegalAct | null>(null)
  const [withdrawing, setWithdrawing] = useState<number | null>(null)

  useEffect(() => {
    client.get('/execution-notes').then(r => setNotes(r.data.data ?? []))
  }, [])

  const fetchData = useCallback(async (page: number, size: number, search: string): Promise<PageResponse<LegalAct>> => {
    const res = await client.get('/executor/dashboard', { params: { page, size, search } })
    return res.data.data
  }, [])

  const openStatusModal = (act: LegalAct, e: React.MouseEvent) => {
    e.stopPropagation()
    setSelectedAct(act)
    setForm({ executionNoteId: '', customNote: '' })
    setFiles([])
    setShowStatusModal(true)
  }

  const loadDetail = async (act: LegalAct) => {
    const res = await client.get(`/executor/legal-acts/${act.id}`)
    setDetail(res.data.data)
  }

  const submitStatus = async () => {
    if (!form.executionNoteId) { toast.error('İcra qeydi seçin'); return }
    setSaving(true)
    try {
      const fd = new FormData()
      fd.append('executionNoteId', form.executionNoteId)
      if (form.customNote) fd.append('customNote', form.customNote)
      files.forEach(f => fd.append('files', f))

      await client.post(`/executor/legal-acts/${selectedAct!.id}/status`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      toast.success('Status göndərildi')
      setShowStatusModal(false)
      setRefreshKey(k => k + 1)
      if (detail?.id === selectedAct!.id) loadDetail(selectedAct!)
    } finally {
      setSaving(false)
    }
  }

  const handleWithdraw = async (act: LegalAct, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm('Gözləmədə olan statusu geri almaq istədiyinizə əminsiniz?')) return
    setWithdrawing(act.id)
    try {
      await client.post(`/executor/legal-acts/${act.id}/withdraw-status`)
      toast.success('Status geri alındı')
      setRefreshKey(k => k + 1)
      if (detail?.id === act.id) loadDetail(act)
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Geri alma mümkün olmadı')
    } finally {
      setWithdrawing(null)
    }
  }

  const getStatusBadge = (act: LegalAct) => {
    const log = act.statusLogs?.[0]
    if (!log) return <span className="badge bg-secondary">Başlanmayıb</span>
    if (log.approvalStatus === 'approved') return <span className="badge badge-executed">İcra olunub</span>
    if (log.approvalStatus === 'pending') return <span className="badge badge-pending">Gözləmədə</span>
    if (log.approvalStatus === 'rejected') return <span className="badge badge-rejected">Rədd edilib</span>
    return <span className="badge bg-info">Qeyd var</span>
  }

  const getMyRole = (act: LegalAct): string | null => {
    if (!user?.executorId) return null
    const link = act.executorLinks?.find(l => l.executorId === user.executorId)
    return link?.role ?? null
  }

  const hasPendingOwnLog = (act: LegalAct): boolean => {
    return !!(act.statusLogs?.[0]?.approvalStatus === 'pending')
  }

  const getRowClass = (row: LegalAct) => {
    const log = row.statusLogs?.[0]
    if (log?.approvalStatus === 'approved') return 'row-executed'
    if (log?.approvalStatus === 'rejected') return 'row-overdue'
    if (log?.approvalStatus === 'pending') return 'row-pending'
    if (row.executionDeadline && new Date(row.executionDeadline) < new Date()) return 'row-overdue'
    return ''
  }

  const columns = [
    {
      header: 'Növü',
      render: (row: LegalAct) => row.actType?.name
        ? <span className="badge" style={{ background: '#1e3a5f', fontSize: '.74rem', whiteSpace: 'normal', lineHeight: 1.2 }}>{row.actType.name}</span>
        : <span className="text-muted">—</span>,
    },
    {
      header: 'Nömrə',
      render: (row: LegalAct) => <span className="fw-semibold">{row.legalActNumber}</span>,
    },
    { header: 'Tarixi', render: (row: LegalAct) => <span style={{ whiteSpace: 'nowrap', fontSize: '.76rem' }}>{row.legalActDate?.substring(0, 10)}</span> },
    { header: 'Kim Qəbul Edib', render: (row: LegalAct) => <span style={{ fontSize: '.76rem' }}>{row.issuedBy?.name ?? '—'}</span> },
    { header: 'Qısa Məzmun', render: (row: LegalAct) => <span title={row.summary ?? ''} style={{ fontSize: '.76rem' }}>{row.summary?.substring(0, 60) ?? '—'}</span> },
    {
      header: 'İcra Müddəti',
      render: (row: LegalAct) => row.executionDeadline ? (
        <span style={{ whiteSpace: 'nowrap', fontSize: '.76rem', color: new Date(row.executionDeadline) < new Date() ? '#dc2626' : undefined, fontWeight: new Date(row.executionDeadline) < new Date() ? 600 : undefined }}>
          {row.executionDeadline.substring(0, 10)}
        </span>
      ) : <span className="text-muted">—</span>,
    },
    { header: 'Status', render: (row: LegalAct) => getStatusBadge(row) },
    {
      header: 'Notlar',
      render: (row: LegalAct) => {
        const log = row.statusLogs?.[0]
        if (!log) return <span className="text-muted">—</span>
        const parts: string[] = []
        if (log.executionNote?.note) parts.push(log.executionNote.note)
        if (log.customNote) parts.push(log.customNote)
        return <span style={{ fontSize: '.74rem' }}>{parts.join(' / ') || '—'}</span>
      },
    },
    {
      header: '',
      render: (row: LegalAct) => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3, alignItems: 'center', justifyContent: 'center' }} onClick={e => e.stopPropagation()}>
          <button className="btn btn-sm btn-info" style={{ width: 26, height: 26, padding: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8 }}
            title="Bax" onClick={e => { e.stopPropagation(); loadDetail(row) }}>
            <i className="bi bi-eye" style={{ fontSize: '.8rem' }} />
          </button>
          <button className="btn btn-sm btn-primary" style={{ width: 26, height: 26, padding: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8 }}
            title="Status göndər" onClick={e => openStatusModal(row, e)}>
            <i className="bi bi-send" style={{ fontSize: '.8rem' }} />
          </button>
          {hasPendingOwnLog(row) && (
            <button
              className="btn btn-sm btn-warning"
              style={{ width: 26, height: 26, padding: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8 }}
              onClick={e => handleWithdraw(row, e)}
              disabled={withdrawing === row.id}
              title="Geri al"
            >
              {withdrawing === row.id
                ? <span className="spinner-border spinner-border-sm" style={{ width: 12, height: 12 }} />
                : <i className="bi bi-arrow-counterclockwise" style={{ fontSize: '.8rem' }} />}
            </button>
          )}
        </div>
      ),
    },
  ]

  return (
    <>
      <div className="page-header">
        <div className="page-title">
          <i className="bi bi-kanban" />İcraçı Paneli
        </div>
      </div>

      <div className="row g-3">
        <div className={detail ? 'col-md-7' : 'col-12'}>
          <div className="card">
            <DataTable columns={columns} fetchData={fetchData} refreshKey={refreshKey} onRowClick={loadDetail} rowClassName={getRowClass} />
          </div>
        </div>

        {detail && (
          <div className="col-md-5">
            <div className="card">
              <div className="card-header d-flex justify-content-between align-items-center" style={{ background: 'var(--primary)', color: '#fff', padding: '10px 16px' }}>
                <span className="fw-semibold" style={{ fontSize: '.9rem' }}>
                  <i className="bi bi-file-earmark-text me-2" />Tapşırıq #{detail.legalActNumber}
                </span>
                <button
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#fff', fontSize: '1.1rem', padding: 0 }}
                  onClick={() => setDetail(null)}
                >
                  <i className="bi bi-x-lg" />
                </button>
              </div>
              <div className="card-body" style={{ overflowY: 'auto', maxHeight: 'calc(100vh - 220px)' }}>
                <dl className="row small mb-3" style={{ rowGap: '.3rem' }}>
                  <dt className="col-5 text-muted fw-semibold">Akt tarixi</dt>
                  <dd className="col-7 mb-0">{detail.legalActDate?.substring(0, 10)}</dd>
                  {detail.actType && <><dt className="col-5 text-muted fw-semibold">Növ</dt><dd className="col-7 mb-0">{detail.actType.name}</dd></>}
                  {detail.issuedBy && <><dt className="col-5 text-muted fw-semibold">Kim qəbul edib</dt><dd className="col-7 mb-0">{detail.issuedBy.name}</dd></>}
                  <dt className="col-5 text-muted fw-semibold">Son tarix</dt>
                  <dd className="col-7 mb-0">{detail.executionDeadline?.substring(0, 10) ?? '—'}</dd>
                  <dt className="col-5 text-muted fw-semibold">Sübut tələbi</dt>
                  <dd className="col-7 mb-0">
                    {detail.proofRequired
                      ? <span className="badge badge-pending">Tələb olunur</span>
                      : <span className="badge badge-executed">Tələb yoxdur</span>}
                  </dd>
                  {detail.summary && (
                    <>
                      <dt className="col-5 text-muted fw-semibold">Xülasə</dt>
                      <dd className="col-7 mb-0">{detail.summary}</dd>
                    </>
                  )}
                  {detail.taskNumber && (
                    <>
                      <dt className="col-5 text-muted fw-semibold">Qeyd</dt>
                      <dd className="col-7 mb-0">{detail.taskNumber}</dd>
                    </>
                  )}
                </dl>

                {detail.executorLinks && detail.executorLinks.length > 0 && (
                  <>
                    <div className="fw-bold mb-2 mt-2" style={{ fontSize: '.82rem', color: 'var(--primary)' }}>İcraçılar</div>
                    <ul className="list-unstyled small mb-3">
                      {detail.executorLinks.map(lnk => (
                        <li key={lnk.id} className="d-flex align-items-center gap-2 mb-1">
                          <span className={`badge ${lnk.role === 'main' ? 'bg-primary' : 'bg-secondary'}`}>
                            {lnk.role === 'main' ? 'Əsas' : 'Köməkçi'}
                          </span>
                          <span>{lnk.executor?.name}</span>
                        </li>
                      ))}
                    </ul>
                  </>
                )}

                {detail.taskDescription && (
                  <p className="small text-muted" style={{ whiteSpace: 'pre-wrap' }}>{detail.taskDescription}</p>
                )}

                <div className="fw-bold mb-2 mt-3" style={{ fontSize: '.82rem', color: 'var(--primary)' }}>
                  Status Tarixi
                </div>
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
                        {log.approvalNote && <div className="text-muted fst-italic">{log.approvalNote}</div>}
                        {log.attachments && log.attachments.length > 0 && (
                          <div className="mt-1 d-flex flex-wrap gap-1">
                            {log.attachments.map(att => (
                              <a key={att.id}
                                href={`/api/executor/attachments/${att.id}/download`}
                                className="badge bg-light text-dark text-decoration-none"
                                style={{ fontSize: '.72rem' }}
                                download>
                                <i className="bi bi-paperclip me-1" />{att.originalName}
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  {!detail.statusLogs?.length && (
                    <p className="text-muted small">Heç bir qeyd yoxdur</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Status Modal */}
      {showStatusModal && selectedAct && (
        <div className="modal show d-block" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header header-info">
                <h5 className="modal-title">
                  <i className="bi bi-send me-2" />Status Göndər — #{selectedAct.legalActNumber}
                </h5>
                <button className="btn-close" onClick={() => setShowStatusModal(false)} />
              </div>
              <div className="modal-body">
                {selectedAct.proofRequired && (
                  <div className="alert alert-warning small">
                    <i className="bi bi-exclamation-triangle-fill me-1" />
                    Bu tapşırıq üçün "İcra olunub" seçərkən sənəd yükləmək <strong>məcburidir</strong>.
                  </div>
                )}
                <div className="mb-3">
                  <label className="form-label">İcra qeydi *</label>
                  <select className="form-select" value={form.executionNoteId}
                    onChange={e => setForm(p => ({ ...p, executionNoteId: e.target.value }))}>
                    <option value="">Seçin...</option>
                    {notes.map(n => <option key={n.id} value={n.id}>{n.note}</option>)}
                  </select>
                </div>
                <div className="mb-3">
                  <label className="form-label">Əlavə qeyd</label>
                  <textarea className="form-control" rows={3} value={form.customNote}
                    onChange={e => setForm(p => ({ ...p, customNote: e.target.value }))} />
                </div>
                <div className="mb-3">
                  <label className="form-label">Fayllar</label>
                  <input type="file" className="form-control" multiple
                    onChange={e => setFiles(Array.from(e.target.files ?? []))} />
                  {files.length > 0 && (
                    <ul className="file-list mt-2">
                      {files.map((f, i) => (
                        <li key={i}><i className="bi bi-file-earmark" />{f.name}</li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary btn-sm" onClick={() => setShowStatusModal(false)}>Ləğv et</button>
                <button className="btn btn-primary btn-sm" onClick={submitStatus} disabled={saving}>
                  {saving ? <span className="spinner-border spinner-border-sm me-1" /> : <i className="bi bi-send me-1" />}
                  Göndər
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
