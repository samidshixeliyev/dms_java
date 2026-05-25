import { useState, useCallback, useEffect } from 'react'
import DataTable from '../components/DataTable'
import client from '../api/client'
import toast from 'react-hot-toast'
import Select from 'react-select'
import type { User, Department, Executor, PageResponse } from '../types'

const roles = [
  { value: 'admin', label: 'Admin' },
  { value: 'manager', label: 'Menecer' },
  { value: 'user', label: 'İstifadəçi' },
  { value: 'executor', label: 'İcraçı' },
]

const selectStyles = {
  control: (base: object) => ({ ...base, borderColor: '#dee2e6', minHeight: 34, fontSize: '0.875rem' }),
}

export default function Users() {
  const [refreshKey, setRefreshKey] = useState(0)
  const [showModal, setShowModal] = useState(false)
  const [editItem, setEditItem] = useState<User | null>(null)
  const [form, setForm] = useState<Record<string, any>>({})
  const [departments, setDepartments] = useState<Department[]>([])
  const [executors, setExecutors] = useState<Executor[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    client.get('/departments').then(r => setDepartments(r.data.data ?? []))
    client.get('/executors').then(r => setExecutors(r.data.data ?? []))
  }, [])

  const fetchData = useCallback(async (page: number, size: number, search: string): Promise<PageResponse<User>> => {
    const res = await client.get('/users', { params: { page, size, search } })
    return res.data.data
  }, [])

  const openCreate = () => { setEditItem(null); setForm({}); setShowModal(true) }
  const openEdit = (u: User) => { setEditItem(u); setForm({ ...u, password: '' }); setShowModal(true) }

  const handleSave = async () => {
    setSaving(true)
    try {
      if (editItem) {
        await client.put(`/users/${editItem.id}`, form)
        toast.success('Yeniləndi')
      } else {
        await client.post('/users', form)
        toast.success('Yaradıldı')
      }
      setShowModal(false)
      setRefreshKey(k => k + 1)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Silmək istədiyinizə əminsiniz?')) return
    await client.delete(`/users/${id}`)
    toast.success('Silindi')
    setRefreshKey(k => k + 1)
  }

  const columns = [
    { header: 'İstifadəçi adı', render: (row: User) => <span className="fw-semibold">{row.username}</span> },
    { header: 'Ad Soyad', render: (row: User) => `${row.name ?? ''} ${row.surname ?? ''}` },
    { header: 'Email', render: (row: User) => row.email ?? '-' },
    {
      header: 'Rol',
      render: (row: User) => {
        const labels: Record<string, string> = { admin: 'Admin', manager: 'Menecer', user: 'İstifadəçi', executor: 'İcraçı' }
        return <span className="badge bg-secondary">{labels[row.userRole] ?? row.userRole}</span>
      },
    },
    {
      header: '',
      render: (row: User) => (
        <div className="d-flex gap-1">
          <button className="btn btn-xs btn-outline-primary py-0 px-1" onClick={() => openEdit(row)}>
            <i className="bi bi-pencil" />
          </button>
          <button className="btn btn-xs btn-outline-danger py-0 px-1" onClick={() => handleDelete(row.id)}>
            <i className="bi bi-trash" />
          </button>
        </div>
      ),
    },
  ]

  return (
    <>
      <div className="page-header">
        <div className="page-title"><i className="bi bi-person-gear" />İstifadəçilər</div>
        <button className="btn btn-primary btn-sm" onClick={openCreate}>
          <i className="bi bi-plus-lg" />Yeni
        </button>
      </div>
      <div className="card">
        <DataTable columns={columns} fetchData={fetchData} refreshKey={refreshKey} />
      </div>

      {showModal && (
        <div className="modal show d-block" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">{editItem ? 'İstifadəçini Düzəlt' : 'Yeni İstifadəçi'}</h5>
                <button className="btn-close" onClick={() => setShowModal(false)} />
              </div>
              <div className="modal-body">
                <div className="row g-3">
                  <div className="col-6">
                    <label className="form-label">Ad</label>
                    <input className="form-control form-control-sm" value={form.name ?? ''}
                      onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
                  </div>
                  <div className="col-6">
                    <label className="form-label">Soyad</label>
                    <input className="form-control form-control-sm" value={form.surname ?? ''}
                      onChange={e => setForm(p => ({ ...p, surname: e.target.value }))} />
                  </div>
                  <div className="col-12">
                    <label className="form-label">İstifadəçi adı *</label>
                    <input className="form-control form-control-sm" value={form.username ?? ''}
                      disabled={!!editItem}
                      onChange={e => setForm(p => ({ ...p, username: e.target.value }))} />
                  </div>
                  <div className="col-12">
                    <label className="form-label">{editItem ? 'Yeni Şifrə (boş qoyun dəyişməmək üçün)' : 'Şifrə *'}</label>
                    <input type="password" className="form-control form-control-sm" value={form.password ?? ''}
                      onChange={e => setForm(p => ({ ...p, password: e.target.value }))} />
                  </div>
                  <div className="col-12">
                    <label className="form-label">Email</label>
                    <input type="email" className="form-control form-control-sm" value={form.email ?? ''}
                      onChange={e => setForm(p => ({ ...p, email: e.target.value }))} />
                  </div>
                  <div className="col-12">
                    <label className="form-label">Rol</label>
                    <Select
                      styles={selectStyles}
                      options={roles}
                      value={roles.find(r => r.value === form.userRole) ?? null}
                      onChange={opt => setForm(p => ({ ...p, userRole: opt?.value }))}
                      placeholder="Rol seçin..."
                    />
                  </div>
                  {form.userRole === 'executor' && (
                    <div className="col-12">
                      <label className="form-label">İcraçı</label>
                      <Select
                        styles={selectStyles}
                        options={executors.map(e => ({ value: e.id, label: e.name }))}
                        value={executors.filter(e => e.id === form.executorId).map(e => ({ value: e.id, label: e.name }))[0] ?? null}
                        onChange={opt => setForm(p => ({ ...p, executorId: opt?.value }))}
                        placeholder="İcraçı seçin..."
                        isClearable
                      />
                    </div>
                  )}
                  {(form.userRole === 'manager' || form.userRole === 'user') && (
                    <div className="col-12">
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
                  )}
                  <div className="col-12">
                    <div className="form-check">
                      <input
                        type="checkbox"
                        className="form-check-input"
                        id="forcePasswordChange"
                        checked={!!form.forcePasswordChange}
                        onChange={e => setForm(p => ({ ...p, forcePasswordChange: e.target.checked }))}
                      />
                      <label className="form-check-label" htmlFor="forcePasswordChange">
                        Növbəti girişdə şifrəni dəyişməyə məcbur et
                      </label>
                    </div>
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
