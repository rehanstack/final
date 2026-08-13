import express from 'express'
import cors from 'cors'

const app = express()
let PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 5001

// Middleware
app.use(cors())
app.use(express.json())

// Health Check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'DBSense AI Backend',
    version: '1.0.0'
  })
})

// Analyze Database Endpoint
app.post('/analyze', (req, res) => {
  setTimeout(() => {
    res.json({
      success: true,
      jobId: 'job-' + Date.now(),
      status: 'processing',
      message: 'Database analysis started',
      estimatedTime: '2-5 minutes',
      data: {
        tablesFound: 12,
        relationships: 42,
        columns: 156,
        estimatedSize: '42.5 GB'
      }
    })
  }, 300)
})

// Dashboard Data Endpoint
app.get('/dashboard', (req, res) => {
  res.json({
    tables: 12,
    relationships: 42,
    dataQualityScore: 91,
    anomaliesDetected: 3,
    totalRecords: 9893000,
    totalSize: '42.5 GB',
    lastAnalyzed: new Date().toISOString(),
    tableDetails: [
      { name: 'Orders', size: '12GB', records: 2840000, quality: 94 },
      { name: 'Customers', size: '8.5GB', records: 450000, quality: 87 },
      { name: 'Products', size: '6.2GB', records: 125000, quality: 99 },
      { name: 'Inventory', size: '4.1GB', records: 98000, quality: 85 },
      { name: 'Payments', size: '6.8GB', records: 2700000, quality: 92 }
    ]
  })
})

// Insights Data Endpoint
app.get('/insights', (req, res) => {
  res.json({
    insights: [
      {
        id: 'ins-1',
        title: 'Revenue Anomaly Detected',
        description: 'Unusual spike in order values detected in the Orders table on specific dates.',
        confidence: 94,
        severity: 'high',
        type: 'anomaly',
        affectedTable: 'Orders',
        recommendation: 'Manual review recommended for orders >$50,000'
      },
      {
        id: 'ins-2',
        title: 'Duplicate Customer Records',
        description: '27% of customer records have potential duplicates based on email and phone matching.',
        confidence: 89,
        severity: 'warning',
        type: 'quality',
        affectedTable: 'Customers',
        recommendation: 'Run deduplication process'
      }
    ],
    summary: {
      totalInsights: 2,
      critical: 1,
      warnings: 1,
      generatedAt: new Date().toISOString()
    }
  })
})

// RAG Knowledge Base Endpoint
app.get('/rag-knowledge', (req, res) => {
  res.json({
    vectorCount: 1247,
    embeddingDimensions: 1536,
    vectorDatabaseSize: '3.2 GB',
    chunks: [
      {
        id: '5f8a-b2c3-9d1e',
        title: 'Order Table Schema',
        content: 'orders(id UUID, customer_id UUID, created_at TIMESTAMP, total_amount DECIMAL, status VARCHAR)',
        metadata: 'Schema - Orders',
        tokens: 18,
        relevance: 0.94
      }
    ],
    lastUpdated: new Date().toISOString()
  })
})

// Processing Status Endpoint
app.get('/status/:jobId', (req, res) => {
  const { jobId } = req.params
  res.json({
    jobId,
    overallProgress: 100,
    status: 'completed',
    results: {
      tablesAnalyzed: 12,
      relationshipsDiscovered: 42,
      embeddings: 1247,
      quality: 91,
      anomalies: 3
    }
  })
})

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    path: req.path,
    method: req.method
  })
})

// Start Server with Automatic Port Fallback for macOS AirPlay (Port 5000 conflict)
function startListening(port) {
  const server = app.listen(port, () => {
    console.log(`🚀 DBSense Backend running at http://localhost:${port}`)
    console.log(`📊 Health check: http://localhost:${port}/health`)
  })

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.warn(`⚠️ Port ${port} is in use (often by macOS AirPlay Receiver / ControlCenter). Retrying on port ${port + 1}...`)
      startListening(port + 1)
    } else {
      console.error('Server error:', err)
    }
  })
}

startListening(PORT)
