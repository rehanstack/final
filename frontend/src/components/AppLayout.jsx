import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import { loadAnalysis } from '../lib/analysisState'
import { motion } from 'framer-motion'

export default function AppLayout({ children }) {
  const analysis = loadAnalysis()
  const location = useLocation()

  // If trying to access dashboard pages without an active database connection, redirect to upload
  if (!analysis || !analysis.hasAnalysis) {
    return <Navigate to="/upload" state={{ from: location }} replace />
  }

  return (
    <div className="flex min-h-screen bg-dark-950">
      <Sidebar />
      <div className="flex-1 lg:pl-64 flex flex-col pt-16">
        <motion.main
          key={location.pathname}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -15 }}
          transition={{ duration: 0.3 }}
          className="flex-1 w-full relative"
        >
          {children}
        </motion.main>
      </div>
    </div>
  )
}
