import { useState, useEffect, useCallback, useRef } from 'react'
import client from '../api/client'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'
import Select from 'react-select'
import type { LegalAct, ActType, IssuingAuthority, Department, Executor } from '../types'

const PAGE_SIZE = 25

const sel = {
  control: (b: object) => ({ ...b, borderColor: '#dee2e6', minHeight: 32, fontSize: '0.81rem', boxShadow: 'none' }),
  menu:    (b: object) => ({ ...b, fontSize: '0.81rem', zIndex: 9999 }),
}

async function downloadBlob(url: string, filename: string) {
  try {
    const res = await client.get(url, { responseType: 'blob' })
    const href = URL.createObjectURL(res.data)
    const a = Object.assign(document.createElement('a'), { href, download: filename })
    document.body.appendChild(a); a.click(); document.body.removeChild(a)
    URL.revokeObjectURL(href)
  } catch { toast.error('Yükləmə xətası') }
}

const TH = ({ children, center, style }: { children?: React.ReactNode; center?: boolean; style?: React.CSSProperties }) => (
  <th style={{
    background: '#1e3a5f', color: '#fff', fontWeight: 700, fontSize: '.72rem',
    padding: '7px 8px', border: '1px solid rgba(255,255,255,.12)',
    whiteSpace: 'nowrap', verticalAlign: 'middle',
    textAlign: center ? 'center' : 'left', ...style,
  }}>{children}</th>
)

