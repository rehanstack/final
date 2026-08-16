import React, { useState, useMemo, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { Link2, Database, Search, ChevronDown, ChevronRight, Layers, Code, Maximize, Minimize, Copy, Check, ExternalLink, X } from 'lucide-react'
import ReactFlow, { Background, Controls, MiniMap } from 'reactflow'
import dagre from 'dagre'
import 'reactflow/dist/style.css'

import { loadAnalysis, DATASETS } from '../lib/analysisState'
import TableNode from '../components/TableNode'

const nodeWidth = 260
const nodeHeight = 250

const getLayoutedElements = (nodes, edges, direction = 'TB') => {
  const dagreGraph = new dagre.graphlib.Graph()
  dagreGraph.setDefaultEdgeLabel(() => ({}))
  dagreGraph.setGraph({ rankdir: direction, nodesep: 100, ranksep: 120 })

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight })
  })

  edges.forEach((edge) => {
    if (dagreGraph.hasNode(edge.source) && dagreGraph.hasNode(edge.target)) {
      dagreGraph.setEdge(edge.source, edge.target)
    }
  })

  try {
    dagre.layout(dagreGraph)
  } catch (err) {
    console.warn('Dagre layout notice:', err)
  }

  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id) || { x: 0, y: 0 }
    return {
      ...node,
      targetPosition: direction === 'LR' ? 'left' : 'top',
      sourcePosition: direction === 'LR' ? 'right' : 'bottom',
      position: {
        x: (nodeWithPosition.x || 0) - nodeWidth / 2,
        y: (nodeWithPosition.y || 0) - nodeHeight / 2,
      }
    }
  })

  return { nodes: layoutedNodes, edges }
}
const nodeTypes = { table: TableNode }

// Helper: generate a CREATE TABLE DDL string from a table definition
function generateDDL(table) {
  const cols = (table.columns || []).map(col => {
    const c = typeof col === 'string' ? { name: col, type: 'TEXT' } : col
    const constraints = [
      c.pk ? 'PRIMARY KEY' : '',
      !c.nullable ? 'NOT NULL' : '',
      c.unique ? 'UNIQUE' : ''
    ].filter(Boolean).join(' ')
    return `  ${c.name} ${c.type || 'TEXT'}${constraints ? ' ' + constraints : ''}`
  }).join(',\n')
  return `CREATE TABLE ${table.name} (\n${cols}\n);`
}

