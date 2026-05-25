import { useState, useEffect, useCallback } from 'react'
import type { PageResponse } from '../types'

interface Column<T> {
  header: string
  key?: keyof T
  render?: (row: T) => React.ReactNode
  className?: string
}

interface Props<T> {
  columns: Column<T>[]
  fetchData: (page: number, size: number, search: string) => Promise<PageResponse<T>>
  rowClassName?: (row: T) => string
  onRowClick?: (row: T) => void
  refreshKey?: number
}

export default function DataTable<T extends { id?: number | string | object }>({
  columns, fetchData, rowClassName, onRowClick, refreshKey = 0
}: Props<T>) {
  const [data, setData] = useState<T[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [size] = useState(25)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [searchInput, setSearchInput] = useState('')

  const load = useCallback(async (p: number, s: string) => {
    setLoading(true)
    try {
      const res = await fetchData(p, size, s)
      setData(res.data)
      setTotal(res.total)
    } finally {
      setLoading(false)
    }
  }, [fetchData, size])

  useEffect(() => { load(0, '') }, [refreshKey])

  useEffect(() => {
    const t = setTimeout(() => {
      setPage(0)
      setSearch(searchInput)
      load(0, searchInput)
    }, 400)
    return () => clearTimeout(t)
  }, [searchInput])

  const goPage = (p: number) => { setPage(p); load(p, search) }
  const totalPages = Math.ceil(total / size)

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <input
          className="form-control form-control-sm"
          style={{ maxWidth: 280 }}
          placeholder="Axtar..."
          value={searchInput}
          onChange={e => setSearchInput(e.target.value)}
        />
        <small className="text-muted">Cəmi: {total}</small>
      </div>

      <div className="table-responsive">
        <table className="table table-hover table-sm mb-0">
          <thead>
            <tr>
              {columns.map((c, i) => (
                <th key={i} className={c.className}>{c.header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={columns.length} className="text-center py-4">
                <div className="spinner-border spinner-border-sm text-secondary" />
              </td></tr>
            ) : data.length === 0 ? (
              <tr><td colSpan={columns.length} className="text-center text-muted py-4">Məlumat yoxdur</td></tr>
            ) : data.map((row, ri) => (
              <tr
                key={ri}
                className={rowClassName?.(row)}
                onClick={() => onRowClick?.(row)}
                style={onRowClick ? { cursor: 'pointer' } : undefined}
              >
                {columns.map((col, ci) => (
                  <td key={ci} className={col.className}>
                    {col.render ? col.render(row) : col.key ? String(row[col.key] ?? '') : ''}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="d-flex justify-content-between align-items-center mt-3">
          <small className="text-muted">Səhifə {page + 1} / {totalPages}</small>
          <div className="btn-group btn-group-sm">
            <button className="btn btn-outline-secondary" disabled={page === 0} onClick={() => goPage(page - 1)}>
              <i className="bi bi-chevron-left" />
            </button>
            <button className="btn btn-outline-secondary" disabled={page >= totalPages - 1} onClick={() => goPage(page + 1)}>
              <i className="bi bi-chevron-right" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
