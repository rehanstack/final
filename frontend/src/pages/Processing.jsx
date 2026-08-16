import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2, Zap, Brain, RefreshCw, GitBranch, Gauge, BarChart3, Eye, Trash2, ArrowRight, Play, Pause, Database, Layers, Upload } from 'lucide-react'
import { clearAnalysis, completeAnalysis, loadAnalysis, saveAnalysis, AGENT_PIPELINE_STEPS } from '../lib/analysisState'
import { useNavigate, Link } from 'react-router-dom'
import { apiPost } from '../lib/apiClient'

export default function Processing() {
  const [analysis, setAnalysis] = useState(() => loadAnalysis())
  const [isPaused, setIsPaused] = useState(false)
  const [liveTime, setLiveTime] = useState(0)
  const navigate = useNavigate()
  const agentRefs = useRef([])

  // Empty State if no database uploaded
  if (!analysis || !analysis.hasAnalysis) {
    return (
      <div className="pt-32 pb-20 px-4 min-h-[85vh] flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-xl w-full glass-dark p-10 rounded-2xl border border-primary/30 text-center shadow-glow"
        >
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-r from-primary to-secondary flex items-center justify-center mx-auto mb-6 shadow-lg">
            <GitBranch className="w-10 h-10 text-white" />
          </div>

          <h1 className="text-3xl font-bold mb-3">No Active Workflow</h1>
          <p className="text-gray-400 mb-8 text-sm leading-relaxed">
            Upload or connect a database schema to launch the 7-agent autonomous processing framework.
          </p>

          <Link
            to="/upload"
            className="button-primary text-base justify-center inline-flex hover:shadow-glow py-3 px-8"
          >
            <Upload className="w-5 h-5" />
            Upload / Connect Database
          </Link>
        </motion.div>
      </div>
    )
  }

  const activeAgent = analysis.activeAgent || 0
  const completedAgents = analysis.completedAgents || []
  const progress = analysis.progress || 0

  const agentIcons = [Brain, GitBranch, Gauge, Eye, Database, Zap, BarChart3]

  const updateAnalysis = (updater) => {
    setAnalysis((current) => {
      const next = updater(current)
      saveAnalysis(next)
      return next
    })
  }

  const resetAnalysis = () => {
    clearAnalysis()
    const fresh = loadAnalysis()
    setAnalysis(fresh)
  }

  // Smooth Progress Timer
  useEffect(() => {
    if (!analysis.hasAnalysis || analysis.status !== 'processing' || isPaused) return undefined

    const interval = setInterval(() => {
      updateAnalysis((current) => {
        if (!current.hasAnalysis || current.status !== 'processing') return current
        
        // Calculate the maximum progress allowed for the current active agent (e.g., if agent 2 of 7 is running, max is ~42%)
        // We leave a 1% buffer so it doesn't overlap the next stage perfectly
        const maxAllowedProgress = ((current.activeAgent + 0.95) / AGENT_PIPELINE_STEPS.length) * 100;
        
        // Increment slowly by 1-3% every 800ms, but never exceed maxAllowedProgress
        const nextProgress = Math.min(maxAllowedProgress, current.progress + Math.random() * 2 + 1);
        
        return {
          ...current,
          progress: nextProgress,
          updatedAt: new Date().toISOString()
        }
      })
    }, 800)

    return () => clearInterval(interval)
  }, [analysis.hasAnalysis, analysis.status, isPaused])

  // Live Clock for currently running agent
  useEffect(() => {
    if (!analysis.hasAnalysis || analysis.status !== 'processing' || isPaused) return undefined
    
    const liveTimer = setInterval(() => {
      setLiveTime(prev => prev + 0.1);
    }, 100);
    
    return () => clearInterval(liveTimer);
  }, [analysis.hasAnalysis, analysis.status, isPaused, activeAgent]);

  // Reset live time and auto-scroll when active agent changes
  useEffect(() => {
    setLiveTime(0);
    if (agentRefs.current[activeAgent]) {
      // Small timeout to allow render to settle
      setTimeout(() => {
        agentRefs.current[activeAgent]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    }
  }, [activeAgent]);

  // Step-by-Step Agent Progression UI (visual fake progress while waiting)
  useEffect(() => {
    if (!analysis.hasAnalysis || analysis.status !== 'processing' || isPaused) return undefined

    if (activeAgent < AGENT_PIPELINE_STEPS.length) {
      // Cinematic pacing for the hackathon demo: 1.5s to 3.5s per agent
      const delays = [1500, 2200, 1800, 3100, 2500, 2800, 1900];
      const currentDelay = delays[activeAgent] || 2000;

      const timer = setTimeout(() => {
        updateAnalysis((current) => {
          if (!current.hasAnalysis || current.status !== 'processing') return current
          
          // Don't auto-complete the last agent until the API call finishes (only for custom data)
          const isCustom = ['Custom CSV', 'Custom Database', 'SQL Dump'].includes(current.datasetKey);
          if (isCustom && current.activeAgent === AGENT_PIPELINE_STEPS.length - 1 && !current.customData) {
              return current;
          }

          const nextActiveAgent = current.activeAgent + 1
          const nextCompleted = [...new Set([...current.completedAgents, current.activeAgent])]
          const targetProgress = Math.round((nextActiveAgent / AGENT_PIPELINE_STEPS.length) * 100)

          // If we just finished the last agent, mark it completed
          if (nextActiveAgent >= AGENT_PIPELINE_STEPS.length) {
            return {
              ...current,
              activeAgent: nextActiveAgent,
              completedAgents: nextCompleted,
              progress: 100,
              status: 'completed',
              updatedAt: new Date().toISOString()
            }
          }

          return {
            ...current,
            activeAgent: nextActiveAgent,
            completedAgents: nextCompleted,
            progress: Math.max(current.progress, targetProgress),
            updatedAt: new Date().toISOString()
          }
        })
      }, currentDelay)
      return () => clearTimeout(timer)
    }
    return undefined
  }, [analysis.hasAnalysis, analysis.status, activeAgent, isPaused])

  // Actual API Call to LangGraph (Runs in background while UI simulates)
  useEffect(() => {
    if (analysis.status === 'processing' && !isPaused && analysis.datasetKey) {
      const runAnalysis = async () => {
        // Skip backend analysis if it's a static demo dataset
        if (analysis.datasetKey !== 'Custom CSV' && analysis.datasetKey !== 'Custom Database' && analysis.datasetKey !== 'SQL Dump') {
          return;
        }

        try {
          const aiRes = await apiPost('/api/analyze', { 
            dbType: 'sqlite', 
            filename: '../backend/dbsense.db', 
            host: 'localhost', 
            dbName: 'dbsense.db', 
            username: '', 
            password: '' 
          });
          
          if (aiRes.data?.success && aiRes.data?.customDetails) {
            updateAnalysis((current) => {
              return {
                ...current,
                customData: aiRes.data.customDetails,
                metrics: {
                  ...current.metrics,
                  tables: aiRes.data.customDetails.tablesCount || current.metrics.tables,
                  relationships: aiRes.data.customDetails.relationshipsCount || current.metrics.relationships,
                  quality: aiRes.data.customDetails.qualityScore || current.metrics.quality,
                  anomalies: aiRes.data.customDetails.anomaliesCount || current.metrics.anomalies
                }
              }
            })
          }
        } catch (err) {
          console.error("AI Analysis failed. Silently ignoring to let demo animation complete:", err);
        }
      }
      
      runAnalysis()
    }
  }, [analysis.status, analysis.datasetKey, isPaused])

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  }

  return (
    <div className="pt-28 pb-20 px-4 min-h-screen">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="max-w-5xl mx-auto"
      >
        {/* Header */}
        <motion.div variants={itemVariants} className="text-center mb-12">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 mb-8 glass-dark p-8 rounded-2xl border border-white/10">
            <div className="text-center md:text-left flex-1">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/20 text-primary border border-primary/30 text-xs font-semibold mb-3">
                <Layers className="w-3.5 h-3.5" />
                <span>Multi-Agent Workflow Engine</span>
              </div>
              <h1 className="text-4xl font-bold mb-2">
                Analyzing: {analysis.dataset || 'Database Schema'}
              </h1>
              <p className="text-gray-400">
                Executing 7 autonomous agents across {analysis.metrics.tables || 12} tables and {analysis.metrics.relationships || 42} relationships.
              </p>
            </div>

            <div className="flex items-center justify-center gap-3">
              {analysis.status === 'processing' && (
                <button
                  onClick={() => setIsPaused(!isPaused)}
                  className="button-secondary text-sm"
                >
                  {isPaused ? <Play className="w-4 h-4 text-green-400" /> : <Pause className="w-4 h-4 text-yellow-400" />}
                  {isPaused ? 'Resume' : 'Pause'}
                </button>
              )}

              <button onClick={resetAnalysis} className="button-secondary text-sm">
                <Trash2 className="w-4 h-4 text-red-400" />
                Reset Pipeline
              </button>
            </div>
          </div>
        </motion.div>

        {/* Overall Progress Bar */}
        <motion.div 
          variants={itemVariants}
          className="glass-dark p-6 rounded-2xl border border-white/10 mb-8 sticky top-[100px] z-40 backdrop-blur-xl shadow-2xl"
        >
          <div className="flex justify-between items-center text-sm font-semibold mb-3">
            <span className="flex items-center gap-2">
              {analysis.status === 'completed' ? (
                <CheckCircle2 className="w-5 h-5 text-green-400" />
              ) : (
                <RefreshCw className="w-5 h-5 text-primary animate-spin" />
              )}
              <span>
                {analysis.status === 'completed'
                  ? 'All 7 Agents Completed Successfully'
                  : `Agent ${Math.min(activeAgent + 1, AGENT_PIPELINE_STEPS.length)} of ${AGENT_PIPELINE_STEPS.length}: ${AGENT_PIPELINE_STEPS[activeAgent]?.name || 'Processing'}`}
              </span>
            </span>
            <span className="text-xl font-bold gradient-text">{Math.min(Math.round(progress), 100)}%</span>
          </div>

          <div className="w-full bg-dark-800 rounded-full h-3 overflow-hidden border border-white/10">
            <motion.div
              className="h-full bg-gradient-to-r from-primary via-secondary to-accent"
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(progress, 100)}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </motion.div>

        {/* Agent Steps Flow */}
        <motion.div variants={itemVariants} className="space-y-4 mb-12">
          {AGENT_PIPELINE_STEPS.map((agentStep, index) => {
            const Icon = agentIcons[index] || Brain
            const isActive = activeAgent === index && analysis.status === 'processing'
            const isCompleted = completedAgents.includes(index) || analysis.status === 'completed'
            const agentOutput = analysis.agents?.[index]

            return (
              <motion.div
                key={agentStep.id}
                ref={(el) => (agentRefs.current[index] = el)}
                layout
                className={`glass-dark p-6 rounded-2xl transition-all duration-300 ${
                  isActive
                    ? 'border-2 border-primary shadow-glow bg-primary/5'
                    : isCompleted
                    ? 'border border-green-500/30'
                    : 'border border-white/10 opacity-70'
                }`}
              >
                <div className="flex items-start gap-4">
                  <motion.div
                    className={`flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center font-bold ${
                      isCompleted
                        ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                        : isActive
                        ? 'bg-gradient-to-r from-primary to-secondary text-white shadow-lg'
                        : 'bg-dark-700 text-gray-400 border border-white/10'
                    }`}
                    animate={isActive ? { scale: [1, 1.08, 1] } : {}}
                    transition={{ duration: 1.2, repeat: Infinity }}
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="w-6 h-6" />
                    ) : isActive ? (
                      <RefreshCw className="w-6 h-6 animate-spin" />
                    ) : (
                      <Icon className="w-6 h-6" />
                    )}
                  </motion.div>

                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className={`font-bold text-xl ${isCompleted ? 'text-green-400' : isActive ? 'text-primary' : 'text-white'}`}>
                        {agentStep.name}
                      </h3>
                      <div className="flex items-center gap-2">
                        {isCompleted && analysis.agentTimes && (
                          <span className="badge text-gray-300 border border-white/10 bg-dark-700/50">
                            {(() => {
                              const keys = ['master', 'schema', 'relationship', 'quality', 'rag', 'reasoning', 'visualization'];
                              const key = keys[agentStep.id];
                              const time = analysis.agentTimes[key];
                              return time ? `${time}s` : '0.1s';
                            })()}
                          </span>
                        )}
                        {isActive && (
                          <span className="badge text-primary border border-primary/30 bg-primary/10">
                            {liveTime.toFixed(1)}s
                          </span>
                        )}
                        {isCompleted && <span className="badge badge-success">Completed</span>}
                        {isActive && <span className="badge badge-warning animate-pulse">Running</span>}
                        {!isCompleted && !isActive && <span className="badge">Queued</span>}
                      </div>
                    </div>

                    <p className={`text-sm mb-3 ${isActive ? 'text-gray-200' : 'text-gray-400'}`}>
                      {agentStep.status}
                    </p>

                    <div className="bg-dark-800/80 border border-white/10 rounded-xl p-4 mb-3">
                      <p className="text-sm text-gray-300 font-medium">
                        {agentOutput?.summary || agentStep.summary}
                      </p>
                    </div>

                    <AnimatePresence>
                      {(isActive || isCompleted) && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="grid md:grid-cols-2 gap-2 pt-3 border-t border-white/10 text-xs"
                        >
                          {agentStep.tasks.map((task, taskIdx) => (
                            <div key={taskIdx} className="flex items-center gap-2 text-gray-300">
                              {isCompleted ? (
                                <CheckCircle2 className="w-3.5 h-3.5 text-green-400 flex-shrink-0" />
                              ) : isActive && taskIdx <= (progress % 4) ? (
                                <RefreshCw className="w-3.5 h-3.5 text-primary flex-shrink-0 animate-spin" />
                              ) : (
                                <div className="w-3.5 h-3.5 rounded-full border border-gray-600 flex-shrink-0" />
                              )}
                              <span>{task}</span>
                            </div>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </motion.div>

        {/* Next Action Navigation */}
        <AnimatePresence>
          {analysis.status === 'completed' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-wrap gap-4 justify-center mt-10"
            >
              <button
                onClick={() => navigate('/dashboard')}
                className="button-primary text-lg hover:shadow-glow"
              >
                Explore Dashboard <ArrowRight className="w-5 h-5" />
              </button>
              <button
                onClick={() => navigate('/insights')}
                className="button-secondary text-lg"
              >
                View AI Insights
              </button>
              <button
                onClick={() => navigate('/rag-knowledge')}
                className="button-secondary text-lg"
              >
                Ask RAG Assistant
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}
