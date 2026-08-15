import React, { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { FileSpreadsheet, Search, ChevronLeft, ChevronRight, Download, Filter, Database, Columns, AlertCircle, AlertTriangle, CheckCircle2, Table2 } from 'lucide-react'
import { loadAnalysis, DATASETS } from '../lib/analysisState'

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Single source of truth: is this cell value "missing"?
 * Handles null, undefined, empty string, and "NULL"/"null" string literals.
 */
function isMissingCell(val) {
  if (val === null || val === undefined) return true
  const s = String(val).trim()
  return s === '' || s.toLowerCase() === 'null' || s.toLowerCase() === 'undefined'
}

/** Is this value an outlier (negative number / negative currency)? */
function isOutlierCell(val) {
  if (isMissingCell(val)) return false
  const s = String(val).trim()
  return s.startsWith('-') || s.includes('-$')
}

export default function DataExplorer() {
  const analysis = loadAnalysis()
  const currentDatasetKey = analysis.datasetKey || 'E-Commerce Dataset'
  const isCustom = currentDatasetKey === 'Custom CSV' || currentDatasetKey === 'SQL Dump'
  const isSql = currentDatasetKey === 'SQL Dump'
  const datasetMeta = isCustom ? null : (DATASETS[currentDatasetKey] || DATASETS['E-Commerce Dataset'])

  // All tables — SQL has many, CSV has one
  const allTables = analysis.tables || analysis.customData?.tables || datasetMeta?.tables || []

  const [selectedTableIdx, setSelectedTableIdx] = useState(0)
  const [searchTerm, setSearchTerm] = useState('')
  const [pageIndex, setPageIndex] = useState(0)
  const [pageSize, setPageSize] = useState(10)
  const [selectedColumnFilter, setSelectedColumnFilter] = useState('all')
  const [rowFilterMode, setRowFilterMode] = useState('all')

  // Active table — for SQL user can switch between tables
  const activeTable = allTables[selectedTableIdx] || allTables[0]
  const sampleRows = activeTable?.sampleRows || (isCustom ? [] : datasetMeta?.tables?.[0]?.sampleRows || [
    { id: 1, genre: 'Action', release_year: 2022, revenue: '$1,932', director: 'Christopher Nolan', rating: 8.8 },
    { id: 2, genre: 'Comedy', release_year: 2023, revenue: '$450', director: '', rating: 6.5 },
    { id: 3, genre: 'Drama', release_year: 2021, revenue: '-$1,200', director: 'Denis Villeneuve', rating: null }
  ])

  // Schema column objects — for display metadata (type badges, pk/fk)
  const rawCols = activeTable?.columns || []
  const schemaColNames = rawCols.map(c => typeof c === 'string' ? c : (c.name || 'Column'))

  // colNames for display: schema order preferred, falling back to row keys
  const colNames = useMemo(() => {
    if (schemaColNames.length > 0) return schemaColNames
    if (sampleRows.length > 0) return Object.keys(sampleRows[0])
    return []
  }, [schemaColNames, sampleRows])

  /**
   * colNamesForCounting: ONLY keys that actually exist in the row data.
   * Prevents schema-only columns (not in INSERT INTO rows) from inflating the missing count.
   */
  const colNamesForCounting = useMemo(() => {
    if (sampleRows.length === 0) return colNames
    const rowKeys = new Set(Object.keys(sampleRows[0]))
    const schemaInRows = colNames.filter(c => rowKeys.has(c))
    return schemaInRows.length > 0 ? schemaInRows : Array.from(rowKeys)
  }, [colNames, sampleRows])

  // Problem Count Diagnostics — uses colNamesForCounting so counts match what's visible in the table
  const counts = useMemo(() => {
    let missingCount = 0
    let outlierCount = 0
    const problemRowIndices = new Set()
    sampleRows.forEach((row, idx) => {
      if (!row) return
      colNamesForCounting.forEach(cName => {
        const val = row[cName]
        if (isMissingCell(val)) {
          missingCount++
          problemRowIndices.add(idx)
        } else if (isOutlierCell(val)) {
          outlierCount++
          problemRowIndices.add(idx)
        }
      })
    })
    return { missing: missingCount, outliers: outlierCount, problemRows: problemRowIndices.size }
  }, [sampleRows, colNamesForCounting])

  const visibleColNames = useMemo(() =>
    selectedColumnFilter === 'all' ? colNames : colNames.filter(c => c === selectedColumnFilter),
    [colNames, selectedColumnFilter])

  const filteredRows = useMemo(() => {
    let rows = sampleRows
    if (rowFilterMode === 'problems') {
      rows = sampleRows.filter(row => row && colNamesForCounting.some(cName => {
        const val = row[cName]
        return isMissingCell(val) || isOutlierCell(val)
      }))
    } else if (rowFilterMode === 'missing') {
      rows = sampleRows.filter(row => row && colNamesForCounting.some(cName => isMissingCell(row[cName])))
    } else if (rowFilterMode === 'outliers') {
      rows = sampleRows.filter(row => row && colNamesForCounting.some(cName => isOutlierCell(row[cName])))
    }
    if (!searchTerm.trim()) return rows
    const term = searchTerm.toLowerCase()
    return rows.filter(row => row && Object.values(row).some(v => v != null && String(v).toLowerCase().includes(term)))
  }, [sampleRows, colNamesForCounting, rowFilterMode, searchTerm])

  const totalPages = Math.ceil(filteredRows.length / pageSize) || 1
  const paginatedRows = useMemo(() => filteredRows.slice(pageIndex * pageSize, (pageIndex + 1) * pageSize), [filteredRows, pageIndex, pageSize])

  const handleExportCSV = () => {
    if (sampleRows.length === 0) return
    const headers = colNames.join(',')
    const csvLines = sampleRows.map(r => colNames.map(c => `"${String(r[c] || '').replace(/"/g, '""')}"`).join(','))
    const blob = new Blob([[headers, ...csvLines].join('\n')], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url
    a.download = `${activeTable?.name || 'dataset'}_export.csv`; a.click()
    window.URL.revokeObjectURL(url)
  }

  // Switch table and reset state
  const handleTableSwitch = (idx) => {
    setSelectedTableIdx(idx)
    setPageIndex(0)
    setSearchTerm('')
    setSelectedColumnFilter('all')
    setRowFilterMode('all')
  }

  const totalRecords = activeTable?.records ?? sampleRows.length
  const displayedLabel = isSql ? `${activeTable?.name || 'Table'} (SQL Dump)` : (activeTable?.name || currentDatasetKey)

  return (
    <div className="p-8 pb-20 max-w-7xl mx-auto w-full">
      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-8">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/20 text-primary border border-primary/30 text-xs font-semibold mb-3">
              {isSql ? <Database className="w-3.5 h-3.5" /> : <FileSpreadsheet className="w-3.5 h-3.5" />}
              <span>{isSql ? 'SQL Dump Data Explorer' : 'Interactive CSV Dataset Explorer'}</span>
            </div>
            <h1 className="text-4xl font-bold text-white mb-1">{isSql ? 'SQL Table Viewer' : 'CSV File Viewer'}</h1>
            <p className="text-gray-400 text-sm">
              Full dataset spreadsheet with problem row detection for{' '}
              <strong className="text-white">{displayedLabel}</strong>
            </p>
          </div>
          <button onClick={handleExportCSV}
            className="button-primary py-3 px-6 text-sm font-semibold flex items-center gap-2 whitespace-nowrap hover:shadow-glow self-start">
            <Download className="w-4 h-4" /> Export Table as CSV
          </button>
        </div>

        {/* SQL Table Selector — only for SQL with multiple tables */}
        {isSql && allTables.length > 1 && (
          <div className="mb-6 glass-dark p-4 rounded-2xl border border-white/10">
            <div className="flex items-center gap-3 mb-3">
              <Table2 className="w-4 h-4 text-primary" />
              <span className="text-sm font-semibold text-white">Select Table</span>
              <span className="text-xs text-gray-400">({allTables.length} tables in your SQL dump)</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {allTables.map((t, idx) => (
                <button
                  key={idx}
                  onClick={() => handleTableSwitch(idx)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all border ${
                    selectedTableIdx === idx
                      ? 'bg-primary text-white border-primary shadow-glow'
                      : 'border-white/10 text-gray-400 hover:text-white hover:border-white/30 bg-dark-800/40'
                  }`}
                >
                  <span className="font-mono">{t.name}</span>
                  <span className={`ml-2 ${selectedTableIdx === idx ? 'text-primary-100' : 'text-gray-500'}`}>
                    ({t.columns?.length || 0} cols)
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Summary Bar */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="glass-dark p-5 rounded-2xl border border-white/10">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-primary/20 text-primary rounded-xl"><FileSpreadsheet className="w-4 h-4" /></div>
              <div>
                <p className="text-[11px] text-gray-400 font-semibold uppercase">Sample Rows</p>
                <p className="text-lg font-bold text-white">{sampleRows.length.toLocaleString()}</p>
              </div>
            </div>
          </div>
          <div className="glass-dark p-5 rounded-2xl border border-yellow-500/30">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-yellow-500/20 text-yellow-400 rounded-xl"><AlertTriangle className="w-4 h-4" /></div>
              <div>
                <p className="text-[11px] text-gray-400 font-semibold uppercase">Problem Rows</p>
                <p className="text-lg font-bold text-yellow-400">{counts.problemRows}</p>
              </div>
            </div>
          </div>
          <div className="glass-dark p-5 rounded-2xl border border-red-500/30">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-red-500/20 text-red-400 rounded-xl"><AlertCircle className="w-4 h-4" /></div>
              <div>
                <p className="text-[11px] text-gray-400 font-semibold uppercase">Missing Cells</p>
                <p className="text-lg font-bold text-red-400">{counts.missing}</p>
              </div>
            </div>
          </div>
          <div className="glass-dark p-5 rounded-2xl border border-white/10">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-accent/20 text-accent rounded-xl"><Columns className="w-4 h-4" /></div>
              <div>
                <p className="text-[11px] text-gray-400 font-semibold uppercase">Columns</p>
                <p className="text-lg font-bold text-white">{colNames.length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Table Viewer */}
        <div className="glass-dark p-6 rounded-2xl border border-white/10">

          {/* Row Filter + Column Filter + Search */}
          <div className="flex flex-wrap items-center justify-between gap-4 mb-5 pb-5 border-b border-white/10">
            <div className="flex items-center gap-2 flex-wrap">
              <Filter className="w-4 h-4 text-primary" />
              <span className="text-xs font-bold text-white uppercase tracking-wider">Filter:</span>
              <div className="flex rounded-xl bg-dark-800 p-1 border border-white/10 text-xs">
                {[
                  { id: 'all', label: `All (${sampleRows.length})` },
                  { id: 'problems', label: `⚠️ Problems (${counts.problemRows})` },
                  { id: 'missing', label: `❌ Missing (${counts.missing})` },
                  { id: 'outliers', label: `📉 Outliers (${counts.outliers})` },
                ].map(f => (
                  <button key={f.id}
                    onClick={() => { setRowFilterMode(f.id); setPageIndex(0) }}
                    className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                      rowFilterMode === f.id
                        ? f.id === 'all' ? 'bg-primary text-white'
                          : f.id === 'problems' ? 'bg-yellow-500 text-dark-950'
                          : f.id === 'missing' ? 'bg-red-500 text-white'
                          : 'bg-accent text-white'
                        : 'text-gray-400 hover:text-white'
                    }`}>
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-xs text-gray-400 bg-dark-800 px-3 py-2 rounded-xl border border-white/10">
                <Columns className="w-3.5 h-3.5 text-primary" />
                <select
                  value={selectedColumnFilter}
                  onChange={(e) => setSelectedColumnFilter(e.target.value)}
                  className="bg-transparent text-white font-semibold outline-none cursor-pointer">
                  <option value="all">All Columns ({colNames.length})</option>
                  {colNames.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="relative w-full sm:w-52">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input type="text" value={searchTerm}
                  onChange={(e) => { setSearchTerm(e.target.value); setPageIndex(0) }}
                  placeholder="Search values…"
                  className="input-dark w-full text-xs pl-9 py-2 rounded-xl" />
              </div>
            </div>
          </div>

          {/* Column metadata strip — only for SQL with column type info */}
          {isSql && activeTable?.columns?.length > 0 && (
            <div className="flex gap-2 flex-wrap mb-4 pb-4 border-b border-white/5">
              {(activeTable.columns || []).slice(0, 12).map((col, i) => {
                const c = typeof col === 'string' ? { name: col } : col
                return (
                  <div key={i} className={`px-2.5 py-1 rounded-lg border text-[10px] font-mono flex items-center gap-1.5 ${
                    c.pk ? 'border-yellow-500/40 bg-yellow-500/10 text-yellow-300'
                    : c.fk ? 'border-primary/40 bg-primary/10 text-primary'
                    : 'border-white/10 bg-white/5 text-gray-400'
                  }`}>
                    {c.pk && '🔑'}
                    {c.fk && '🔗'}
                    {c.name}
                    {c.type && <span className="text-gray-500 ml-1">{c.type.split('(')[0]}</span>}
                  </div>
                )
              })}
              {activeTable.columns.length > 12 && (
                <div className="px-2.5 py-1 rounded-lg border border-white/10 bg-white/5 text-[10px] font-mono text-gray-400">
                  +{activeTable.columns.length - 12} more
                </div>
              )}
            </div>
          )}

          {/* No data message for SQL without INSERT INTO rows */}
          {sampleRows.length === 0 ? (
            <div className="py-16 text-center">
              <div className="w-14 h-14 rounded-2xl bg-dark-700 border border-white/10 flex items-center justify-center mx-auto mb-4">
                <Database className="w-7 h-7 text-gray-500" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">No Row Data Available</h3>
              <p className="text-gray-400 text-sm max-w-sm mx-auto">
                {isSql
                  ? `The table "${activeTable?.name}" has no INSERT INTO statements in your SQL dump. Schema structure is available in the Schema Explorer.`
                  : 'No data rows found in this table.'}
              </p>
            </div>
          ) : filteredRows.length === 0 ? (
            <div className="p-10 text-center bg-white/5 rounded-xl border border-white/10 text-gray-400 text-xs">
              <CheckCircle2 className="w-8 h-8 text-green-400 mx-auto mb-2" />
              <p className="font-bold text-white text-sm">No rows match this filter</p>
              <p className="text-gray-500 mt-1">Switch to "All Rows" to see all data.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-white/10 text-gray-400 uppercase tracking-wider font-semibold">
                    <th className="py-3 px-4 w-10">#</th>
                    {visibleColNames.map(c => (
                      <th key={c} className="py-3 px-4 whitespace-nowrap">{c}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-gray-300">
                  {paginatedRows.map((row, rIdx) => {
                    const rowNum = pageIndex * pageSize + rIdx + 1
                    return (
                      <tr key={rIdx} className="hover:bg-white/5 transition-colors">
                        <td className="py-3 px-4 text-gray-500 font-mono font-semibold">{rowNum}</td>
                        {visibleColNames.map(cName => {
                          const val = row?.[cName]
                          const missing = isMissingCell(val)
                          const outlier = !missing && isOutlierCell(val)
                          const strVal = missing ? '' : String(val).trim()
                          return (
                            <td key={cName} className="py-3 px-4 whitespace-nowrap font-mono">
                              {missing ? (
                                <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-red-500/20 text-red-400 border border-red-500/30 flex items-center gap-1 w-fit">
                                  <AlertCircle className="w-3 h-3" /> Missing
                                </span>
                              ) : outlier ? (
                                <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 flex items-center gap-1 w-fit">
                                  <AlertTriangle className="w-3 h-3" /> {strVal}
                                </span>
                              ) : (
                                <span className="text-gray-200 truncate max-w-[180px] block">{strVal}</span>
                              )}
                            </td>
                          )
                        })}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {sampleRows.length > 0 && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-5 border-t border-white/10 mt-4 text-xs">
              <div className="flex items-center gap-4 text-gray-400">
                <span>
                  Page <strong className="text-white">{pageIndex + 1}</strong> of <strong className="text-white">{totalPages}</strong> ({filteredRows.length} records)
                  {totalRecords > sampleRows.length && (
                    <span className="ml-2 text-gray-500">· {totalRecords.toLocaleString()} total in table</span>
                  )}
                </span>
                <div className="flex items-center gap-1.5">
                  <span>Show:</span>
                  {[10, 25, 50].map(s => (
                    <button key={s} onClick={() => { setPageSize(s); setPageIndex(0) }}
                      className={`px-2 py-1 rounded font-semibold text-[11px] ${pageSize === s ? 'bg-primary text-white' : 'bg-dark-800 text-gray-400 hover:text-white'}`}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setPageIndex(Math.max(0, pageIndex - 1))} disabled={pageIndex === 0}
                  className="p-2 rounded-lg bg-dark-800 border border-white/10 text-gray-300 disabled:opacity-40 hover:text-white">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button onClick={() => setPageIndex(Math.min(totalPages - 1, pageIndex + 1))} disabled={pageIndex >= totalPages - 1}
                  className="p-2 rounded-lg bg-dark-800 border border-white/10 text-gray-300 disabled:opacity-40 hover:text-white">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>

      </motion.div>
    </div>
  )
}
