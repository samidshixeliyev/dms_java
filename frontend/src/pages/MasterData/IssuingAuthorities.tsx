import { useState, useCallback } from 'react'
import DataTable from '../../components/DataTable'
import client from '../../api/client'
import toast from 'react-hot-toast'
import type { IssuingAuthority, PageResponse } from '../../types'

export default function IssuingAuthorities() {
  const [refreshKey, setRefreshKey] = useState(0)
  const [showModal, setShowModal] = useState(false)
  const [editItem, setEditItem] = useState<IssuingAuthority | null>(null)
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)

  const fetchData = useCallback(async (page: number, size: number, search: string): Promise<PageResponse<IssuingAuthority>> => {
    const res = await client.get('/issuing-authorities/page', { params: { page, size, search } })
    return res.data.data
  }, [])

  const openCreate = () => { setEditItem(null); setName(''); setShowModal(true) }
  const openEdit = (item: IssuingAuthority) => { setEditItem(item); setName(item.name); setShowModal(true) }

  const handleSave = async () => {
    setSaving(true)
    try {
      if (editItem) { await client.put(`/issuing-authorities/${editItem.id}`, { name }); toast.success('Yeniləndi') }
      else { await client.post('/issuing-authorities', { name }); toast.success('Yaradıldı') }
      setShowModal(false)
      setRefreshKey(k => k + 1)
    } finally { setSaving(false) }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Silmək istədiyinizə əminsiniz?')) return
    await client.delete(`/issuing-authorities/${id}`)
    toast.success('Silindi')
    setRefreshKey(k => k + 1)
  }

  const columns = [
    { header: 'Göndərən qurum adı', render: (row: IssuingAuthority) => <span className="fw-semibold">{row.name}</span> },
    {
      header: '',
      render: (row: IssuingAuthority) => (
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
        <div className="page-title"><i className="bi bi-building-check" />Kim qəbul edib</div>
        <button className="btn btn-primary btn-sm" onClick={openCreate}><i className="bi bi-plus-lg" />Yeni</button>
      </div>
      <div className="card">
        <DataTable columns={columns} fetchData={fetchData} refreshKey={refreshKey} />
      </div>

      {showModal && (
        <div className="modal show d-block" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog"><div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">{editItem ? 'Qurumu Düzəlt' : 'Yeni Qurum'}</h5>
              <button className="btn-close" onClick={() => setShowModal(false)} />
            </div>
            <div className="modal-body">
              <label className="form-label">Ad *</label>
              <input className="form-control" value={name} onChange={e => setName(e.target.value)} autoFocus />
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
