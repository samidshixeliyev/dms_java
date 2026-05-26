import { useState, useEffect, useCallback, useRef } from 'react'
import client from '../api/client'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'
import Select from 'react-select'
import type { LegalAct, ActType, IssuingAuthority, Department, Executor } from '../types'

const selectStyles = {
  control: (base: object) => ({ ...base, borderColor: '#dee2e6', minHeight: 34, fontSize: '0.875rem' }),
}

const PAGE_SIZE = 25

export default function LegalActs() {
  const { canManage } = useAuth()
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

  // table state
  const [rows, setRows] = useState<LegalAct[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [loadingTable, setLoadingTable] = useState(false)

  // filters
  const [orgId, setOrgId]                 = useState<number | null>(null)
  const [search, setSearch]               = useState('')
  const [filterActType, setFilterActType] = useState<number | null>(null)
  const [filterIssuedBy, setFilterIssuedBy] = useState<number | null>(null)
  const [filterExecutor, setFilterExecutor] = useState<number | null>(null)
  const [filterDeadline, setFilterDeadline] = useState('')
  const [showFilters, setShowFilters]     = useState(false)
  const [activeFilters, setActiveFilters] = useState<Record<string, any>>({})

  const assignableDepts = departments.filter(d => d.canAssign)
  const totalPages = Math.ceil(total / PAGE_SIZE)

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

  const loadTable = useCallback(async (p: number) => {
    setLoadingTable(true)
    try {
      const params: any = { page: p, size: PAGE_SIZE, ...activeFilters }
      if (orgId) params.orgId = orgId
      const res = await client.get('/legal-acts', { params })
      const pageData = res.data.data
      setRows(pageData.data)
      setTotal(pageData.total)
    } finally {
      setLoadingTable(false)
    }
  }, [activeFilters, orgId])

  useEffect(() => { setPage(0); loadTable(0) }, [refreshKey, loadTable])

  // re-fetch when orgId changes
  const prevOrgId = useRef(orgId)
  useEffect(() => {
    if (prevOrgId.current !== orgId) {
      prevOrgId.current = orgId
      setPage(0); loadTable(0)
    }
  }, [orgId])

  const goPage = (p: number) => { setPage(p); loadTable(p) }

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
      proofRequired: item.proofRequired,
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
    if (log?.approvalStatus === 'approved') return 'row-executed'
    if (log?.approvalStatus === 'rejected') return 'row-overdue'
    if (log?.approvalStatus === 'partial') return 'row-partial'
    if (log?.approvalStatus === 'pending') return 'row-pending'
    if (row.executionDeadline && new Date(row.executionDeadline) < new Date()) return 'row-overdue'
    return ''
  }

  const renderExecutors = (row: LegalAct) => {
    if (!row.executorLinks?.length) return <span className="text-muted">—</span>
    return (
      <div style={{ lineHeight: 1.4 }}>
        {row.executorLinks.map(l => (
          <div key={l.id} style={{ fontSize: '.76rem' }}>
            <span style={{ color: l.role === 'main' ? '#1e3a5f' : '#64748b', fontWeight: l.role === 'main' ? 600 : 400 }}>
              {l.role === 'main' ? 'Əsas' : 'Digər'}:
            </span>{' '}
            {l.executor?.name ?? '—'}
          </div>
        ))}
      </div>
    )
  }

  const renderDepartments = (row: LegalAct) => {
    if (!row.executorLinks?.length) return <span className="text-muted">—</span>
    const depts = [...new Set(row.executorLinks.map(l => l.executor?.department?.name).filter(Boolean))]
    if (!depts.length) return <span className="text-muted">—</span>
    return <div style={{ fontSize: '.76rem', lineHeight: 1.4 }}>{depts.map((d, i) => <div key={i}>{d}</div>)}</div>
  }

  const renderDeadline = (row: LegalAct) => {
    if (!row.executionDeadline) return <span className="text-muted">—</span>
    const isOverdue = new Date(row.executionDeadline) < new Date()
    return (
      <span style={{ color: isOverdue ? '#dc2626' : undefined, fontWeight: isOverdue ? 600 : undefined, fontSize: '.76rem', whiteSpace: 'nowrap' }}>
        {row.executionDeadline.substring(0, 10)}
      </span>
    )
  }

  const renderNote = (row: LegalAct) => {
    const log = row.statusLogs?.[0]
    const pieces: string[] = []
    if (log?.executionNote?.note) pieces.push(log.executionNote.note)
    if (row.taskNumber) pieces.push(row.taskNumber)
    if (!pieces.length) return <span className="text-muted">—</span>
    return <span style={{ fontSize: '.76rem' }}>{pieces.join(' / ')}</span>
  }

  // Pagination range
  const delta = 2
  const pageNums: number[] = []
  for (let i = Math.max(0, page - delta); i <= Math.min(totalPages - 1, page + delta); i++) pageNums.push(i)

  return (
    <>
      <div className="page-header">
        <div className="page-title"><i className="bi bi-file-text" />Hüquqi Aktlar</div>
        <div className="d-flex gap-2">
          {canManage() && (
            <>
              <button className="btn btn-outline-success btn-sm" onClick={exportExcel}>
                <i className="bi bi-file-earmark-excel me-1" />Excel
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
        <div className="mb-2 d-flex align-items-center gap-2 flex-wrap">
          <span className="text-muted fw-semibold" style={{ fontSize: '.82rem' }}>İdarə:</span>
          <button
            className={`btn btn-sm ${orgId === null ? 'btn-primary' : 'btn-outline-primary'}`}
            onClick={() => setOrgId(null)}>Hamısı</button>
          {assignableDepts.map(d => (
            <button key={d.id}
              className={`btn btn-sm ${orgId === d.id ? 'btn-primary' : 'btn-outline-primary'}`}
              onClick={() => setOrgId(d.id)}>{d.name}</button>
          ))}
        </div>
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
            <span className="ms-auto text-muted" style={{ fontSize: '.82rem' }}>{total} qeyd</span>
          </div>
          {showFilters && (
            <div className="row g-2 mt-2">
              <div className="col-md-3">
                <Select styles={selectStyles}
                  options={actTypes.map(a => ({ value: a.id, label: a.name }))}
                  value={actTypes.filter(a => a.id === filterActType).map(a => ({ value: a.id, label: a.name }))[0] ?? null}
                  onChange={opt => setFilterActType(opt?.value ?? null)}
                  placeholder="Akt növü..." isClearable />
              </div>
              <div className="col-md-3">
                <Select styles={selectStyles}
                  options={authorities.map(a => ({ value: a.id, label: a.name }))}
                  value={authorities.filter(a => a.id === filterIssuedBy).map(a => ({ value: a.id, label: a.name }))[0] ?? null}
                  onChange={opt => setFilterIssuedBy(opt?.value ?? null)}
                  placeholder="Kim qəbul edib..." isClearable />
              </div>
              <div className="col-md-3">
                <Select styles={selectStyles}
                  options={executors.map(e => ({ value: e.id, label: e.name }))}
                  value={executors.filter(e => e.id === filterExecutor).map(e => ({ value: e.id, label: e.name }))[0] ?? null}
                  onChange={opt => setFilterExecutor(opt?.value ?? null)}
                  placeholder="İcraçı..." isClearable />
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

      <div className={`row g-3`}>
        <div className={detailAct ? 'col-md-7' : 'col-12'}>
          <div className="card p-0">
            <div style={{ overflowX: 'auto' }}>
              <table className="table table-hover table-bordered mb-0" id="legalActsTable" style={{ minWidth: 860, tableLayout: 'fixed', width: '100%', fontSize: '.78rem' }}>
                <colgroup>
                  <col style={{ width: 90 }} />
                  <col style={{ width: 90 }} />
                  <col style={{ width: 95 }} />
                  <col style={{ width: 120 }} />
                  <col />
                  <col />
                  <col style={{ width: 160 }} />
                  <col style={{ width: 150 }} />
                  <col style={{ width: 110 }} />
                  <col style={{ width: 140 }} />
                  {canManage() && <col style={{ width: 36 }} />}
                </colgroup>
                <thead>
                  <tr>
                    <th colSpan={5} style={{ background: '#1e3a5f', color: '#fff', textAlign: 'center', fontSize: '.72rem', fontWeight: 700, padding: '4px 6px', border: '1px solid rgba(255,255,255,.18)' }}>
                      Sənəd Məlumatları
                    </th>
                    <th colSpan={1} style={{ background: '#1e3a5f', color: '#fff', textAlign: 'center', fontSize: '.72rem', fontWeight: 700, padding: '4px 6px', border: '1px solid rgba(255,255,255,.18)' }}>
                      Tapşırıq
                    </th>
                    <th colSpan={4} style={{ background: '#1e3a5f', color: '#fff', textAlign: 'center', fontSize: '.72rem', fontWeight: 700, padding: '4px 6px', border: '1px solid rgba(255,255,255,.18)' }}>
                      İcraçı Məlumatları
                    </th>
                    {canManage() && (
                      <th rowSpan={2} style={{ background: '#1e3a5f', border: '1px solid rgba(255,255,255,.18)', position: 'sticky', right: 0, zIndex: 4 }} />
                    )}
                  </tr>
                  <tr>
                    {(['Növü','Nömrəsi','Tarixi','Kim Qəbul Edib','Qısa Məzmun','Tapşırıq','İcraçı','Bölmə','İcra Müddəti','Qeyd'] as const).map(h => (
                      <th key={h} style={{ background: '#2a5298', color: '#fff', textAlign: 'center', fontSize: '.71rem', fontWeight: 600, padding: '4px 6px', border: '1px solid rgba(255,255,255,.18)', whiteSpace: 'nowrap', verticalAlign: 'middle' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loadingTable ? (
                    <tr>
                      <td colSpan={canManage() ? 11 : 10} className="text-center py-5">
                        <div className="spinner-border text-secondary" style={{ width: '1.25rem', height: '1.25rem' }} />
                      </td>
                    </tr>
                  ) : rows.length === 0 ? (
                    <tr>
                      <td colSpan={canManage() ? 11 : 10} className="dt-empty">
                        <i className="bi bi-inbox dt-empty-icon" /><div>Məlumat tapılmadı</div>
                      </td>
                    </tr>
                  ) : rows.map(row => (
                    <tr key={row.id} className={getRowClass(row)} style={{ cursor: 'pointer' }} onClick={() => openDetail(row)}>
                      <td style={{ textAlign: 'center', padding: '4px 6px', verticalAlign: 'middle' }}>
                        {row.actType?.name
                          ? <span className="badge" style={{ background: '#1e3a5f', fontSize: '.74rem', whiteSpace: 'normal', lineHeight: 1.2 }}>{row.actType.name}</span>
                          : <span className="text-muted">—</span>}
                      </td>
                      <td style={{ textAlign: 'center', fontWeight: 600, padding: '4px 6px', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>{row.legalActNumber}</td>
                      <td style={{ textAlign: 'center', padding: '4px 6px', verticalAlign: 'middle', whiteSpace: 'nowrap', fontSize: '.74rem' }}>{row.legalActDate?.substring(0, 10)}</td>
                      <td style={{ padding: '4px 6px', verticalAlign: 'middle', fontSize: '.76rem', wordBreak: 'normal' }}>{row.issuedBy?.name ?? '—'}</td>
                      <td style={{ padding: '4px 6px', verticalAlign: 'middle', fontSize: '.76rem', wordBreak: 'break-word' }} title={row.summary ?? ''}>{row.summary ?? '—'}</td>
                      <td style={{ padding: '4px 6px', verticalAlign: 'middle', fontSize: '.76rem', wordBreak: 'break-word' }}>{row.taskDescription ?? '—'}</td>
                      <td style={{ padding: '4px 6px', verticalAlign: 'middle' }}>{renderExecutors(row)}</td>
                      <td style={{ padding: '4px 6px', verticalAlign: 'middle' }}>{renderDepartments(row)}</td>
                      <td style={{ textAlign: 'center', padding: '4px 6px', verticalAlign: 'middle' }}>{renderDeadline(row)}</td>
                      <td style={{ padding: '4px 6px', verticalAlign: 'middle' }}>{renderNote(row)}</td>
                      {canManage() && (
                        <td style={{ textAlign: 'center', padding: '4px 2px', verticalAlign: 'middle', position: 'sticky', right: 0, background: '#fff', boxShadow: '-2px 0 4px rgba(0,0,0,.06)', zIndex: 3 }}
                          onClick={e => e.stopPropagation()}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 3, alignItems: 'center', justifyContent: 'center' }}>
                            <button className="btn btn-sm btn-info" style={{ width: 26, height: 26, padding: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8 }}
                              title="Bax" onClick={() => openDetail(row)}>
                              <i className="bi bi-eye" style={{ fontSize: '.8rem' }} />
                            </button>
                            <button
                              className={`btn btn-sm ${row.proofRequired ? 'btn-dark' : 'btn-outline-secondary'}`}
                              style={{ width: 26, height: 26, padding: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8 }}
                              title={row.proofRequired ? 'Sübut məcburi' : 'Sübut ixtiyari'}
                              onClick={e => handleToggleProof(row.id, e)}>
                              <i className="bi bi-shield-lock" style={{ fontSize: '.8rem' }} />
                            </button>
                            <button className="btn btn-sm btn-warning" style={{ width: 26, height: 26, padding: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8 }}
                              title="Redaktə" onClick={e => openEdit(row, e)}>
                              <i className="bi bi-pencil" style={{ fontSize: '.8rem' }} />
                            </button>
                            <button className="btn btn-sm btn-danger" style={{ width: 26, height: 26, padding: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8 }}
                              title="Sil" onClick={e => handleDelete(row.id, e)}>
                              <i className="bi bi-trash" style={{ fontSize: '.8rem' }} />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="dt-pagination">
                <div className="dt-pagination-info">
                  Səhifə <strong>{page + 1}</strong> / <strong>{totalPages}</strong> ({total} qeyd)
                </div>
                <ul className="pagination pagination-sm mb-0">
                  <li className={`page-item ${page === 0 ? 'disabled' : ''}`}>
                    <button className="page-link" onClick={() => goPage(0)} disabled={page === 0}><i className="bi bi-chevron-double-left" /></button>
                  </li>
                  <li className={`page-item ${page === 0 ? 'disabled' : ''}`}>
                    <button className="page-link" onClick={() => goPage(page - 1)} disabled={page === 0}><i className="bi bi-chevron-left" /></button>
                  </li>
                  {pageNums.map(p => (
                    <li key={p} className={`page-item ${p === page ? 'active' : ''}`}>
                      <button className="page-link" onClick={() => goPage(p)}>{p + 1}</button>
                    </li>
                  ))}
                  <li className={`page-item ${page >= totalPages - 1 ? 'disabled' : ''}`}>
                    <button className="page-link" onClick={() => goPage(page + 1)} disabled={page >= totalPages - 1}><i className="bi bi-chevron-right" /></button>
                  </li>
                  <li className={`page-item ${page >= totalPages - 1 ? 'disabled' : ''}`}>
                    <button className="page-link" onClick={() => goPage(totalPages - 1)} disabled={page >= totalPages - 1}><i className="bi bi-chevron-double-right" /></button>
                  </li>
                </ul>
              </div>
            )}
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
                  {detailAct.issuedBy && <><dt className="col-5 text-muted">Kim qəbul edib</dt><dd className="col-7 mb-0">{detailAct.issuedBy.name}</dd></>}
                  {detailAct.organization && <><dt className="col-5 text-muted">Şöbə</dt><dd className="col-7 mb-0">{detailAct.organization.name}</dd></>}
                  <dt className="col-5 text-muted">Tarix</dt><dd className="col-7 mb-0">{detailAct.legalActDate?.substring(0, 10)}</dd>
                  {detailAct.executionDeadline && (
                    <><dt className="col-5 text-muted">Son tarix</dt>
                    <dd className="col-7 mb-0">
                      <span className={new Date(detailAct.executionDeadline) < new Date() ? 'text-danger fw-semibold' : ''}>
                        {detailAct.executionDeadline.substring(0, 10)}
                      </span>
                    </dd></>
                  )}
                  {detailAct.taskNumber && <><dt className="col-5 text-muted">Qeyd</dt><dd className="col-7 mb-0">{detailAct.taskNumber}</dd></>}
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
                          {l.role === 'main' ? 'Əsas' : 'Digər'}
                        </span>
                        <span>{l.executor?.name}</span>
                        {l.executor?.department?.name && <small className="text-muted">({l.executor.department.name})</small>}
                        {l.taskDescription && <small className="text-muted">— {l.taskDescription}</small>}
                      </div>
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
                    <label className="form-label">Kim qəbul edib *</label>
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
                  <div className="col-md-6">
                    <label className="form-label">Qeyd</label>
                    <textarea className="form-control form-control-sm" rows={2} value={form.taskNumber ?? ''}
                      onChange={e => setForm(p => ({ ...p, taskNumber: e.target.value }))} />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Əlaqəli sənəd nömrəsi</label>
                    <input className="form-control form-control-sm" value={form.relatedDocumentNumber ?? ''}
                      onChange={e => setForm(p => ({ ...p, relatedDocumentNumber: e.target.value }))} />
                  </div>
                  <div className="col-12">
                    <label className="form-label">Qısa məzmun *</label>
                    <textarea className="form-control form-control-sm" rows={2} value={form.summary ?? ''}
                      onChange={e => setForm(p => ({ ...p, summary: e.target.value }))} />
                  </div>
                  <div className="col-12">
                    <label className="form-label">Tapşırıq</label>
                    <textarea className="form-control form-control-sm" rows={2} value={form.taskDescription ?? ''}
                      onChange={e => setForm(p => ({ ...p, taskDescription: e.target.value }))} />
                  </div>
                  <div className="col-12">
                    <div className="form-check form-switch">
                      <input type="checkbox" className="form-check-input" id="proofRequired"
                        checked={!!form.proofRequired}
                        onChange={e => setForm(p => ({ ...p, proofRequired: e.target.checked }))} />
                      <label className="form-check-label" htmlFor="proofRequired">
                        <i className="bi bi-shield-lock me-1" />Sübut sənəd məcburidir
                      </label>
                    </div>
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
                            <option value="helper">Digər</option>
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
                  {saving ? <span className="spinner-border spinner-border-sm me-1" /> : <i className="bi bi-save me-1" />}
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
