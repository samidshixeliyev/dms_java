import { useState, useEffect, useCallback, useRef } from 'react'
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
  /** Extra toolbar content rendered to the right of the search bar */
  toolbar?: React.ReactNode
  /** Page size, defaults to 25 */
  pageSize?: number
  /** Optional custom thead element to replace the default one */
  customThead?: React.ReactNode
}

export default function DataTable<T extends { id?: number | string | object }>({
  columns, fetchData, rowClassName, onRowClick, refreshKey = 0, toolbar, pageSize = 25, customThead
}: Props<T>) {
  const [data, setData] = useState<T[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const size = pageSize
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [searchInput, setSearchInput] = useState('')
  const isFirstRender = useRef(true)

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
    if (isFirstRender.current) { isFirstRender.current = false; return }
    const t = setTimeout(() => {
      setPage(0)
      setSearch(searchInput)
      load(0, searchInput)
    }, 400)
    return () => clearTimeout(t)
  }, [searchInput])

  const goPage = (p: number) => { setPage(p); load(p, search) }
  const totalPages = Math.ceil(total / size)

  const pages: number[] = []
  const delta = 2
  for (let i = Math.max(0, page - delta); i <= Math.min(totalPages - 1, page + delta); i++) {
    pages.push(i)
  }

  return (
    <div className="dt-wrapper">
      {/* Toolbar */}
      <div className="table-toolbar">
        <div className="search-bar">
          <span className="search-bar-icon"><i className="bi bi-search" /></span>
          <input
            className="search-bar-input"
            placeholder="Axtar..."
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
          />
        </div>
        <div className="table-toolbar-right">
          {toolbar}
          <span className="table-total-badge">{total} qeyd</span>
        </div>
      </div>

      {/* Table */}
      <div className="table-responsive">
        <table className="table table-hover table-bordered dt-table mb-0">
          {customThead ?? (
            <thead>
              <tr>
                {columns.map((c, i) => (
                  <th key={i} className={c.className} style={{
                    background: (c.header === '' && i === columns.length - 1) ? '#374151' : '#1e3a5f',
                    color: '#fff',
                    textAlign: 'center',
                    padding: '6px 8px',
                    fontSize: '.78rem',
                    fontWeight: 700,
                    whiteSpace: 'nowrap',
                    border: '1px solid rgba(255,255,255,.15)',
                    verticalAlign: 'middle',
                  }}>{c.header}</th>
                ))}
              </tr>
            </thead>
          )}
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={columns.length} className="text-center py-5">
                  <div className="spinner-border text-secondary" style={{ width: '1.25rem', height: '1.25rem' }} />
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="dt-empty">
                  <i className="bi bi-inbox dt-empty-icon" />
                  <div>Məlumat tapılmadı</div>
                </td>
              </tr>
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

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="dt-pagination">
          <div className="dt-pagination-info">
            Səhifə <strong>{page + 1}</strong> / <strong>{totalPages}</strong>
            &nbsp;({total} qeyd)
          </div>
          <ul className="pagination pagination-sm mb-0">
            <li className={`page-item ${page === 0 ? 'disabled' : ''}`}>
              <button className="page-link" onClick={() => goPage(0)} disabled={page === 0}>
                <i className="bi bi-chevron-double-left" />
              </button>
            </li>
            <li className={`page-item ${page === 0 ? 'disabled' : ''}`}>
              <button className="page-link" onClick={() => goPage(page - 1)} disabled={page === 0}>
                <i className="bi bi-chevron-left" />
              </button>
            </li>
            {pages.map(p => (
              <li key={p} className={`page-item ${p === page ? 'active' : ''}`}>
                <button className="page-link" onClick={() => goPage(p)}>{p + 1}</button>
              </li>
            ))}
            <li className={`page-item ${page >= totalPages - 1 ? 'disabled' : ''}`}>
              <button className="page-link" onClick={() => goPage(page + 1)} disabled={page >= totalPages - 1}>
                <i className="bi bi-chevron-right" />
              </button>
            </li>
            <li className={`page-item ${page >= totalPages - 1 ? 'disabled' : ''}`}>
              <button className="page-link" onClick={() => goPage(totalPages - 1)} disabled={page >= totalPages - 1}>
                <i className="bi bi-chevron-double-right" />
              </button>
            </li>
          </ul>
        </div>
      )}
    </div>
  )
}
