import React, { useState, useMemo, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Network, Sparkles, ChevronDown, CheckSquare, Square, BarChart2, Maximize2, Minimize2, Lightbulb } from 'lucide-react'
import { loadAnalysis, DATASETS } from '../lib/analysisState'
import { apiPost } from '../lib/apiClient'
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#14b8a6', '#f43f5e', '#f97316']

export default function Clustering() {
  const [analysis] = useState(() => loadAnalysis())
  const currentDatasetKey = analysis.datasetKey || 'E-Commerce Dataset'
  
  const isCustom = currentDatasetKey === 'Custom CSV' || currentDatasetKey === 'SQL Dump'
  const datasetMeta = isCustom ? null : (DATASETS[currentDatasetKey] || DATASETS['E-Commerce Dataset'])
  const allTables = useMemo(() => analysis.tables || analysis.customData?.tables || datasetMeta?.tables || [], [analysis, datasetMeta])
  
  const [selectedTableName, setSelectedTableName] = useState(allTables[0]?.name || '')
  
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

  const [selectedFeatures, setSelectedFeatures] = useState([])
  const [clusterCount, setClusterCount] = useState(3)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  
  const [loading, setLoading] = useState(false)
  const [clusterResults, setClusterResults] = useState(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [showDetailedModal, setShowDetailedModal] = useState(false)
  const [isFullScreenGraph, setIsFullScreenGraph] = useState(false)
  const [suggestions, setSuggestions] = useState([])
  const [loadingSuggestions, setLoadingSuggestions] = useState(false)

  const fetchSuggestions = async () => {
    if (availableColumns.length === 0) return;
    setLoadingSuggestions(true);
    try {
      const response = await apiPost('/api/ml/cluster-suggestions', {
        available_columns: availableColumns,
        table_name: selectedTableName || "Dataset"
      });
      if (response?.data?.suggestions) {
        setSuggestions(response.data.suggestions);
      }
    } catch (e) {
      console.error("Failed to fetch suggestions", e);
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const applySuggestion = (suggestion) => {
    const features = suggestion.features.filter(f => availableColumns.includes(f));
    setSelectedFeatures(features);
    runClustering(features);
  };

  useEffect(() => {
    if (availableColumns.length > 0 && selectedFeatures.length === 0) {
      setSelectedFeatures(availableColumns.slice(0, 3))
    }
  }, [availableColumns])

  const toggleFeature = (col) => {
    setSelectedFeatures(prev => prev.includes(col) ? prev.filter(c => c !== col) : [...prev, col])
  }

  const runClustering = async (overrideFeatures = null) => {
    const featuresToUse = Array.isArray(overrideFeatures) ? overrideFeatures : selectedFeatures;
    if (featuresToUse.length < 2) return setErrorMsg("Please select at least 2 features for clustering.")
    setLoading(true)
    setErrorMsg('')
    setClusterResults(null)
    
    const dataToCluster = sampleRows.map(r => {
      const obj = {}
      featuresToUse.forEach(col => obj[col] = r[col])
      return obj
    })

    if (dataToCluster.length === 0) {
      setLoading(false)
      return setErrorMsg("No data available to cluster for the selected features.")
    }

    try {
      const response = await apiPost('/api/ml/cluster', { 
        data: dataToCluster, 
        feature_columns: selectedFeatures, 
        n_clusters: clusterCount 
      })

      if (response && response.status < 400 && response.data) {
        setClusterResults(response.data)
      } else {
        setErrorMsg(response?.data?.error || response?.statusText || "Clustering failed.")
      }
    } catch (err) {
      setErrorMsg(`Connection Failed. Details: ${err.response?.data?.error || err.message}`)
    } finally {
      setLoading(false)
    }
  }

  const containerVariants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.08 } } }
  const itemVariants = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }

  return (
    <div className="p-8 pb-20 max-w-7xl mx-auto w-full">
      <motion.div variants={containerVariants} initial="hidden" animate="visible">
        
        {/* Top Header & Data Selection Panel */}
        <motion.div variants={itemVariants} className="mb-8 p-6 glass-dark border border-white/10 rounded-2xl relative z-20">
          <div className="mb-6">
            <h1 className="text-3xl font-bold mb-2 flex items-center gap-3 text-white">
              <Network className="w-8 h-8 text-primary" /> Data Clustering
            </h1>
            <p className="text-gray-400 text-sm max-w-2xl">
              Discover hidden patterns in your data using clustering. Select multiple numerical features, choose the number of clusters, and visualize the 2D projection.
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

            <div className="flex-1 relative">
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-[11px] font-bold text-primary uppercase tracking-wider">2. Feature Columns</label>
                {selectedFeatures.length > 0 && (
                  <button 
                    onClick={() => setSelectedFeatures([])}
                    className="text-[10px] text-primary/80 hover:text-primary uppercase tracking-wider font-bold transition-colors"
                  >
                    Clear All
                  </button>
                )}
              </div>
              <button 
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="w-full bg-primary/10 border border-primary/30 rounded-lg px-3 py-2.5 text-sm text-primary font-semibold flex items-center justify-between hover:bg-primary/20 transition-all"
              >
                <span>{selectedFeatures.length === 0 ? "Select Features" : `${selectedFeatures.length} Features Selected`}</span>
                <ChevronDown className={`w-4 h-4 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
              </button>
              
              <div className="mt-2 text-right">
                <button 
                  onClick={fetchSuggestions}
                  disabled={loadingSuggestions}
                  className="text-[11px] text-white/70 hover:text-primary transition-colors flex items-center gap-1 ml-auto"
                >
                  <Lightbulb className={`w-3 h-3 ${loadingSuggestions ? 'animate-pulse text-primary' : ''}`} />
                  {loadingSuggestions ? 'Analyzing...' : 'AI Auto-Suggest'}
                </button>
              </div>

              {isDropdownOpen && (
                <div className="absolute top-[calc(100%+8px)] left-0 w-full bg-dark-800 border border-primary/30 rounded-xl shadow-2xl p-2 z-50 max-h-60 overflow-y-auto custom-scrollbar">
                  {availableColumns.map(col => (
                    <div 
                      key={col} 
                      className="flex items-center gap-3 p-2 hover:bg-white/5 cursor-pointer rounded-lg transition-colors"
                      onClick={() => toggleFeature(col)}
                    >
                      {selectedFeatures.includes(col) 
                        ? <CheckSquare className="w-4 h-4 text-primary shrink-0" /> 
                        : <Square className="w-4 h-4 text-gray-500 shrink-0" />}
                      <span className={`text-sm truncate ${selectedFeatures.includes(col) ? 'text-white' : 'text-gray-400'}`}>{col}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="w-32 flex-shrink-0">
               <label className="block text-[11px] font-bold text-secondary uppercase tracking-wider mb-1.5">3. Clusters</label>
               <input 
                 type="number"
                 min="2"
                 max="10"
                 value={clusterCount}
                 onChange={e => setClusterCount(Math.max(2, Math.min(10, parseInt(e.target.value) || 2)))}
                 className="w-full bg-secondary/10 border border-secondary/30 rounded-lg px-3 py-2.5 text-sm text-secondary font-semibold focus:border-secondary outline-none text-center"
               />
            </div>

            <div className="flex-1 flex items-end">
              <button 
                onClick={runClustering}
                disabled={loading || selectedFeatures.length < 2}
                className="w-full py-2.5 bg-gradient-to-r from-primary to-secondary text-white rounded-lg text-sm font-bold hover:shadow-glow transition-all flex justify-center items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? <Sparkles className="w-4 h-4 animate-spin" /> : <Network className="w-4 h-4" />}
                {loading ? 'Processing...' : 'Run Clustering'}
              </button>
            </div>
          </div>
          
          {errorMsg && (
             <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg text-sm">
               {errorMsg}
             </div>
          )}

          {suggestions.length > 0 && (
            <div className="mt-6 border-t border-white/10 pt-4">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                <Sparkles className="w-3 h-3 text-secondary" /> AI Clustering Recommendations
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {suggestions.map((sug, i) => (
                  <div 
                    key={i}
                    onClick={() => applySuggestion(sug)}
                    className="bg-white/5 border border-white/10 hover:border-secondary/50 rounded-xl p-4 cursor-pointer transition-colors group"
                  >
                    <h4 className="text-sm font-bold text-white group-hover:text-secondary mb-1">{sug.title}</h4>
                    <p className="text-xs text-gray-400 mb-3 leading-relaxed line-clamp-2">{sug.description}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {sug.features.map(f => (
                        <span key={f} className="text-[10px] bg-dark-900 px-2 py-0.5 rounded text-gray-300 border border-white/5">
                          {f}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </motion.div>

        {isDropdownOpen && (
          <div className="fixed inset-0 z-10" onClick={() => setIsDropdownOpen(false)} />
        )}

        {sampleRows.length === 0 ? (
           <motion.div variants={itemVariants} className="p-8 text-center text-gray-500 glass-dark rounded-2xl">
             No sample data available to perform clustering.
           </motion.div>
        ) : clusterResults && (
          <div className="flex flex-col lg:flex-row gap-8 relative z-0">
            
            {/* Left: Scatter Chart Projection */}
            <motion.div variants={itemVariants} className="glass-dark p-6 rounded-2xl border border-white/10 lg:w-2/3 flex flex-col relative">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-xl font-bold flex items-center gap-2 text-white">
                    <BarChart2 className="w-5 h-5 text-primary" /> 2D Cluster Projection
                  </h2>
                  <p className="text-sm text-gray-400 mt-1">PCA reduced projection of the selected features.</p>
                </div>
                <button 
                  onClick={() => setIsFullScreenGraph(true)}
                  className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors"
                  title="Full Screen"
                >
                  <Maximize2 className="w-5 h-5" />
                </button>
              </div>
              
              <div className="w-full h-[400px] bg-dark-900/30 rounded-xl border border-white/5 p-4 flex-1">
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart margin={{ top: 10, right: 10, bottom: 20, left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--color-white) / 0.05)" />
                    <XAxis type="number" dataKey="x" name="PCA Component 1" stroke="rgb(var(--color-white) / 0.4)" tick={{ fontSize: 11 }} />
                    <YAxis type="number" dataKey="y" name="PCA Component 2" stroke="rgb(var(--color-white) / 0.4)" tick={{ fontSize: 11 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Scatter data={clusterResults.plot_data} name="Clusters" shape="circle">
                      {clusterResults.plot_data.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[entry.cluster % COLORS.length]} fillOpacity={0.8} />
                      ))}
                    </Scatter>
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 p-4 bg-primary/5 border border-primary/20 rounded-xl">
                <p className="text-xs text-primary/90 leading-relaxed font-medium">
                  <strong>Note on PCA (Principal Component Analysis):</strong> The X and Y axes are not individual features (like Income or Age). 
                  PCA compresses all your selected multidimensional features into two dimensions so you can visualize the clusters.
                </p>
              </div>
            </motion.div>

            {/* Right: Summary Table */}
            <motion.div variants={itemVariants} className="glass-dark p-6 rounded-2xl border border-white/10 lg:w-1/3">
               <h2 className="text-xl font-bold flex items-center gap-2 mb-6 text-white">
                 <Network className="w-5 h-5 text-secondary" /> Cluster Profiles
               </h2>
               
               <div className="space-y-4 max-h-[500px] overflow-y-auto custom-scrollbar pr-2">
                 {clusterResults.summaries.map((summary, idx) => (
                   <div key={idx} className="bg-dark-900/50 border border-white/5 rounded-xl p-5 relative overflow-hidden group hover:bg-white/5 transition-colors">
                     <div className="absolute top-0 left-0 w-1.5 h-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></div>
                     
                     <div className="ml-2 mb-4">
                       <h3 className="text-md font-bold text-white flex items-center gap-2">
                         <div className="w-3 h-3 rounded-full shadow-[0_0_10px_rgba(255,255,255,0.2)]" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></div>
                         {summary.profile_name || `Cluster ${idx}`}
                       </h3>
                       {summary.profile_description && (
                         <p className="text-xs text-gray-400 mt-1.5 leading-relaxed pr-2">
                           {summary.profile_description}
                         </p>
                       )}
                       <div className="mt-2.5 inline-block">
                         <span className="text-[10px] font-bold text-white/70 bg-white/10 px-2.5 py-1 rounded-md uppercase tracking-wider">
                           {summary.count || 0} Data Points
                         </span>
                       </div>
                     </div>
                     
                     <div className="space-y-1.5 ml-2 mt-4 pt-4 border-t border-white/5">
                       <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Average Metrics</p>
                       {Object.entries(summary)
                         .filter(([k]) => k !== 'cluster' && k !== 'count' && !k.startsWith('profile_'))
                         .map(([feature, avgVal]) => (
                         <div key={feature} className="flex justify-between items-center text-sm">
                           <span className="text-gray-400 truncate max-w-[140px]" title={feature.replace('_avg', '')}>
                             {feature.replace('_avg', '')}
                           </span>
                           <span className="text-white font-mono">{typeof avgVal === 'number' ? avgVal.toFixed(2) : avgVal}</span>
                         </div>
                       ))}
                     </div>
                   </div>
                 ))}
                 
                 <button 
                   onClick={() => setShowDetailedModal(true)}
                   className="w-full mt-4 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-sm font-medium text-white transition-colors flex items-center justify-center gap-2 group"
                 >
                   View Detailed Analysis <Sparkles className="w-4 h-4 text-primary group-hover:scale-110 transition-transform" />
                 </button>
               </div>
            </motion.div>

          </div>
        )}

      </motion.div>

      {/* Detailed Analysis Modal */}
      <AnimatePresence>
        {showDetailedModal && clusterResults && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm" 
            onClick={() => setShowDetailedModal(false)}
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-dark-950 border border-white/10 rounded-2xl w-full max-w-6xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden" 
              onClick={e => e.stopPropagation()}
            >
              <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/5 backdrop-blur-md">
                <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-3">
                  <Sparkles className="w-6 h-6 text-primary" /> Detailed Cluster Analysis
                </h2>
                <button 
                  onClick={() => setShowDetailedModal(false)} 
                  className="text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 p-2 rounded-lg transition-colors"
                >
                  ✕
                </button>
              </div>
              <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-8 bg-dark-950/50">
                {clusterResults.summaries.map((summary, idx) => (
                  <div key={idx} className="bg-dark-900/40 border border-white/5 rounded-2xl p-6 sm:p-8 relative overflow-hidden group hover:border-white/10 transition-colors">
                    <div className="absolute top-0 left-0 w-2 h-full shadow-[0_0_15px_rgba(255,255,255,0.2)]" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></div>
                    <div className="ml-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                        <h3 className="text-2xl font-bold text-white flex items-center gap-3">
                          <div className="w-4 h-4 rounded-full shadow-lg" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></div>
                          {summary.profile_name || `Cluster ${idx}`} 
                        </h3>
                        <span className="text-xs font-bold text-white/70 bg-white/10 px-3 py-1.5 rounded-lg uppercase tracking-widest border border-white/5 inline-block w-max">
                          {summary.count || 0} Data Points
                        </span>
                      </div>
                      
                      {summary.profile_description && (
                        <p className="text-sm text-gray-300 mb-8 max-w-4xl leading-relaxed border-l-2 border-white/10 pl-4 py-1">
                          {summary.profile_description}
                        </p>
                      )}
                      
                      <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">Average Feature Values</h4>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
                        {Object.entries(summary)
                          .filter(([k]) => k !== 'cluster' && k !== 'count' && !k.startsWith('profile_'))
                          .map(([feature, avgVal]) => (
                          <div key={feature} className="bg-dark-800/40 p-4 rounded-xl border border-white/5 group-hover:bg-dark-800/60 transition-colors">
                            <p className="text-[10px] sm:text-xs text-gray-400 uppercase tracking-wider mb-2 truncate" title={feature.replace('_avg', '')}>
                              {feature.replace('_avg', '')}
                            </p>
                            <p className="text-lg sm:text-xl font-mono text-white font-medium">
                              {typeof avgVal === 'number' ? avgVal.toFixed(2) : avgVal}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Full Screen Graph Modal */}
      <AnimatePresence>
        {isFullScreenGraph && clusterResults && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-8 bg-black/80 backdrop-blur-md" 
            onClick={() => setIsFullScreenGraph(false)}
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-dark-950 border border-white/10 rounded-2xl w-full h-full flex flex-col shadow-2xl overflow-hidden p-6 relative" 
              onClick={e => e.stopPropagation()}
            >
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-2xl font-bold flex items-center gap-3 text-white">
                    <BarChart2 className="w-6 h-6 text-primary" /> 2D Cluster Projection (Full Screen)
                  </h2>
                  <p className="text-gray-400 mt-2">Explore the PCA distribution in detail.</p>
                </div>
                <button 
                  onClick={() => setIsFullScreenGraph(false)}
                  className="p-3 bg-white/5 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors"
                >
                  <Minimize2 className="w-6 h-6" />
                </button>
              </div>
              <div className="w-full bg-dark-900/30 rounded-xl border border-white/5 p-4 flex-1">
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--color-white) / 0.05)" />
                    <XAxis type="number" dataKey="x" name="PCA Component 1" stroke="rgb(var(--color-white) / 0.4)" tick={{ fontSize: 13 }} />
                    <YAxis type="number" dataKey="y" name="PCA Component 2" stroke="rgb(var(--color-white) / 0.4)" tick={{ fontSize: 13 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Scatter data={clusterResults.plot_data} name="Clusters" shape="circle">
                      {clusterResults.plot_data.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[entry.cluster % COLORS.length]} fillOpacity={0.8} />
                      ))}
                    </Scatter>
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  )
}

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-dark-950 border border-white/10 p-4 rounded-xl shadow-2xl max-w-sm backdrop-blur-xl">
        <p className="text-white font-bold mb-3 flex items-center gap-2 border-b border-white/10 pb-2">
          <span className="w-3 h-3 rounded-full shadow-[0_0_8px_rgba(255,255,255,0.3)]" style={{ backgroundColor: COLORS[data.cluster % COLORS.length] }}></span>
          Data Point (Cluster {data.cluster})
        </p>
        <div className="space-y-1.5 max-h-[250px] overflow-y-auto custom-scrollbar pr-2">
          {Object.entries(data).filter(([k]) => k !== 'x' && k !== 'y' && k !== 'cluster' && !k.startsWith('profile_')).map(([k, v]) => (
            <div key={k} className="flex justify-between items-center text-xs gap-6">
              <span className="text-gray-400 truncate max-w-[150px]" title={k}>{k}</span>
              <span className="text-white font-mono font-medium">{typeof v === 'number' ? v.toFixed(2) : String(v)}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
};
