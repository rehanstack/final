import React, { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area,
  PieChart as RechartsPieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts'
import {
  BarChart3, TrendingUp, Users, Database, Activity,
  Sparkles, Plus, Trash2, Loader2, Pin, PieChart,
  Table2, Columns, Hash, RefreshCw
} from 'lucide-react'
import { apiPost } from '../lib/apiClient'
import { loadAnalysis, saveAnalysis, DATASETS } from '../lib/analysisState'

// ─── Helpers ────────────────────────────────────────────────────────────────

const COLORS = ['rgb(var(--color-primary))', 'rgb(var(--color-secondary))', 'rgb(var(--color-accent))', '#f59e0b', '#10b981', '#6366f1', '#f97316', '#8b5cf6']

function fmtNum(val) {
  if (val == null || isNaN(+val)) return String(val ?? '0')
  const n = Math.abs(+val)
  if (n >= 1e9) return (+val / 1e9).toFixed(1) + 'B'
  if (n >= 1e6) return (+val / 1e6).toFixed(1) + 'M'
  if (n >= 1e4) return (+val / 1e3).toFixed(1) + 'K'
  return Number((+val).toFixed(2)).toLocaleString()
}

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

function aggregateData(rows, xKey, yKey, agg = 'count') {
  if (!rows || rows.length === 0 || !xKey) return []
  const map = {}
  rows.forEach(row => {
    if (!row) return
    const xRaw = row[xKey]
    const xVal = (xRaw != null && String(xRaw).trim() !== '') ? String(xRaw).trim().slice(0, 28) : 'Unknown'
    if (!map[xVal]) map[xVal] = { sum: 0, count: 0 }
    map[xVal].count++
    if (agg !== 'count' && yKey) {
      const clean = String(row[yKey] ?? '').replace(/[^0-9.-]/g, '')
      const num = parseFloat(clean)
      if (!isNaN(num)) map[xVal].sum += num
    }
  })

  const entries = Object.entries(map)
  if (entries.length === 0) return []

  return entries
    .map(([name, { sum, count }]) => {
      const val = agg === 'count' ? count : agg === 'avg' ? (count ? sum / count : 0) : sum
      return {
        name,
        value: Math.round(val * 100) / 100
      }
    })
    .sort((a, b) => b.value - a.value)
}

// ─── Chart Renderer ──────────────────────────────────────────────────────────

function ChartRenderer({ chart }) {
  const data = (chart.data || []).map(d => ({
    name: String(d.name ?? ''),
    value: isNaN(+d.value) ? 0 : +d.value
  })).filter(d => d.name !== '')

  const pieData = data.filter(d => d.value > 0)

  const tooltipStyle = {
    backgroundColor: 'rgb(var(--color-dark-900))',
    borderRadius: '10px',
    border: '1px solid rgb(var(--color-white) / 0.12)',
    color: 'rgb(var(--color-white))'
  }

  if (chart.type === 'pie') {
    return (
      <ResponsiveContainer width="100%" height={290}>
        <RechartsPieChart>
          <Pie
            data={pieData.length > 0 ? pieData : [{ name: 'No data', value: 1 }]}
            cx="50%" cy="45%"
            innerRadius={52} outerRadius={88}
            paddingAngle={2} dataKey="value" nameKey="name"
            label={({ name, percent }) => (percent && percent > 0.06) ? `${name} (${(percent * 100).toFixed(0)}%)` : ''}
            labelLine={false}
          >
            {(pieData.length > 0 ? pieData : [{ name: 'No data', value: 1 }]).map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip contentStyle={tooltipStyle} formatter={v => [fmtNum(v), chart.yAxis || 'Value']} />
          <Legend verticalAlign="bottom" height={32} />
        </RechartsPieChart>
      </ResponsiveContainer>
    )
  }

  if (chart.type === 'line') {
    return (
      <ResponsiveContainer width="100%" height={290}>
        <LineChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--color-white) / 0.07)" />
          <XAxis dataKey="name" stroke="rgb(var(--color-white) / 0.4)" tick={{ fontSize: 11 }} />
          <YAxis stroke="rgb(var(--color-white) / 0.4)" tick={{ fontSize: 11 }} tickFormatter={fmtNum} width={52} />
          <Tooltip contentStyle={tooltipStyle} formatter={v => [fmtNum(v), chart.yAxis || 'Value']} />
          <Line type="monotone" dataKey="value" stroke="rgb(var(--color-primary))" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 7 }} />
        </LineChart>
      </ResponsiveContainer>
    )
  }

  if (chart.type === 'area') {
    return (
      <ResponsiveContainer width="100%" height={290}>
        <AreaChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={`ag-${chart.id}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="rgb(var(--color-accent))" stopOpacity={0.35} />
              <stop offset="95%" stopColor="rgb(var(--color-accent))" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--color-white) / 0.07)" />
          <XAxis dataKey="name" stroke="rgb(var(--color-white) / 0.4)" tick={{ fontSize: 11 }} />
          <YAxis stroke="rgb(var(--color-white) / 0.4)" tick={{ fontSize: 11 }} tickFormatter={fmtNum} width={52} />
          <Tooltip contentStyle={tooltipStyle} formatter={v => [fmtNum(v), chart.yAxis || 'Value']} />
          <Area type="monotone" dataKey="value" stroke="rgb(var(--color-accent))" strokeWidth={2.5} fill={`url(#ag-${chart.id})`} />
        </AreaChart>
      </ResponsiveContainer>
    )
  }

  // Default: bar
  return (
    <ResponsiveContainer width="100%" height={290}>
      <BarChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--color-white) / 0.07)" />
        <XAxis dataKey="name" stroke="rgb(var(--color-white) / 0.4)" tick={{ fontSize: 11 }} />
        <YAxis stroke="rgb(var(--color-white) / 0.4)" tick={{ fontSize: 11 }} tickFormatter={fmtNum} width={52} />
        <Tooltip contentStyle={tooltipStyle} formatter={v => [fmtNum(v), chart.yAxis || 'Value']} />
        <Bar dataKey="value" radius={[5, 5, 0, 0]}>
          {data.map((_, i) => <Cell key={`cell-${i}`} fill={COLORS[i % COLORS.length]} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

// ─── Auto chart generator (from sampleRows) ──────────────────────────────────

function buildAutoCharts(allTables, fallbackSampleRows, availableColumns) {
  const charts = []
  
  if (allTables.length > 1) {
    const businessTables = [...allTables]
      .filter(t => t.sampleRows && t.sampleRows.length > 0)
      .sort((a, b) => {
        const aScore = /order|sale|payment|revenue|invoice|customer|user/i.test(a.name) ? 1000 : 0
        const bScore = /order|sale|payment|revenue|invoice|customer|user/i.test(b.name) ? 1000 : 0
        return (bScore + (b.records || 0)) - (aScore + (a.records || 0))
      })
      .slice(0, 5) // Top 5 tables

    businessTables.forEach(t => {
      const rows = t.sampleRows
      const cols = Object.keys(rows[0] || {})
      const numCols = cols.filter(c => isNumericCol(c, rows) && !/(^id$|_id$)/i.test(c))
      const catCols = cols.filter(c => !numCols.includes(c) && !/(^id$|_id$)/i.test(c))
      const dateCols = cols.filter(c => /year|date|time|month|day|created|updated/i.test(c))
      
      dateCols.forEach(dateCol => {
        numCols.forEach(yCol => {
          const data = aggregateData(rows, dateCol, yCol, 'sum').slice(0, 12).sort((a, b) => String(a.name).localeCompare(String(b.name)))
          if (data.length > 0) {
            charts.push({
              id: `sugg-trend-${t.name}-${dateCol}-${yCol}`,
              title: `${t.name}: ${yCol.replace(/_/g, ' ')} Over Time`,
              type: /amount|revenue|total/i.test(yCol) ? 'area' : 'line', xAxis: dateCol, yAxis: yCol,
              isAutoGenerated: true, data
            })
          }
        })
      })

      catCols.forEach(xCol => {
        numCols.forEach(yCol => {
          const data = aggregateData(rows, xCol, yCol, 'sum').slice(0, 8)
          if (data.length > 0) {
            charts.push({
              id: `sugg-cat-${t.name}-${xCol}-${yCol}`,
              title: `${t.name}: ${yCol.replace(/_/g, ' ')} by ${xCol.replace(/_/g, ' ')}`,
              type: data.length <= 5 ? 'pie' : 'bar', xAxis: xCol, yAxis: yCol,
              isAutoGenerated: true, data
            })
          }
        })
        
        const dataCount = aggregateData(rows, xCol, null, 'count').slice(0, 6)
        if (dataCount.length > 0) {
          charts.push({
            id: `sugg-count-${t.name}-${xCol}`,
            title: `${t.name}: Breakdown by ${xCol.replace(/_/g, ' ')}`,
            type: 'pie', xAxis: xCol, yAxis: 'count',
            isAutoGenerated: true, data: dataCount
          })
        }
      })
    })
    
    return charts
  }

  // Fallback for CSV (single table) logic
  const sampleRows = fallbackSampleRows || []
  if (sampleRows.length === 0) return charts

  const cols = Object.keys(sampleRows[0] || {})
  const numCols = cols.filter(c => isNumericCol(c, sampleRows) && !/(^id$|_id$)/i.test(c))
  const catCols = cols.filter(c => !numCols.includes(c) && !/(^id$|_id$)/i.test(c))
  const dateCols = cols.filter(c => /year|date|time|month|day|created|updated/i.test(c))
  
  dateCols.forEach(dateCol => {
    numCols.forEach(yCol => {
      const data = aggregateData(sampleRows, dateCol, yCol, 'sum').slice(0, 12).sort((a, b) => String(a.name).localeCompare(String(b.name)))
      if (data.length > 0) {
        charts.push({
          id: `sugg-trend-${dateCol}-${yCol}`,
          title: `${yCol.replace(/_/g, ' ')} Over Time (${dateCol})`,
          type: /amount|revenue|total/i.test(yCol) ? 'area' : 'line', xAxis: dateCol, yAxis: yCol,
          isAutoGenerated: true, data
        })
      }
    })
  })

  catCols.forEach(xCol => {
    numCols.forEach(yCol => {
      const data = aggregateData(sampleRows, xCol, yCol, 'sum').slice(0, 8)
      if (data.length > 0) {
        charts.push({
          id: `sugg-cat-${xCol}-${yCol}`,
          title: `${yCol.replace(/_/g, ' ')} by ${xCol.replace(/_/g, ' ')}`,
          type: data.length <= 5 ? 'pie' : 'bar', xAxis: xCol, yAxis: yCol,
          isAutoGenerated: true, data
        })
      }
    })
    
    const dataCount = aggregateData(sampleRows, xCol, null, 'count').slice(0, 6)
    if (dataCount.length > 0) {
      charts.push({
        id: `sugg-count-${xCol}`,
        title: `Distribution of ${xCol.replace(/_/g, ' ')}`,
        type: 'pie', xAxis: xCol, yAxis: 'count',
        isAutoGenerated: true, data: dataCount
      })
    }
  })

  return charts
}

// Build static charts from demo dataset businessMetrics
function buildDemoCharts(businessMetrics) {
  const charts = []
  if (!businessMetrics) return charts
  if (businessMetrics.monthlyRevenue?.length > 0) {
    const firstItem = businessMetrics.monthlyRevenue[0]
    const valueKey = 'revenue' in firstItem ? 'revenue' : 'admissions' in firstItem ? 'admissions' : Object.keys(firstItem).find(k => k !== 'month') || 'value'
    charts.push({
      id: 'demo-revenue', type: 'line', isAutoGenerated: true,
      title: valueKey.charAt(0).toUpperCase() + valueKey.slice(1).replace(/_/g, ' ') + ' Trend (Monthly)',
      data: businessMetrics.monthlyRevenue.map(d => ({ name: d.month, value: d[valueKey] || 0 }))
    })
  }
  if (businessMetrics.userGrowth?.length > 0) {
    const firstItem = businessMetrics.userGrowth[0]
    const valueKey = Object.keys(firstItem).find(k => k !== 'month') || 'users'
    charts.push({
      id: 'demo-users', type: 'area', isAutoGenerated: true,
      title: valueKey.charAt(0).toUpperCase() + valueKey.slice(1).replace(/_/g, ' ') + ' Growth',
      data: businessMetrics.userGrowth.map(d => ({ name: d.month, value: d[valueKey] || 0 }))
    })
  }
  if (businessMetrics.salesByCategory?.length > 0) {
    charts.push({
      id: 'demo-cat', type: 'pie', isAutoGenerated: true,
      title: 'Distribution by Category',
      data: businessMetrics.salesByCategory.map(d => ({ name: d.name, value: d.value || 0 }))
    })
  }
  return charts
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function BusinessIntel() {
  const [analysis, setAnalysisState] = useState(() => loadAnalysis())
  const [errorMsg, setErrorMsg] = useState(null)
  const [suggFilter, setSuggFilter] = useState('all')

  const currentDatasetKey = analysis.datasetKey || 'E-Commerce Dataset'
  const isCustom = currentDatasetKey === 'Custom CSV' || currentDatasetKey === 'SQL Dump'
  const datasetMeta = isCustom ? null : (DATASETS[currentDatasetKey] || DATASETS['E-Commerce Dataset'])

  const dynamicCharts = useMemo(() => analysis.dynamicCharts || analysis.customData?.dynamicCharts || [], [analysis])
  const hasDynamic = dynamicCharts.length > 0

  // All tables + rows
  const allTables = useMemo(() =>
    analysis.tables || analysis.customData?.tables || datasetMeta?.tables || [],
    [analysis, datasetMeta])

  const sampleRows = useMemo(() => {
    if (allTables.length > 0) {
      const tablesWithRows = allTables.filter(t => t.sampleRows && t.sampleRows.length > 0)
      if (tablesWithRows.length > 0) {
        // Pick the largest table's rows to ensure a uniform schema for charting
        const largest = [...tablesWithRows].sort((a, b) => (b.records || 0) - (a.records || 0))[0]
        return largest.sampleRows
      }
    }
    return analysis.customData?.sampleRows || []
  }, [allTables, analysis])

  // All unique column names across all tables
  const availableColumns = useMemo(() => {
    const fromSchema = allTables.flatMap(t => (t.columns || []).map(c => typeof c === 'string' ? c : c.name))
    const fromRows = sampleRows.length > 0 ? Object.keys(sampleRows[0]) : []
    const all = [...new Set([...fromSchema, ...fromRows])].filter(Boolean)
    return all
  }, [allTables, sampleRows])

  // Column schema with type info for smart axis picking
  const columnSchema = useMemo(() =>
    allTables.flatMap(t => (t.columns || []).map(c =>
      typeof c === 'string' ? { name: c } : { name: c.name, type: c.type, pk: c.pk, fk: c.fk }
    )).filter((c, i, a) => a.findIndex(x => x.name === c.name) === i),
    [allTables])

  // Auto-generated charts for custom uploads
  const autoCharts = useMemo(() =>
    isCustom ? buildAutoCharts(allTables, sampleRows, availableColumns) : [],
    [isCustom, allTables, sampleRows, availableColumns])

  // Static demo charts for built-in datasets
  const demoCharts = useMemo(() =>
    !isCustom ? buildDemoCharts(datasetMeta?.businessMetrics) : [],
    [isCustom, datasetMeta])

  // What to render: only explicitly pinned/dynamic charts
  const chartsToRender = dynamicCharts

  // Unpinned suggestions to display as clickable buttons
  const suggestedCharts = useMemo(() => {
    const source = isCustom ? autoCharts : demoCharts
    return source.filter(sugg => !dynamicCharts.some(pinned => pinned.id === sugg.id))
  }, [isCustom, autoCharts, demoCharts, dynamicCharts])

  const filteredSuggestions = useMemo(() => {
    if (suggFilter === 'all') return suggestedCharts
    return suggestedCharts.filter(s => s.type === suggFilter)
  }, [suggestedCharts, suggFilter])

  // KPIs
  const autoKpis = useMemo(() => {
    if (!isCustom) return []
    return [
      { title: 'Tables', value: allTables.length, icon: Table2, color: 'primary' },
      { title: 'Total Columns', value: allTables.reduce((a, t) => a + (t.columns?.length || 0), 0), icon: Columns, color: 'secondary' },
      { title: 'Sample Rows', value: sampleRows.length.toLocaleString(), icon: Hash, color: 'accent' },
      { title: 'Relationships', value: analysis.relationships?.length || analysis.metrics?.relationships || 0, icon: Database, color: 'primary' },
    ]
  }, [isCustom, allTables, sampleRows, analysis])

  const kpisToShow = useMemo(() => {
    const dyn = analysis.dynamicKpis || analysis.customData?.dynamicKpis || []
    if (dyn.length > 0) return dyn
    if (isCustom) return autoKpis
    return [
      { title: 'Total Revenue', value: '$3.75M', icon: TrendingUp, color: 'primary' },
      { title: 'Active Users', value: '56,000', icon: Users, color: 'secondary' },
      { title: 'Total Orders', value: '108.4K', icon: Database, color: 'accent' },
      { title: 'Quality Score', value: `${analysis.metrics?.quality || 91}%`, icon: Activity, color: 'primary' },
    ]
  }, [analysis, isCustom, autoKpis])

  // Persist chart updates
  const updateChartsState = (newCharts) => {
    const updated = {
      ...analysis, dynamicCharts: newCharts,
      customData: { ...(analysis.customData || {}), dynamicCharts: newCharts }
    }
    setAnalysisState(updated)
    saveAnalysis(updated)
  }

  const handlePinSuggestion = (suggestion) => {
    const newChart = {
      ...suggestion,
      id: `pinned-${suggestion.id}-${Date.now()}`,
      isCustomPin: true
    }
    updateChartsState([newChart, ...dynamicCharts])
  }

  const handleDeleteChart = (id) => updateChartsState(dynamicCharts.filter(c => c.id !== id))
  const handleResetCharts = () => updateChartsState([])

  const containerVariants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.08 } } }
  const itemVariants = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }

  return (
    <div className="p-8 pb-20 max-w-7xl mx-auto w-full">
      <motion.div variants={containerVariants} initial="hidden" animate="visible">

        {/* Header */}
        <motion.div variants={itemVariants} className="mb-8 flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold mb-1">Business Intelligence &amp; Analytics</h1>
            <p className="text-gray-400 text-sm">
              {isCustom
                ? `Auto-generated insights for ${analysis.dataset || 'your uploaded database'} · ${allTables.length} tables · ${sampleRows.length} rows`
                : 'Marketing, growth, and operational metrics derived from your data'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {hasDynamic && (
            <button onClick={handleResetCharts} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-gray-300 border border-white/15 hover:border-red-400/40 hover:text-red-400 transition-all bg-dark-800/60">
                <RefreshCw className="w-3.5 h-3.5" /> Reset Charts
              </button>
            )}
            {(hasDynamic || autoCharts.length > 0) && (
              <div className="flex items-center gap-2 px-4 py-2 rounded-full glass border border-primary/30">
                <Sparkles className="w-4 h-4 text-primary" />
                <span className="text-sm font-semibold gradient-text">
                  {hasDynamic ? 'Custom AI Charts' : 'Auto-Generated'}
                </span>
              </div>
            )}
          </div>
        </motion.div>

        {/* KPI Cards */}
        <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {kpisToShow.map((kpi, idx) => {
            const Icon = kpi.icon || Activity
            const clr = { primary: { bg: 'bg-primary/15', text: 'text-primary', border: 'border-primary/25' }, secondary: { bg: 'bg-secondary/15', text: 'text-secondary', border: 'border-secondary/25' }, accent: { bg: 'bg-accent/15', text: 'text-accent', border: 'border-accent/25' } }
            const c = clr[kpi.color] || clr.primary
            return (
              <div key={idx} className={`glass-dark p-5 rounded-2xl border ${c.border}`}>
                <div className="flex items-center gap-3 mb-2">
                  <div className={`p-2.5 rounded-xl ${c.bg} ${c.text}`}><Icon className="w-5 h-5" /></div>
                  <p className="text-[11px] text-gray-400 font-semibold uppercase tracking-wide leading-tight">{kpi.title}</p>
                </div>
                <p className="text-2xl font-bold text-white">{kpi.value}</p>
              </div>
            )
          })}
        </motion.div>

        {/* AI Suggested Views */}
        {suggestedCharts.length > 0 && (
          <motion.div variants={itemVariants} className="mb-8 p-5 glass-dark border border-white/10 rounded-2xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
              <h2 className="text-sm font-bold flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                AI Suggested Views
              </h2>
              <div className="flex bg-dark-800 p-1 rounded-lg border border-white/10 shrink-0 overflow-x-auto hide-scrollbar">
                {['all', 'bar', 'line', 'pie', 'area'].map(f => (
                  <button key={f} onClick={() => setSuggFilter(f)}
                    className={`px-3 py-1.5 text-[10px] font-semibold uppercase rounded-md transition-all whitespace-nowrap ${suggFilter === f ? 'bg-primary text-white' : 'text-gray-400 hover:text-white'}`}>
                    {f}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="flex flex-wrap gap-2 max-h-[160px] overflow-y-auto pr-2 custom-scrollbar">
              {filteredSuggestions.map(sugg => (
                <button 
                  key={sugg.id} 
                  onClick={() => handlePinSuggestion(sugg)}
                  className="px-3 py-1.5 rounded-full border border-white/10 bg-dark-800 hover:border-primary hover:bg-primary/10 text-xs font-semibold text-gray-300 hover:text-white transition-all flex items-center gap-1.5 shrink-0"
                >
                  <Plus className="w-3 h-3 text-gray-500" />
                  {sugg.title}
                </button>
              ))}
              {filteredSuggestions.length === 0 && (
                <p className="text-xs text-gray-500 w-full text-center py-4">No suggestions found for this type.</p>
              )}
            </div>
          </motion.div>
        )}

        {/* Dashboard Charts */}
        {chartsToRender.length > 0 ? (
          <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {chartsToRender.map((chart, idx) => (
              <motion.div key={chart.id || idx} variants={itemVariants}
                className={`glass-dark p-6 rounded-2xl border transition-all ${
                  chart.isCustomPin
                    ? 'border-primary/50 shadow-glow bg-primary/5 lg:col-span-2'
                    : idx === 0 && chartsToRender.length > 1
                      ? 'border-white/15 lg:col-span-2'
                      : 'border-white/15'
                }`}>
                <div className="flex items-start justify-between mb-5">
                  <div>
                    <h2 className="text-sm font-bold flex items-center gap-2">
                      {chart.isCustomPin
                        ? <Pin className="w-4 h-4 text-primary fill-primary shrink-0" />
                        : <BarChart3 className="w-4 h-4 text-primary shrink-0" />}
                      {chart.title}
                    </h2>
                    <div className="flex items-center gap-2 mt-1">
                      {chart.isCustomPin && <span className="badge badge-primary text-[10px]">Custom AI</span>}
                      {chart.isAutoGenerated && <span className="badge badge-info text-[10px]">Auto</span>}
                      <span className="text-[10px] text-gray-500 uppercase font-mono">{chart.type}</span>
                    </div>
                  </div>
                  {chart.isCustomPin && (
                    <button onClick={() => handleDeleteChart(chart.id)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-all shrink-0 ml-2">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <ChartRenderer chart={chart} />
              </motion.div>
            ))}
          </motion.div>
        ) : (
          <motion.div variants={itemVariants} className="glass-dark p-12 rounded-2xl border border-white/10 text-center">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-r from-primary to-secondary flex items-center justify-center mx-auto mb-4">
              <BarChart3 className="w-7 h-7 text-white" />
            </div>
            <h3 className="text-xl font-bold mb-2">No Charts Yet</h3>
            <p className="text-gray-400 text-sm max-w-sm mx-auto mb-6">
              {isCustom
                ? 'Use the AI Chart Studio above to generate visualizations from your database schema.'
                : 'Generate a chart using the AI prompt or manual builder above.'}
            </p>
          </motion.div>
        )}

        {/* SQL schema overview */}
        {isCustom && allTables.length > 1 && (
          <motion.div variants={itemVariants} className="mt-8 glass-dark p-6 rounded-2xl border border-white/10">
            <h2 className="text-base font-bold mb-4 flex items-center gap-2">
              <Database className="w-4 h-4 text-secondary" /> Schema Overview
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
              {allTables.map((t, i) => (
                <div key={i} className="bg-dark-800/60 border border-white/10 rounded-xl p-3 hover:border-primary/30 transition-colors">
                  <p className="font-semibold text-white text-xs truncate">{t.name}</p>
                  <p className="text-[10px] text-gray-500 mt-0.5">{t.columns?.length || 0} cols</p>
                </div>
              ))}
            </div>
          </motion.div>
        )}

      </motion.div>
    </div>
  )
}

// ─── Client-side chart builder (runs when backend is offline/unavailable) ────

function buildChartClientSide(payload, sampleRows, allTables, availableColumns, columnSchema) {
  let xKey = payload.xAxis
  let yKey = payload.yAxis
  const agg = (payload.aggregation === 'auto' || !payload.aggregation) ? 'count' : payload.aggregation

  // Restrict matching strictly to valid columns present in the sampled rows, ignoring ID columns
  const validCols = (sampleRows.length > 0 ? Object.keys(sampleRows[0]) : availableColumns).filter(c => !/(^id$|_id$)/i.test(c))

  // Match prompt words to column names
  if (payload.prompt && !xKey) {
    const lp = payload.prompt.toLowerCase()
    const matched = validCols.filter(c =>
      lp.includes(c.toLowerCase()) || lp.includes(c.toLowerCase().replace(/_/g, ' '))
    )
    if (matched.length >= 2) {
      const dateCol = matched.find(c => /year|date|time|month/i.test(c))
      const numCol = matched.find(c => isNumericCol(c, sampleRows))
      xKey = dateCol || matched[0]
      yKey = numCol || matched.find(c => c !== xKey)
    } else if (matched.length === 1) {
      xKey = matched[0]
    }
  }

  // Smart column defaults from schema types / row data
  if (!xKey) {
    const catCol = validCols.find(c => !c.toLowerCase().endsWith('_id') && c.toLowerCase() !== 'id' && !isNumericCol(c, sampleRows))
    xKey = catCol || validCols[0] || 'name'
  }
  if (!yKey) {
    const numCol = validCols.find(c => c !== xKey && isNumericCol(c, sampleRows))
    yKey = numCol || null
  }

  let data = []

  if (sampleRows.length > 0) {
    data = aggregateData(sampleRows, xKey, yKey, agg).slice(0, 12)
  }

  // Schema-only fallback: columns-per-table
  if (data.length === 0 && allTables.length > 0) {
    data = allTables.map(t => ({ name: t.name, value: t.columns?.length || 0 })).filter(d => d.value > 0).slice(0, 12)
    xKey = 'table'
    yKey = 'columns'
  }

  // Determine chart type
  let type = payload.chartType && payload.chartType !== 'auto' ? payload.chartType : null
  if (!type) {
    const lp = (payload.prompt || '').toLowerCase()
    const lx = (xKey || '').toLowerCase()
    if (/year|date|time|month/.test(lx) || /trend|over time|timeline/.test(lp)) type = 'line'
    else if (/share|pie|distribut|percent|breakdown/.test(lp) || (data.length >= 2 && data.length <= 6)) type = 'pie'
    else if (/growth|cumulative|area/.test(lp)) type = 'area'
    else type = 'bar'
  }

  if (type === 'pie' && data.length > 6) {
    const top5 = data.slice(0, 5)
    const other = data.slice(5).reduce((s, d) => s + d.value, 0)
    data = [...top5, { name: 'Other', value: Math.round(other * 100) / 100 }]
  }

  const title = payload.prompt
    ? payload.prompt.charAt(0).toUpperCase() + payload.prompt.slice(1)
    : `${(yKey || 'Count').replace(/_/g, ' ')} by ${(xKey || 'Category').replace(/_/g, ' ')}`

  return {
    id: `custom-${Date.now()}`,
    title, type, xAxis: xKey, yAxis: yKey,
    aggregation: agg, isCustomPin: true,
    data: data.length > 0 ? data : [{ name: 'No data', value: 1 }]
  }
}
