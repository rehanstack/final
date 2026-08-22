import express from 'express'
import axios from 'axios'

const router = express.Router()

router.get('/api/health', async (req, res) => {
  let aiLayerStatus = 'offline';
  try {
    let aiLayerUrl = (process.env.AI_LAYER_URL || 'http://127.0.0.1:8000').replace(/\/$/, '');
    const response = await axios.get(`${aiLayerUrl}/health`, { timeout: 4000 });
    if (response.status === 200) aiLayerStatus = 'online';
  } catch (err) {
    console.error('AI layer health check failed:', err.message);
  }

  res.json({
    status: 'ok', backend: 'online', aiLayer: aiLayerStatus,
    timestamp: new Date().toISOString(), service: 'DBSense AI Backend', version: '1.0.0'
  })
})

router.get('/ping', (req, res) => {
  res.send('pong')
})

export default router
