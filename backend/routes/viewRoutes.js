import express from 'express'
const router = express.Router()

router.get('/dashboard', (req, res) => {
  res.json({
    tables: 12, relationships: 42, dataQualityScore: 91, anomaliesDetected: 3, totalRecords: 9893000,
    totalSize: '42.5 GB', lastAnalyzed: new Date().toISOString(),
    tableDetails: [
      { name: 'Orders', size: '12GB', records: 2840000, quality: 94 },
      { name: 'Customers', size: '8.5GB', records: 450000, quality: 87 },
      { name: 'Products', size: '6.2GB', records: 125000, quality: 99 },
      { name: 'Inventory', size: '4.1GB', records: 98000, quality: 85 },
      { name: 'Payments', size: '6.8GB', records: 2700000, quality: 92 }
    ]
  })
})

router.get('/insights', (req, res) => {
  res.json({
    insights: [
      { id: 'ins-1', title: 'Revenue Anomaly Detected', description: 'Unusual spike in order values detected.', confidence: 94, severity: 'high', type: 'anomaly', affectedTable: 'Orders', recommendation: 'Manual review recommended for orders >$50,000' },
      { id: 'ins-2', title: 'Duplicate Customer Records', description: '27% of customer records have potential duplicates based on email and phone matching.', confidence: 89, severity: 'warning', type: 'quality', affectedTable: 'Customers', recommendation: 'Run deduplication process' }
    ],
    summary: { totalInsights: 2, critical: 1, warnings: 1, generatedAt: new Date().toISOString() }
  })
})

router.get('/rag-knowledge', (req, res) => {
  res.json({
    vectorCount: 1247, embeddingDimensions: 1536, vectorDatabaseSize: '3.2 GB',
    chunks: [{ id: '5f8a-b2c3-9d1e', title: 'Order Table Schema', content: 'orders(id UUID, customer_id UUID, created_at TIMESTAMP, total_amount DECIMAL, status VARCHAR)', metadata: 'Schema - Orders', tokens: 18, relevance: 0.94 }],
    lastUpdated: new Date().toISOString()
  })
})

router.get('/status/:jobId', (req, res) => {
  res.json({
    jobId: req.params.jobId, overallProgress: 100, status: 'completed',
    results: { tablesAnalyzed: 12, relationshipsDiscovered: 42, embeddings: 1247, quality: 91, anomalies: 3 }
  })
})

export default router
