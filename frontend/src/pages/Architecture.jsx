import React from 'react'
import { motion } from 'framer-motion'
import { Box, Database, Cpu, Lock, Zap, Cloud } from 'lucide-react'

export default function Architecture() {
  const layers = [
    {
      name: 'Frontend Layer',
      tech: 'React + Vite + Tailwind',
      description: 'Beautiful, responsive UI with real-time updates',
      color: 'from-blue-600 to-cyan-500',
      icon: Box
    },
    {
      name: 'API Gateway',
      tech: 'Node.js + Express',
      description: 'RESTful API with authentication and rate limiting',
      color: 'from-green-600 to-emerald-500',
      icon: Cpu
    },
    {
      name: 'Master Agent',
      tech: 'Python + LangChain',
      description: 'Orchestrates multi-agent workflow',
      color: 'from-purple-600 to-pink-500',
      icon: Zap
    },
    {
      name: 'AI Agents',
      tech: '6 Specialized Agents',
      description: 'Schema, Relationship, Quality, RAG, Reasoning, Visualization',
      color: 'from-indigo-600 to-purple-500',
      icon: Cpu
    },
    {
      name: 'Knowledge Store',
      tech: 'ChromaDB + Embeddings',
      description: 'Vector database for semantic search',
      color: 'from-orange-600 to-red-500',
      icon: Database
    },
    {
      name: 'AI Model',
      tech: 'Google Gemini',
      description: 'Large language model for reasoning',
      color: 'from-yellow-600 to-orange-500',
      icon: Cloud
    },
    {
      name: 'Data Layer',
      tech: 'MongoDB + PostgreSQL',
      description: 'Persistent storage and audit logs',
      color: 'from-teal-600 to-cyan-500',
      icon: Database
    },
    {
      name: 'Security',
      tech: 'AES-256 + TLS 1.3 + RBAC',
      description: 'Enterprise-grade security infrastructure',
      color: 'from-red-600 to-pink-500',
      icon: Lock
    }
  ]

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  }

  return (
    <div className="pt-24 pb-20 px-4">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="max-w-6xl mx-auto"
      >
        <motion.div variants={itemVariants} className="mb-16">
          <h1 className="text-5xl font-bold mb-2">System Architecture</h1>
          <p className="text-xl text-gray-400">Modern, scalable multi-layer architecture</p>
        </motion.div>

        {/* Architecture Diagram */}
        <motion.div variants={itemVariants} className="glass-dark p-8 rounded-xl mb-16 border border-white/10">
          <div className="space-y-4">
            {[
              { title: 'Frontend', detail: 'React + Tailwind' },
              { title: 'Backend', detail: 'Node.js + Express' },
              { title: 'Master Agent', detail: 'Workflow orchestration' },
              { title: 'Python AI Layer', detail: 'Specialized mock agents' },
              { title: 'LangChain', detail: 'Phase 2 orchestration layer' },
              { title: 'ChromaDB', detail: 'Phase 2 vector store' },
              { title: 'Gemini', detail: 'Phase 2 reasoning model' },
              { title: 'MongoDB', detail: 'Phase 2 persistence' }
            ].map((step, index, items) => (
              <div key={step.title}>
                <div className="max-w-xl mx-auto p-4 rounded-xl bg-dark-800/60 border border-white/10 text-center">
                  <p className="font-semibold">{step.title}</p>
                  <p className="text-sm text-primary font-mono">{step.detail}</p>
                </div>
                {index < items.length - 1 && (
                  <div className="text-center text-primary my-3">↓</div>
                )}
              </div>
            ))}
          </div>
        </motion.div>

        {/* Detailed Layers */}
        <motion.div variants={itemVariants} className="mb-16">
          <h2 className="text-2xl font-semibold mb-8">Architecture Layers</h2>
          <div className="grid md:grid-cols-2 gap-6">
            {layers.map((layer, i) => {
              const Icon = layer.icon
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: i % 2 === 0 ? -20 : 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="glass-dark p-6 rounded-xl border border-white/10 hover:border-primary/50 transition-all group"
                >
                  <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${layer.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold mb-1">{layer.name}</h3>
                  <p className="text-sm font-mono text-primary mb-2">{layer.tech}</p>
                  <p className="text-sm text-gray-400">{layer.description}</p>
                </motion.div>
              )
            })}
          </div>
        </motion.div>

        {/* Data Flow */}
        <motion.div variants={itemVariants} className="glass-dark p-8 rounded-xl border border-secondary/20 mb-16">
          <h2 className="text-2xl font-semibold mb-6">Request Processing Flow</h2>
          <div className="space-y-4">
            {[
              { step: 1, title: 'User Upload', desc: 'Schema file or database connection submitted' },
              { step: 2, title: 'Validation', desc: 'API validates input and authenticates user' },
              { step: 3, title: 'Queue Processing', desc: 'Job queued for agent framework' },
              { step: 4, title: 'Agent Orchestration', desc: 'Master agent coordinates 6 specialized agents' },
              { step: 5, title: 'Knowledge Extraction', desc: 'Schema and metadata chunked and embedded' },
              { step: 6, title: 'RAG Indexing', desc: 'Embeddings stored in ChromaDB' },
              { step: 7, title: 'Reasoning', desc: 'Gemini generates insights with context' },
              { step: 8, title: 'Presentation', desc: 'Results formatted and sent to frontend' }
            ].map((item) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ delay: item.step * 0.05 }}
                className="flex items-center gap-4"
              >
                <div className="w-10 h-10 rounded-full bg-gradient-to-r from-primary to-secondary flex items-center justify-center font-bold flex-shrink-0">
                  {item.step}
                </div>
                <div>
                  <p className="font-semibold">{item.title}</p>
                  <p className="text-sm text-gray-400">{item.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Technology Details */}
        <motion.div variants={itemVariants} className="grid md:grid-cols-2 gap-6">
          <div className="glass-dark p-8 rounded-xl border border-white/10">
            <h3 className="text-lg font-semibold mb-4">Core Technologies</h3>
            <ul className="space-y-2 text-gray-300">
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-primary"></span>
                React 18 + Vite for lightning-fast UI
              </li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-secondary"></span>
                Node.js + Express API gateway
              </li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-accent"></span>
                Python + LangChain for AI orchestration
              </li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-primary"></span>
                ChromaDB for vector embeddings
              </li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-secondary"></span>
                Google Gemini for reasoning
              </li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-accent"></span>
                MongoDB for flexible data storage
              </li>
            </ul>
          </div>

          <div className="glass-dark p-8 rounded-xl border border-white/10">
            <h3 className="text-lg font-semibold mb-4">Key Features</h3>
            <ul className="space-y-2 text-gray-300">
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-primary"></span>
                Horizontal scalability with distributed agents
              </li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-secondary"></span>
                Real-time progress tracking & updates
              </li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-accent"></span>
                Comprehensive audit logging
              </li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-primary"></span>
                WebSocket for live agent status
              </li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-secondary"></span>
                Caching layer for performance
              </li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-accent"></span>
                Fallback mechanisms for reliability
              </li>
            </ul>
          </div>
        </motion.div>
      </motion.div>
    </div>
  )
}