export default function SchemaExplorer() {
  const analysis = loadAnalysis()
  const navigate = useNavigate()
  const [searchTerm, setSearchTerm] = useState('')
  const [expandedTable, setExpandedTable] = useState(null)
  const [selectedTable, setSelectedTable] = useState(null)
  const [isFullScreen, setIsFullScreen] = useState(false)
  const [copiedTable, setCopiedTable] = useState(null)
  const [columnSearch, setColumnSearch] = useState('')
  const tableRefs = useRef({})

  const isSQL = analysis.datasetKey !== 'Custom CSV'

  const currentDatasetKey = analysis.datasetKey || 'E-Commerce Dataset'
  const datasetMeta = DATASETS[currentDatasetKey] || DATASETS['E-Commerce Dataset']
  const tablesList = analysis.customData?.tables || analysis.tables || datasetMeta?.tables || []
  const relationshipsList = analysis.customData?.relationships || analysis.relationships || datasetMeta?.relationships || []

  // When a node is clicked in ER diagram
  const handleNodeClick = useCallback((_, node) => {
    const tableName = node.id
    setSelectedTable(tableName)
    setExpandedTable(tableName)
    setColumnSearch('')
    // Scroll directory entry into view
    setTimeout(() => {
      tableRefs.current[tableName]?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 100)
  }, [])

  // When a table row is clicked in the directory
  const handleDirectoryClick = (tableName) => {
    setExpandedTable(expandedTable === tableName ? null : tableName)
    setSelectedTable(tableName)
    setColumnSearch('')
  }

  // Copy DDL to clipboard
  const handleCopyDDL = (table) => {
    navigator.clipboard.writeText(generateDDL(table)).then(() => {
      setCopiedTable(table.name)
      setTimeout(() => setCopiedTable(null), 2000)
    })
  }

  // Get selected table object for fullscreen panel
  const selectedTableObj = tablesList.find(t => t.name === selectedTable) || null
  const selectedTableCols = selectedTableObj?.columns || []

  const filteredTables = tablesList.filter(t =>
    t.name?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // React Flow Mappings
  const { layoutedNodes, layoutedEdges } = useMemo(() => {
    const initialNodes = tablesList.map(t => ({
      id: t.name,
      type: 'table',
      data: t,
      position: { x: 0, y: 0 },
      selected: t.name === selectedTable
    }))

    const initialEdges = relationshipsList.map((rel, i) => ({
      id: `e-${rel.from}-${rel.to}-${i}`,
      source: rel.from,
      target: rel.to,
      animated: rel.status === 'Implicit Inferred',
      label: rel.status === 'Explicit FK' ? 'FK' : 'Inferred',
      labelStyle: { fill: 'rgb(var(--color-white))', fontSize: 10, fontWeight: 700 },
      labelBgStyle: { fill: 'rgb(var(--color-dark-900) / 0.8)', stroke: 'rgb(var(--color-white) / 0.1)', rx: 4 },
      style: { stroke: rel.status === 'Explicit FK' ? 'rgb(var(--color-primary))' : 'rgb(var(--color-accent))', strokeWidth: 2 }
    }))

    const layouted = getLayoutedElements(initialNodes, initialEdges, 'TB')
    return { layoutedNodes: layouted.nodes, layoutedEdges: layouted.edges }
  }, [tablesList, relationshipsList, selectedTable])

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  }

  return (
    <div className="p-8 pb-20 max-w-7xl mx-auto w-full">
      <motion.div variants={containerVariants} initial="hidden" animate="visible">

        {/* Header */}
        <motion.div variants={itemVariants} className="mb-10">
          <h1 className="text-3xl font-bold mb-2">Schema Explorer & ER Mapper</h1>
          <p className="text-gray-400">Click any node in the diagram to inspect its schema. Click a table row to highlight it in the diagram.</p>
        </motion.div>

        {/* ER Diagram */}
        <motion.div variants={itemVariants} className={`glass-dark border border-primary/30 flex flex-col transition-all duration-300 ${
          isFullScreen ? 'fixed inset-0 z-50 rounded-none bg-dark-950 shadow-2xl' : 'rounded-2xl mb-6 h-[600px] p-6'
        }`}>
          {/* Toolbar */}
          <div className={`flex items-center justify-between border-b border-white/10 pb-4 mb-4 ${isFullScreen ? 'px-6 pt-5' : ''}`}>
            <div>
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Link2 className="w-5 h-5 text-primary" />
                Interactive ER Diagram
              </h2>
              <p className="text-xs text-gray-400 mt-1">
                {isFullScreen ? 'Click a node to see its schema in the side panel.' : 'Click a node to open its schema below.'}
                {selectedTable && <span className="ml-2 text-primary font-semibold">— {selectedTable}</span>}
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs font-mono">
              <span className="hidden sm:flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-primary"></span> Explicit FK</span>
              <span className="hidden sm:flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-pink-500"></span> Inferred</span>
              <button onClick={() => setIsFullScreen(!isFullScreen)}
                className="ml-2 p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white transition-colors flex items-center gap-2 font-sans">
                {isFullScreen ? <><X className="w-4 h-4" /> Exit Fullscreen</> : <><Maximize className="w-4 h-4" /> Fullscreen</>}
              </button>
            </div>
          </div>

          {/* Diagram + optional side panel in fullscreen */}
          <div className={`flex flex-1 min-h-0 gap-4 ${isFullScreen ? 'px-6 pb-6' : ''}`}>
            {/* ReactFlow canvas */}
            <div className="flex-1 rounded-xl overflow-hidden bg-dark-950 border border-white/5 relative">
              <ReactFlow
                nodes={layoutedNodes}
                edges={layoutedEdges}
                nodeTypes={nodeTypes}
                onNodeClick={handleNodeClick}
                fitView
                minZoom={0.15}
                className="bg-dark-950"
              >
                <Background color="rgb(var(--color-white) / 0.08)" gap={20} size={1} />
                <Controls className="bg-dark-900 border-white/10 fill-white" />
                <MiniMap
                  nodeColor={(n) => n.id === selectedTable ? 'rgb(var(--color-primary))' : '#374151'}
                  maskColor="rgba(0, 0, 0, 0.5)"
                  className="bg-dark-900 border border-white/10 rounded-lg"
                />
              </ReactFlow>
            </div>

            {/* Fullscreen Side Panel — only shown when a table is selected and in fullscreen */}
            <AnimatePresence>
              {isFullScreen && selectedTableObj && (
                <motion.div
                  initial={{ opacity: 0, x: 40 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 40 }}
                  transition={{ duration: 0.2 }}
                  className="w-80 flex-shrink-0 bg-dark-900 border border-white/10 rounded-xl flex flex-col overflow-hidden"
                >
                  {/* Panel header */}
                  <div className="p-4 border-b border-white/10 bg-primary/10">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-bold text-white text-sm flex items-center gap-2">
                        <Database className="w-4 h-4 text-primary" />
                        {selectedTableObj.name}
                      </h3>
                      <button onClick={() => setSelectedTable(null)} className="text-gray-400 hover:text-white transition-colors">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <p className="text-[11px] text-gray-400">{selectedTableObj.description || 'Database entity table'}</p>
                    <div className="flex gap-3 mt-2 text-[11px] text-gray-400 font-mono">
                      <span>{selectedTableCols.length} cols</span>
                      {selectedTableObj.records && <span>{selectedTableObj.records.toLocaleString()} rows</span>}
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex gap-2 p-3 border-b border-white/10">
                    {isSQL && (
                      <button onClick={() => handleCopyDDL(selectedTableObj)}
                        className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg border border-white/10 bg-white/5 hover:bg-primary/10 hover:border-primary/40 text-[11px] font-semibold text-gray-300 hover:text-white transition-all">
                        {copiedTable === selectedTableObj.name ? <><Check className="w-3 h-3 text-green-400" /> Copied!</> : <><Copy className="w-3 h-3" /> Copy DDL</>}
                      </button>
                    )}
                    <button onClick={() => { setIsFullScreen(false); navigate('/data-explorer') }}
                      className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg border border-white/10 bg-white/5 hover:bg-secondary/10 hover:border-secondary/40 text-[11px] font-semibold text-gray-300 hover:text-white transition-all">
                      <ExternalLink className="w-3 h-3" /> Data Explorer
                    </button>
                  </div>

                  {/* Column list */}
                  <div className="flex-1 overflow-y-auto">
                    <div className="p-3 pb-1">
                      <div className="relative">
                        <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                        <input type="text" placeholder="Filter columns..."
                          value={columnSearch} onChange={e => setColumnSearch(e.target.value)}
                          className="input-dark text-xs pl-8 py-1.5 rounded-lg w-full" />
                      </div>
                    </div>
                    <div className="divide-y divide-white/5">
                      {selectedTableCols
                        .filter(col => {
                          const c = typeof col === 'string' ? { name: col } : col
                          return !columnSearch || c.name?.toLowerCase().includes(columnSearch.toLowerCase())
                        })
                        .map((col, i) => {
                          const c = typeof col === 'string' ? { name: col } : col
                          return (
                            <div key={i} className="px-3 py-2 hover:bg-white/5 flex items-center justify-between gap-2">
                              <div className="flex items-center gap-1.5 min-w-0">
                                {c.pk && <span className="text-yellow-400 text-[10px] flex-shrink-0">🔑</span>}
                                {c.fk && <span className="text-primary text-[10px] flex-shrink-0">🔗</span>}
                                {!c.pk && !c.fk && <span className="w-3 flex-shrink-0" />}
                                <span className={`font-mono text-xs truncate ${c.pk ? 'text-yellow-200 font-bold' : c.fk ? 'text-primary' : 'text-gray-200'}`}>{c.name}</span>
                              </div>
                              <div className="flex items-center gap-1 flex-shrink-0">
                                {c.pk && <span className="px-1 py-0.5 rounded bg-yellow-500/20 text-yellow-300 text-[9px] font-mono">PK</span>}
                                {c.fk && <span className="px-1 py-0.5 rounded bg-primary/20 text-primary text-[9px] font-mono">FK</span>}
                                <span className="text-[10px] text-gray-500 font-mono">{c.type?.split('(')[0] || ''}</span>
                              </div>
                            </div>
                          )
                        })
                      }
                    </div>
                  </div>

                  {/* Sample rows preview */}
                  {selectedTableObj.sampleRows && selectedTableObj.sampleRows.length > 0 && (
                    <div className="border-t border-white/10 p-3">
                      <p className="text-[10px] text-gray-500 font-semibold uppercase mb-2">Sample Data</p>
                      <div className="overflow-x-auto">
                        <table className="text-[10px] font-mono w-full">
                          <thead><tr className="text-gray-500">{Object.keys(selectedTableObj.sampleRows[0]).slice(0, 4).map(k => <th key={k} className="pr-3 pb-1 text-left truncate max-w-[60px]">{k}</th>)}</tr></thead>
                          <tbody className="divide-y divide-white/5">
                            {selectedTableObj.sampleRows.slice(0, 3).map((row, rIdx) => (
                              <tr key={rIdx}>{Object.values(row).slice(0, 4).map((v, vIdx) => (
                                <td key={vIdx} className="pr-3 py-1 text-gray-400 truncate max-w-[60px]">{String(v ?? '')}</td>
                              ))}</tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Table Directory */}
        <motion.div variants={itemVariants} className="glass-dark rounded-2xl overflow-hidden border border-white/10">
          <div className="p-6 border-b border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Database className="w-5 h-5 text-secondary" />
                Table Schema Directory
              </h2>
              <p className="text-xs text-gray-400 mt-1">{tablesList.length} tables - Click a row to select it in the ER diagram</p>
            </div>
            <div className="relative max-w-xs w-full">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
              <input type="text" placeholder="Search tables..."
                value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                className="input-dark pl-9 py-2 text-sm w-full" />
            </div>
          </div>

          <div className="divide-y divide-white/10">
            {filteredTables.map((table) => {
              const isExpanded = expandedTable === table.name
              const isSelected = selectedTable === table.name
              const visibleCols = (table.columns || []).filter(col => {
                const c = typeof col === "string" ? { name: col } : col
                return !columnSearch || c.name?.toLowerCase().includes(columnSearch.toLowerCase())
              })
              return (
                <div key={table.name}
                  ref={el => { tableRefs.current[table.name] = el }}
                  className={`transition-all ${isSelected ? "bg-primary/5 border-l-2 border-l-primary" : "border-l-2 border-l-transparent"}`}>

                  <div onClick={() => handleDirectoryClick(table.name)}
                    className="p-5 flex items-center justify-between hover:bg-white/5 cursor-pointer transition-all">
                    <div className="flex items-center gap-4">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${isSelected ? "bg-primary/30 text-primary" : "bg-secondary/20 text-secondary"}`}>
                        {isExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5 text-gray-400" />}
                      </div>
                      <div>
                        <h3 className="font-bold text-lg text-white flex items-center gap-2">
                          {table.name}
                          {isSelected && <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/20 text-primary font-mono">Selected</span>}
                          <span className="text-xs font-mono text-gray-400">({table.columnsCount || table.columns?.length || 0} cols)</span>
                        </h3>
                        <p className="text-xs text-gray-400">{table.description || "Database entity table"}</p>
                      </div>
                    </div>
                    <div className="text-right hidden sm:block">
                      <p className="text-xs font-mono text-gray-300">{table.records?.toLocaleString() || "-"} rows</p>
                      <p className="text-[10px] text-gray-500 font-mono">{table.size || ""}</p>
                    </div>
                  </div>

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="bg-dark-950/80 p-6 border-t border-white/10 space-y-6"
                      >
                        {/* Action buttons */}
                        <div className="flex flex-wrap items-center gap-3">
                          {isSQL && (
                            <button onClick={() => handleCopyDDL(table)}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 hover:bg-primary/10 hover:border-primary/40 text-xs font-semibold text-gray-300 hover:text-white transition-all">
                              {copiedTable === table.name
                                ? <><Check className="w-3.5 h-3.5 text-green-400" /> Copied!</>
                                : <><Copy className="w-3.5 h-3.5" /> Copy DDL</>}
                            </button>
                          )}
                          <button onClick={() => navigate('/data-explorer')}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 hover:bg-secondary/10 hover:border-secondary/40 text-xs font-semibold text-gray-300 hover:text-white transition-all">
                            <ExternalLink className="w-3.5 h-3.5" /> Open in Data Explorer
                          </button>
                        </div>

                        {/* Columns */}
                        <div>
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="text-sm font-bold text-white flex items-center gap-2">
                              <Layers className="w-4 h-4 text-primary" />
                              Columns
                              <span className="text-xs font-normal text-gray-400">({visibleCols.length}/{table.columns?.length || 0})</span>
                            </h4>
                            <div className="relative">
                              <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                              <input type="text" placeholder="Filter columns..."
                                value={columnSearch} onChange={e => setColumnSearch(e.target.value)}
                                onClick={e => e.stopPropagation()}
                                className="input-dark text-xs pl-8 py-1.5 rounded-lg w-44" />
                            </div>
                          </div>
                          <div className="overflow-x-auto rounded-xl border border-white/10">
                            <table className="w-full text-left text-xs font-mono">
                              <thead className="bg-dark-900 text-gray-400 uppercase text-[10px]">
                                <tr>
                                  <th className="p-3">Column</th>
                                  <th className="p-3">Type</th>
                                  <th className="p-3">Constraints</th>
                                  <th className="p-3">Nullable</th>
                                  <th className="p-3">Description</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-white/5 bg-dark-950">
                                {visibleCols.map((col, cIdx) => {
                                  const c = typeof col === "string" ? { name: col } : col
                                  return (
                                    <tr key={cIdx} className="hover:bg-white/5">
                                      <td className="p-3 font-bold text-white">
                                        <div className="flex items-center gap-1.5">
                                          {c.pk && <span title="Primary Key">&#128273;</span>}
                                          {c.fk && <span title="Foreign Key">&#128279;</span>}
                                          {c.name}
                                        </div>
                                      </td>
                                      <td className="p-3 text-secondary">{c.type || "-"}</td>
                                      <td className="p-3">
                                        <div className="flex flex-wrap gap-1">
                                          {c.pk && <span className="px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-300 text-[9px]">PK</span>}
                                          {c.fk && <span className="px-1.5 py-0.5 rounded bg-primary/20 text-primary text-[9px]">FK{c.references ? ": " + c.references : ""}</span>}
                                          {c.unique && <span className="px-1.5 py-0.5 rounded bg-green-500/20 text-green-300 text-[9px]">UNIQUE</span>}
                                        </div>
                                      </td>
                                      <td className="p-3">{c.nullable ? <span className="text-gray-400">YES</span> : <span className="text-green-400 font-bold">NOT NULL</span>}</td>
                                      <td className="p-3 text-gray-400 font-sans text-xs">{c.desc || "-"}</td>
                                    </tr>
                                  )
                                })}
                                {visibleCols.length === 0 && (
                                  <tr><td colSpan={5} className="p-4 text-center text-gray-500 text-xs">No columns match your search.</td></tr>
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>

                        {table.sampleRows && table.sampleRows.length > 0 && (
                          <div>
                            <h4 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                              <Code className="w-4 h-4 text-secondary" />
                              Sample Rows
                            </h4>
                            <div className="overflow-x-auto rounded-xl border border-white/10 bg-dark-900 p-4 font-mono text-xs">
                              <table className="w-full text-left">
                                <thead className="text-gray-400 border-b border-white/10">
                                  <tr>{Object.keys(table.sampleRows[0] || {}).map(k => <th key={k} className="pb-2 pr-4">{k}</th>)}</tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                  {table.sampleRows.slice(0, 5).map((row, rIdx) => (
                                    <tr key={rIdx}>
                                      {Object.values(row).map((v, vIdx) => (
                                        <td key={vIdx} className="py-2 pr-4 text-gray-300 truncate max-w-[150px]">{String(v ?? "")}</td>
                                      ))}
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )
            })}
          </div>
        </motion.div>
      </motion.div>
    </div>
  )
}
