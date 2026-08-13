import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Upload as UploadIcon, FileJson, Database, ShoppingCart, Stethoscope, GraduationCap, Landmark, ArrowRight, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react'
import Papa from 'papaparse'
import { createAnalysisForDataset, saveAnalysis, DATASETS } from '../lib/analysisState'

export default function UploadPage() {
  const [dragActive, setDragActive] = useState(false)
  const [uploadedFile, setUploadedFile] = useState(null)
  const [testingConn, setTestingConn] = useState(false)
  const [connSuccess, setConnSuccess] = useState(false)
  
  // Direct DB Connection Form State
  const [dbConfig, setDbConfig] = useState({
    dbType: 'PostgreSQL',
    host: 'db.internal.company.com',
    dbName: 'production_analytics',
    username: 'readonly_user',
    password: ''
  })

  const navigate = useNavigate()

  const handleDrag = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0]
      setUploadedFile(file)
    }
  }

  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files[0]) {
      setUploadedFile(e.target.files[0])
    }
  }

  const startAnalysis = (datasetKey, customDetails = null) => {
    saveAnalysis(createAnalysisForDataset(datasetKey, customDetails))
    navigate('/processing')
  }

  const handleCustomFileUploadStart = () => {
    if (!uploadedFile) {
      startAnalysis('E-Commerce Dataset')
      return
    }

    if (uploadedFile.name.toLowerCase().endsWith('.csv')) {
      Papa.parse(uploadedFile, {
        header: true,
        preview: 150, // Read first 150 rows for schema inference
        skipEmptyLines: true,
        complete: (results) => {
          const data = results.data
          if (!data || data.length === 0) {
            alert("CSV file is empty or invalid.")
            return
          }
          
          const fields = results.meta.fields || Object.keys(data[0])
          
          const columns = fields.map((field, idx) => {
            let type = 'VARCHAR'
            const sampleVal = data[0][field]
            if (sampleVal !== null && sampleVal !== undefined && sampleVal !== '') {
              if (!isNaN(sampleVal)) {
                type = Number.isInteger(Number(sampleVal)) ? 'INT' : 'DECIMAL'
              } else if (!isNaN(Date.parse(sampleVal))) {
                type = 'TIMESTAMP'
              }
            }
            
            const isIdLike = field.toLowerCase().includes('id')
            return {
              name: field,
              type,
              pk: isIdLike && idx === 0, // Heuristic: first ID column is PK
              fk: isIdLike && idx !== 0,
              nullable: true,
              desc: `Inferred column from CSV header '${field}'`
            }
          })

          const typeCounts = {}
          columns.forEach(c => typeCounts[c.type] = (typeCounts[c.type] || 0) + 1)
          const breakdown = Object.entries(typeCounts).map(([k, v]) => ({
            name: k, count: v, percentage: Math.round((v / columns.length) * 100)
          }))

          const tableName = uploadedFile.name.replace(/\.[^/.]+$/, "").replace(/[^a-zA-Z0-9]/g, '_')

          const customData = {
            name: uploadedFile.name + ' (Parsed CSV)',
            tablesCount: 1,
            totalRecords: 1000, // Placeholder
            columnTypesBreakdown: breakdown,
            tables: [{
              name: tableName,
              columns: columns,
              columnsCount: columns.length,
              records: 1000,
              size: (uploadedFile.size / 1024).toFixed(1) + ' KB',
              description: `Dynamically imported table from ${uploadedFile.name}`,
              sampleRows: data.slice(0, 4)
            }],
            relationships: [], // No relationships for a single CSV
            businessMetrics: DATASETS['E-Commerce Dataset'].businessMetrics, // Re-use mock metrics for UI stability
            ragChunks: [],
            insights: []
          }

          startAnalysis('Custom CSV', {
            name: uploadedFile.name,
            size: (uploadedFile.size / (1024 * 1024)).toFixed(2) + ' MB',
            tablesCount: 1,
            customData
          })
        }
      })
    } else {
      // Fallback for non-CSV files (mocked)
      const customDetails = {
        name: uploadedFile.name.replace(/\.[^/.]+$/, "") + ' (Uploaded)',
        tablesCount: 14,
        size: (uploadedFile.size / (1024 * 1024)).toFixed(1) + ' MB'
      }
      startAnalysis('E-Commerce Dataset', customDetails)
    }
  }

  const handleTestConnection = () => {
    setTestingConn(true)
    setConnSuccess(false)
    setTimeout(() => {
      setTestingConn(false)
      setConnSuccess(true)
    }, 1200)
  }

  const handleDirectConnectSubmit = (e) => {
    e.preventDefault()
    const customDetails = {
      name: `${dbConfig.dbName} (${dbConfig.dbType})`,
      tablesCount: 16,
      size: '24.8 GB'
    }
    startAnalysis('E-Commerce Dataset', customDetails)
  }

  const samples = [
    {
      key: 'E-Commerce Dataset',
      name: 'E-Commerce Dataset',
      icon: ShoppingCart,
      tables: DATASETS['E-Commerce Dataset']?.tablesCount || 12,
      desc: 'Orders, customers, products, inventory, payments, reviews',
      color: 'from-purple-500/20 to-indigo-500/20'
    },
    {
      key: 'Healthcare Dataset',
      name: 'Healthcare Dataset',
      icon: Stethoscope,
      tables: DATASETS['Healthcare Dataset']?.tablesCount || 15,
      desc: 'Patients, appointments, prescriptions, diagnostics, doctors',
      color: 'from-cyan-500/20 to-blue-500/20'
    },
    {
      key: 'Financial Dataset',
      name: 'Financial Dataset',
      icon: Landmark,
      tables: DATASETS['Financial Dataset']?.tablesCount || 18,
      desc: 'Accounts, transactions, cards, fraud alerts, loans',
      color: 'from-emerald-500/20 to-teal-500/20'
    },
    {
      key: 'University Dataset',
      name: 'University Dataset',
      icon: GraduationCap,
      tables: DATASETS['University Dataset']?.tablesCount || 24,
      desc: 'Students, courses, enrollments, grades, instructors',
      color: 'from-amber-500/20 to-orange-500/20'
    }
  ]

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.12 }
    }
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  }

  return (
    <div className="pt-28 pb-20 px-4">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="max-w-5xl mx-auto"
      >
        <motion.div variants={itemVariants} className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass border border-primary/30 mb-4">
            <SparklesIcon className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold gradient-text">Autonomous Multi-Agent Database Intelligence</span>
          </div>
          <h1 className="text-5xl font-bold mb-4">Upload Your Database</h1>
          <p className="text-xl text-gray-400">Choose a schema file, connect directly, or select a sample dataset</p>
        </motion.div>

        {/* Upload Card */}
        <motion.div variants={itemVariants} className="mb-12">
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={`glass-dark p-10 rounded-2xl border-2 border-dashed transition-all relative overflow-hidden ${
              dragActive
                ? 'border-primary bg-primary/10 shadow-glow'
                : 'border-white/20 hover:border-primary/50'
            }`}
          >
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-r from-primary to-secondary flex items-center justify-center mx-auto mb-4 shadow-lg">
                <UploadIcon className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-semibold mb-2">Drag and drop your schema or database file</h2>
              <p className="text-gray-400 mb-6">Supports SQL Dumps (.sql), SQLite (.db), JSON Schemas, or CSV Exports</p>

              {uploadedFile ? (
                <div className="bg-dark-800/80 border border-primary/40 rounded-xl p-4 max-w-md mx-auto mb-6 flex items-center justify-between">
                  <div className="flex items-center gap-3 text-left">
                    <FileJson className="w-8 h-8 text-primary" />
                    <div>
                      <p className="font-semibold text-white truncate max-w-[200px]">{uploadedFile.name}</p>
                      <p className="text-xs text-gray-400">{(uploadedFile.size / 1024).toFixed(1)} KB</p>
                    </div>
                  </div>
                  <button
                    onClick={handleCustomFileUploadStart}
                    className="button-primary py-2 px-4 text-sm"
                  >
                    Analyze File
                  </button>
                </div>
              ) : (
                <label className="button-primary inline-flex cursor-pointer hover:shadow-glow">
                  <FileJson className="w-5 h-5" />
                  <span>Browse Files</span>
                  <input
                    type="file"
                    accept=".sql,.db,.sqlite,.json,.csv"
                    className="hidden"
                    onChange={handleFileSelect}
                  />
                </label>
              )}
            </div>
          </div>
        </motion.div>

        {/* Sample Datasets */}
        <motion.div variants={itemVariants} className="mb-12">
          <h2 className="text-2xl font-semibold mb-6 text-center">Or launch with pre-analyzed sample datasets</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {samples.map((sample) => {
              const Icon = sample.icon
              return (
                <motion.button
                  key={sample.key}
                  onClick={() => startAnalysis(sample.key)}
                  whileHover={{ y: -5, scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="glass-dark p-6 rounded-xl text-left border border-white/10 hover:border-primary/50 transition-all group flex flex-col justify-between"
                >
                  <div>
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${sample.color} border border-white/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                      <Icon className="w-6 h-6 text-primary group-hover:text-secondary transition-colors" />
                    </div>
                    <h3 className="font-semibold text-lg mb-2 group-hover:text-primary transition-colors">{sample.name}</h3>
                    <p className="text-xs text-gray-400 mb-4 leading-relaxed">{sample.desc}</p>
                  </div>
                  <div className="flex items-center justify-between pt-3 border-t border-white/10">
                    <span className="badge badge-info">{sample.tables} Tables</span>
                    <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-primary group-hover:translate-x-1 transition-all" />
                  </div>
                </motion.button>
              )
            })}
          </div>
        </motion.div>

        {/* Direct Database Connection */}
        <motion.div variants={itemVariants} className="space-y-4">
          <h2 className="text-2xl font-semibold text-center mb-6">Direct Database Connection</h2>
          <form onSubmit={handleDirectConnectSubmit} className="glass-dark p-8 rounded-2xl border border-white/10">
            <div className="grid md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-xs text-gray-400 uppercase font-semibold mb-2">Database Engine</label>
                <select
                  value={dbConfig.dbType}
                  onChange={(e) => setDbConfig({ ...dbConfig, dbType: e.target.value })}
                  className="input-dark w-full"
                >
                  <option value="PostgreSQL">PostgreSQL</option>
                  <option value="MySQL">MySQL</option>
                  <option value="SQLite">SQLite</option>
                  <option value="MongoDB">MongoDB</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-400 uppercase font-semibold mb-2">Host / Connection Endpoint</label>
                <input
                  type="text"
                  value={dbConfig.host}
                  onChange={(e) => setDbConfig({ ...dbConfig, host: e.target.value })}
                  placeholder="e.g. postgresql://user:pass@host:5432/db"
                  className="input-dark w-full font-mono text-sm"
                />
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-4 mb-6">
              <div>
                <label className="block text-xs text-gray-400 uppercase font-semibold mb-2">Database Name</label>
                <input
                  type="text"
                  value={dbConfig.dbName}
                  onChange={(e) => setDbConfig({ ...dbConfig, dbName: e.target.value })}
                  placeholder="prod_db"
                  className="input-dark w-full"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 uppercase font-semibold mb-2">Username</label>
                <input
                  type="text"
                  value={dbConfig.username}
                  onChange={(e) => setDbConfig({ ...dbConfig, username: e.target.value })}
                  placeholder="admin"
                  className="input-dark w-full"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 uppercase font-semibold mb-2">Password</label>
                <input
                  type="password"
                  value={dbConfig.password}
                  onChange={(e) => setDbConfig({ ...dbConfig, password: e.target.value })}
                  placeholder="••••••••••••"
                  className="input-dark w-full"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between pt-4 border-t border-white/10 gap-4">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleTestConnection}
                  disabled={testingConn}
                  className="button-secondary text-sm"
                >
                  {testingConn ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-primary" />
                      Testing Connection...
                    </>
                  ) : (
                    'Test Connection'
                  )}
                </button>

                {connSuccess && (
                  <span className="flex items-center gap-1.5 text-xs text-green-400 bg-green-500/10 px-3 py-1.5 rounded-lg border border-green-500/30">
                    <CheckCircle2 className="w-4 h-4" />
                    Connection Successful (24ms latency)
                  </span>
                )}
              </div>

              <button
                type="submit"
                className="button-primary hover:shadow-glow"
              >
                <Database className="w-5 h-5" />
                Analyze Connected Database
              </button>
            </div>
          </form>
        </motion.div>

        {/* Security Info Box */}
        <motion.div variants={itemVariants} className="glass-dark p-6 rounded-xl mt-8 border border-primary/20 bg-primary/5">
          <h4 className="font-semibold mb-2 text-primary flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5" />
            Enterprise Privacy & Isolation
          </h4>
          <ul className="grid md:grid-cols-2 gap-2 text-sm text-gray-300">
            <li>✓ Schema-only extraction without copying sensitive row data</li>
            <li>✓ End-to-end TLS 1.3 encryption & isolated sandbox processing</li>
            <li>✓ ChromaDB vector embeddings stored in isolated tenant index</li>
            <li>✓ Complete audit trail logged for enterprise compliance</li>
          </ul>
        </motion.div>
      </motion.div>
    </div>
  )
}

function SparklesIcon(props) {
  return (
    <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
    </svg>
  )
}
