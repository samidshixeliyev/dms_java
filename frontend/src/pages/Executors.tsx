import { useState, useCallback, useEffect } from 'react'
import DataTable from '../components/DataTable'
import client from '../api/client'
import toast from 'react-hot-toast'
import Select from 'react-select'
import type { Executor, Department, PageResponse } from '../types'

const selectStyles = { control: (b: object) => ({ ...b, borderColor: '#dee2e6', minHeight: 34, fontSize: '0.875rem' }) }

export default function Executors() {
  const [refreshKey, setRefreshKey] = useState(0)
  const [showModal, setShowModal] = useState(false)
  const [editItem, setEditItem] = useState<Executor | null>(null)
  const [form, setForm] = useState<Record<string, any>>({})
  const [departments, setDepartments] = useState<Department[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => { client.get('/departments').then(r => setDepartments(r.data.data ?? [])) }, [])

  const fetchData = useCallback(async (page: number, size: number, search: string): Promise<PageResponse<Executor>> => {
    const res = await client.get('/executors/page', { params: { page, size, search } })
    return res.data.data
  }, [])

  const openCreate = () => { setEditItem(null); setForm({}); setShowModal(true) }
  const openEdit = (e: Executor) => { setEditItem(e); setForm({ ...e }); setShowModal(true) }

  const handleSave = async () => {
    setSaving(true)
    try {
      if (editItem) {
        await client.put(`/executors/${editItem.id}`, form)
        toast.success('Yeniləndi')
      } else {
        await client.post('/executors', form)
        toast.success('Yaradıldı')
      }
      setShowModal(false)
      setRefreshKey(k => k + 1)
    } finally { setSaving(false) }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Silmək istədiyinizə əminsiniz?')) return
    await client.delete(`/executors/${id}`)
    toast.success('Silindi')
    setRefreshKey(k => k + 1)
  }

  const columns = [
    { header: 'Ad', render: (row: Executor) => <span className="fw-semibold">{row.name}</span> },
    { header: 'Vəzifə', render: (row: Executor) => row.position ?? '—' },
    { header: 'Şöbə', render: (row: Executor) => row.department?.name ?? departments.find(d => d.id === row.departmentId)?.name ?? '—' },
    {
      header: '',
      render: (row: Executor) => (
        <div className="d-flex gap-1" style={{ justifyContent: 'center' }}>
          <button className="btn btn-sm btn-warning" style={{ width: 26, height: 26, padding: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8 }}
            title="Düzəlt" onClick={() => openEdit(row)}>
            <i className="bi bi-pencil" style={{ fontSize: '.8rem' }} />
          </button>
          <button className="btn btn-sm btn-danger" style={{ width: 26, height: 26, padding: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8 }}
            title="Sil" onClick={() => handleDelete(row.id)}>
            <i className="bi bi-trash" style={{ fontSize: '.8rem' }} />
          </button>
        </div>
      ),
    },
  ]

  return (
    <>
      <div className="page-header">
        <div className="page-title"><i className="bi bi-people" />Rəhbərlər</div>
        <button className="btn btn-primary btn-sm" onClick={openCreate}><i className="bi bi-plus-lg" />Yeni</button>
      </div>
      <div className="card">
        <DataTable columns={columns} fetchData={fetchData} refreshKey={refreshKey} />
      </div>

      {showModal && (
        <div className="modal show d-block" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog"><div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">{editItem ? 'İcraçını Düzəlt' : 'Yeni İcraçı'}</h5>
              <button className="btn-close" onClick={() => setShowModal(false)} />
            </div>
            <div className="modal-body">
              <div className="mb-3">
                <label className="form-label">Ad *</label>
                <input className="form-control form-control-sm" value={form.name ?? ''}
                  onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
              </div>
              <div className="mb-3">
                <label className="form-label">Vəzifə</label>
                <input className="form-control form-control-sm" value={form.position ?? ''}
                  onChange={e => setForm(p => ({ ...p, position: e.target.value }))} />
              </div>
              <div className="mb-3">
                <label className="form-label">Şöbə</label>
                <Select
                  styles={selectStyles}
                  options={departments.map(d => ({ value: d.id, label: d.name }))}
                  value={departments.filter(d => d.id === form.departmentId).map(d => ({ value: d.id, label: d.name }))[0] ?? null}
                  onChange={opt => setForm(p => ({ ...p, departmentId: opt?.value }))}
                  placeholder="Şöbə seçin..."
                  isClearable
                />
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
