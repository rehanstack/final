import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Link } from 'react-router-dom'
import { TrendingUp, AlertTriangle, Shield, CheckCircle, Play, Filter, Sparkles, Database, Upload, BarChart3 } from 'lucide-react'
import { loadAnalysis, applyInsightFix } from '../lib/analysisState'

export default function Insights() {
  const [analysis, setAnalysis] = useState(() => loadAnalysis())
  const [severityFilter, setSeverityFilter] = useState('all')
  const [appliedNotification, setAppliedNotification] = useState(null)

  const severityStyles = {
    high: { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/30' },
    warning: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', border: 'border-yellow-500/30' },
    info: { bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/30' }
  }

  const handleApplyFix = (insightId, title) => {
    const updated = applyInsightFix(insightId)
    setAnalysis(updated)
    setAppliedNotification(`Applied fix for: "${title}". Quality score updated to ${updated.metrics.quality}%.`)
    setTimeout(() => setAppliedNotification(null), 4000)
  }

  const insightsList = analysis.insights || []

  const filteredInsights = insightsList.filter(item => {
    if (severityFilter === 'all') return true
    return item.severity === severityFilter
  })

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
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Header */}
        <motion.div variants={itemVariants} className="mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/20 text-primary border border-primary/30 text-xs font-semibold mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Gemini RAG Grounded Reasoning Engine</span>
          </div>
          <h1 className="text-4xl font-bold mb-2">AI-Generated Database Insights</h1>
          <p className="text-gray-400">Autonomous pattern discovery, data anomalies, and one-click SQL remediation</p>
        </motion.div>

        {/* Success Toast */}
        <AnimatePresence>
          {appliedNotification && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-8 p-4 rounded-xl glass-dark border border-green-500/40 bg-green-500/10 text-green-300 flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-green-400" />
                <span className="text-sm font-semibold">{appliedNotification}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Filter Controls */}
        <motion.div variants={itemVariants} className="flex flex-wrap items-center justify-between mb-8 gap-4 glass-dark p-4 rounded-xl border border-white/10">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-primary" />
            <span className="text-xs uppercase font-semibold text-gray-400">Filter by Severity:</span>
          </div>

          <div className="flex flex-wrap gap-2">
            {['all', 'high', 'warning', 'info'].map((sev) => (
              <button
                key={sev}
                onClick={() => setSeverityFilter(sev)}
                className={`px-4 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all ${
                  severityFilter === sev
                    ? 'bg-primary text-white shadow-glow'
                    : 'bg-dark-800 text-gray-400 hover:text-white border border-white/10'
                }`}
              >
                {sev === 'all' ? 'All Findings' : sev}
              </button>
            ))}
          </div>

          <span className="text-xs text-gray-400 font-semibold">
            Showing {filteredInsights.length} of {insightsList.length} Insights
          </span>
        </motion.div>

        {/* Insights List */}
        <div className="space-y-6 mb-12">
          {filteredInsights.map((insight, i) => {
            const styles = severityStyles[insight.severity] || severityStyles.info
            return (
              <motion.div
                key={insight.id || i}
                variants={itemVariants}
                className="glass-dark p-8 rounded-2xl border border-white/10 hover:border-primary/50 transition-all group relative overflow-hidden"
              >
                <div className="flex flex-col md:flex-row gap-6 items-start">
                  <div className={`w-12 h-12 rounded-xl ${styles.bg} border ${styles.border} flex items-center justify-center flex-shrink-0`}>
                    {insight.severity === 'high' ? (
                      <AlertTriangle className={`w-6 h-6 ${styles.text}`} />
                    ) : insight.severity === 'warning' ? (
                      <Shield className={`w-6 h-6 ${styles.text}`} />
                    ) : (
                      <TrendingUp className={`w-6 h-6 ${styles.text}`} />
                    )}
                  </div>

                  <div className="flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
                      <h3 className="text-xl font-bold text-white group-hover:text-primary transition-colors">
                        {insight.title}
                      </h3>
                      <div className="flex items-center gap-2">
                        <span className={`badge ${insight.severity === 'high' ? 'badge-danger' : insight.severity === 'warning' ? 'badge-warning' : 'badge-info'}`}>
                          {insight.severity.toUpperCase()}
                        </span>
                        <span className="text-xs text-gray-400 bg-dark-800 px-2.5 py-1 rounded border border-white/10">
                          {insight.confidence}% Confidence
                        </span>
                      </div>
                    </div>

                    <p className="text-gray-300 text-sm leading-relaxed mb-4">{insight.description}</p>

                    {/* Recommendation Box */}
                    <div className="bg-dark-800/80 border border-white/10 rounded-xl p-4 mb-4">
                      <p className="text-xs font-semibold uppercase tracking-wider text-primary mb-1">Recommended Action</p>
                      <p className="text-sm text-gray-300">{insight.recommendation}</p>
                    </div>

                    {/* SQL Fix Snippet */}
                    {insight.sqlFix && (
                      <div className="bg-dark-900 border border-white/10 rounded-xl p-4 mb-4 font-mono text-xs text-green-400 overflow-x-auto flex items-center justify-between gap-4">
                        <code className="truncate">{insight.sqlFix}</code>
                        <button
                          onClick={() => handleApplyFix(insight.id, insight.title)}
                          disabled={insight.applied}
                          className={`flex-shrink-0 text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
                            insight.applied
                              ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                              : 'button-primary text-xs py-1.5 px-3 hover:shadow-glow'
                          }`}
                        >
                          {insight.applied ? (
                            <>
                              <CheckCircle className="w-3.5 h-3.5" />
                              Fix Applied
                            </>
                          ) : (
                            <>
                              <Play className="w-3.5 h-3.5" />
                              Apply Fix
                            </>
                          )}
                        </button>
                      </div>
                    )}

                    <div className="flex items-center justify-between text-xs text-gray-400">
                      <span>Affected Table: <strong className="text-white">{insight.affectedTable}</strong></span>
                      <span className="uppercase tracking-wider font-semibold">{insight.type}</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>

        {/* Optimizations Box */}
        <motion.div variants={itemVariants} className="grid md:grid-cols-2 gap-6">
          <div className="glass-dark p-8 rounded-2xl border border-green-500/30 bg-green-500/5">
            <div className="flex items-center gap-3 mb-4">
              <CheckCircle className="w-6 h-6 text-green-400" />
              <h3 className="text-lg font-bold text-green-400">Schema Health Verified</h3>
            </div>
            <ul className="space-y-2 text-sm text-gray-300">
              <li>✓ Foreign key referential integrity index active</li>
              <li>✓ Columns normalized across primary entities</li>
              <li>✓ Temporal timestamps configured with indexed range queries</li>
            </ul>
          </div>

          <div className="glass-dark p-8 rounded-2xl border border-primary/30 bg-primary/5">
            <div className="flex items-center gap-3 mb-4">
              <BarChart3 className="w-6 h-6 text-primary" />
              <h3 className="text-lg font-bold text-primary">Continuous Monitoring</h3>
            </div>
            <ul className="space-y-2 text-sm text-gray-300">
              <li>• Automated 24/7 Z-score anomaly scanning</li>
              <li>• Real-time duplicate record hash validation</li>
              <li>• Grounded RAG knowledge base auto-indexing</li>
            </ul>
          </div>
        </motion.div>
      </motion.div>
    </div>
  )
}
