import { useState, useCallback } from 'react'
import DataTable from '../components/DataTable'
import client from '../api/client'
import toast from 'react-hot-toast'
import type { LegalAct, ExecutionNote, PageResponse } from '../types'
import { useEffect } from 'react'

export default function ExecutorDashboard() {
  const [selectedAct, setSelectedAct] = useState<LegalAct | null>(null)
  const [showStatusModal, setShowStatusModal] = useState(false)
  const [notes, setNotes] = useState<ExecutionNote[]>([])
  const [refreshKey, setRefreshKey] = useState(0)
  const [form, setForm] = useState({ executionNoteId: '', customNote: '' })
  const [files, setFiles] = useState<File[]>([])
  const [saving, setSaving] = useState(false)
  const [detail, setDetail] = useState<LegalAct | null>(null)

  useEffect(() => {
    client.get('/execution-notes').then(r => setNotes(r.data.data ?? []))
  }, [])

  const fetchData = useCallback(async (page: number, size: number, search: string): Promise<PageResponse<LegalAct>> => {
    const res = await client.get('/executor/dashboard', { params: { page, size, search } })
    return res.data.data
  }, [])

  const openStatusModal = (act: LegalAct) => {
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
    } finally {
      setSaving(false)
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

  const columns = [
    { header: 'Nömrə', render: (row: LegalAct) => <span className="fw-semibold">{row.legalActNumber}</span> },
    { header: 'Tarix', render: (row: LegalAct) => row.legalActDate?.substring(0, 10) },
    { header: 'Son tarix', render: (row: LegalAct) => row.executionDeadline?.substring(0, 10) ?? '-' },
    { header: 'Xülasə', render: (row: LegalAct) => <span title={row.summary ?? ''}>{row.summary?.substring(0, 60) ?? '-'}</span> },
    { header: 'Status', render: (row: LegalAct) => getStatusBadge(row) },
    {
      header: '',
      render: (row: LegalAct) => (
        <div className="d-flex gap-1" onClick={e => e.stopPropagation()}>
          <button className="btn btn-xs btn-outline-primary py-0 px-1" onClick={() => openStatusModal(row)}>
            <i className="bi bi-send" /> Status
          </button>
          <button className="btn btn-xs btn-outline-secondary py-0 px-1" onClick={() => loadDetail(row)}>
            <i className="bi bi-eye" />
          </button>
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
            <DataTable columns={columns} fetchData={fetchData} refreshKey={refreshKey} />
          </div>
        </div>

        {detail && (
          <div className="col-md-5">
            <div className="card">
              <div className="card-header">
                <span>Tapşırıq #{detail.legalActNumber}</span>
                <button
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: '1.1rem', padding: 0 }}
                  onClick={() => setDetail(null)}
                >
                  <i className="bi bi-x-lg" />
                </button>
              </div>
              <div className="card-body" style={{ overflowY: 'auto', maxHeight: 'calc(100vh - 220px)' }}>
                <dl className="row small mb-3" style={{ rowGap: '.3rem' }}>
                  <dt className="col-5 text-muted fw-semibold">Akt tarixi</dt>
                  <dd className="col-7 mb-0">{detail.legalActDate?.substring(0, 10)}</dd>
                  <dt className="col-5 text-muted fw-semibold">Son tarix</dt>
                  <dd className="col-7 mb-0">{detail.executionDeadline?.substring(0, 10) ?? '—'}</dd>
                  <dt className="col-5 text-muted fw-semibold">Sübut tələbi</dt>
                  <dd className="col-7 mb-0">
                    {detail.proofRequired
                      ? <span className="badge badge-pending">Tələb olunur</span>
                      : <span className="badge badge-executed">Tələb yoxdur</span>}
                  </dd>
                </dl>
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
                        {log.attachments && log.attachments.length > 0 && (
                          <div className="mt-1 d-flex flex-wrap gap-1">
                            {log.attachments.map(att => (
                              <a key={att.id}
                                href={`/api/executor/attachments/${att.id}/download`}
                                className="badge bg-light"
                                style={{ textDecoration: 'none', fontSize: '.72rem' }}
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
                    <i className="bi bi-exclamation-triangle-fill" />
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
                  {saving ? <span className="spinner-border spinner-border-sm" /> : <i className="bi bi-send" />}
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
