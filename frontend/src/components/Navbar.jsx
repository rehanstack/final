import React, { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Zap, Menu, X, Shield, GitBranch, Upload as UploadIcon, LogOut } from 'lucide-react'
import { loadAnalysis, clearAnalysis } from '../lib/analysisState'
import { useNavigate } from 'react-router-dom'

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const analysis = loadAnalysis()
  const hasDb = analysis && analysis.hasAnalysis

  const isActive = (path) => location.pathname === path

  const handleDisconnect = () => {
    clearAnalysis()
    navigate('/upload')
    setIsOpen(false)
  }

  const links = [
    { name: 'Upload Database', path: '/upload', icon: UploadIcon },
    { name: 'Architecture', path: '/architecture', icon: GitBranch },
    { name: 'Security', path: '/security', icon: Shield }
  ]

  // If in app layout (desktop), we might want to hide the mobile menu toggle if sidebar is visible.
  // But on mobile, sidebar is hidden, so we need a mobile menu for sidebar items.
  // For simplicity, we'll just keep the main public links here. Mobile sidebar can be implemented later.

  return (
    <nav className="fixed top-0 w-full z-50 glass-dark border-b border-white/10 backdrop-blur-xl bg-dark-950/85">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-9 h-9 bg-gradient-to-r from-primary to-secondary rounded-lg flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold gradient-text group-hover:glow-text transition-all">DBSense AI</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-6 text-sm">
            {links.map((link) => {
              const Icon = link.icon
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`font-medium flex items-center gap-1.5 transition-all duration-200 ${
                    isActive(link.path)
                      ? 'text-primary font-bold'
                      : 'text-gray-300 hover:text-white'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {link.name}
                </Link>
              )
            })}
          </div>

          <h2>Version 1.4 :- RAG APPLICATION</h2>

          <div className="hidden lg:flex items-center gap-3">
            {hasDb ? (
              <>
                <button
                  onClick={handleDisconnect}
                  className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg text-xs font-semibold transition-all border border-red-500/30 flex items-center gap-2"
                >
                  <LogOut className="w-4 h-4" />
                  Disconnect
                </button>
                <Link to="/business-intel" className="button-primary text-xs py-2 px-5 hover:shadow-glow">
                  Dashboard
                </Link>
              </>
            ) : (
              <Link to="/upload" className="button-primary text-xs py-2 px-5 hover:shadow-glow">
                <UploadIcon className="w-4 h-4" />
                Upload Database
              </Link>
            )}
          </div>

          {/* Mobile Menu Toggle */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="lg:hidden text-white p-2"
          >
            {isOpen ? <X /> : <Menu />}
          </button>
        </div>

        {/* Mobile Dropdown */}
        {isOpen && (
          <div className="lg:hidden pb-6 pt-2 space-y-3 border-t border-white/10">
            {hasDb && (
              <div className="pb-2 border-b border-white/10 space-y-1">
                <p className="text-[10px] uppercase font-semibold text-gray-500 px-3 mb-1">Active Database Workspace</p>
                {[
                  { name: 'Business Intelligence', path: '/business-intel' },
                  { name: 'Schema Explorer', path: '/schema-explorer' },
                  { name: 'Quality Metrics', path: '/quality-metrics' },
                  { name: 'Data Explorer', path: '/data-explorer' },
                  { name: 'AI Insights', path: '/insights' },
                  { name: 'RAG Knowledge', path: '/rag-knowledge' },
                ].map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setIsOpen(false)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                      isActive(item.path)
                        ? 'bg-primary/20 text-primary font-bold'
                        : 'text-gray-300 hover:bg-white/5'
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                    {item.name}
                  </Link>
                ))}
              </div>
            )}
            {links.map((link) => {
              const Icon = link.icon
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`flex items-center gap-3 font-medium px-3 py-2 rounded-lg text-sm transition-all ${
                    isActive(link.path)
                      ? 'bg-primary/20 text-primary font-bold'
                      : 'text-gray-300 hover:bg-white/5'
                  }`}
                  onClick={() => setIsOpen(false)}
                >
                  <Icon className="w-4 h-4" />
                  {link.name}
                </Link>
              )
            })}
            <div className="pt-2 flex flex-col gap-2">
              {hasDb ? (
                <>
                  <Link
                    to="/business-intel"
                    onClick={() => setIsOpen(false)}
                    className="button-primary w-full justify-center text-sm py-2.5 mb-2"
                  >
                    Go to Dashboard
                  </Link>
                  <button
                    onClick={handleDisconnect}
                    className="w-full px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg text-xs font-semibold text-center border border-red-500/30 flex items-center justify-center gap-2"
                  >
                    <LogOut className="w-4 h-4" />
                    Disconnect Active Database
                  </button>
                </>
              ) : (
                <Link
                  to="/upload"
                  onClick={() => setIsOpen(false)}
                  className="button-primary w-full justify-center text-sm py-2.5"
                >
                  <UploadIcon className="w-4 h-4" />
                  Upload Database
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}
