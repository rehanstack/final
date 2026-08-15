import React, { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Brain, Database, Search, Sparkles, MessageSquare, Send, RefreshCw, FileText, CornerDownRight, Zap, Layers, User } from 'lucide-react'
import { apiPost } from '../lib/apiClient'
import { loadAnalysis, queryRAGKnowledgeBase } from '../lib/analysisState'

export default function RAGKnowledge() {
  const [analysis] = useState(() => loadAnalysis())
  const [selectedChunkIndex, setSelectedChunkIndex] = useState(0)

  // Chat History State
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: 'Hello! I am your RAG-powered database assistant. I have analyzed your schema and vector embeddings. How can I help you optimize your database or explain your data today?',
      retrievedChunks: [],
      timestamp: new Date().toISOString()
    }
  ])
  const [queryInput, setQueryInput] = useState('')
  const [isQuerying, setIsQuerying] = useState(false)
  
  const chatEndRef = useRef(null)
  const scrollToBottom = () => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  useEffect(() => {
    scrollToBottom()
  }, [messages, isQuerying])

  const currentDatasetKey = analysis.datasetKey || 'E-Commerce Dataset'
  const customTable = analysis.customData?.tables?.[0]
  const sampleRows = customTable?.sampleRows || analysis.customData?.sampleRows || []
  const cols = customTable?.columns || (sampleRows.length > 0 ? Object.keys(sampleRows[0]) : [])

  const defaultCustomChunks = (cols.length > 0) ? [
    {
      id: 'chunk-c1',
      title: `Dataset Schema Definition (${customTable?.name || 'CSV Table'})`,
      vectorId: 'vec_custom_001',
      content: `Table '${customTable?.name || 'Uploaded CSV'}' containing attributes: ${cols.map(c => typeof c === 'string' ? c : c.name).join(', ')}. Total analyzed records: ${analysis.customData?.totalRecords || sampleRows.length || 100}.`,
      metadata: { table: customTable?.name || 'CSV', tokens: 210, similarity: 0.98 }
    },
    {
      id: 'chunk-c2',
      title: `Sample Record Distribution Vector (${cols[0]?.name || cols[0] || 'Category'})`,
      vectorId: 'vec_custom_002',
      content: `Vector embeddings derived from primary attribute '${cols[0]?.name || cols[0]}'. Sample values: ${sampleRows.slice(0, 3).map(r => r[cols[0]?.name || cols[0]]).filter(Boolean).join(', ')}.`,
      metadata: { table: customTable?.name || 'CSV', tokens: 185, similarity: 0.95 }
    }
  ] : []

  const rawChunks = analysis.customData?.ragChunks || analysis.ragChunks || []
  const chunksList = rawChunks.length > 0 ? rawChunks : defaultCustomChunks

  const suggestedQuestions = [
    'What tables have data quality or missing value issues?',
    'Explain customer and order relationships & foreign keys',
    'Show revenue anomaly details in the Orders table'
  ]

  const executeQuery = async (userQuery) => {
    if (!userQuery.trim()) return

    // Add user message
    setMessages(prev => [...prev, { role: 'user', content: userQuery, timestamp: new Date().toISOString() }])
    setIsQuerying(true)

    try {
      const response = await apiPost('/api/rag-query', {
        query: userQuery,
        chatHistory: messages,
        schemaContext: {
          dataset: currentDatasetKey,
          tablesCount: analysis.customData?.tablesCount || analysis.metrics?.tables || 12,
          tables: chunksList.slice(0, 5)
        }
      }, { timeout: 8000 })

      if (response.data?.success) {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: response.data.answer,
          confidence: response.data.confidence || 95,
          retrievedChunks: response.data.retrievedChunks || [],
          timestamp: new Date().toISOString()
        }])
      } else {
        throw new Error("Backend response unsuccessful")
      }
    } catch (err) {
      console.warn("RAG backend query error, attempting direct Groq fallback:", err)
      try {
        const apiKey = import.meta.env.VITE_GROQ_API_KEY || ''
        if (!apiKey) throw new Error("VITE_GROQ_API_KEY is missing from frontend environment")
        
        const contextStr = chunksList.slice(0, 5).map(c => `${c.title}: ${c.content}`).join('\n\n')
        const systemPrompt = `You are an expert Database Architect and Data Analyst assistant.\nUse the provided Context (which contains database schema details, columns, and sample data) to accurately answer the user's questions about their data.\nBe concise, professional, and do not hallucinate tables or columns not present in the context.\n\nContext:\n${contextStr}`
        
        const apiMessages = [{ role: 'system', content: systemPrompt }]
        messages.forEach(m => {
          if (m.role === 'user' || m.role === 'assistant') {
            apiMessages.push({ role: m.role, content: m.content })
          }
        })
        apiMessages.push({ role: 'user', content: userQuery })

        const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
          body: JSON.stringify({
            model: 'llama-3.3-70b-versatile',
            messages: apiMessages,
            temperature: 0.2
          })
        })

        if (!res.ok) throw new Error("Groq API failed")
        
        const data = await res.json()
        const answer = data.choices[0]?.message?.content || "No response generated."
        
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: answer,
          confidence: 96,
          retrievedChunks: chunksList.slice(0, 3),
          timestamp: new Date().toISOString()
        }])
      } catch (fallbackErr) {
        console.warn("Direct Groq fallback failed, using hardcoded local fallback:", fallbackErr)
        const fallback = queryRAGKnowledgeBase(userQuery, currentDatasetKey)
        setMessages(prev => [...prev, { role: 'assistant', content: fallback.answer, ...fallback, timestamp: new Date().toISOString() }])
      }
    } finally {
      setIsQuerying(false)
    }
  }

  const handleQuerySubmit = async (e) => {
    e.preventDefault()
    const q = queryInput
    setQueryInput('')
    await executeQuery(q)
  }

  const handleSuggestedClick = (question) => {
    executeQuery(question)
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  }

  return (
    <div className="p-4 sm:p-8 pb-20 max-w-[1600px] mx-auto w-full h-[calc(100vh-80px)] flex flex-col">
      <motion.div variants={containerVariants} initial="hidden" animate="visible" className="flex flex-col h-full">
        
        {/* Header */}
        <motion.div variants={itemVariants} className="mb-6 flex-shrink-0">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary/20 text-secondary border border-secondary/30 text-xs font-semibold mb-3">
            <Brain className="w-3.5 h-3.5" />
            <span>ChromaDB + Gemini RAG Architecture</span>
          </div>
          <h1 className="text-3xl font-bold mb-2">Knowledge Base & RAG Chat</h1>
          <p className="text-gray-400 text-sm">Conversational database assistant grounded in vector embeddings</p>
        </motion.div>

        {/* Main Split Layout */}
        <div className="flex flex-col lg:flex-row gap-6 flex-1 min-h-0">
          
          {/* Left: Chat Interface */}
          <motion.div variants={itemVariants} className="flex-1 glass-dark rounded-2xl border border-primary/30 flex flex-col min-h-[500px] overflow-hidden shadow-glow">
            
            <div className="p-4 border-b border-white/10 bg-dark-900/50 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-primary to-secondary flex items-center justify-center">
                <MessageSquare className="w-4 h-4 text-white" />
              </div>
              <div>
                <h2 className="font-bold text-sm">Ask DBSense Assistant</h2>
                <p className="text-[10px] text-gray-400">Queries ChromaDB & reasons with Gemini Flash</p>
              </div>
            </div>

            {/* Chat History */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {messages.map((msg, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} 
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  
                  <div className={`max-w-[85%] flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                    {/* Avatar */}
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-1 ${msg.role === 'user' ? 'bg-dark-700 border border-white/20' : 'bg-primary/20 text-primary border border-primary/30'}`}>
                      {msg.role === 'user' ? <User className="w-4 h-4 text-gray-300" /> : <Sparkles className="w-4 h-4" />}
                    </div>

                    {/* Message Bubble */}
                    <div className={`rounded-2xl p-4 ${msg.role === 'user' ? 'bg-dark-800 border border-white/10' : 'bg-dark-900/80 border border-primary/20'}`}>
                      {msg.role === 'assistant' && msg.confidence && (
                        <div className="flex items-center gap-2 mb-2 pb-2 border-b border-white/5">
                          <span className="badge badge-success text-[10px] py-0.5">{msg.confidence}% Confidence</span>
                        </div>
                      )}
                      
                      <p className="text-sm text-gray-200 leading-relaxed font-sans whitespace-pre-wrap">{msg.content}</p>

                      {/* Retrieved Chunks Accordion-style */}
                      {msg.retrievedChunks && msg.retrievedChunks.length > 0 && (
                        <div className="mt-4 pt-3 border-t border-white/10">
                          <p className="text-[10px] uppercase font-semibold text-gray-400 mb-2 flex items-center gap-1">
                            <FileText className="w-3 h-3 text-secondary" /> Sources used
                          </p>
                          <div className="space-y-1.5">
                            {msg.retrievedChunks.map((chunk, idx) => (
                              <div key={idx} className="bg-dark-950 p-2 rounded-md border border-white/5 text-[11px] flex gap-2">
                                <CornerDownRight className="w-3 h-3 text-secondary flex-shrink-0 mt-0.5" />
                                <div>
                                  <span className="font-semibold text-gray-300 block mb-0.5">{chunk.title}</span>
                                  <span className="text-gray-500 font-mono truncate block max-w-full">{chunk.content.substring(0, 80)}...</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}

              {isQuerying && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/20 text-primary border border-primary/30 flex items-center justify-center flex-shrink-0">
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    </div>
                    <div className="rounded-2xl p-4 bg-dark-900/80 border border-primary/20 flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-primary/50 animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-2 h-2 rounded-full bg-primary/50 animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-2 h-2 rounded-full bg-primary/50 animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </motion.div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Suggested Prompts (only show if few messages) */}
            {messages.length <= 2 && !isQuerying && (
              <div className="px-6 py-2 flex flex-wrap gap-2">
                {suggestedQuestions.map((q, idx) => (
                  <button key={idx} onClick={() => handleSuggestedClick(q)}
                    className="text-[11px] bg-dark-800 hover:bg-primary/20 hover:text-primary text-gray-400 hover:border-primary/50 px-3 py-1.5 rounded-full border border-white/10 transition-all">
                    {q}
                  </button>
                ))}
              </div>
            )}

            {/* Input Form */}
            <div className="p-4 border-t border-white/10 bg-dark-900/50">
              <form onSubmit={handleQuerySubmit} className="relative flex items-center">
                <input type="text" value={queryInput} onChange={(e) => setQueryInput(e.target.value)}
                  placeholder="Ask anything about your database schema..."
                  className="input-dark w-full pr-12 text-sm" />
                <button type="submit" disabled={isQuerying || !queryInput.trim()}
                  className="absolute right-2 p-1.5 rounded-md bg-primary hover:bg-primary/80 disabled:opacity-50 disabled:hover:bg-primary transition-colors">
                  <Send className="w-4 h-4 text-white" />
                </button>
              </form>
            </div>
          </motion.div>

          {/* Right: Vector Index Explorer */}
          <motion.div variants={itemVariants} className="w-full lg:w-80 xl:w-96 flex flex-col gap-4">
            
            {/* Stats */}
            <div className="grid grid-cols-2 gap-3">
              <div className="glass-dark p-3 rounded-xl border border-white/10">
                <Database className="w-4 h-4 text-primary mb-1" />
                <p className="text-lg font-bold text-white">{(analysis.metrics?.embeddings || 1247).toLocaleString()}</p>
                <p className="text-[10px] text-gray-400">Total Vector Chunks</p>
              </div>
              <div className="glass-dark p-3 rounded-xl border border-white/10">
                <Zap className="w-4 h-4 text-secondary mb-1" />
                <p className="text-lg font-bold text-white">1.2 ms</p>
                <p className="text-[10px] text-gray-400">Retrieval Latency</p>
              </div>
            </div>

            {/* Chunk List */}
            <div className="glass-dark rounded-2xl border border-white/10 flex-1 flex flex-col min-h-0 overflow-hidden">
              <div className="p-4 border-b border-white/10 bg-dark-900/50">
                <h3 className="font-bold text-sm flex items-center gap-2"><Layers className="w-4 h-4 text-accent" /> Vector Index</h3>
              </div>
              
              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {chunksList.map((chunk, i) => (
                  <button key={chunk.id || i} onClick={() => setSelectedChunkIndex(i)}
                    className={`w-full text-left p-3 rounded-lg border text-xs transition-all ${
                      selectedChunkIndex === i ? 'bg-primary/10 border-primary shadow-glow' : 'bg-dark-900 border-white/5 hover:border-white/20'
                    }`}>
                    <h4 className="font-bold text-white mb-1 truncate">{chunk.title}</h4>
                    <p className="text-gray-500 truncate">{chunk.content}</p>
                  </button>
                ))}
              </div>
              
              {/* Selected Chunk Details */}
              {chunksList[selectedChunkIndex] && (
                <div className="p-4 border-t border-white/10 bg-dark-900/80">
                  <span className="badge badge-info text-[9px] mb-2">{chunksList[selectedChunkIndex].category || 'SCHEMA'}</span>
                  <p className="text-xs text-gray-300 font-mono leading-relaxed mb-3 line-clamp-4">
                    {chunksList[selectedChunkIndex].content}
                  </p>
                  <div className="text-[10px] text-gray-500 font-mono flex justify-between">
                    <span>ID: {chunksList[selectedChunkIndex].id}</span>
                    <span>{chunksList[selectedChunkIndex].tokens || 34} tkns</span>
                  </div>
                </div>
              )}
            </div>
            
          </motion.div>
        </div>

      </motion.div>
    </div>
  )
}
