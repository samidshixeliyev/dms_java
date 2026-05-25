import { useState, useEffect, useCallback } from 'react'
import DataTable from '../components/DataTable'
import client from '../api/client'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'
import ReactDatePicker from 'react-datepicker'
import Select from 'react-select'
import type { LegalAct, ActType, IssuingAuthority, Department, Executor, PageResponse } from '../types'
import { format } from 'date-fns'

const selectStyles = {
  control: (base: object) => ({ ...base, borderColor: '#dee2e6', minHeight: 38, fontSize: '0.875rem' }),
}

export default function LegalActs() {
  const { canManage, isAdmin } = useAuth()
  const [showModal, setShowModal] = useState(false)
  const [editItem, setEditItem] = useState<LegalAct | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  const [actTypes, setActTypes]     = useState<ActType[]>([])
  const [authorities, setAuth]      = useState<IssuingAuthority[]>([])
  const [departments, setDepts]     = useState<Department[]>([])
  const [executors, setExecutors]   = useState<Executor[]>([])

  const [form, setForm] = useState<Record<string, any>>({})
  const [executorLinks, setExecutorLinks] = useState<{ executorId: string; role: string; taskDescription: string }[]>([])
  const [saving, setSaving] = useState(false)

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

  const fetchData = useCallback(async (page: number, size: number, search: string): Promise<PageResponse<LegalAct>> => {
    const res = await client.get('/legal-acts', { params: { page, size, search } })
    return res.data.data
  }, [])

  const openCreate = () => { setEditItem(null); setForm({}); setExecutorLinks([]); setShowModal(true) }
  const openEdit = (item: LegalAct) => {
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
      executorId: l.id.executorId.toString(),
      role: l.role,
      taskDescription: l.taskDescription ?? '',
    })) ?? [])
    setShowModal(true)
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Silmək istədiyinizə əminsiniz?')) return
    await client.delete(`/legal-acts/${id}`)
    toast.success('Silindi')
    setRefreshKey(k => k + 1)
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

  const addExecutorLink = () => setExecutorLinks(p => [...p, { executorId: '', role: 'main', taskDescription: '' }])
  const removeExecutorLink = (i: number) => setExecutorLinks(p => p.filter((_, idx) => idx !== i))
  const updateExecutorLink = (i: number, key: string, val: string) =>
    setExecutorLinks(p => p.map((e, idx) => idx === i ? { ...e, [key]: val } : e))

  const getRowClass = (row: LegalAct) => {
    const latestLog = row.statusLogs?.[0]
    const isExecuted = latestLog?.approvalStatus === 'approved' &&
      latestLog?.executionNote?.note?.includes('İcra olunub')
    if (isExecuted) return 'row-executed'
    if (row.executionDeadline && new Date(row.executionDeadline) < new Date()) return 'row-overdue'
    return ''
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
    {
      header: 'Status',
      render: (row: LegalAct) => {
        const log = row.statusLogs?.[0]
        if (!log) return <span className="badge bg-secondary">Başlanmayıb</span>
        if (log.approvalStatus === 'approved') return <span className="badge badge-executed">İcra olunub</span>
        if (log.approvalStatus === 'pending') return <span className="badge badge-pending">Gözləmədə</span>
        if (log.approvalStatus === 'rejected') return <span className="badge badge-rejected">Rədd edilib</span>
        return <span className="badge bg-info">Davam edir</span>
      },
    },
    ...(canManage() ? [{
      header: '',
      render: (row: LegalAct) => (
        <div className="d-flex gap-1" onClick={e => e.stopPropagation()}>
          <button className="btn btn-xs btn-outline-primary py-0 px-1" onClick={() => openEdit(row)}>
            <i className="bi bi-pencil" />
          </button>
          <button className="btn btn-xs btn-outline-danger py-0 px-1" onClick={() => handleDelete(row.id)}>
            <i className="bi bi-trash" />
          </button>
        </div>
      ),
    }] : []),
  ]

  return (
    <>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h5 className="mb-0 fw-bold" style={{ color: 'var(--primary)' }}>
          <i className="bi bi-file-earmark-text me-2" />Hüquqi Aktlar
        </h5>
        {canManage() && (
          <button className="btn btn-primary btn-sm" onClick={openCreate}>
            <i className="bi bi-plus-lg me-1" />Yeni Akt
          </button>
        )}
      </div>

      <div className="card">
        <div className="card-body">
          <DataTable columns={columns} fetchData={fetchData} rowClassName={getRowClass} refreshKey={refreshKey} />
        </div>
      </div>

      {/* Modal */}
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
                    <Select
                      styles={selectStyles}
                      options={departments.map(d => ({ value: d.id, label: d.name }))}
                      value={departments.filter(d => d.id === form.organizationId).map(d => ({ value: d.id, label: d.name }))[0] ?? null}
                      onChange={opt => setForm(p => ({ ...p, organizationId: opt?.value }))}
                      placeholder="Şöbə seçin..."
                      isClearable
                    />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label">Akt növü *</label>
                    <Select
                      styles={selectStyles}
                      options={actTypes.map(a => ({ value: a.id, label: a.name }))}
                      value={actTypes.filter(a => a.id === form.actTypeId).map(a => ({ value: a.id, label: a.name }))[0] ?? null}
                      onChange={opt => setForm(p => ({ ...p, actTypeId: opt?.value }))}
                      placeholder="Növ seçin..."
                    />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label">Göndərən qurum *</label>
                    <Select
                      styles={selectStyles}
                      options={authorities.map(a => ({ value: a.id, label: a.name }))}
                      value={authorities.filter(a => a.id === form.issuedById).map(a => ({ value: a.id, label: a.name }))[0] ?? null}
                      onChange={opt => setForm(p => ({ ...p, issuedById: opt?.value }))}
                      placeholder="Qurum seçin..."
                    />
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

                  {/* Executors */}
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
                          <Select
                            styles={selectStyles}
                            options={executors.map(e => ({ value: e.id.toString(), label: e.name }))}
                            value={executors.filter(e => e.id.toString() === link.executorId).map(e => ({ value: e.id.toString(), label: e.name }))[0] ?? null}
                            onChange={opt => updateExecutorLink(i, 'executorId', opt?.value ?? '')}
                            placeholder="İcraçı seçin..."
                          />
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
