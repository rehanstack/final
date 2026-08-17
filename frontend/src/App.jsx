import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import Navbar from './components/Navbar'
import AppLayout from './components/AppLayout'
import Landing from './pages/Landing'
import Upload from './pages/Upload'
import Processing from './pages/Processing'
import BusinessIntel from './pages/BusinessIntel'
import TargetAnalysis from './pages/TargetAnalysis'
import SchemaExplorer from './pages/SchemaExplorer'
import QualityMetrics from './pages/QualityMetrics'
import DataExplorer from './pages/DataExplorer'
import Insights from './pages/Insights'
import RAGKnowledge from './pages/RAGKnowledge'
import Architecture from './pages/Architecture'
import Security from './pages/Security'
import { AnimatePresence } from 'framer-motion'
import { ServerStatusProvider } from './context/ServerStatusContext'
import DebugMenu from './components/DebugMenu'

export default function App() {
  return (
    <ServerStatusProvider>
      <Router>
        <div className="min-h-screen bg-dark-950">
          <Navbar />
          <DebugMenu />
          <AnimatePresence mode="wait">
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<Landing />} />
              <Route path="/upload" element={<Upload />} />
              <Route path="/processing" element={<Processing />} />
              <Route path="/architecture" element={<Architecture />} />
              <Route path="/security" element={<Security />} />

              {/* Dashboard Redirect */}
              <Route path="/dashboard" element={<Navigate to="/business-intel" replace />} />

              {/* App Layout Routes (Require Authentication/Database) */}
              <Route path="/business-intel" element={<AppLayout><BusinessIntel /></AppLayout>} />
              <Route path="/target-analysis" element={<AppLayout><TargetAnalysis /></AppLayout>} />
              <Route path="/schema-explorer" element={<AppLayout><SchemaExplorer /></AppLayout>} />
              <Route path="/quality-metrics" element={<AppLayout><QualityMetrics /></AppLayout>} />
              <Route path="/data-explorer" element={<AppLayout><DataExplorer /></AppLayout>} />
              <Route path="/insights" element={<AppLayout><Insights /></AppLayout>} />
              <Route path="/rag-knowledge" element={<AppLayout><RAGKnowledge /></AppLayout>} />
            </Routes>
          </AnimatePresence>
        </div>
      </Router>
    </ServerStatusProvider>
  )
}
