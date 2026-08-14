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

const COLORS = ['#7c3aed', '#06b6d4', '#ec4899', '#f59e0b', '#10b981', '#6366f1', '#f97316', '#8b5cf6']

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
    backgroundColor: '#0f172a',
    borderRadius: '10px',
    border: '1px solid rgba(255,255,255,0.12)',
    color: '#fff'
  }

  if (chart.type === 'pie') {
    return (
      <ResponsiveContainer width="100%" height={290}>
        <RechartsPieChart>
          <Pie
            data={pieData.length > 0 ? pieData : [{ name: 'No data', value: 1 }]}
            cx="50%" cy="45%"
            innerRadius={52} outerRadius={88}
            paddingAngle={2} dataKey="value"
            label={({ name, percent }) => percent > 0.06 ? `${name} (${(percent * 100).toFixed(0)}%)` : ''}
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
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.07)" />
          <XAxis dataKey="name" stroke="rgba(255,255,255,0.4)" tick={{ fontSize: 11 }} />
          <YAxis stroke="rgba(255,255,255,0.4)" tick={{ fontSize: 11 }} tickFormatter={fmtNum} width={52} />
          <Tooltip contentStyle={tooltipStyle} formatter={v => [fmtNum(v), chart.yAxis || 'Value']} />
          <Line type="monotone" dataKey="value" stroke="#7c3aed" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 7 }} />
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
              <stop offset="5%" stopColor="#ec4899" stopOpacity={0.35} />
              <stop offset="95%" stopColor="#ec4899" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.07)" />
          <XAxis dataKey="name" stroke="rgba(255,255,255,0.4)" tick={{ fontSize: 11 }} />
          <YAxis stroke="rgba(255,255,255,0.4)" tick={{ fontSize: 11 }} tickFormatter={fmtNum} width={52} />
          <Tooltip contentStyle={tooltipStyle} formatter={v => [fmtNum(v), chart.yAxis || 'Value']} />
          <Area type="monotone" dataKey="value" stroke="#ec4899" strokeWidth={2.5} fill={`url(#ag-${chart.id})`} />
        </AreaChart>
      </ResponsiveContainer>
    )
  }

  // Default: bar
  return (
    <ResponsiveContainer width="100%" height={290}>
      <BarChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.07)" />
        <XAxis dataKey="name" stroke="rgba(255,255,255,0.4)" tick={{ fontSize: 11 }} />
        <YAxis stroke="rgba(255,255,255,0.4)" tick={{ fontSize: 11 }} tickFormatter={fmtNum} width={52} />
        <Tooltip contentStyle={tooltipStyle} formatter={v => [fmtNum(v), chart.yAxis || 'Value']} />
        <Bar dataKey="value" radius={[5, 5, 0, 0]}>
          {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

// ─── Auto chart generator (from sampleRows) ──────────────────────────────────

function buildAutoCharts(allTables, sampleRows, availableColumns) {
  const charts = []
  if (sampleRows.length === 0 && allTables.length > 0) {
    // No row data — make a "Columns per Table" chart from schema
    const data = allTables.map(t => ({ name: t.name, value: t.columns?.length || 0 })).filter(d => d.value > 0).slice(0, 12)
    if (data.length > 0) {
      charts.push({ id: 'auto-schema', title: 'Columns per Table (Schema Overview)', type: 'bar', data, isAutoGenerated: true })
    }
    // FK relationships chart
    const fkData = allTables.map(t => ({
      name: t.name,
      value: (t.columns || []).filter(c => c.fk).length
    })).filter(d => d.value > 0).slice(0, 10)
    if (fkData.length > 0) {
      charts.push({ id: 'auto-fk', title: 'Foreign Key Count per Table', type: 'bar', data: fkData, isAutoGenerated: true })
    }
    return charts
  }

  const allCols = availableColumns && availableColumns.length > 0
    ? availableColumns
    : (sampleRows.length > 0 ? Object.keys(sampleRows[0]) : [])

  const nonIdCols = allCols.filter(c => !c.toLowerCase().endsWith('_id') && c.toLowerCase() !== 'id')
  const usableCols = nonIdCols.length > 0 ? nonIdCols : allCols

  const numCols = usableCols.filter(c => isNumericCol(c, sampleRows))
  const catCols = usableCols.filter(c => !numCols.includes(c))

  const dateCol = usableCols.find(c => /year|date|time|month|day/i.test(c))
  const xCol = catCols[0] || dateCol || usableCols[0]
  const yCol = numCols.find(c => c !== xCol) || numCols[0]

  // Chart 1 — Categorical / Primary Distribution
  if (xCol) {
    const data = aggregateData(sampleRows, xCol, null, 'count').slice(0, 10)
    if (data.length > 0) {
      charts.push({
        id: 'auto-dist',
        title: `Distribution by ${xCol.replace(/_/g, ' ')}`,
        type: data.length <= 6 ? 'pie' : 'bar',
        xAxis: xCol, yAxis: 'count',
        isAutoGenerated: true, data
      })
    }
  }

  // Chart 2 — Numeric metric by Category
  if (xCol && yCol && xCol !== yCol) {
    const data = aggregateData(sampleRows, xCol, yCol, 'sum').slice(0, 10)
    if (data.length > 0) {
      charts.push({
        id: 'auto-metric',
        title: `Total ${yCol.replace(/_/g, ' ')} by ${xCol.replace(/_/g, ' ')}`,
        type: 'bar', xAxis: xCol, yAxis: yCol,
        isAutoGenerated: true, data
      })
    }
  }

  // Chart 3 — Date / Timeline Trend (if date/year col exists) or second category
  if (dateCol && yCol) {
    const data = aggregateData(sampleRows, dateCol, yCol, 'sum').slice(0, 12).sort((a, b) => a.name.localeCompare(b.name))
    if (data.length > 0) {
      charts.push({
        id: 'auto-trend',
        title: `${yCol.replace(/_/g, ' ')} Trend by ${dateCol.replace(/_/g, ' ')}`,
        type: 'line', xAxis: dateCol, yAxis: yCol,
        isAutoGenerated: true, data
      })
    }
  } else {
    const xCol2 = catCols.find(c => c !== xCol)
    if (xCol2) {
      const data = aggregateData(sampleRows, xCol2, null, 'count').slice(0, 6)
      if (data.length > 0) {
        charts.push({
          id: 'auto-cat2',
          title: `Breakdown by ${xCol2.replace(/_/g, ' ')}`,
          type: 'pie', xAxis: xCol2, yAxis: 'count',
          isAutoGenerated: true, data
        })
      }
    }
  }

  // Chart 4 — If multiple tables, add schema overview as 4th chart
  if (allTables.length > 1) {
    const tableData = allTables.map(t => ({ name: t.name, value: t.records || t.columns?.length || 0 })).filter(d => d.value > 0).slice(0, 8)
    if (tableData.length > 0) {
      charts.push({
        id: 'auto-tables',
        title: 'Table Sizes (Row Counts)',
        type: 'bar', data: tableData, isAutoGenerated: true
      })
    }
  }

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
  const [promptInput, setPromptInput] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [builderMode, setBuilderMode] = useState('prompt')
  const [manualConfig, setManualConfig] = useState({ xAxis: '', yAxis: '', aggregation: 'count', chartType: 'auto' })
  const [errorMsg, setErrorMsg] = useState(null)

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
    const fromTables = allTables.flatMap(t => t.sampleRows || []).filter(Boolean)
    return fromTables.length > 0 ? fromTables : (analysis.customData?.sampleRows || [])
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

  // What to render: dynamic (user-generated) > auto/demo fallback
  // For custom: show dynamic + auto background; for demo: show dynamic + demo background
  const chartsToRender = useMemo(() => {
    if (hasDynamic) return dynamicCharts
    if (isCustom) return autoCharts
    return demoCharts
  }, [hasDynamic, isCustom, dynamicCharts, autoCharts, demoCharts])

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

  // ── Chart generation ─────────────────────────────────────────────────────

  const handleGenerateCustomChart = async (e) => {
    e.preventDefault()
    setIsGenerating(true)
    setErrorMsg(null)

    const colDescriptors = columnSchema.map(c => c.type ? `${c.name} (${c.type})` : c.name)

    const payload = {
      prompt: builderMode === 'prompt' ? promptInput : '',
      xAxis: builderMode === 'manual' ? manualConfig.xAxis : '',
      yAxis: builderMode === 'manual' ? manualConfig.yAxis : '',
      aggregation: builderMode === 'manual' ? manualConfig.aggregation : 'auto',
      chartType: builderMode === 'manual' ? manualConfig.chartType : 'auto',
      data: sampleRows,
      columns: colDescriptors.length > 0 ? colDescriptors : availableColumns,
      isSynthetic: sampleRows.length === 0
    }

    // Try backend
    let newChart = null
    try {
      const res = await apiPost('/api/generate-chart', payload)
      newChart = res?.data?.chart
    } catch {}

    // Client-side fallback
    if (!newChart) {
      newChart = buildChartClientSide(payload, sampleRows, allTables, availableColumns, columnSchema)
    }

    if (newChart) {
      updateChartsState([newChart, ...dynamicCharts])
      setPromptInput('')
    }
    setIsGenerating(false)
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
        <motion.div variants={itemVariants} className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
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

        {/* AI Chart Studio */}
        <motion.div variants={itemVariants} className="glass-dark p-6 rounded-2xl border border-primary/35 mb-8 bg-gradient-to-r from-primary/8 via-transparent to-secondary/8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-primary/20 text-primary rounded-xl"><Sparkles className="w-5 h-5" /></div>
              <div>
                <h2 className="text-lg font-bold flex items-center gap-2">
                  AI Custom Chart Studio
                  <span className="badge badge-primary text-[10px]">Live</span>
                </h2>
                <p className="text-xs text-gray-400">
                  {availableColumns.length > 0
                    ? `Columns available: ${availableColumns.slice(0, 5).join(', ')}${availableColumns.length > 5 ? ` +${availableColumns.length - 5} more` : ''}`
                    : 'Describe your chart in natural language or use the manual builder'}
                </p>
              </div>
            </div>
            <div className="flex rounded-xl bg-dark-800 p-1 border border-white/10 text-xs shrink-0">
              <button type="button" onClick={() => setBuilderMode('prompt')}
                className={`px-4 py-2 rounded-lg font-semibold transition-all ${builderMode === 'prompt' ? 'bg-primary text-white' : 'text-gray-400 hover:text-white'}`}>
                ✨ AI Prompt
              </button>
              <button type="button" onClick={() => setBuilderMode('manual')}
                className={`px-4 py-2 rounded-lg font-semibold transition-all ${builderMode === 'manual' ? 'bg-secondary text-white' : 'text-gray-400 hover:text-white'}`}>
                ⚙️ Manual
              </button>
            </div>
          </div>

          {errorMsg && <div className="mb-4 text-xs text-red-400 bg-red-500/10 p-3 rounded-xl border border-red-500/20">{errorMsg}</div>}

          {builderMode === 'prompt' ? (
            <form onSubmit={handleGenerateCustomChart} className="flex gap-3">
              <input type="text" value={promptInput}
                onChange={e => setPromptInput(e.target.value)}
                placeholder={availableColumns.length > 0
                  ? `e.g. "distribution of ${availableColumns[0] || 'status'}" or "compare ${availableColumns[0]} and ${availableColumns[1] || 'count'}"...`
                  : 'e.g. "bar chart of revenue by category"...'}
                className="input-dark flex-1 text-sm py-3 rounded-xl border border-white/10 focus:border-primary"
              />
              <button type="submit" disabled={isGenerating || !promptInput.trim()}
                className="button-primary py-3 px-6 text-sm font-semibold flex items-center gap-2 whitespace-nowrap disabled:opacity-50 hover:shadow-glow">
                {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                {isGenerating ? 'Generating…' : 'Generate'}
              </button>
            </form>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2">Chart Type</label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { id: 'auto', label: '✨ Auto' },
                    { id: 'bar', label: '📊 Bar' },
                    { id: 'line', label: '📈 Line' },
                    { id: 'pie', label: '🥧 Pie' },
                    { id: 'area', label: '📉 Area' },
                  ].map(ct => (
                    <button key={ct.id} type="button"
                      onClick={() => setManualConfig(p => ({ ...p, chartType: ct.id }))}
                      className={`px-4 py-2 rounded-xl border text-xs font-semibold transition-all ${manualConfig.chartType === ct.id ? 'border-primary bg-primary/20 text-white' : 'border-white/10 text-gray-400 hover:text-white'}`}>
                      {ct.label}
                    </button>
                  ))}
                </div>
              </div>
              <form onSubmit={handleGenerateCustomChart} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] text-gray-400 uppercase font-semibold mb-1">X-Axis (Category)</label>
                  <select value={manualConfig.xAxis} onChange={e => setManualConfig(p => ({ ...p, xAxis: e.target.value }))} className="input-dark w-full text-xs py-2.5">
                    <option value="">Select column…</option>
                    {availableColumns.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] text-gray-400 uppercase font-semibold mb-1">Y-Axis (Metric)</label>
                  <select value={manualConfig.yAxis} onChange={e => setManualConfig(p => ({ ...p, yAxis: e.target.value }))} className="input-dark w-full text-xs py-2.5">
                    <option value="">Count occurrences</option>
                    {availableColumns.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] text-gray-400 uppercase font-semibold mb-1">Aggregation</label>
                  <select value={manualConfig.aggregation} onChange={e => setManualConfig(p => ({ ...p, aggregation: e.target.value }))} className="input-dark w-full text-xs py-2.5">
                    <option value="count">Count</option>
                    <option value="sum">Sum</option>
                    <option value="avg">Average</option>
                  </select>
                </div>
                <div className="sm:col-span-3">
                  <button type="submit" disabled={isGenerating || !manualConfig.xAxis}
                    className="button-primary py-2.5 px-6 text-xs font-semibold inline-flex items-center gap-1.5 disabled:opacity-50">
                    {isGenerating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                    Generate &amp; Pin Chart
                  </button>
                </div>
              </form>
            </div>
          )}
        </motion.div>

        {/* Charts Grid */}
        {chartsToRender.length > 0 ? (
          <motion.div variants={itemVariants} className="grid lg:grid-cols-2 gap-6">
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

  // Match prompt words to column names
  if (payload.prompt && !xKey) {
    const lp = payload.prompt.toLowerCase()
    const matched = availableColumns.filter(c =>
      lp.includes(c.toLowerCase()) || lp.includes(c.toLowerCase().replace(/_/g, ' '))
    )
    if (matched.length >= 2) {
      const dateCol = matched.find(c => /year|date|time|month/i.test(c))
      const numCol = matched.find(c => columnSchema.find(s => s.name === c && s.type && /int|decimal|float|numeric/i.test(s.type)))
      xKey = dateCol || matched[0]
      yKey = numCol || matched.find(c => c !== xKey)
    } else if (matched.length === 1) {
      xKey = matched[0]
    }
  }

  // Smart column defaults from schema types
  if (!xKey) {
    const catCol = columnSchema.find(c => !c.pk && !c.name.toLowerCase().endsWith('_id') && (!c.type || /varchar|text|char|enum/i.test(c.type)))
    xKey = catCol?.name || availableColumns[0] || 'name'
  }
  if (!yKey) {
    const numCol = columnSchema.find(c => c.name !== xKey && !c.pk && c.type && /int|decimal|float|double|numeric/i.test(c.type))
    yKey = numCol?.name || null
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
