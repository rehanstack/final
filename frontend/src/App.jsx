import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import Navbar from './components/Navbar'
import AppLayout from './components/AppLayout'
import Landing from './pages/Landing'
import Upload from './pages/Upload'
import Processing from './pages/Processing'
import BusinessIntel from './pages/BusinessIntel'
import SchemaExplorer from './pages/SchemaExplorer'
import QualityMetrics from './pages/QualityMetrics'
import Insights from './pages/Insights'
import RAGKnowledge from './pages/RAGKnowledge'
import Architecture from './pages/Architecture'
import Security from './pages/Security'
import { AnimatePresence } from 'framer-motion'

export default function App() {
  return (
    <Router>
      <div className="min-h-screen bg-dark-950 gradient-animation">
        <Navbar />
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
            <Route path="/schema-explorer" element={<AppLayout><SchemaExplorer /></AppLayout>} />
            <Route path="/quality-metrics" element={<AppLayout><QualityMetrics /></AppLayout>} />
            <Route path="/insights" element={<AppLayout><Insights /></AppLayout>} />
            <Route path="/rag-knowledge" element={<AppLayout><RAGKnowledge /></AppLayout>} />
          </Routes>
        </AnimatePresence>
      </div>
    </Router>
  )
}
