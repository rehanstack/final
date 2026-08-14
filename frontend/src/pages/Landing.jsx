import React from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Zap, Brain, Database, TrendingUp, ArrowRight, Shield, Gauge, GitBranch, Search, Layers, Sparkles, BarChart3 } from 'lucide-react'

export default function Landing() {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.2 }
    }
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  }

  const features = [
    {
      icon: Brain,
      title: 'Multi-Agent Architecture',
      description: 'Specialized AI agents collaborate to extract, analyze, and reason about your data'
    },
    {
      icon: Database,
      title: 'Advanced Schema Analysis',
      description: 'Automatically discover relationships, constraints, and data quality issues'
    },
    {
      icon: TrendingUp,
      title: 'Predictive Insights',
      description: 'Identify patterns, anomalies, and emerging trends in your databases'
    },
    {
      icon: Shield,
      title: 'Enterprise Security',
      description: 'AES-256 encryption, TLS 1.3, RBAC, and comprehensive audit logging'
    },
    {
      icon: Gauge,
      title: 'Real-time Monitoring',
      description: 'Track data quality metrics and system health continuously'
    },
    {
      icon: GitBranch,
      title: 'RAG Pipeline',
      description: 'Retrieval-augmented generation for grounded, accurate insights'
    }
  ]

  const workflow = [
    { number: 1, title: 'Schema Agent', desc: 'Extract database structure' },
    { number: 2, title: 'Relationship Agent', desc: 'Discover entity relationships' },
    { number: 3, title: 'Quality Agent', desc: 'Analyze data integrity' },
    { number: 4, title: 'RAG Agent', desc: 'Build knowledge base' },
    { number: 5, title: 'Reasoning Agent', desc: 'Generate insights' },
    { number: 6, title: 'Visualization Agent', desc: 'Create dashboards' }
  ]

  const ragPipeline = [
    { icon: Database, title: 'Database', desc: 'Schema, metadata, and quality signals' },
    { icon: Layers, title: 'Chunking', desc: 'Database context split into retrievable knowledge' },
    { icon: Sparkles, title: 'Embeddings', desc: 'Metadata converted into vector-like mock signals' },
    { icon: Search, title: 'Retriever', desc: 'Relevant context selected for each question' },
    { icon: Brain, title: 'Grounded Reasoning', desc: 'Insights stay tied to database evidence' }
  ]

  const techStack = [
    { name: 'React', icon: '⚛️' },
    { name: 'Node.js', icon: '🟢' },
    { name: 'Python', icon: '🐍' },
    { name: 'LangChain', icon: '🔗' },
    { name: 'ChromaDB', icon: '🧠' },
    { name: 'Gemini', icon: '✨' },
  ]

  return (
    <div className="pt-20">
      {/* Hero Section */}
      <section className="min-h-screen flex items-center justify-center px-4 pt-12">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="max-w-6xl mx-auto text-center"
        >
          <motion.div variants={itemVariants} className="mb-6">
            <div className="inline-block px-4 py-2 glass rounded-full mb-6">
              <span className="text-sm font-semibold gradient-text">🚀 Next Generation Database Intelligence</span>
            </div>
          </motion.div>

          <motion.h1 variants={itemVariants} className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
            <span className="gradient-text">DBSense AI</span>
            <br />
            <span className="text-white">Autonomous Database Intelligence</span>
          </motion.h1>

          <motion.p variants={itemVariants} className="text-lg md:text-xl text-gray-400 mb-10 max-w-2xl mx-auto">
            Transform complex databases into actionable business intelligence using collaborative AI agents and retrieval-grounded reasoning. Unlock hidden insights with enterprise-grade security.
          </motion.p>

          <motion.div variants={itemVariants} className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <Link
              to="/upload"
              className="button-primary justify-center hover:shadow-glow text-lg"
            >
              Try Demo <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              to="/architecture"
              className="button-secondary justify-center text-lg"
            >
              View Architecture
            </Link>
          </motion.div>

          <motion.div variants={itemVariants} className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-secondary/20 blur-3xl"></div>
            <div className="relative glass-dark p-8 md:p-12 rounded-2xl">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="flex flex-col items-center">
                  <Brain className="w-12 h-12 text-primary mb-4" />
                  <p className="font-semibold mb-2">Multi-Agent System</p>
                  <p className="text-sm text-gray-400">6+ specialized agents</p>
                </div>
                <div className="flex flex-col items-center">
                  <Database className="w-12 h-12 text-secondary mb-4" />
                  <p className="font-semibold mb-2">RAG Pipeline</p>
                  <p className="text-sm text-gray-400">Grounded reasoning</p>
                </div>
                <div className="flex flex-col items-center">
                  <Shield className="w-12 h-12 text-accent mb-4" />
                  <p className="font-semibold mb-2">Enterprise Grade</p>
                  <p className="text-sm text-gray-400">98% Security Score</p>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </section>

      {/* Features Section */}
      <section className="py-24 px-4">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-6">Powerful Features</h2>
            <p className="text-xl text-gray-400">Everything you need for comprehensive database intelligence</p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="glass-dark p-8 rounded-xl group hover:border-primary/50 transition-all"
              >
                <feature.icon className="w-12 h-12 text-primary mb-4 group-hover:text-secondary transition-colors" />
                <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
                <p className="text-gray-400">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Multi-Agent Workflow */}
      <section className="py-24 px-4">
        <div className="max-w-6xl mx-auto">
          <motion.h2
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            className="text-4xl md:text-5xl font-bold text-center mb-16"
          >
            Multi-Agent Workflow
          </motion.h2>

          <div className="space-y-4">
            {workflow.map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                className="flex items-center gap-4"
              >
                <div className="w-12 h-12 rounded-full bg-gradient-to-r from-primary to-secondary flex items-center justify-center font-bold flex-shrink-0">
                  {item.number}
                </div>
                <div className="glass-dark p-4 rounded-lg flex-1">
                  <h3 className="font-semibold">{item.title}</h3>
                  <p className="text-sm text-gray-400">{item.desc}</p>
                </div>
                {i < workflow.length - 1 && (
                  <div className="hidden md:block text-primary text-2xl">→</div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* RAG Pipeline */}
      <section className="py-24 px-4 bg-dark-900/40">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-6">RAG Pipeline</h2>
            <p className="text-xl text-gray-400">Ground every AI answer in retrieved database context</p>
          </motion.div>

          <div className="grid md:grid-cols-5 gap-4">
            {ragPipeline.map((step, i) => {
              const Icon = step.icon
              return (
                <motion.div
                  key={step.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08 }}
                  className="glass-dark p-6 rounded-xl text-center border border-white/10"
                >
                  <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center mx-auto mb-4">
                    <Icon className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="font-semibold mb-2">{step.title}</h3>
                  <p className="text-sm text-gray-400">{step.desc}</p>
                </motion.div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Tech Stack */}
      <section className="py-24 px-4 bg-gradient-to-b from-dark-900/50 to-dark-950">
        <div className="max-w-6xl mx-auto">
          <motion.h2
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            className="text-4xl md:text-5xl font-bold text-center mb-16"
          >
            Technology Stack
          </motion.h2>

          <div className="grid md:grid-cols-3 lg:grid-cols-6 gap-4">
            {techStack.map((tech, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.05 }}
                className="glass-dark p-6 rounded-lg text-center hover:border-primary/50 transition-all"
              >
                <p className="text-3xl mb-2">{tech.icon}</p>
                <p className="font-semibold">{tech.name}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Demo Preview */}
      <section className="py-24 px-4">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            className="glass-dark p-6 md:p-8 rounded-2xl border border-primary/20"
          >
            <div className="flex flex-col lg:flex-row gap-8 items-center">
              <div className="flex-1">
                <h2 className="text-3xl md:text-4xl font-bold mb-4">Demo Preview</h2>
                <p className="text-gray-400 mb-6">
                  A complete judge-ready flow: upload sample data, watch agents process it, then review dashboards, RAG context, and AI insights.
                </p>
                <Link to="/processing" className="button-primary inline-flex">
                  Launch Workflow <ArrowRight className="w-5 h-5" />
                </Link>
              </div>
              <div className="flex-1 w-full grid grid-cols-2 gap-4">
                {[
                  { label: 'Tables', value: '18', icon: Database },
                  { label: 'Relations', value: '42', icon: GitBranch },
                  { label: 'Quality', value: '91%', icon: Gauge },
                  { label: 'Insights', value: '6', icon: BarChart3 }
                ].map((item) => {
                  const Icon = item.icon
                  return (
                    <div key={item.label} className="bg-dark-800/60 border border-white/10 rounded-xl p-5">
                      <Icon className="w-5 h-5 text-secondary mb-3" />
                      <p className="text-3xl font-bold gradient-text">{item.value}</p>
                      <p className="text-sm text-gray-400">{item.label}</p>
                    </div>
                  )
                })}
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            className="glass-dark p-12 rounded-2xl"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-6">Ready to explore your data?</h2>
            <p className="text-lg text-gray-400 mb-8">Start with our demo database or upload your own.</p>
            <Link to="/upload" className="button-primary inline-flex justify-center hover:shadow-glow">
              Get Started <ArrowRight className="w-5 h-5" />
            </Link>
          </motion.div>
        </div>
      </section>
    </div>
  )
}
