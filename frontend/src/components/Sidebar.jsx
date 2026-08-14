import React from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { LayoutDashboard, Database, Shield, Sparkles, Brain, LogOut, GitBranch, BarChart3, Activity, Table } from 'lucide-react'
import { clearAnalysis, loadAnalysis } from '../lib/analysisState'
import { motion } from 'framer-motion'

export default function Sidebar() {
  const location = useLocation()
  const navigate = useNavigate()
  const analysis = loadAnalysis()

  const isActive = (path) => location.pathname === path

  const handleDisconnect = () => {
    clearAnalysis()
    navigate('/upload')
  }

  const links = [
    { name: 'Business Intelligence', path: '/business-intel', icon: BarChart3 },
    { name: 'Schema Explorer', path: '/schema-explorer', icon: Database },
    { name: 'Quality Metrics', path: '/quality-metrics', icon: Activity },
    { name: 'Data Explorer', path: '/data-explorer', icon: Table },
    { name: 'AI Insights', path: '/insights', icon: Sparkles },
    { name: 'RAG Knowledge', path: '/rag-knowledge', icon: Brain },
  ]

  return (
    <div className="w-64 h-screen fixed left-0 top-16 bg-dark-950 border-r border-white/10 hidden lg:flex flex-col z-40">
      
      {/* Active Database Badge */}
      <div className="p-6 border-b border-white/10">
        <p className="text-xs uppercase tracking-wider text-gray-500 font-semibold mb-2">Active Connection</p>
        <div className="flex items-center gap-3 bg-dark-900 p-3 rounded-xl border border-white/5">
          <div className="w-8 h-8 rounded-lg bg-green-500/20 border border-green-500/30 flex items-center justify-center">
            <Database className="w-4 h-4 text-green-400" />
          </div>
          <div className="overflow-hidden">
            <p className="font-semibold text-sm text-white truncate w-full">{analysis.dataset || 'Unknown DB'}</p>
            <p className="text-xs text-green-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></span> Connected
            </p>
          </div>
        </div>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 py-6 px-4 space-y-2 overflow-y-auto">
        {links.map((link) => {
          const Icon = link.icon
          const active = isActive(link.path)
          return (
            <Link
              key={link.path}
              to={link.path}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${
                active
                  ? 'bg-primary/20 text-primary shadow-glow border border-primary/30'
                  : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent'
              }`}
            >
              <Icon className="w-5 h-5" />
              {link.name}
              {active && (
                <motion.div
                  layoutId="sidebar-indicator"
                  className="absolute left-0 w-1 h-8 bg-primary rounded-r-full"
                />
              )}
            </Link>
          )
        })}
      </div>

      {/* Disconnect Button */}
      <div className="p-4 border-t border-white/10">
        <button
          onClick={handleDisconnect}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl text-sm font-semibold transition-all border border-red-500/30"
        >
          <LogOut className="w-4 h-4" />
          Disconnect Database
        </button>
      </div>
    </div>
  )
}
