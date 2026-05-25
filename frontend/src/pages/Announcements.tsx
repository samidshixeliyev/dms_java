import { useState, useEffect } from 'react'
import client from '../api/client'
import toast from 'react-hot-toast'
import type { Announcement } from '../types'

export default function Announcements() {
  const [items, setItems] = useState<Announcement[]>([])
  const [showModal, setShowModal] = useState(false)
  const [editItem, setEditItem] = useState<Announcement | null>(null)
  const [form, setForm] = useState({ title: '', message: '' })
  const [saving, setSaving] = useState(false)

  const load = () => client.get('/announcements').then(r => setItems(r.data.data ?? []))
  useEffect(() => { load() }, [])

  const openCreate = () => { setEditItem(null); setForm({ title: '', message: '' }); setShowModal(true) }
  const openEdit = (a: Announcement) => { setEditItem(a); setForm({ title: a.title, message: a.message }); setShowModal(true) }

  const handleSave = async () => {
    setSaving(true)
    try {
      if (editItem) { await client.put(`/announcements/${editItem.id}`, form); toast.success('Yeniləndi') }
      else { await client.post('/announcements', form); toast.success('Yaradıldı') }
      setShowModal(false)
      load()
    } finally { setSaving(false) }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Silmək istədiyinizə əminsiniz?')) return
    await client.delete(`/announcements/${id}`)
    toast.success('Silindi')
    load()
  }

  const handleToggle = async (id: number) => {
    await client.post(`/announcements/${id}/toggle`)
    load()
  }

  return (
    <>
      <div className="page-header">
        <div className="page-title"><i className="bi bi-megaphone" />Elanlar</div>
        <button className="btn btn-primary btn-sm" onClick={openCreate}><i className="bi bi-plus-lg" />Yeni</button>
      </div>

      <div className="row g-3">
        {items.map(a => (
          <div className="col-md-6" key={a.id}>
            <div className={`card border-0 shadow-sm ${a.active ? '' : 'opacity-50'}`}>
              <div className="card-body">
                <div className="d-flex justify-content-between align-items-start">
                  <h6 className="fw-bold mb-1">{a.title}</h6>
                  <div className="d-flex gap-1">
                    <button className={`btn btn-xs ${a.active ? 'btn-success' : 'btn-outline-success'} py-0 px-1`}
                      onClick={() => handleToggle(a.id)}>
                      <i className={`bi bi-${a.active ? 'eye' : 'eye-slash'}`} />
                    </button>
                    <button className="btn btn-xs btn-outline-primary py-0 px-1" onClick={() => openEdit(a)}>
                      <i className="bi bi-pencil" />
                    </button>
                    <button className="btn btn-xs btn-outline-danger py-0 px-1" onClick={() => handleDelete(a.id)}>
                      <i className="bi bi-trash" />
                    </button>
                  </div>
                </div>
                <p className="small text-muted mb-1">{a.message}</p>
                <small className="text-muted">{new Date(a.createdAt).toLocaleDateString('az')}</small>
              </div>
            </div>
          </div>
        ))}
        {items.length === 0 && <div className="col-12 text-muted text-center py-5">Heç bir elan yoxdur</div>}
      </div>

      {showModal && (
        <div className="modal show d-block" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog"><div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">{editItem ? 'Elanı Düzəlt' : 'Yeni Elan'}</h5>
              <button className="btn-close" onClick={() => setShowModal(false)} />
            </div>
            <div className="modal-body">
              <div className="mb-3">
                <label className="form-label">Başlıq *</label>
                <input className="form-control" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} />
              </div>
              <div className="mb-3">
                <label className="form-label">Məzmun *</label>
                <textarea className="form-control" rows={4} value={form.message} onChange={e => setForm(p => ({ ...p, message: e.target.value }))} />
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
