import React, { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Link2, Database, Search, ChevronDown, ChevronRight, Layers, ArrowUpRight, Code, Sparkles, LayoutTemplate, Maximize, Minimize } from 'lucide-react'
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

const nodeTypes = {
  table: TableNode
}

export default function SchemaExplorer() {
  const analysis = loadAnalysis()
  const [searchTerm, setSearchTerm] = useState('')
  const [expandedTable, setExpandedTable] = useState(null)
  const [isFullScreen, setIsFullScreen] = useState(false)
  
  const currentDatasetKey = analysis.datasetKey || 'E-Commerce Dataset'
  const datasetMeta = DATASETS[currentDatasetKey] || DATASETS['E-Commerce Dataset']
  const tablesList = analysis.customData?.tables || analysis.tables || datasetMeta?.tables || []
  const relationshipsList = analysis.customData?.relationships || analysis.relationships || datasetMeta?.relationships || []

  const toggleExpandTable = (tableName) => {
    setExpandedTable(expandedTable === tableName ? null : tableName)
  }

  const filteredTables = tablesList.filter(t =>
    t.name?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // React Flow Mappings
  const { layoutedNodes, layoutedEdges } = useMemo(() => {
    const initialNodes = tablesList.map(t => ({
      id: t.name,
      type: 'table',
      data: t,
      position: { x: 0, y: 0 }
    }))

    const initialEdges = relationshipsList.map((rel, i) => ({
      id: `e-${rel.from}-${rel.to}-${i}`,
      source: rel.from,
      target: rel.to,
      animated: rel.status === 'Implicit Inferred',
      label: rel.status === 'Explicit FK' ? 'FK' : 'Inferred',
      labelStyle: { fill: '#fff', fontSize: 10, fontWeight: 700 },
      labelBgStyle: { fill: 'rgba(15, 23, 42, 0.8)', stroke: 'rgba(255,255,255,0.1)', rx: 4 },
      style: { stroke: rel.status === 'Explicit FK' ? '#7c3aed' : '#ec4899', strokeWidth: 2 }
    }))

    const layouted = getLayoutedElements(initialNodes, initialEdges, 'TB')
    return { layoutedNodes: layouted.nodes, layoutedEdges: layouted.edges }
  }, [tablesList, relationshipsList])

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
          <p className="text-gray-400">Interactive diagrammatic entity relationship graph and schema directory</p>
        </motion.div>

        {/* Diagrammatic ER Mapper (React Flow) */}
        <motion.div variants={itemVariants} className={`glass-dark p-6 border border-primary/30 flex flex-col transition-all duration-300 ${isFullScreen ? 'fixed inset-4 z-50 rounded-2xl bg-dark-950 shadow-2xl' : 'rounded-2xl mb-10 h-[600px]'}`}>
          <div className="flex items-center justify-between mb-4 border-b border-white/10 pb-4">
            <div>
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Link2 className="w-5 h-5 text-primary" />
                Interactive ER Diagram
              </h2>
              <p className="text-xs text-gray-400 mt-1">Scroll to zoom, drag to pan. Powered by React Flow.</p>
            </div>
            <div className="flex items-center gap-4 text-xs font-mono">
              <span className="hidden sm:flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-primary"></span> Explicit FK</span>
              <span className="hidden sm:flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-pink-500"></span> Inferred (AI)</span>
              <button
                onClick={() => setIsFullScreen(!isFullScreen)}
                className="ml-4 p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white transition-colors flex items-center gap-2 font-sans"
              >
                {isFullScreen ? (
                  <><Minimize className="w-4 h-4" /> Exit Fullscreen</>
                ) : (
                  <><Maximize className="w-4 h-4" /> Fullscreen</>
                )}
              </button>
            </div>
          </div>

          <div className="flex-1 rounded-xl overflow-hidden bg-dark-950 border border-white/5 relative">
            <ReactFlow
              nodes={layoutedNodes}
              edges={layoutedEdges}
              nodeTypes={nodeTypes}
              fitView
              minZoom={0.2}
              className="bg-dark-950"
            >
              <Background color="rgba(255,255,255,0.1)" gap={16} size={1} />
              <Controls className="bg-dark-900 border-white/10 fill-white" />
              <MiniMap 
                nodeColor={(n) => '#7c3aed'} 
                maskColor="rgba(0, 0, 0, 0.5)" 
                className="bg-dark-900 border border-white/10 rounded-lg"
              />
            </ReactFlow>
          </div>
        </motion.div>

        {/* Expandable Table Directory */}
        <motion.div variants={itemVariants} className="glass-dark rounded-2xl overflow-hidden border border-white/10">
          <div className="p-6 border-b border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Database className="w-5 h-5 text-secondary" />
                Table Schema Directory
              </h2>
            </div>

            <div className="relative max-w-xs w-full">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Search tables..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input-dark pl-9 py-2 text-sm w-full"
              />
            </div>
          </div>

          <div className="divide-y divide-white/10">
            {filteredTables.map((table) => {
              const isExpanded = expandedTable === table.name
              return (
                <div key={table.name} className="transition-colors">
                  <div
                    onClick={() => toggleExpandTable(table.name)}
                    className="p-5 flex items-center justify-between hover:bg-white/5 cursor-pointer transition-all"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-8 h-8 rounded-lg bg-secondary/20 text-secondary flex items-center justify-center font-bold">
                        {isExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5 text-gray-400" />}
                      </div>
                      <div>
                        <h3 className="font-bold text-lg text-white flex items-center gap-2">
                          {table.name}
                          <span className="text-xs font-mono text-gray-400">({table.columnsCount || table.columns?.length || 8} cols)</span>
                        </h3>
                        <p className="text-xs text-gray-400">{table.description || 'Database entity table'}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-6">
                      <div className="text-right hidden sm:block">
                        <p className="text-xs font-mono text-gray-300">{table.records?.toLocaleString()} rows</p>
                        <p className="text-[10px] text-gray-500 font-mono">{table.size}</p>
                      </div>
                    </div>
                  </div>

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="bg-dark-950/80 p-6 border-t border-white/10 space-y-6"
                      >
                        <div>
                          <h4 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                            <Layers className="w-4 h-4 text-primary" />
                            Column Definitions & Constraints
                          </h4>
                          <div className="overflow-x-auto rounded-xl border border-white/10">
                            <table className="w-full text-left text-xs font-mono">
                              <thead className="bg-dark-900 text-gray-400 uppercase text-[10px]">
                                <tr>
                                  <th className="p-3">Column Name</th>
                                  <th className="p-3">Data Type</th>
                                  <th className="p-3">Constraints</th>
                                  <th className="p-3">Nullable</th>
                                  <th className="p-3">Description</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-white/5 bg-dark-950">
                                {(table.columns || []).map((col, cIdx) => (
                                  <tr key={cIdx} className="hover:bg-white/5">
                                    <td className="p-3 font-bold text-white flex items-center gap-1.5">
                                      {col.pk && <span className="text-yellow-400 font-bold" title="Primary Key">🔑</span>}
                                      {col.fk && <span className="text-primary font-bold" title="Foreign Key">🔗</span>}
                                      {col.name}
                                    </td>
                                    <td className="p-3 text-secondary">{col.type}</td>
                                    <td className="p-3">
                                      <div className="flex flex-wrap gap-1">
                                        {col.pk && <span className="px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-300 text-[9px]">PK</span>}
                                        {col.fk && <span className="px-1.5 py-0.5 rounded bg-primary/20 text-primary text-[9px]">FK: {col.references}</span>}
                                        {col.unique && <span className="px-1.5 py-0.5 rounded bg-green-500/20 text-green-300 text-[9px]">UNIQUE</span>}
                                      </div>
                                    </td>
                                    <td className="p-3">
                                      {col.nullable ? (
                                        <span className="text-gray-400">YES</span>
                                      ) : (
                                        <span className="text-green-400 font-bold">NOT NULL</span>
                                      )}
                                    </td>
                                    <td className="p-3 text-gray-400 font-sans text-xs">{col.desc || 'Column attribute'}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>

                        {table.sampleRows && (
                          <div>
                            <h4 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                              <Code className="w-4 h-4 text-secondary" />
                              Sample Rows Preview (`SELECT * FROM {table.name} LIMIT 3;`)
                            </h4>
                            <div className="overflow-x-auto rounded-xl border border-white/10 bg-dark-900 p-4 font-mono text-xs">
                              <table className="w-full text-left">
                                <thead className="text-gray-400 border-b border-white/10">
                                  <tr>
                                    {Object.keys(table.sampleRows[0] || {}).map((k) => (
                                      <th key={k} className="pb-2 pr-4">{k}</th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                  {table.sampleRows.map((row, rIdx) => (
                                    <tr key={rIdx}>
                                      {Object.values(row).map((v, valIdx) => (
                                        <td key={valIdx} className="py-2 pr-4 text-gray-300 truncate max-w-[150px]">{String(v)}</td>
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
