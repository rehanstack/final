import React, { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Menu, X, Shield, GitBranch, Upload as UploadIcon, LogOut, Database, Sun, Moon } from 'lucide-react'
import { loadAnalysis, clearAnalysis } from '../lib/analysisState'

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false)
  const [hasDb, setHasDb] = useState(false)
  const [theme, setTheme] = useState('dark')
  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    // Check initial theme class
    const savedTheme = localStorage.getItem('theme')
    if (savedTheme === 'cream' || document.documentElement.classList.contains('theme-cream')) {
      document.documentElement.classList.add('theme-cream')
      setTheme('cream')
    } else {
      document.documentElement.classList.remove('theme-cream')
      setTheme('dark')
    }
  }, [])

  const toggleTheme = () => {
    // Generate a completely random position for the transition origin
    const x = Math.random() * window.innerWidth
    const y = Math.random() * window.innerHeight
    document.documentElement.style.setProperty('--click-x', `${x}px`)
    document.documentElement.style.setProperty('--click-y', `${y}px`)

    const isDark = theme === 'dark'

    const updateDOM = () => {
      if (isDark) {
        document.documentElement.classList.add('theme-cream')
        localStorage.setItem('theme', 'cream')
        setTheme('cream')
      } else {
        document.documentElement.classList.remove('theme-cream')
        localStorage.setItem('theme', 'dark')
        setTheme('dark')
      }
    }

    if (!document.startViewTransition) {
      updateDOM()
      return
    }

    document.startViewTransition(() => updateDOM())
  }
  
  useEffect(() => {
    const analysis = loadAnalysis()
    setHasDb(Boolean(analysis?.hasAnalysis))
  }, [location.pathname])

  const isActive = (path) => location.pathname === path

  const handleDisconnect = () => {
    clearAnalysis()
    setHasDb(false)
    navigate('/upload')
    setIsOpen(false)
  }

  const links = [
    { name: 'Architecture', path: '/architecture', icon: GitBranch },
    { name: 'Security', path: '/security', icon: Shield }
  ]

  return (
    <div className="absolute top-0 w-full z-50 px-4 pt-4 pb-2 animate-float-slow">
      <nav className="max-w-5xl mx-auto glass-dark border border-white/10 rounded-full px-4 sm:px-6 h-14 flex items-center justify-between backdrop-blur-xl bg-dark-950/80 animate-glow-continuous">
        
        {/* Logo and Version */}
        <div className="flex items-center gap-4">
          <Link to="/" className="flex items-center gap-2 group">
            <Database className="w-5 h-5 text-red-500 group-hover:text-red-400 transition-colors" />
            <span className="text-lg font-bold tracking-tight bg-gradient-to-r from-primary via-secondary to-accent text-transparent bg-clip-text animate-text-gradient transition-opacity hover:opacity-80">DBSense</span>
          </Link>
          <div className="hidden sm:flex items-center">
            <span className="px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-[10px] font-semibold text-gray-400 tracking-wide uppercase">
              v1.9 :- Clusters
            </span>
          </div>
        </div>

        {/* Desktop Navigation (Center) */}
        <div className="hidden lg:flex items-center gap-8">
          {links.map((link) => {
            const Icon = link.icon
            return (
              <Link
                key={link.path}
                to={link.path}
                className={`text-sm font-medium flex items-center gap-1.5 transition-colors ${
                  isActive(link.path)
                    ? 'text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4" />
                {link.name}
              </Link>
            )
          })}
        </div>

        {/* Desktop Actions (Right) */}
        <div className="hidden lg:flex items-center gap-3">
          <button
            onClick={toggleTheme}
            className="text-gray-400 hover:text-white p-2 rounded-full hover:bg-white/5 transition-colors"
            title="Toggle Theme"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          
          {hasDb ? (
            <>
              <button
                onClick={handleDisconnect}
                className="text-gray-400 hover:text-red-400 text-sm font-medium transition-colors flex items-center gap-1.5 px-2"
                title="Disconnect Database"
              >
                <LogOut className="w-4 h-4" />
              </button>
              <Link to="/business-intel" className="bg-white text-black hover:bg-gray-200 px-5 py-1.5 rounded-full text-sm font-bold transition-colors">
                Dashboard
              </Link>
            </>
          ) : (
            <Link to="/upload" className="bg-white text-black hover:bg-gray-200 px-5 py-1.5 rounded-full text-sm font-bold transition-colors flex items-center gap-1.5">
              <UploadIcon className="w-4 h-4" />
              Upload
            </Link>
          )}
        </div>

        {/* Mobile Menu Toggle */}
        <div className="flex items-center gap-2 lg:hidden">
          <button
            onClick={toggleTheme}
            className="text-gray-400 hover:text-white p-2 rounded-full hover:bg-white/5 transition-colors"
          >
            {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="text-gray-400 hover:text-white transition-colors p-1"
          >
            {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </nav>

      {/* Mobile Dropdown */}
      {isOpen && (
        <div className="lg:hidden absolute top-[72px] left-4 right-4 glass-dark border border-white/10 rounded-2xl p-4 shadow-card flex flex-col gap-2 backdrop-blur-2xl bg-dark-950/95">
          {hasDb && (
            <div className="pb-3 mb-2 border-b border-white/10 flex flex-col gap-1">
              <p className="text-[10px] uppercase font-bold text-gray-500 tracking-wider mb-1">Active Workspace</p>
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
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive(item.path)
                      ? 'bg-white/10 text-white'
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {item.name}
                </Link>
              ))}
            </div>
          )}
          
          <div className="flex flex-col gap-1">
            {links.map((link) => {
              const Icon = link.icon
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive(link.path)
                      ? 'bg-white/10 text-white'
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                  onClick={() => setIsOpen(false)}
                >
                  <Icon className="w-4 h-4" />
                  {link.name}
                </Link>
              )
            })}
          </div>

          <div className="pt-3 mt-2 border-t border-white/10 flex flex-col gap-2">
            {hasDb ? (
              <>
                <Link
                  to="/business-intel"
                  onClick={() => setIsOpen(false)}
                  className="bg-white text-black text-center font-bold text-sm py-2.5 rounded-xl transition-colors hover:bg-gray-200"
                >
                  Go to Dashboard
                </Link>
                <button
                  onClick={handleDisconnect}
                  className="text-red-400 text-center text-sm font-medium py-2.5 rounded-xl hover:bg-red-500/10 transition-colors flex items-center justify-center gap-2"
                >
                  <LogOut className="w-4 h-4" />
                  Disconnect Database
                </button>
              </>
            ) : (
              <Link
                to="/upload"
                onClick={() => setIsOpen(false)}
                className="bg-white text-black text-center font-bold text-sm py-2.5 rounded-xl transition-colors hover:bg-gray-200 flex items-center justify-center gap-2"
              >
                <UploadIcon className="w-4 h-4" />
                Upload Database
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
