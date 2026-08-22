import express from 'express'
import axios from 'axios'
import { testDatabaseConnection } from '../lib/dbConnector.js'

const router = express.Router()

// Test Direct Database Connection Endpoint
router.post('/api/test-db', async (req, res) => {
  try {
    const result = await testDatabaseConnection(req.body)
    return res.json(result)
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message || 'Connection test failed' })
  }
})

// Connect & Analyze Database Schema Endpoint
router.post('/api/connect-db', async (req, res) => {
  try {
    const aiLayerUrl = process.env.AI_LAYER_URL || 'http://127.0.0.1:8000'
    const response = await axios.post(`${aiLayerUrl}/api/analyze`, req.body)
    
    // Reshape Python payload to match legacy Node payload expected by React
    const pyData = response.data?.results || {}
    const pySchema = pyData.schema || {}
    const tablesArray = Object.values(pySchema.tables || {})
    const relationships = pyData.relationships || []
    
    const customDetails = {
      name: `${req.body.dbName || req.body.filename || 'Database'} (${req.body.dbType || 'Unknown'})`,
      tablesCount: pySchema.table_count || tablesArray.length,
      columnsCount: pySchema.column_count || 0,
      relationshipsCount: relationships.length,
      totalRecords: tablesArray.reduce((acc, t) => acc + (t.row_count || 0), 0),
      qualityScore: pyData.quality?.overall_score || 92,
      anomaliesCount: (pyData.quality?.anomalies || []).length,
      tables: tablesArray.map(t => ({
        ...t,
        records: t.row_count || 0,
        columns: t.columns || []
      })),
      relationships: relationships,
      ragChunks: pyData.rag?.index || [],
      insights: pyData.insights || null,
      dynamicCharts: pyData.visualizations?.charts || null
    }

    return res.json({
      success: true,
      datasetKey: 'Custom Database',
      customDetails
    })
  } catch (err) {
    console.error('Database analysis error:', err)
    return res.status(500).json({ error: err.response?.data?.detail || err.message || 'Failed to extract schema from database via AI Layer' })
  }
})

export default router;
