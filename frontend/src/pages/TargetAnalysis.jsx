import React, { useState, useMemo, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Target, Activity, BarChart2, Sparkles, ChevronDown, CheckSquare, Square, BrainCircuit, Maximize2, X } from 'lucide-react'
import { loadAnalysis, DATASETS } from '../lib/analysisState'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import Mermaid from '../components/Mermaid'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ScatterChart, Scatter } from 'recharts'
import { apiPost } from '../lib/apiClient'

// ─── Helpers ────────────────────────────────────────────────────────────────
const COLORS = ['rgb(var(--color-primary))', 'rgb(var(--color-secondary))', 'rgb(var(--color-accent))', '#f59e0b', '#10b981', '#6366f1']

function isNumericCol(colName, rows) {
  if (!colName || !rows || rows.length === 0) return false
  const vals = rows.map(r => r[colName]).filter(v => v != null && String(v).trim() !== '')
  if (vals.length === 0) return false
  const numericCount = vals.filter(v => {
    if (typeof v === 'number') return !isNaN(v)
    const clean = String(v).replace(/[^0-9.-]/g, '')
    return clean !== '' && !isNaN(Number(clean))
  }).length
  return numericCount / vals.length > 0.55
}

function extractNumber(val) {
  if (typeof val === 'number') return val
  const clean = String(val).replace(/[^0-9.-]/g, '')
  return Number(clean)
}

function buildScatterData(rows, xCol, yCol) {
  return rows.map(r => ({
    x: extractNumber(r[xCol]),
    y: extractNumber(r[yCol]),
    name: r.name || r.title || r.id || 'Data Point'
  })).filter(d => !isNaN(d.x) && !isNaN(d.y)).slice(0, 500)
}

function buildGroupedBarData(rows, xCol, yCol, yIsNumeric) {
  if (yIsNumeric) {
    const groups = {}
    rows.forEach(r => {
      const x = String(r[xCol] || 'Unknown').trim()
      const y = extractNumber(r[yCol])
      if (!isNaN(y)) {
        if (!groups[x]) groups[x] = { sum: 0, count: 0 }
        groups[x].sum += y
        groups[x].count += 1
      }
    })
    return Object.entries(groups).map(([name, {sum, count}]) => ({
      name: name.slice(0, 15),
      value: Math.round((sum / count) * 100) / 100
    })).sort((a, b) => b.value - a.value).slice(0, 10)
  }
  return []
}

