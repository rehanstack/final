import React from 'react'
import { motion } from 'framer-motion'
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { TrendingUp, AlertCircle, BarChart3, PieChart as PieChartIcon, Layers, Activity } from 'lucide-react'
import { loadAnalysis, DATASETS } from '../lib/analysisState'

export default function QualityMetrics() {
  const analysis = loadAnalysis()
  const currentDatasetKey = analysis.datasetKey || 'E-Commerce Dataset'
  const datasetMeta = DATASETS[currentDatasetKey] || DATASETS['E-Commerce Dataset']
  const tablesList = analysis.tables || datasetMeta.tables || []

  // Chart Data Configurations
  const completenessData = tablesList.map(t => ({
    name: t.name,
    quality: t.quality,
  }))

  const storageDistributionData = tablesList.map(t => ({
    name: t.name,
    value: parseFloat(t.size?.replace(/[^0-9.]/g, '')) || 5
  }))

  const columnTypesData = analysis.columnTypesBreakdown || datasetMeta.columnTypesBreakdown || [
    { name: 'VARCHAR', count: 68 },
    { name: 'UUID', count: 32 },
    { name: 'TIMESTAMP', count: 24 },
    { name: 'DECIMAL', count: 18 },
    { name: 'INT', count: 14 }
  ]

  const nullabilityData = tablesList.map(t => ({
    name: t.name,
    nullableRatio: Math.round(((t.nullableCount || 2) / (t.columnsCount || 8)) * 100)
  }))

  const COLORS = ['#7c3aed', '#06b6d4', '#ec4899', '#f59e0b', '#10b981', '#6366f1']

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
          <h1 className="text-3xl font-bold mb-2">Data Quality & Health Metrics</h1>
          <p className="text-gray-400">Database statistics, storage distribution, and missing attribute tracking</p>
        </motion.div>

        {/* Top KPI Cards */}
        <motion.div variants={itemVariants} className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          {[
            { icon: TrendingUp, label: 'Data Quality Score', value: `${analysis.metrics.quality || 91}%`, sub: 'Overall Completeness', color: 'border-accent/50 text-accent bg-accent/10' },
            { icon: AlertCircle, label: 'Anomalies Flagged', value: String(analysis.metrics.anomalies || 3), sub: 'Actionable Insights', color: 'border-yellow-500/50 text-yellow-400 bg-yellow-500/10' },
            { icon: Layers, label: 'Total Columns', value: String(datasetMeta.columnsCount || 156), sub: 'Across All Tables', color: 'border-primary/50 text-primary bg-primary/10' },
            { icon: Activity, label: 'Storage Size', value: analysis.metrics.totalSize || '42.5 GB', sub: 'Total Disk Space', color: 'border-secondary/50 text-secondary bg-secondary/10' }
          ].map((metric, i) => {
            const Icon = metric.icon
            return (
              <motion.div
                key={i}
                whileHover={{ y: -4 }}
                className={`glass-dark p-6 rounded-2xl border transition-all ${metric.color.split(' ')[0]}`}
              >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${metric.color.split(' ').slice(1).join(' ')}`}>
                  <Icon className="w-6 h-6" />
                </div>
                <p className="text-xs text-gray-400 uppercase tracking-wider mb-1 font-semibold">{metric.label}</p>
                <p className="text-3xl font-bold text-white">{metric.value}</p>
                <p className="text-xs text-gray-500 mt-1">{metric.sub}</p>
              </motion.div>
            )
          })}
        </motion.div>

        {/* Charts Grid */}
        <div className="grid lg:grid-cols-2 gap-6 mb-10">
          {/* Chart 1: Per-Table Data Quality Score */}
          <motion.div variants={itemVariants} className="glass-dark p-6 rounded-2xl border border-white/10">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-primary" />
                Data Quality Score by Table
              </h2>
              <span className="text-xs text-gray-400">Target &ge; 90%</span>
            </div>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={completenessData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                <XAxis dataKey="name" stroke="rgba(255,255,255,0.5)" tick={{ fontSize: 11 }} />
                <YAxis stroke="rgba(255,255,255,0.5)" domain={[0, 100]} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }} />
                <Bar dataKey="quality" fill="#7c3aed" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </motion.div>

          {/* Chart 2: Storage Size Breakdown Donut */}
          <motion.div variants={itemVariants} className="glass-dark p-6 rounded-2xl border border-white/10">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <PieChartIcon className="w-5 h-5 text-secondary" />
                Storage Size Distribution (GB)
              </h2>
              <span className="text-xs text-gray-400">{analysis.metrics.totalSize || '42.5 GB'} Total</span>
            </div>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={storageDistributionData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={4}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}GB`}
                >
                  {storageDistributionData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }} />
              </PieChart>
            </ResponsiveContainer>
          </motion.div>

          {/* Chart 3: Data Types Breakdown */}
          <motion.div variants={itemVariants} className="glass-dark p-6 rounded-2xl border border-white/10">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Layers className="w-5 h-5 text-accent" />
                Column Data Type Distribution
              </h2>
            </div>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={columnTypesData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                <XAxis type="number" stroke="rgba(255,255,255,0.5)" />
                <YAxis dataKey="name" type="category" stroke="rgba(255,255,255,0.5)" tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }} />
                <Bar dataKey="count" fill="#ec4899" radius={[0, 8, 8, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </motion.div>

          {/* Chart 4: Nullability & Missing Values */}
          <motion.div variants={itemVariants} className="glass-dark p-6 rounded-2xl border border-white/10">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Activity className="w-5 h-5 text-yellow-400" />
                Missing Attributes (% Nullable)
              </h2>
            </div>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={nullabilityData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                <XAxis dataKey="name" stroke="rgba(255,255,255,0.5)" tick={{ fontSize: 11 }} />
                <YAxis stroke="rgba(255,255,255,0.5)" domain={[0, 100]} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }} />
                <Bar dataKey="nullableRatio" fill="#f59e0b" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </motion.div>
        </div>
      </motion.div>
    </div>
  )
}
