import { useState, useCallback, useEffect } from 'react'
import DataTable from '../components/DataTable'
import client from '../api/client'
import toast from 'react-hot-toast'
import Select from 'react-select'
import type { Department, PageResponse } from '../types'

const selectStyles = { control: (b: object) => ({ ...b, borderColor: '#dee2e6', minHeight: 34, fontSize: '0.875rem' }) }

export default function Departments() {
  const [refreshKey, setRefreshKey] = useState(0)
  const [showModal, setShowModal] = useState(false)
  const [editItem, setEditItem] = useState<Department | null>(null)
  const [form, setForm] = useState<Record<string, any>>({})
  const [allDepts, setAllDepts] = useState<Department[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => { client.get('/departments').then(r => setAllDepts(r.data.data ?? [])) }, [refreshKey])

  const fetchData = useCallback(async (page: number, size: number, search: string): Promise<PageResponse<Department>> => {
    const res = await client.get('/departments/page', { params: { page, size, search } })
    return res.data.data
  }, [])

  const openCreate = () => { setEditItem(null); setForm({ canAssign: false }); setShowModal(true) }
  const openEdit = (d: Department) => { setEditItem(d); setForm({ ...d }); setShowModal(true) }

  const handleSave = async () => {
    setSaving(true)
    try {
      if (editItem) {
        await client.put(`/departments/${editItem.id}`, form)
        toast.success('Yeniləndi')
      } else {
        await client.post('/departments', form)
        toast.success('Yaradıldı')
      }
      setShowModal(false)
      setRefreshKey(k => k + 1)
    } finally { setSaving(false) }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Silmək istədiyinizə əminsiniz?')) return
    await client.delete(`/departments/${id}`)
    toast.success('Silindi')
    setRefreshKey(k => k + 1)
  }

  const columns = [
    { header: 'Ad', render: (row: Department) => <span className="fw-semibold">{row.name}</span> },
    { header: 'Ana şöbə', render: (row: Department) => allDepts.find(d => d.id === row.parentId)?.name ?? '-' },
    { header: 'Tapşırıq verə bilər', render: (row: Department) => row.canAssign ? <span className="badge bg-success">Bəli</span> : <span className="badge bg-secondary">Xeyr</span> },
    {
      header: '',
      render: (row: Department) => (
        <div className="d-flex gap-1">
          <button className="btn btn-xs btn-outline-primary py-0 px-1" onClick={() => openEdit(row)}><i className="bi bi-pencil" /></button>
          <button className="btn btn-xs btn-outline-danger py-0 px-1" onClick={() => handleDelete(row.id)}><i className="bi bi-trash" /></button>
        </div>
      ),
    },
  ]

  return (
    <>
      <div className="page-header">
        <div className="page-title"><i className="bi bi-diagram-3" />İdarələr</div>
        <button className="btn btn-primary btn-sm" onClick={openCreate}><i className="bi bi-plus-lg" />Yeni</button>
      </div>
      <div className="card">
        <DataTable columns={columns} fetchData={fetchData} refreshKey={refreshKey} />
      </div>

      {showModal && (
        <div className="modal show d-block" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog"><div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">{editItem ? 'Şöbəni Düzəlt' : 'Yeni Şöbə'}</h5>
              <button className="btn-close" onClick={() => setShowModal(false)} />
            </div>
            <div className="modal-body">
              <div className="mb-3">
                <label className="form-label">Ad *</label>
                <input className="form-control form-control-sm" value={form.name ?? ''}
                  onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
              </div>
              <div className="mb-3">
                <label className="form-label">Ana şöbə</label>
                <Select
                  styles={selectStyles}
                  options={allDepts.filter(d => d.id !== editItem?.id).map(d => ({ value: d.id, label: d.name }))}
                  value={allDepts.filter(d => d.id === form.parentId).map(d => ({ value: d.id, label: d.name }))[0] ?? null}
                  onChange={opt => setForm(p => ({ ...p, parentId: opt?.value ?? null }))}
                  placeholder="Ana şöbə seçin..."
                  isClearable
                />
              </div>
              <div className="form-check">
                <input className="form-check-input" type="checkbox" checked={!!form.canAssign}
                  onChange={e => setForm(p => ({ ...p, canAssign: e.target.checked }))} />
                <label className="form-check-label">Tapşırıq verə bilər</label>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary btn-sm" onClick={() => setShowModal(false)}>Ləğv et</button>
              <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving}>
                {saving ? <span className="spinner-border spinner-border-sm me-1" /> : null}Yadda saxla
              </button>
            </div>
          </div></div>
        </div>
      )}
    </>
  )
}