// ─── Main Component ──────────────────────────────────────────────────────────
export default function TargetAnalysis() {
  const [analysis] = useState(() => loadAnalysis())
  const currentDatasetKey = analysis.datasetKey || 'E-Commerce Dataset'
  const storageKey = `targetAnalysis_${currentDatasetKey}`

  // Lazy initialize state from localStorage
  const initSavedState = () => {
    try { return JSON.parse(localStorage.getItem(storageKey)) || {} } catch { return {} }
  }

  const [selectedTableName, setSelectedTableName] = useState(() => initSavedState().selectedTableName || '')
  const [targetCol, setTargetCol] = useState(() => initSavedState().targetCol || '')
  
  // Multivariate inputs state
  const [selectedInputs, setSelectedInputs] = useState(() => initSavedState().selectedInputs || [])
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  
  // AI Insights State
  const [aiFinalInsight, setAiFinalInsight] = useState(() => initSavedState().aiFinalInsight || "")
  const [loadingInsight, setLoadingInsight] = useState(false)

  // Full screen chart modal state
  const [expandedChart, setExpandedChart] = useState(null)

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify({
      selectedTableName,
      targetCol,
      selectedInputs,
      aiFinalInsight
    }))
  }, [selectedTableName, targetCol, selectedInputs, aiFinalInsight, storageKey])

  const isCustom = currentDatasetKey === 'Custom CSV' || currentDatasetKey === 'SQL Dump'
  const datasetMeta = isCustom ? null : (DATASETS[currentDatasetKey] || DATASETS['E-Commerce Dataset'])
  const allTables = useMemo(() => analysis.tables || analysis.customData?.tables || datasetMeta?.tables || [], [analysis, datasetMeta])

  useEffect(() => {
    if (allTables.length > 0 && !selectedTableName) {
      const tableWithRows = allTables.find(t => t.sampleRows && t.sampleRows.length > 0) || allTables[0]
      setSelectedTableName(tableWithRows.name)
    }
  }, [allTables, selectedTableName])

  const selectedTable = useMemo(() => allTables.find(t => t.name === selectedTableName) || allTables[0], [allTables, selectedTableName])
  
  const sampleRows = useMemo(() => {
    if (selectedTable?.sampleRows?.length > 0) return selectedTable.sampleRows
    return analysis.customData?.sampleRows || []
  }, [selectedTable, analysis])

  const availableColumns = useMemo(() => {
    if (sampleRows.length > 0) return Object.keys(sampleRows[0]).filter(c => !/(^id$|_id$)/i.test(c))
    if (selectedTable?.columns) return selectedTable.columns.map(c => typeof c === 'string' ? c : c.name).filter(c => !/(^id$|_id$)/i.test(c))
    return []
  }, [sampleRows, selectedTable])

  useEffect(() => {
    if (availableColumns.length > 0 && !targetCol) {
      const numCol = availableColumns.find(c => isNumericCol(c, sampleRows))
      const initTarget = numCol || availableColumns[0]
      setTargetCol(initTarget)
      
      const others = availableColumns.filter(c => c !== initTarget && isNumericCol(c, sampleRows)).slice(0, 3)
      setSelectedInputs(others.length > 0 ? others : availableColumns.filter(c => c !== initTarget).slice(0, 2))
    }
  }, [availableColumns, targetCol, sampleRows])

  const handleTargetChange = (e) => {
    const newTarget = e.target.value
    setTargetCol(newTarget)
    setSelectedInputs(prev => prev.filter(col => col !== newTarget))
    setAiFinalInsight("")
  }

  const toggleInput = (col) => {
    setSelectedInputs(prev => prev.includes(col) ? prev.filter(c => c !== col) : [...prev, col])
    setAiFinalInsight("")
    setAiReasoning("")
  }

  const targetIsNumeric = useMemo(() => isNumericCol(targetCol, sampleRows), [targetCol, sampleRows])

  const univariateData = useMemo(() => {
    if (!targetCol || sampleRows.length === 0) return []
    const counts = {}
    sampleRows.forEach(row => {
      let val = row[targetCol]
      if (val == null) return
      if (targetIsNumeric) {
        val = Math.round(extractNumber(val) * 10) / 10
      } else {
        val = String(val).trim()
      }
      counts[val] = (counts[val] || 0) + 1
    })
    return Object.entries(counts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 15)
  }, [targetCol, sampleRows, targetIsNumeric])

  const generateInsights = async () => {
    if (selectedInputs.length === 0) return alert("Please select at least one required input feature to analyze.")
    setLoadingInsight(true)
    setAiFinalInsight("")
    
    // Prepare a data sample to send to the AI
    const sampleDataForPrompt = sampleRows.map(r => {
      const obj = { [targetCol]: r[targetCol] }
      selectedInputs.forEach(col => obj[col] = r[col])
      return obj
    }).slice(0, 15) // send top 15 rows to save tokens
    
    try {
      const prompt = `Act as an expert Data Scientist. Perform a multivariate analysis on the dataset.
Target Output Variable: ${targetCol} (${targetIsNumeric ? 'Numeric' : 'Categorical'})
Selected Input Features: ${selectedInputs.join(', ')}

Here is a sample of 15 rows of actual data for these variables:
${JSON.stringify(sampleDataForPrompt, null, 2)}

Please provide a beautifully formatted Markdown analysis. Focus on the relationship between these specific inputs and the target. DO NOT just describe the sample data, use it to infer general trends.

CRITICAL INSTRUCTION: DO NOT output any reasoning trace, chain of thought, or <think> tags. Provide ONLY your final, nicely structured insights using headers, bullet points, and bold text.
IMPORTANT VISUALS: You MUST include at least one \`mermaid\` code block diagram (e.g. flowchart or pie chart) demonstrating the interaction between the features. You should also use Markdown tables and emojis to make the report visually engaging.
LENGTH LIMIT: You MUST keep your entire response extremely concise (under 600 words) so it does not hit token limits and get cut off mid-sentence. Get straight to the key insights.`

      const response = await apiPost('/api/chat', { 
        messages: [{ role: 'user', content: prompt }] 
      })

      if (response && response.status < 400) {
        const data = response.data || {}
        let fullText = data.response || data.answer || data.content || ""
        
        // Aggressively strip out any think tags if the model still disobeys
        fullText = fullText.replace(/<think>[\s\S]*?(?:<\/think>|$)/gi, '').trim()
        
        setAiFinalInsight(fullText || "No insights returned.")
      } else {
        const status = response?.status || 'Unknown'
        const errorMsg = response?.data?.error || response?.statusText || "Server error"
        setAiFinalInsight(`**Error:** HTTP ${status} - ${errorMsg}. Please check backend logs.`)
      }
    } catch (err) {
      setAiFinalInsight(`**Connection Failed.** Details: ${err.response?.data?.error || err.message}. Please ensure both Node.js backend and Python AI Layer are running.`)
    } finally {
      setLoadingInsight(false)
    }
  }

  // Common markdown renderer config
  const renderMarkdown = (text) => (
    <div className="prose prose-invert prose-p:text-gray-300 prose-headings:text-white max-w-none w-full">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({node, ...props}) => <h1 className="text-2xl md:text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-primary via-secondary to-white border-b border-white/10 pb-4 mb-6 mt-8" {...props} />,
          h2: ({node, ...props}) => <h2 className="text-xl md:text-2xl font-bold text-white mb-4 mt-8 flex items-center gap-2 before:content-[''] before:w-2 before:h-6 before:bg-primary before:rounded-full" {...props} />,
          h3: ({node, ...props}) => <h3 className="text-lg font-bold text-gray-200 mb-3 mt-6" {...props} />,
          ul: ({node, ...props}) => <ul className="list-none pl-0 mb-6 space-y-2" {...props} />,
          ol: ({node, ...props}) => <ol className="list-decimal pl-5 mb-6 space-y-2 text-gray-300 marker:text-primary marker:font-bold" {...props} />,
          li: ({node, ...props}) => <li className="relative pl-6 text-gray-300 before:content-['→'] before:absolute before:left-0 before:text-secondary before:font-bold" {...props} />,
          strong: ({node, ...props}) => <strong className="text-white font-bold bg-white/5 px-1 rounded" {...props} />,
          p: ({node, ...props}) => <p className="mb-4 text-gray-300 leading-relaxed text-[15px]" {...props} />,
          table: ({node, ...props}) => <div className="overflow-x-auto my-8 border border-white/10 rounded-2xl shadow-xl bg-dark-900/40 backdrop-blur-md"><table className="w-full text-sm text-left text-gray-300 border-collapse" {...props} /></div>,
          thead: ({node, ...props}) => <thead className="bg-gradient-to-r from-dark-800 to-dark-900 text-white" {...props} />,
          th: ({node, ...props}) => <th className="px-6 py-4 font-bold tracking-wider border-b border-white/10 text-primary" {...props} />,
          td: ({node, ...props}) => <td className="px-6 py-4 border-b border-white/5 group-hover:bg-white/5 transition-colors" {...props} />,
          tr: ({node, ...props}) => <tr className="group hover:bg-white/5 transition-colors" {...props} />,
          code: ({node, inline, className, children, ...props}) => {
            const match = /language-(\w+)/.exec(className || '')
            if (!inline && match && match[1] === 'mermaid') {
              return <Mermaid chart={String(children).replace(/\n$/, '')} />
            }
            return <code className={`${className} bg-primary/10 px-1.5 py-0.5 rounded-md text-primary text-[13px] font-mono border border-primary/20`} {...props}>{children}</code>
          },
          blockquote: ({node, ...props}) => <blockquote className="border-l-4 border-accent pl-6 py-2 my-6 italic text-gray-400 bg-accent/5 rounded-r-xl" {...props} />
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  )

  const containerVariants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.08 } } }
  const itemVariants = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }

  return (
    <div className="p-8 pb-20 max-w-7xl mx-auto w-full">
      <motion.div variants={containerVariants} initial="hidden" animate="visible">
        
        {/* Top Header & Data Selection Panel */}
        <motion.div variants={itemVariants} className="mb-8 p-6 glass-dark border border-white/10 rounded-2xl relative z-20">
          <div className="mb-6">
            <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
              <Target className="w-8 h-8 text-primary" /> Target & Multivariate Analysis
            </h1>
            <p className="text-gray-400 text-sm max-w-2xl">
              Explicitly choose a Target Output and multiple Input Features. Visualize their relationships and let the AI generate a comprehensive data science report.
            </p>
          </div>
          
          <div className="flex flex-col lg:flex-row gap-6 bg-dark-900/50 p-5 rounded-xl border border-white/5">
            
            {allTables.length > 1 && (
              <div className="flex-1">
                <label className="block text-[11px] font-bold text-gray-500 mb-1.5 uppercase tracking-wider">1. Source Table</label>
                <select 
                  value={selectedTableName} 
                  onChange={e => setSelectedTableName(e.target.value)}
                  className="w-full bg-dark-800 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                >
                  {allTables.map(t => <option key={t.name} value={t.name}>{t.name}</option>)}
                </select>
              </div>
            )}
            
            <div className="flex-1">
              <label className="block text-[11px] font-bold text-primary mb-1.5 uppercase tracking-wider">2. Target Output</label>
              <select 
                value={targetCol} 
                onChange={handleTargetChange}
                className="w-full bg-primary/10 border border-primary/30 rounded-lg px-3 py-2.5 text-sm text-primary font-semibold focus:border-primary outline-none"
              >
                {availableColumns.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div className="flex-1 relative">
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-[11px] font-bold text-secondary uppercase tracking-wider">3. Required Inputs</label>
                {selectedInputs.length > 0 && (
                  <button 
                    onClick={() => { setSelectedInputs([]); setAiFinalInsight(""); }}
                    className="text-[10px] text-secondary/80 hover:text-secondary uppercase tracking-wider font-bold transition-colors"
                  >
                    Clear All
                  </button>
                )}
              </div>
              <button 
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="w-full bg-secondary/10 border border-secondary/30 rounded-lg px-3 py-2.5 text-sm text-secondary font-semibold flex items-center justify-between hover:bg-secondary/20 transition-all"
              >
                <span>{selectedInputs.length === 0 ? "Select Inputs" : `${selectedInputs.length} Inputs Selected`}</span>
                <ChevronDown className={`w-4 h-4 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
              </button>
              
              {isDropdownOpen && (
                <div className="absolute top-[calc(100%+8px)] left-0 w-full bg-dark-800 border border-secondary/30 rounded-xl shadow-2xl p-2 z-50 max-h-60 overflow-y-auto custom-scrollbar">
                  {availableColumns.filter(c => c !== targetCol).map(col => (
                    <div 
                      key={col} 
                      className="flex items-center gap-3 p-2 hover:bg-white/5 cursor-pointer rounded-lg transition-colors"
                      onClick={() => toggleInput(col)}
                    >
                      {selectedInputs.includes(col) 
                        ? <CheckSquare className="w-4 h-4 text-secondary shrink-0" /> 
                        : <Square className="w-4 h-4 text-gray-500 shrink-0" />}
                      <span className={`text-sm truncate ${selectedInputs.includes(col) ? 'text-white' : 'text-gray-400'}`}>{col}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex-1 flex items-end">
              <button 
                onClick={generateInsights}
                disabled={loadingInsight || selectedInputs.length === 0}
                className="w-full py-2.5 bg-gradient-to-r from-primary to-secondary text-white rounded-lg text-sm font-bold hover:shadow-glow transition-all flex justify-center items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loadingInsight ? <Sparkles className="w-4 h-4 animate-spin" /> : <BrainCircuit className="w-4 h-4" />}
                {loadingInsight ? 'Analyzing...' : 'Generate AI Report'}
              </button>
            </div>
          </div>
        </motion.div>

        {isDropdownOpen && (
          <div className="fixed inset-0 z-10" onClick={() => setIsDropdownOpen(false)} />
        )}

        {sampleRows.length === 0 ? (
           <motion.div variants={itemVariants} className="p-8 text-center text-gray-500 glass-dark rounded-2xl">
             No sample data available to perform analysis.
           </motion.div>
        ) : (
          <div className="flex flex-col gap-8 relative z-0">
            
            {/* Row 1: Univariate Analysis */}
            <motion.div variants={itemVariants} className="glass-dark p-6 rounded-2xl border border-primary/20 bg-primary/5 w-full">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-xl font-bold flex items-center gap-2 text-primary">
                    <BarChart2 className="w-5 h-5" /> Univariate Analysis
                  </h2>
                  <p className="text-sm text-gray-400 mt-1">Target Distribution: <strong className="text-white">{targetCol}</strong></p>
                </div>
                <button 
                  onClick={() => setExpandedChart({ type: 'univariate', title: `Univariate Analysis: ${targetCol}` })}
                  className="p-2 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors"
                  title="View Full Screen"
                >
                  <Maximize2 className="w-5 h-5" />
                </button>
              </div>
              
              <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={univariateData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--color-white) / 0.05)" />
                    <XAxis dataKey="name" stroke="rgb(var(--color-white) / 0.4)" tick={{ fontSize: 12 }} />
                    <Tooltip cursor={{ fill: 'rgb(var(--color-white) / 0.05)' }} contentStyle={{ backgroundColor: 'var(--color-dark-900)', borderColor: 'rgb(var(--color-primary))', borderRadius: '8px' }} />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                      {univariateData.map((_, i) => <Cell key={i} fill="rgb(var(--color-primary))" />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </motion.div>

            {/* Row 2: Bivariate Analysis */}
            <motion.div variants={itemVariants} className="glass-dark p-6 rounded-2xl border border-secondary/20 w-full">
              <h2 className="text-xl font-bold flex items-center gap-2 mb-2 text-secondary">
                <Activity className="w-5 h-5" /> Bivariate Analysis
              </h2>
              <p className="text-sm text-gray-400 mb-6">Selected Input Features vs Target Output</p>
              
              {selectedInputs.length === 0 ? (
                <div className="h-[280px] flex items-center justify-center border border-dashed border-white/10 rounded-xl">
                  <p className="text-sm text-gray-500">Select required inputs above to generate comparison charts.</p>
                </div>
              ) : (
                <div className={`grid gap-6 ${selectedInputs.length === 1 ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'}`}>
                  {selectedInputs.map(col => {
                    const isNumeric = isNumericCol(col, sampleRows)
                    
                    return (
                      <div key={col} className="bg-dark-900/50 border border-white/5 rounded-xl p-4 h-[280px] flex flex-col relative group">
                        <div className="flex justify-between items-start mb-3">
                          <p className="text-sm font-bold text-gray-300 pr-8">{col} <span className="text-gray-500 font-normal block text-xs">vs {targetCol}</span></p>
                          <button 
                            onClick={() => setExpandedChart({ type: targetIsNumeric && isNumeric ? 'scatter' : 'bar', col: col, title: `Bivariate: ${col} vs ${targetCol}` })}
                            className="absolute top-3 right-3 p-1.5 opacity-0 group-hover:opacity-100 bg-white/10 hover:bg-white/20 rounded text-gray-300 transition-all"
                            title="View Full Screen"
                          >
                            <Maximize2 className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="flex-1 w-full">
                          {targetIsNumeric && isNumeric ? (
                            <ResponsiveContainer width="100%" height="100%">
                              <ScatterChart margin={{ top: 5, right: 10, bottom: 5, left: -20 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--color-white) / 0.05)" />
                                <XAxis type="number" dataKey="x" name={col} stroke="rgb(var(--color-white) / 0.4)" tick={{ fontSize: 10 }} tickCount={5} />
                                <YAxis type="number" dataKey="y" name={targetCol} stroke="rgb(var(--color-white) / 0.4)" tick={{ fontSize: 10 }} tickCount={5} />
                                <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{ backgroundColor: 'var(--color-dark-900)', borderColor: 'rgb(var(--color-secondary))', borderRadius: '8px', fontSize: '12px' }} />
                                <Scatter data={buildScatterData(sampleRows, col, targetCol)} fill="rgb(var(--color-secondary))" fillOpacity={0.6} />
                              </ScatterChart>
                            </ResponsiveContainer>
                          ) : (
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={buildGroupedBarData(sampleRows, isNumeric ? targetCol : col, isNumeric ? col : targetCol, targetIsNumeric || isNumeric)} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--color-white) / 0.05)" />
                                <XAxis dataKey="name" stroke="rgb(var(--color-white) / 0.4)" tick={{ fontSize: 10 }} />
                                <YAxis stroke="rgb(var(--color-white) / 0.4)" tick={{ fontSize: 10 }} />
                                <Tooltip cursor={{ fill: 'rgb(var(--color-white) / 0.05)' }} contentStyle={{ backgroundColor: 'var(--color-dark-900)', borderColor: 'rgb(var(--color-secondary))', borderRadius: '8px' }} />
                                <Bar dataKey="value" fill="rgb(var(--color-secondary))" radius={[4, 4, 0, 0]} />
                              </BarChart>
                            </ResponsiveContainer>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </motion.div>

            {/* Row 3: Multivariate AI Analysis */}
            <AnimatePresence>
              {aiFinalInsight && (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} 
                  className="glass-dark p-8 rounded-2xl border border-accent/20 shadow-2xl relative overflow-hidden w-full"
                >
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-secondary to-accent"></div>
                  
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-gradient-to-r from-primary/20 to-secondary/20 rounded-xl border border-primary/30">
                      <BrainCircuit className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-white">Multivariate AI Analysis</h2>
                      <p className="text-sm text-gray-400">Comprehensive AI report on the combined interactions of selected features.</p>
                    </div>
                  </div>

                  <div className="bg-dark-900/30 p-6 rounded-xl border border-white/5">
                    {renderMarkdown(aiFinalInsight)}
                  </div>

                </motion.div>
              )}
            </AnimatePresence>

          </div>
        )}

      </motion.div>

      {/* Expanded Chart Modal */}
      <AnimatePresence>
        {expandedChart && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex flex-col bg-dark-950/95 backdrop-blur-xl p-4 md:p-12"
          >
            <div className="flex justify-between items-center mb-6 max-w-7xl mx-auto w-full">
              <h2 className="text-2xl md:text-3xl font-bold text-white">{expandedChart.title}</h2>
              <button 
                onClick={() => setExpandedChart(null)} 
                className="p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors border border-white/10"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="flex-1 w-full max-w-7xl mx-auto bg-dark-900/50 border border-white/10 rounded-2xl p-4 md:p-8 flex items-center justify-center min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                {expandedChart.type === 'univariate' ? (
                  <BarChart data={univariateData} margin={{ top: 20, right: 30, left: 20, bottom: 40 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--color-white) / 0.1)" />
                    <XAxis dataKey="name" stroke="rgb(var(--color-white) / 0.6)" tick={{ fontSize: 14 }} angle={-45} textAnchor="end" height={60} />
                    <YAxis stroke="rgb(var(--color-white) / 0.6)" tick={{ fontSize: 14 }} />
                    <Tooltip cursor={{ fill: 'rgb(var(--color-white) / 0.05)' }} contentStyle={{ backgroundColor: 'var(--color-dark-900)', borderColor: 'rgb(var(--color-primary))', borderRadius: '12px', fontSize: '16px' }} />
                    <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                      {univariateData.map((_, i) => <Cell key={i} fill="rgb(var(--color-primary))" />)}
                    </Bar>
                  </BarChart>
                ) : expandedChart.type === 'scatter' ? (
                  <ScatterChart margin={{ top: 20, right: 30, bottom: 20, left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--color-white) / 0.1)" />
                    <XAxis type="number" dataKey="x" name={expandedChart.col} stroke="rgb(var(--color-white) / 0.6)" tick={{ fontSize: 14 }} />
                    <YAxis type="number" dataKey="y" name={targetCol} stroke="rgb(var(--color-white) / 0.6)" tick={{ fontSize: 14 }} />
                    <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{ backgroundColor: 'var(--color-dark-900)', borderColor: 'rgb(var(--color-secondary))', borderRadius: '12px', fontSize: '16px' }} />
                    <Scatter data={buildScatterData(sampleRows, expandedChart.col, targetCol)} fill="rgb(var(--color-secondary))" fillOpacity={0.7} />
                  </ScatterChart>
                ) : (
                  <BarChart data={buildGroupedBarData(sampleRows, isNumericCol(expandedChart.col, sampleRows) ? targetCol : expandedChart.col, isNumericCol(expandedChart.col, sampleRows) ? expandedChart.col : targetCol, true)} margin={{ top: 20, right: 30, left: 20, bottom: 40 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--color-white) / 0.1)" />
                    <XAxis dataKey="name" stroke="rgb(var(--color-white) / 0.6)" tick={{ fontSize: 14 }} angle={-45} textAnchor="end" height={60} />
                    <YAxis stroke="rgb(var(--color-white) / 0.6)" tick={{ fontSize: 14 }} />
                    <Tooltip cursor={{ fill: 'rgb(var(--color-white) / 0.05)' }} contentStyle={{ backgroundColor: 'var(--color-dark-900)', borderColor: 'rgb(var(--color-secondary))', borderRadius: '12px', fontSize: '16px' }} />
                    <Bar dataKey="value" fill="rgb(var(--color-secondary))" radius={[6, 6, 0, 0]} />
                  </BarChart>
                )}
              </ResponsiveContainer>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  )
}
