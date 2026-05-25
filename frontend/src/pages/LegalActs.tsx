import { useState, useEffect, useCallback, useRef } from 'react'
import DataTable from '../components/DataTable'
import client from '../api/client'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'
import Select from 'react-select'
import type { LegalAct, ActType, IssuingAuthority, Department, Executor, PageResponse } from '../types'

const selectStyles = {
  control: (base: object) => ({ ...base, borderColor: '#dee2e6', minHeight: 38, fontSize: '0.875rem' }),
}

export default function LegalActs() {
  const { canManage, isAdmin } = useAuth()
  const [showModal, setShowModal] = useState(false)
  const [editItem, setEditItem] = useState<LegalAct | null>(null)
  const [detailAct, setDetailAct] = useState<LegalAct | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  const [actTypes, setActTypes]   = useState<ActType[]>([])
  const [authorities, setAuth]    = useState<IssuingAuthority[]>([])
  const [departments, setDepts]   = useState<Department[]>([])
  const [executors, setExecutors] = useState<Executor[]>([])

  const [form, setForm] = useState<Record<string, any>>({})
  const [executorLinks, setExecutorLinks] = useState<{ executorId: string; role: string; taskDescription: string }[]>([])
  const [saving, setSaving] = useState(false)

  // filters
  const [orgId, setOrgId]           = useState<number | null>(null)
  const [search, setSearch]         = useState('')
  const [filterActType, setFilterActType]     = useState<number | null>(null)
  const [filterIssuedBy, setFilterIssuedBy]   = useState<number | null>(null)
  const [filterExecutor, setFilterExecutor]   = useState<number | null>(null)
  const [filterDeadline, setFilterDeadline]   = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [activeFilters, setActiveFilters] = useState<Record<string, any>>({})

  const assignableDepts = departments.filter(d => d.canAssign)

  useEffect(() => {
    Promise.all([
      client.get('/act-types'),
      client.get('/issuing-authorities'),
      client.get('/departments'),
      client.get('/executors'),
    ]).then(([at, auth, dept, exec]) => {
      setActTypes(at.data.data ?? [])
      setAuth(auth.data.data ?? [])
      setDepts(dept.data.data ?? [])
      setExecutors(exec.data.data ?? [])
    })
  }, [])

  const applyFilters = () => {
    setActiveFilters({
      search,
      actTypeId: filterActType,
      issuedById: filterIssuedBy,
      executorId: filterExecutor,
      deadlineStatus: filterDeadline || undefined,
    })
    setRefreshKey(k => k + 1)
  }

  const clearFilters = () => {
    setSearch(''); setFilterActType(null); setFilterIssuedBy(null)
    setFilterExecutor(null); setFilterDeadline('')
    setActiveFilters({})
    setRefreshKey(k => k + 1)
  }

  const fetchData = useCallback(async (page: number, size: number): Promise<PageResponse<LegalAct>> => {
    const params: any = { page, size, ...activeFilters }
    if (orgId) params.orgId = orgId
    const res = await client.get('/legal-acts', { params })
    return res.data.data
  }, [activeFilters, orgId])

  // re-fetch when orgId changes
  const prevOrgId = useRef(orgId)
  useEffect(() => {
    if (prevOrgId.current !== orgId) {
      prevOrgId.current = orgId
      setRefreshKey(k => k + 1)
    }
  }, [orgId])

  const openCreate = () => { setEditItem(null); setForm({}); setExecutorLinks([]); setShowModal(true) }
  const openEdit = (item: LegalAct, e: React.MouseEvent) => {
    e.stopPropagation()
    setEditItem(item)
    setForm({
      organizationId: item.organizationId,
      actTypeId: item.actTypeId,
      issuedById: item.issuedById,
      legalActNumber: item.legalActNumber,
      legalActDate: item.legalActDate,
      summary: item.summary,
      taskNumber: item.taskNumber,
      taskDescription: item.taskDescription,
      executionDeadline: item.executionDeadline,
      relatedDocumentNumber: item.relatedDocumentNumber,
      relatedDocumentDate: item.relatedDocumentDate,
    })
    setExecutorLinks(item.executorLinks?.map(l => ({
      executorId: (l.executorId ?? l.executor?.id ?? '').toString(),
      role: l.role,
      taskDescription: l.taskDescription ?? '',
    })) ?? [])
    setShowModal(true)
  }

  const openDetail = async (item: LegalAct) => {
    try {
      const res = await client.get(`/legal-acts/${item.id}`)
      setDetailAct(res.data.data)
    } catch {
      toast.error('Məlumat yüklənmədi')
    }
  }

  const handleDelete = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm('Silmək istədiyinizə əminsiniz?')) return
    await client.delete(`/legal-acts/${id}`)
    toast.success('Silindi')
    if (detailAct?.id === id) setDetailAct(null)
    setRefreshKey(k => k + 1)
  }

  const handleToggleProof = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation()
    await client.post(`/legal-acts/${id}/toggle-proof`)
    toast.success('Sübut tələbi dəyişdirildi')
    setRefreshKey(k => k + 1)
    if (detailAct?.id === id) {
      const res = await client.get(`/legal-acts/${id}`)
      setDetailAct(res.data.data)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const payload = { ...form, executors: executorLinks.map(e => ({ ...e, executorId: parseInt(e.executorId) })) }
      if (editItem) {
        await client.put(`/legal-acts/${editItem.id}`, payload)
        toast.success('Yeniləndi')
      } else {
        await client.post('/legal-acts', payload)
        toast.success('Yaradıldı')
      }
      setShowModal(false)
      setRefreshKey(k => k + 1)
    } finally {
      setSaving(false)
    }
  }

  const exportExcel = () => {
    const params = new URLSearchParams()
    if (orgId) params.set('orgId', String(orgId))
    if (activeFilters.search) params.set('search', activeFilters.search)
    if (activeFilters.actTypeId) params.set('actTypeId', String(activeFilters.actTypeId))
    if (activeFilters.issuedById) params.set('issuedById', String(activeFilters.issuedById))
    if (activeFilters.executorId) params.set('executorId', String(activeFilters.executorId))
    if (activeFilters.deadlineStatus) params.set('deadlineStatus', activeFilters.deadlineStatus)
    window.open(`/api/legal-acts/export-excel?${params.toString()}`, '_blank')
  }

  const addExecutorLink = () => setExecutorLinks(p => [...p, { executorId: '', role: 'main', taskDescription: '' }])
  const removeExecutorLink = (i: number) => setExecutorLinks(p => p.filter((_, idx) => idx !== i))
  const updateExecutorLink = (i: number, key: string, val: string) =>
    setExecutorLinks(p => p.map((e, idx) => idx === i ? { ...e, [key]: val } : e))

  const getRowClass = (row: LegalAct) => {
    const log = row.statusLogs?.[0]
    if (!log) return ''
    if (log.approvalStatus === 'approved') return 'row-executed'
    if (log.approvalStatus === 'pending') return 'row-pending'
    if (log.approvalStatus === 'rejected') return 'row-overdue'
    if (log.approvalStatus === 'partial') return 'row-partial'
    if (row.executionDeadline && new Date(row.executionDeadline) < new Date()) return 'row-overdue'
    return ''
  }

  const getStatusBadge = (row: LegalAct) => {
    const log = row.statusLogs?.[0]
    if (!log) return <span className="badge bg-secondary">Başlanmayıb</span>
    if (log.approvalStatus === 'approved') return <span className="badge badge-executed">İcra olunub</span>
    if (log.approvalStatus === 'pending') return <span className="badge badge-pending">Gözləmədə</span>
    if (log.approvalStatus === 'rejected') return <span className="badge badge-rejected">Rədd edilib</span>
    if (log.approvalStatus === 'partial') return <span className="badge badge-partial">Qismən</span>
    return <span className="badge bg-info text-dark">Qeyd var</span>
  }

  const columns = [
    {
      header: 'Nömrə',
      render: (row: LegalAct) => <span className="fw-semibold">{row.legalActNumber}</span>,
    },
    { header: 'Tarix', render: (row: LegalAct) => row.legalActDate?.substring(0, 10) },
    { header: 'Növ', render: (row: LegalAct) => row.actType?.name },
    { header: 'Göndərən', render: (row: LegalAct) => row.issuedBy?.name },
    { header: 'Şöbə', render: (row: LegalAct) => row.organization?.name },
    {
      header: 'Son tarix',
      render: (row: LegalAct) => row.executionDeadline ? (
        <span className={new Date(row.executionDeadline) < new Date() ? 'text-danger fw-semibold' : ''}>
          {row.executionDeadline.substring(0, 10)}
        </span>
      ) : '-',
    },
    { header: 'Status', render: getStatusBadge },
    ...(canManage() ? [{
      header: '',
      render: (row: LegalAct) => (
        <div className="d-flex gap-1" onClick={e => e.stopPropagation()}>
          <button className="btn btn-xs btn-outline-primary py-0 px-1" title="Düzəlt" onClick={e => openEdit(row, e)}>
            <i className="bi bi-pencil" />
          </button>
          <button
            className={`btn btn-xs py-0 px-1 ${row.proofRequired ? 'btn-warning' : 'btn-outline-secondary'}`}
            title={row.proofRequired ? 'Sübut tələb olunur' : 'Sübut tələb edilmir'}
            onClick={e => handleToggleProof(row.id, e)}>
            <i className="bi bi-paperclip" />
          </button>
          <button className="btn btn-xs btn-outline-danger py-0 px-1" title="Sil" onClick={e => handleDelete(row.id, e)}>
            <i className="bi bi-trash" />
          </button>
        </div>
      ),
    }] : []),
  ]

  return (
    <>
      <div className="page-header">
        <div className="page-title">
          <i className="bi bi-file-text" />Hüquqi Aktlar
        </div>
        <div className="d-flex gap-2">
          {canManage() && (
            <>
              <button className="btn btn-outline-success btn-sm" onClick={exportExcel}>
                <i className="bi bi-file-earmark-excel" /> Excel
              </button>
              <button className="btn btn-primary btn-sm" onClick={openCreate}>
                <i className="bi bi-plus-lg" />Yeni Akt
              </button>
            </>
          )}
        </div>
      </div>

      {/* Org tabs */}
      {assignableDepts.length > 1 && (
        <ul className="nav nav-tabs mb-2" style={{ fontSize: '.85rem' }}>
          <li className="nav-item">
            <button className={`nav-link ${orgId === null ? 'active' : ''}`} onClick={() => setOrgId(null)}>
              Hamısı
            </button>
          </li>
          {assignableDepts.map(d => (
            <li key={d.id} className="nav-item">
              <button className={`nav-link ${orgId === d.id ? 'active' : ''}`} onClick={() => setOrgId(d.id)}>
                {d.name}
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Filter panel */}
      <div className="card mb-2">
        <div className="card-body py-2">
          <div className="d-flex align-items-center gap-2 flex-wrap">
            <input
              className="form-control form-control-sm" style={{ maxWidth: 220 }}
              placeholder="Axtar (nömrə, xülasə...)"
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && applyFilters()}
            />
            <button className="btn btn-link btn-sm text-primary p-0" onClick={() => setShowFilters(f => !f)}>
              <i className="bi bi-sliders" /> {showFilters ? 'Filtri gizlət' : 'Əlavə filtrlər'}
            </button>
            <button className="btn btn-primary btn-sm" onClick={applyFilters}>
              <i className="bi bi-search" /> Axtar
            </button>
            {Object.values(activeFilters).some(Boolean) && (
              <button className="btn btn-outline-secondary btn-sm" onClick={clearFilters}>
                <i className="bi bi-x" /> Təmizlə
              </button>
            )}
          </div>
          {showFilters && (
            <div className="row g-2 mt-2">
              <div className="col-md-3">
                <Select
                  styles={selectStyles}
                  options={actTypes.map(a => ({ value: a.id, label: a.name }))}
                  value={actTypes.filter(a => a.id === filterActType).map(a => ({ value: a.id, label: a.name }))[0] ?? null}
                  onChange={opt => setFilterActType(opt?.value ?? null)}
                  placeholder="Akt növü..."
                  isClearable
                />
              </div>
              <div className="col-md-3">
                <Select
                  styles={selectStyles}
                  options={authorities.map(a => ({ value: a.id, label: a.name }))}
                  value={authorities.filter(a => a.id === filterIssuedBy).map(a => ({ value: a.id, label: a.name }))[0] ?? null}
                  onChange={opt => setFilterIssuedBy(opt?.value ?? null)}
                  placeholder="Göndərən qurum..."
                  isClearable
                />
              </div>
              <div className="col-md-3">
                <Select
                  styles={selectStyles}
                  options={executors.map(e => ({ value: e.id, label: e.name }))}
                  value={executors.filter(e => e.id === filterExecutor).map(e => ({ value: e.id, label: e.name }))[0] ?? null}
                  onChange={opt => setFilterExecutor(opt?.value ?? null)}
                  placeholder="İcraçı..."
                  isClearable
                />
              </div>
              <div className="col-md-3">
                <select className="form-select form-select-sm" value={filterDeadline}
                  onChange={e => setFilterDeadline(e.target.value)}>
                  <option value="">Son tarix (hamısı)</option>
                  <option value="overdue">Vaxtı keçmiş</option>
                  <option value="due_soon">Yaxın 7 gün</option>
                </select>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className={`row g-3 ${detailAct ? '' : ''}`}>
        <div className={detailAct ? 'col-md-7' : 'col-12'}>
          <div className="card">
            <DataTable
              columns={columns}
              fetchData={fetchData}
              rowClassName={getRowClass}
              refreshKey={refreshKey}
              onRowClick={openDetail}
            />
          </div>
        </div>

        {detailAct && (
          <div className="col-md-5">
            <div className="card h-100">
              <div className="card-header d-flex justify-content-between align-items-center" style={{ background: 'var(--primary)', color: '#fff', padding: '10px 16px' }}>
                <span className="fw-semibold" style={{ fontSize: '.9rem' }}>
                  <i className="bi bi-file-earmark-text me-2" />#{detailAct.legalActNumber}
                </span>
                <button style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '1.1rem', padding: 0 }}
                  onClick={() => setDetailAct(null)}>
                  <i className="bi bi-x-lg" />
                </button>
              </div>
              <div className="card-body" style={{ overflowY: 'auto', maxHeight: 'calc(100vh - 240px)', fontSize: '.85rem' }}>
                <dl className="row mb-3" style={{ rowGap: '.25rem' }}>
                  {detailAct.actType && <><dt className="col-5 text-muted">Növ</dt><dd className="col-7 mb-0">{detailAct.actType.name}</dd></>}
                  {detailAct.issuedBy && <><dt className="col-5 text-muted">Göndərən</dt><dd className="col-7 mb-0">{detailAct.issuedBy.name}</dd></>}
                  {detailAct.organization && <><dt className="col-5 text-muted">Şöbə</dt><dd className="col-7 mb-0">{detailAct.organization.name}</dd></>}
                  <dt className="col-5 text-muted">Tarix</dt><dd className="col-7 mb-0">{detailAct.legalActDate?.substring(0, 10)}</dd>
                  {detailAct.executionDeadline && <><dt className="col-5 text-muted">Son tarix</dt>
                    <dd className="col-7 mb-0">
                      <span className={new Date(detailAct.executionDeadline) < new Date() ? 'text-danger fw-semibold' : ''}>
                        {detailAct.executionDeadline.substring(0, 10)}
                      </span>
                    </dd></>}
                  {detailAct.taskNumber && <><dt className="col-5 text-muted">Tapşırıq №</dt><dd className="col-7 mb-0">{detailAct.taskNumber}</dd></>}
                  <dt className="col-5 text-muted">Sübut tələbi</dt>
                  <dd className="col-7 mb-0">
                    {detailAct.proofRequired
                      ? <span className="badge badge-pending">Tələb olunur</span>
                      : <span className="badge bg-secondary">Tələb yoxdur</span>}
                  </dd>
                </dl>
                {detailAct.summary && (
                  <div className="mb-3">
                    <div className="fw-semibold text-muted mb-1" style={{ fontSize: '.78rem', textTransform: 'uppercase', letterSpacing: '.05em' }}>Xülasə</div>
                    <div style={{ whiteSpace: 'pre-wrap' }}>{detailAct.summary}</div>
                  </div>
                )}
                {detailAct.taskDescription && (
                  <div className="mb-3">
                    <div className="fw-semibold text-muted mb-1" style={{ fontSize: '.78rem', textTransform: 'uppercase', letterSpacing: '.05em' }}>Tapşırığın məzmunu</div>
                    <div style={{ whiteSpace: 'pre-wrap' }}>{detailAct.taskDescription}</div>
                  </div>
                )}

                {detailAct.executorLinks && detailAct.executorLinks.length > 0 && (
                  <div className="mb-3">
                    <div className="fw-semibold text-muted mb-1" style={{ fontSize: '.78rem', textTransform: 'uppercase', letterSpacing: '.05em' }}>İcraçılar</div>
                    {detailAct.executorLinks.map(l => (
                      <div key={l.id} className="d-flex align-items-center gap-2 mb-1">
                        <span className={`badge ${l.role === 'main' ? 'bg-primary' : 'bg-secondary'}`}>
                          {l.role === 'main' ? 'Əsas' : 'Köməkçi'}
                        </span>
                        <span>{l.executor?.name}</span>
                        {l.taskDescription && <small className="text-muted">— {l.taskDescription}</small>}
                      </div>
                    ))}
                  </div>
                )}

                {detailAct.attachments && detailAct.attachments.length > 0 && (
                  <div className="mb-3">
                    <div className="fw-semibold text-muted mb-1" style={{ fontSize: '.78rem', textTransform: 'uppercase', letterSpacing: '.05em' }}>Əlavə edilmiş fayllar</div>
                    {detailAct.attachments.map(att => (
                      <a key={att.id} href={`/api/executor/attachments/${att.id}/download`}
                         className="d-block text-decoration-none mb-1" download>
                        <i className="bi bi-paperclip me-1" />{att.originalName}
                      </a>
                    ))}
                  </div>
                )}

                <div className="fw-semibold text-muted mb-2" style={{ fontSize: '.78rem', textTransform: 'uppercase', letterSpacing: '.05em' }}>İcra Tarixi</div>
                <div className="timeline">
                  {detailAct.statusLogs?.map(log => (
                    <div className="timeline-item" key={log.id}>
                      <div className={`timeline-dot ${log.approvalStatus ?? ''}`} />
                      <div>
                        <div className="fw-semibold">{log.executionNote?.note}</div>
                        {log.customNote && <div className="text-muted fst-italic">{log.customNote}</div>}
                        <div className="text-muted" style={{ fontSize: '.72rem' }}>
                          {log.user ? `${log.user.name ?? ''} ${log.user.surname ?? ''}`.trim() : ''}
                          {' · '}{new Date(log.createdAt).toLocaleString('az')}
                        </div>
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
                              <a key={att.id} href={`/api/executor/attachments/${att.id}/download`}
                                 className="badge bg-light text-dark text-decoration-none" download>
                                <i className="bi bi-paperclip me-1" />{att.originalName}
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  {!detailAct.statusLogs?.length && <p className="text-muted">Heç bir qeyd yoxdur</p>}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="modal show d-block" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-xl">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">{editItem ? 'Aktı Düzəlt' : 'Yeni Akt Yarat'}</h5>
                <button className="btn-close" onClick={() => setShowModal(false)} />
              </div>
              <div className="modal-body">
                <div className="row g-3">
                  <div className="col-md-4">
                    <label className="form-label">Şöbə</label>
                    <Select styles={selectStyles}
                      options={departments.map(d => ({ value: d.id, label: d.name }))}
                      value={departments.filter(d => d.id === form.organizationId).map(d => ({ value: d.id, label: d.name }))[0] ?? null}
                      onChange={opt => setForm(p => ({ ...p, organizationId: opt?.value }))}
                      placeholder="Şöbə seçin..." isClearable />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label">Akt növü *</label>
                    <Select styles={selectStyles}
                      options={actTypes.map(a => ({ value: a.id, label: a.name }))}
                      value={actTypes.filter(a => a.id === form.actTypeId).map(a => ({ value: a.id, label: a.name }))[0] ?? null}
                      onChange={opt => setForm(p => ({ ...p, actTypeId: opt?.value }))}
                      placeholder="Növ seçin..." />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label">Göndərən qurum *</label>
                    <Select styles={selectStyles}
                      options={authorities.map(a => ({ value: a.id, label: a.name }))}
                      value={authorities.filter(a => a.id === form.issuedById).map(a => ({ value: a.id, label: a.name }))[0] ?? null}
                      onChange={opt => setForm(p => ({ ...p, issuedById: opt?.value }))}
                      placeholder="Qurum seçin..." />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label">Akt nömrəsi *</label>
                    <input className="form-control form-control-sm" value={form.legalActNumber ?? ''}
                      onChange={e => setForm(p => ({ ...p, legalActNumber: e.target.value }))} />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label">Akt tarixi *</label>
                    <input type="date" className="form-control form-control-sm" value={form.legalActDate ?? ''}
                      onChange={e => setForm(p => ({ ...p, legalActDate: e.target.value }))} />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label">İcra müddəti</label>
                    <input type="date" className="form-control form-control-sm" value={form.executionDeadline ?? ''}
                      onChange={e => setForm(p => ({ ...p, executionDeadline: e.target.value }))} />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label">Tapşırıq nömrəsi</label>
                    <input className="form-control form-control-sm" value={form.taskNumber ?? ''}
                      onChange={e => setForm(p => ({ ...p, taskNumber: e.target.value }))} />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label">Əlaqəli sənəd nömrəsi</label>
                    <input className="form-control form-control-sm" value={form.relatedDocumentNumber ?? ''}
                      onChange={e => setForm(p => ({ ...p, relatedDocumentNumber: e.target.value }))} />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label">Əlaqəli sənəd tarixi</label>
                    <input type="date" className="form-control form-control-sm" value={form.relatedDocumentDate ?? ''}
                      onChange={e => setForm(p => ({ ...p, relatedDocumentDate: e.target.value }))} />
                  </div>
                  <div className="col-12">
                    <label className="form-label">Xülasə</label>
                    <textarea className="form-control form-control-sm" rows={2} value={form.summary ?? ''}
                      onChange={e => setForm(p => ({ ...p, summary: e.target.value }))} />
                  </div>
                  <div className="col-12">
                    <label className="form-label">Tapşırığın məzmunu</label>
                    <textarea className="form-control form-control-sm" rows={3} value={form.taskDescription ?? ''}
                      onChange={e => setForm(p => ({ ...p, taskDescription: e.target.value }))} />
                  </div>
                  <div className="col-12">
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <label className="form-label mb-0">İcraçılar</label>
                      <button type="button" className="btn btn-sm btn-outline-primary" onClick={addExecutorLink}>
                        <i className="bi bi-plus" /> Əlavə et
                      </button>
                    </div>
                    {executorLinks.map((link, i) => (
                      <div key={i} className="row g-2 mb-2 align-items-center">
                        <div className="col-md-5">
                          <Select styles={selectStyles}
                            options={executors.map(e => ({ value: e.id.toString(), label: e.name }))}
                            value={executors.filter(e => e.id.toString() === link.executorId).map(e => ({ value: e.id.toString(), label: e.name }))[0] ?? null}
                            onChange={opt => updateExecutorLink(i, 'executorId', opt?.value ?? '')}
                            placeholder="İcraçı seçin..." />
                        </div>
                        <div className="col-md-2">
                          <select className="form-select form-select-sm" value={link.role}
                            onChange={e => updateExecutorLink(i, 'role', e.target.value)}>
                            <option value="main">Əsas</option>
                            <option value="helper">Köməkçi</option>
                          </select>
                        </div>
                        <div className="col-md-4">
                          <input className="form-control form-control-sm" placeholder="Xüsusi tapşırıq..."
                            value={link.taskDescription}
                            onChange={e => updateExecutorLink(i, 'taskDescription', e.target.value)} />
                        </div>
                        <div className="col-md-1">
                          <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => removeExecutorLink(i)}>
                            <i className="bi bi-x" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary btn-sm" onClick={() => setShowModal(false)}>Ləğv et</button>
                <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving}>
                  {saving ? <span className="spinner-border spinner-border-sm me-1" /> : null}
                  Yadda saxla
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