export default function LegalActs() {
  const { canManage } = useAuth()
  const [showModal, setShowModal] = useState(false)
  const [editItem, setEditItem] = useState<LegalAct | null>(null)
  const [detailAct, setDetailAct] = useState<LegalAct | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  const [actTypes, setActTypes]     = useState<ActType[]>([])
  const [authorities, setAuth]      = useState<IssuingAuthority[]>([])
  const [departments, setDepts]     = useState<Department[]>([])
  const [executors, setExecutors]   = useState<Executor[]>([])
  const [form, setForm]             = useState<Record<string, any>>({})
  const [executorLinks, setExLinks] = useState<{ executorId: string; role: string; taskDescription: string }[]>([])
  const [saving, setSaving]         = useState(false)

  const [rows, setRows]             = useState<LegalAct[]>([])
  const [total, setTotal]           = useState(0)
  const [page, setPage]             = useState(0)
  const [loadingTable, setLoading]  = useState(false)

  const [orgId, setOrgId]                     = useState<number | null>(null)
  const [search, setSearch]                   = useState('')
  const [filterActType, setFilterActType]     = useState<number | null>(null)
  const [filterIssuedBy, setFilterIssuedBy]   = useState<number | null>(null)
  const [filterExecutor, setFilterExecutor]   = useState<number | null>(null)
  const [filterDeadline, setFilterDeadline]   = useState('')
  const [showFilters, setShowFilters]         = useState(false)
  const [activeFilters, setActiveFilters]     = useState<Record<string, any>>({})

  const activeFiltersRef = useRef(activeFilters)
  const orgIdRef         = useRef(orgId)
  useEffect(() => { activeFiltersRef.current = activeFilters }, [activeFilters])
  useEffect(() => { orgIdRef.current = orgId },               [orgId])

  const assignableDepts = departments.filter(d => d.canAssign)
  const totalPages      = Math.ceil(total / PAGE_SIZE)

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
    setLoading(true)
    try {
      const params: any = { page: p, size: PAGE_SIZE, ...activeFiltersRef.current }
      if (orgIdRef.current) params.orgId = orgIdRef.current
      const res   = await client.get('/legal-acts', { params })
      const pdata = res.data.data
      setRows(pdata.data)
      setTotal(pdata.total)
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { setPage(0); loadTable(0) }, [refreshKey])

  const goPage = (p: number) => { setPage(p); loadTable(p) }

  const applyFilters = () => {
    setActiveFilters({
      search, actTypeId: filterActType, issuedById: filterIssuedBy,
      executorId: filterExecutor, deadlineStatus: filterDeadline || undefined,
    })
    setRefreshKey(k => k + 1)
  }

  const clearFilters = () => {
    setSearch(''); setFilterActType(null); setFilterIssuedBy(null)
    setFilterExecutor(null); setFilterDeadline('')
    setActiveFilters({})
    setRefreshKey(k => k + 1)
  }

  const openCreate = () => { setEditItem(null); setForm({}); setExLinks([]); setShowModal(true) }
  const openEdit   = (item: LegalAct, e: React.MouseEvent) => {
    e.stopPropagation()
    setEditItem(item)
    setForm({
      organizationId: item.organizationId, actTypeId: item.actTypeId, issuedById: item.issuedById,
      legalActNumber: item.legalActNumber, legalActDate: item.legalActDate,
      summary: item.summary, taskNumber: item.taskNumber, taskDescription: item.taskDescription,
      executionDeadline: item.executionDeadline, relatedDocumentNumber: item.relatedDocumentNumber,
      relatedDocumentDate: item.relatedDocumentDate, proofRequired: item.proofRequired,
    })
    setExLinks(item.executorLinks?.map(l => ({
      executorId: (l.executorId ?? l.executor?.id ?? '').toString(),
      role: l.role, taskDescription: l.taskDescription ?? '',
    })) ?? [])
    setShowModal(true)
  }

  const openDetail = async (item: LegalAct) => {
    try {
      const res = await client.get(`/legal-acts/${item.id}`)
      setDetailAct(res.data.data)
    } catch { toast.error('Məlumat yüklənmədi') }
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
      setShowModal(false); setRefreshKey(k => k + 1)
    } finally { setSaving(false) }
  }

  const exportExcel = () => {
    const p = new URLSearchParams()
    if (orgId) p.set('orgId', String(orgId))
    if (activeFilters.search) p.set('search', activeFilters.search)
    if (activeFilters.actTypeId) p.set('actTypeId', String(activeFilters.actTypeId))
    if (activeFilters.issuedById) p.set('issuedById', String(activeFilters.issuedById))
    if (activeFilters.executorId) p.set('executorId', String(activeFilters.executorId))
    if (activeFilters.deadlineStatus) p.set('deadlineStatus', activeFilters.deadlineStatus)
    downloadBlob(`/api/legal-acts/export-excel?${p}`, 'huquqi-aktlar.xlsx')
  }

  const addExLink    = () => setExLinks(p => [...p, { executorId: '', role: 'main', taskDescription: '' }])
  const removeExLink = (i: number) => setExLinks(p => p.filter((_, idx) => idx !== i))
  const updateExLink = (i: number, key: string, val: string) =>
    setExLinks(p => p.map((e, idx) => idx === i ? { ...e, [key]: val } : e))

  const getRowClass = (row: LegalAct) => {
    const log = row.statusLogs?.[0]
    if (log?.approvalStatus === 'approved') return 'row-executed'
    if (log?.approvalStatus === 'rejected') return 'row-overdue'
    if (log?.approvalStatus === 'partial')  return 'row-partial'
    if (log?.approvalStatus === 'pending')  return 'row-pending'
    if (row.executionDeadline && new Date(row.executionDeadline) < new Date()) return 'row-overdue'
    return ''
  }

  const renderStatus = (row: LegalAct) => {
    const log = row.statusLogs?.[0]
    if (!log) {
      if (row.executionDeadline && new Date(row.executionDeadline) < new Date())
        return <span className="badge badge-rejected">Vaxtı keçmiş</span>
      return <span className="badge bg-secondary">Başlanmayıb</span>
    }
    if (log.approvalStatus === 'approved') return <span className="badge badge-executed">İcra olunub</span>
    if (log.approvalStatus === 'pending')  return <span className="badge badge-pending">Gözləmədə</span>
    if (log.approvalStatus === 'rejected') return <span className="badge badge-rejected">Rədd edilib</span>
    return <span className="badge bg-info">Qeyd var</span>
  }

  const delta    = 2
  const pageNums: number[] = []
  for (let i = Math.max(0, page - delta); i <= Math.min(totalPages - 1, page + delta); i++) pageNums.push(i)

  const colCount = canManage() ? 11 : 10

  return (
    <>
      {/* ── Header ── */}
      <div className="page-header">
        <div className="page-title"><i className="bi bi-file-earmark-text" />Hüquqi Aktlar</div>
        {canManage() && (
          <div className="d-flex gap-2">
            <button className="btn btn-outline-success btn-sm" onClick={exportExcel}>
              <i className="bi bi-file-earmark-excel" />Excel
            </button>
            <button className="btn btn-primary btn-sm" onClick={openCreate}>
              <i className="bi bi-plus-lg" />Yeni Akt
            </button>
          </div>
        )}
      </div>

      {/* ── Org tabs ── */}
      {assignableDepts.length > 1 && (
        <div className="org-tabs mb-2">
          <button
            className={`org-tab${orgId === null ? ' active' : ''}`}
            onClick={() => { setOrgId(null); setRefreshKey(k => k + 1) }}>
            Hamısı
          </button>
          {assignableDepts.map(d => (
            <button key={d.id}
              className={`org-tab${orgId === d.id ? ' active' : ''}`}
              onClick={() => { setOrgId(d.id); setRefreshKey(k => k + 1) }}>
              {d.name}
            </button>
          ))}
        </div>
      )}

      {/* ── Filter bar ── */}
      <div className="card mb-2" style={{ borderRadius: 10 }}>
        <div className="card-body" style={{ padding: '10px 14px' }}>
          <div className="d-flex align-items-center gap-2 flex-wrap">
            <div style={{ position: 'relative', flex: '0 0 auto' }}>
              <i className="bi bi-search" style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '.8rem', pointerEvents: 'none' }} />
              <input
                style={{ paddingLeft: 28, borderRadius: 7, border: '1.5px solid #dee2e6', height: 32, fontSize: '.81rem', fontFamily: 'inherit', outline: 'none', width: 200 }}
                placeholder="Axtar..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && applyFilters()}
              />
            </div>
            <button className="btn btn-sm" style={{ background: '#1e3a5f', color: '#fff', height: 32, padding: '0 12px', fontSize: '.8rem' }} onClick={applyFilters}>
              <i className="bi bi-search me-1" />Axtar
            </button>
            <button className="btn btn-sm btn-outline-secondary" style={{ height: 32, padding: '0 10px', fontSize: '.8rem' }} onClick={() => setShowFilters(f => !f)}>
              <i className={`bi bi-funnel${showFilters ? '-fill' : ''} me-1`} />{showFilters ? 'Gizlət' : 'Filtrlər'}
            </button>
            {Object.values(activeFilters).some(Boolean) && (
              <button className="btn btn-sm btn-outline-danger" style={{ height: 32, padding: '0 10px', fontSize: '.8rem' }} onClick={clearFilters}>
                <i className="bi bi-x-circle me-1" />Sıfırla
              </button>
            )}
            <span style={{ marginLeft: 'auto', fontSize: '.75rem', color: '#94a3b8', fontWeight: 600 }}>
              {total} qeyd
            </span>
          </div>

          {showFilters && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '8px', marginTop: 10 }}>
              <Select styles={sel}
                options={actTypes.map(a => ({ value: a.id, label: a.name }))}
                value={actTypes.filter(a => a.id === filterActType).map(a => ({ value: a.id, label: a.name }))[0] ?? null}
                onChange={opt => setFilterActType(opt?.value ?? null)}
                placeholder="Akt növü..." isClearable />
              <Select styles={sel}
                options={authorities.map(a => ({ value: a.id, label: a.name }))}
                value={authorities.filter(a => a.id === filterIssuedBy).map(a => ({ value: a.id, label: a.name }))[0] ?? null}
                onChange={opt => setFilterIssuedBy(opt?.value ?? null)}
                placeholder="Kim qəbul edib..." isClearable />
              <Select styles={sel}
                options={executors.map(e => ({ value: e.id, label: e.name }))}
                value={executors.filter(e => e.id === filterExecutor).map(e => ({ value: e.id, label: e.name }))[0] ?? null}
                onChange={opt => setFilterExecutor(opt?.value ?? null)}
                placeholder="İcraçı..." isClearable />
              <select style={{ height: 32, borderRadius: 7, border: '1.5px solid #dee2e6', fontSize: '.81rem', padding: '0 8px', fontFamily: 'inherit' }}
                value={filterDeadline} onChange={e => setFilterDeadline(e.target.value)}>
                <option value="">Son tarix (hamısı)</option>
                <option value="overdue">Vaxtı keçmiş</option>
                <option value="due_soon">Yaxın 7 gün</option>
              </select>
            </div>
          )}
        </div>
      </div>

      {/* ── Main content ── */}
      <div className="row g-3">
        <div className={detailAct ? 'col-md-7' : 'col-12'}>
          <div className="card p-0">
            <div style={{ overflowX: 'auto' }}>
              <table className="table table-hover table-bordered mb-0"
                style={{ minWidth: detailAct ? 700 : 920, fontSize: '.78rem', tableLayout: 'fixed', width: '100%' }}>
                <colgroup>
                  <col style={{ width: 32 }} />
                  <col style={{ width: 82 }} />
                  <col style={{ width: 100 }} />
                  <col style={{ width: 120 }} />
                  <col />
                  <col />
                  <col style={{ width: detailAct ? 120 : 155 }} />
                  <col style={{ width: 82 }} />
                  <col style={{ width: 95 }} />
                  <col style={{ width: 100 }} />
                  {canManage() && <col style={{ width: 36 }} />}
                </colgroup>
                <thead>
                  <tr>
                    <TH center>#</TH>
                    <TH>Növü</TH>
                    <TH center>Nömrə / Tarix</TH>
                    <TH>Kim qəbul edib</TH>
                    <TH>Qısa məzmun</TH>
                    <TH>Tapşırıq</TH>
                    <TH>İcraçı / Bölmə</TH>
                    <TH center>Son tarix</TH>
                    <TH center>Status</TH>
                    <TH>Qeyd</TH>
                    {canManage() && <TH center style={{ background: '#374151' }} />}
                  </tr>
                </thead>
                <tbody>
                  {loadingTable ? (
                    <tr><td colSpan={colCount} className="text-center py-5">
                      <div className="spinner-border text-secondary" style={{ width: '1.2rem', height: '1.2rem' }} />
                    </td></tr>
                  ) : rows.length === 0 ? (
                    <tr><td colSpan={colCount} className="dt-empty">
                      <i className="bi bi-inbox dt-empty-icon" /><div>Məlumat tapılmadı</div>
                    </td></tr>
                  ) : rows.map((row, ri) => (
                    <tr key={row.id} className={getRowClass(row)} style={{ cursor: 'pointer' }} onClick={() => openDetail(row)}>
                      {/* # */}
                      <td style={{ textAlign: 'center', color: '#94a3b8', fontSize: '.7rem', fontWeight: 600, padding: '5px 4px', verticalAlign: 'middle' }}>
                        {page * PAGE_SIZE + ri + 1}
                      </td>
                      {/* Type */}
                      <td style={{ padding: '5px 6px', verticalAlign: 'middle', textAlign: 'center' }}>
                        {row.actType?.name
                          ? <span className="badge" style={{ background: '#1e3a5f', fontSize: '.68rem', whiteSpace: 'normal', lineHeight: 1.25 }}>{row.actType.name}</span>
                          : <span className="text-muted">—</span>}
                      </td>
                      {/* Number / Date */}
                      <td style={{ padding: '5px 6px', verticalAlign: 'middle', textAlign: 'center' }}>
                        <div style={{ fontWeight: 700, fontSize: '.78rem', color: '#1e3a5f' }}>{row.legalActNumber}</div>
                        <div style={{ fontSize: '.68rem', color: '#94a3b8', marginTop: 1 }}>{row.legalActDate?.substring(0, 10)}</div>
                      </td>
                      {/* Issued By */}
                      <td style={{ padding: '5px 6px', verticalAlign: 'middle', fontSize: '.75rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {row.issuedBy?.name ?? '—'}
                      </td>
                      {/* Summary */}
                      <td style={{ padding: '5px 6px', verticalAlign: 'middle', fontSize: '.75rem', overflow: 'hidden' }}
                        title={row.summary ?? ''}>
                        <div style={{ overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                          {row.summary ?? '—'}
                        </div>
                      </td>
                      {/* Task */}
                      <td style={{ padding: '5px 6px', verticalAlign: 'middle', fontSize: '.75rem', overflow: 'hidden' }}>
                        <div style={{ overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                          {row.taskDescription ?? '—'}
                        </div>
                      </td>
                      {/* Executor / Dept */}
                      <td style={{ padding: '5px 6px', verticalAlign: 'middle' }}>
                        {row.executorLinks?.length ? row.executorLinks.map(l => (
                          <div key={l.id} style={{ fontSize: '.72rem', lineHeight: 1.35 }}>
                            <span style={{ fontWeight: 600, color: l.role === 'main' ? '#1e3a5f' : '#64748b' }}>
                              {l.role === 'main' ? '● ' : '○ '}{l.executor?.name ?? '—'}
                            </span>
                            {l.executor?.department?.name && (
                              <div style={{ color: '#94a3b8', fontSize: '.67rem' }}>{l.executor.department.name}</div>
                            )}
                          </div>
                        )) : <span className="text-muted">—</span>}
                      </td>
                      {/* Deadline */}
                      <td style={{ padding: '5px 6px', verticalAlign: 'middle', textAlign: 'center' }}>
                        {row.executionDeadline ? (() => {
                          const over = new Date(row.executionDeadline) < new Date()
                          return <span style={{ fontSize: '.72rem', fontWeight: over ? 700 : 400, color: over ? '#dc2626' : '#374151', whiteSpace: 'nowrap' }}>
                            {row.executionDeadline.substring(0, 10)}
                          </span>
                        })() : <span className="text-muted">—</span>}
                      </td>
                      {/* Status */}
                      <td style={{ padding: '5px 6px', verticalAlign: 'middle', textAlign: 'center' }}>
                        {renderStatus(row)}
                      </td>
                      {/* Note */}
                      <td style={{ padding: '5px 6px', verticalAlign: 'middle', fontSize: '.72rem', overflow: 'hidden' }}>
                        {(() => {
                          const log = row.statusLogs?.[0]
                          const parts: string[] = []
                          if (log?.executionNote?.note) parts.push(log.executionNote.note)
                          if (row.taskNumber) parts.push(row.taskNumber)
                          return parts.length ? <span style={{ color: '#475569' }}>{parts.join(' / ')}</span> : <span className="text-muted">—</span>
                        })()}
                      </td>
                      {/* Actions */}
                      {canManage() && (
                        <td style={{ padding: '4px 2px', verticalAlign: 'middle', textAlign: 'center', position: 'sticky', right: 0, background: 'inherit', boxShadow: '-2px 0 5px rgba(0,0,0,.06)', zIndex: 2 }}
                          onClick={e => e.stopPropagation()}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'center' }}>
                            <button className="btn btn-icon btn-info" title="Bax" onClick={() => openDetail(row)}>
                              <i className="bi bi-eye" style={{ fontSize: '.75rem' }} />
                            </button>
                            <button
                              className={`btn btn-icon ${row.proofRequired ? 'btn-dark' : 'btn-outline-secondary'}`}
                              title={row.proofRequired ? 'Sübut məcburi' : 'Sübut ixtiyari'}
                              onClick={e => handleToggleProof(row.id, e)}>
                              <i className="bi bi-shield-lock" style={{ fontSize: '.75rem' }} />
                            </button>
                            <button className="btn btn-icon btn-warning" title="Redaktə" onClick={e => openEdit(row, e)}>
                              <i className="bi bi-pencil" style={{ fontSize: '.75rem' }} />
                            </button>
                            <button className="btn btn-icon btn-danger" title="Sil" onClick={e => handleDelete(row.id, e)}>
                              <i className="bi bi-trash" style={{ fontSize: '.75rem' }} />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="dt-pagination">
                <div className="dt-pagination-info">Səhifə <strong>{page + 1}</strong> / <strong>{totalPages}</strong></div>
                <ul className="pagination pagination-sm mb-0">
                  <li className={`page-item ${page === 0 ? 'disabled' : ''}`}>
                    <button className="page-link" onClick={() => goPage(0)}><i className="bi bi-chevron-double-left" /></button>
                  </li>
                  <li className={`page-item ${page === 0 ? 'disabled' : ''}`}>
                    <button className="page-link" onClick={() => goPage(page - 1)}><i className="bi bi-chevron-left" /></button>
                  </li>
                  {pageNums.map(p => (
                    <li key={p} className={`page-item ${p === page ? 'active' : ''}`}>
                      <button className="page-link" onClick={() => goPage(p)}>{p + 1}</button>
                    </li>
                  ))}
                  <li className={`page-item ${page >= totalPages - 1 ? 'disabled' : ''}`}>
                    <button className="page-link" onClick={() => goPage(page + 1)}><i className="bi bi-chevron-right" /></button>
                  </li>
                  <li className={`page-item ${page >= totalPages - 1 ? 'disabled' : ''}`}>
                    <button className="page-link" onClick={() => goPage(totalPages - 1)}><i className="bi bi-chevron-double-right" /></button>
                  </li>
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* ── Detail panel ── */}
        {detailAct && (
          <div className="col-md-5">
            <div className="card" style={{ position: 'sticky', top: 72 }}>
              <div className="card-header" style={{ background: '#1e3a5f', color: '#fff', padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: 700, fontSize: '.88rem' }}>
                  <i className="bi bi-file-earmark-text me-2" />#{detailAct.legalActNumber}
                </span>
                <button style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '1rem', padding: 0 }}
                  onClick={() => setDetailAct(null)}>
                  <i className="bi bi-x-lg" />
                </button>
              </div>
              <div className="card-body" style={{ overflowY: 'auto', maxHeight: 'calc(100vh - 200px)', padding: '14px 16px', fontSize: '.83rem' }}>

                {/* Meta grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px', marginBottom: 14 }}>
                  {detailAct.actType && (
                    <div>
                      <div style={{ fontSize: '.68rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.6px', marginBottom: 2 }}>Növ</div>
                      <div style={{ fontWeight: 600, color: '#1e3a5f' }}>{detailAct.actType.name}</div>
                    </div>
                  )}
                  {detailAct.issuedBy && (
                    <div>
                      <div style={{ fontSize: '.68rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.6px', marginBottom: 2 }}>Kim qəbul edib</div>
                      <div style={{ fontWeight: 500 }}>{detailAct.issuedBy.name}</div>
                    </div>
                  )}
                  {detailAct.organization && (
                    <div>
                      <div style={{ fontSize: '.68rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.6px', marginBottom: 2 }}>Şöbə</div>
                      <div>{detailAct.organization.name}</div>
                    </div>
                  )}
                  <div>
                    <div style={{ fontSize: '.68rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.6px', marginBottom: 2 }}>Tarix</div>
                    <div>{detailAct.legalActDate?.substring(0, 10)}</div>
                  </div>
                  {detailAct.executionDeadline && (
                    <div>
                      <div style={{ fontSize: '.68rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.6px', marginBottom: 2 }}>Son tarix</div>
                      <div style={{ fontWeight: 600, color: new Date(detailAct.executionDeadline) < new Date() ? '#dc2626' : '#1e3a5f' }}>
                        {detailAct.executionDeadline.substring(0, 10)}
                      </div>
                    </div>
                  )}
                  <div>
                    <div style={{ fontSize: '.68rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.6px', marginBottom: 2 }}>Sübut tələbi</div>
                    <div>{detailAct.proofRequired
                      ? <span className="badge badge-pending">Tələb olunur</span>
                      : <span className="badge bg-secondary">Tələb yoxdur</span>}</div>
                  </div>
                </div>

                {detailAct.summary && (
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: '.68rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.6px', marginBottom: 4 }}>Qısa məzmun</div>
                    <div style={{ whiteSpace: 'pre-wrap', background: '#f8fafc', borderRadius: 8, padding: '8px 10px', fontSize: '.81rem', color: '#374151' }}>{detailAct.summary}</div>
                  </div>
                )}
                {detailAct.taskDescription && (
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: '.68rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.6px', marginBottom: 4 }}>Tapşırıq məzmunu</div>
                    <div style={{ whiteSpace: 'pre-wrap', background: '#f8fafc', borderRadius: 8, padding: '8px 10px', fontSize: '.81rem', color: '#374151' }}>{detailAct.taskDescription}</div>
                  </div>
                )}

                {detailAct.executorLinks && detailAct.executorLinks.length > 0 && (
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: '.68rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.6px', marginBottom: 6 }}>İcraçılar</div>
                    {detailAct.executorLinks.map(l => (
                      <div key={l.id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span className={`badge ${l.role === 'main' ? 'bg-primary' : 'bg-secondary'}`} style={{ fontSize: '.65rem' }}>
                          {l.role === 'main' ? 'Əsas' : 'Digər'}
                        </span>
                        <span style={{ fontWeight: 500 }}>{l.executor?.name}</span>
                        {l.executor?.department?.name && (
                          <span style={{ fontSize: '.72rem', color: '#94a3b8' }}>· {l.executor.department.name}</span>
                        )}
                        {l.taskDescription && (
                          <span style={{ fontSize: '.72rem', color: '#64748b', fontStyle: 'italic' }}>— {l.taskDescription}</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                <div style={{ fontSize: '.68rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.6px', marginBottom: 8 }}>İcra Tarixi</div>
                <div className="timeline">
                  {detailAct.statusLogs?.map(log => (
                    <div className="timeline-item" key={log.id}>
                      <div className={`timeline-dot ${log.approvalStatus ?? ''}`} />
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '.81rem' }}>{log.executionNote?.note}</div>
                        {log.customNote && <div style={{ color: '#64748b', fontStyle: 'italic', fontSize: '.78rem' }}>{log.customNote}</div>}
                        <div style={{ fontSize: '.69rem', color: '#94a3b8', marginTop: 1 }}>
                          {log.user ? `${log.user.name ?? ''} ${log.user.surname ?? ''}`.trim() : ''}
                          {' · '}{new Date(log.createdAt).toLocaleString('az')}
                        </div>
                        {log.approvalStatus && (
                          <span className={`badge badge-${log.approvalStatus} mt-1`} style={{ fontSize: '.65rem' }}>
                            {log.approvalStatus === 'approved' ? 'Təsdiqləndi' :
                             log.approvalStatus === 'rejected' ? 'Rədd edildi' :
                             log.approvalStatus === 'pending'  ? 'Gözləmədə' : log.approvalStatus}
                          </span>
                        )}
                        {log.approvalNote && <div style={{ fontSize: '.75rem', color: '#64748b', fontStyle: 'italic', marginTop: 2 }}>{log.approvalNote}</div>}
                        {log.attachments && log.attachments.length > 0 && (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
                            {log.attachments.map(att => (
                              <button key={att.id}
                                onClick={() => downloadBlob(`/api/executor/attachments/${att.id}/download`, att.originalName)}
                                style={{ background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 6, padding: '2px 8px', cursor: 'pointer', fontSize: '.69rem', color: '#475569', display: 'flex', alignItems: 'center', gap: 4 }}>
                                <i className="bi bi-paperclip" />{att.originalName}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  {!detailAct.statusLogs?.length && <p style={{ color: '#94a3b8', fontSize: '.8rem' }}>Heç bir qeyd yoxdur</p>}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Create/Edit Modal ── */}
      {showModal && (
        <div className="modal show d-block" style={{ background: 'rgba(0,0,0,.5)' }}>
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
                    <Select styles={sel}
                      options={departments.map(d => ({ value: d.id, label: d.name }))}
                      value={departments.filter(d => d.id === form.organizationId).map(d => ({ value: d.id, label: d.name }))[0] ?? null}
                      onChange={opt => setForm(p => ({ ...p, organizationId: opt?.value }))}
                      placeholder="Şöbə seçin..." isClearable />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label">Akt növü *</label>
                    <Select styles={sel}
                      options={actTypes.map(a => ({ value: a.id, label: a.name }))}
                      value={actTypes.filter(a => a.id === form.actTypeId).map(a => ({ value: a.id, label: a.name }))[0] ?? null}
                      onChange={opt => setForm(p => ({ ...p, actTypeId: opt?.value }))}
                      placeholder="Növ seçin..." />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label">Kim qəbul edib *</label>
                    <Select styles={sel}
                      options={authorities.map(a => ({ value: a.id, label: a.name }))}
                      value={authorities.filter(a => a.id === form.issuedById).map(a => ({ value: a.id, label: a.name }))[0] ?? null}
                      onChange={opt => setForm(p => ({ ...p, issuedById: opt?.value }))}
                      placeholder="Qurum seçin..." />
                  </div>
                  <div className="col-md-3">
                    <label className="form-label">Akt nömrəsi *</label>
                    <input className="form-control form-control-sm" value={form.legalActNumber ?? ''}
                      onChange={e => setForm(p => ({ ...p, legalActNumber: e.target.value }))} />
                  </div>
                  <div className="col-md-3">
                    <label className="form-label">Akt tarixi *</label>
                    <input type="date" className="form-control form-control-sm" value={form.legalActDate ?? ''}
                      onChange={e => setForm(p => ({ ...p, legalActDate: e.target.value }))} />
                  </div>
                  <div className="col-md-3">
                    <label className="form-label">İcra müddəti</label>
                    <input type="date" className="form-control form-control-sm" value={form.executionDeadline ?? ''}
                      onChange={e => setForm(p => ({ ...p, executionDeadline: e.target.value }))} />
                  </div>
                  <div className="col-md-3">
                    <label className="form-label">Əlaqəli sənəd nömrəsi</label>
                    <input className="form-control form-control-sm" value={form.relatedDocumentNumber ?? ''}
                      onChange={e => setForm(p => ({ ...p, relatedDocumentNumber: e.target.value }))} />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Qısa məzmun *</label>
                    <textarea className="form-control form-control-sm" rows={2} value={form.summary ?? ''}
                      onChange={e => setForm(p => ({ ...p, summary: e.target.value }))} />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Qeyd</label>
                    <textarea className="form-control form-control-sm" rows={2} value={form.taskNumber ?? ''}
                      onChange={e => setForm(p => ({ ...p, taskNumber: e.target.value }))} />
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

                  {/* Executor links */}
                  <div className="col-12">
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <label className="form-label mb-0">İcraçılar</label>
                      <button type="button" className="btn btn-sm btn-outline-primary" onClick={addExLink}>
                        <i className="bi bi-plus" />Əlavə et
                      </button>
                    </div>
                    {executorLinks.map((link, i) => (
                      <div key={i} className="row g-2 mb-2 align-items-center">
                        <div className="col-md-5">
                          <Select styles={sel}
                            options={executors.map(e => ({ value: e.id.toString(), label: e.name }))}
                            value={executors.filter(e => e.id.toString() === link.executorId).map(e => ({ value: e.id.toString(), label: e.name }))[0] ?? null}
                            onChange={opt => updateExLink(i, 'executorId', opt?.value ?? '')}
                            placeholder="İcraçı seçin..." />
                        </div>
                        <div className="col-md-2">
                          <select className="form-select form-select-sm" value={link.role}
                            onChange={e => updateExLink(i, 'role', e.target.value)}>
                            <option value="main">Əsas</option>
                            <option value="helper">Digər</option>
                          </select>
                        </div>
                        <div className="col-md-4">
                          <input className="form-control form-control-sm" placeholder="Xüsusi tapşırıq..."
                            value={link.taskDescription}
                            onChange={e => updateExLink(i, 'taskDescription', e.target.value)} />
                        </div>
                        <div className="col-md-1">
                          <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => removeExLink(i)}>
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
