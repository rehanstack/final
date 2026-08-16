import React from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, Sparkles } from 'lucide-react'

export default function Landing() {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.4, delayChildren: 0.2 }
    }
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 2, ease: "easeOut" }
    }
  }

  const titleVariants = {
    hidden: { opacity: 0, scale: 1.15, filter: "blur(10px)", letterSpacing: "0.1em" },
    visible: { 
      opacity: 1, 
      scale: 1, 
      filter: "blur(0px)",
      letterSpacing: "normal",
      transition: { duration: 2.5, ease: [0.2, 0.8, 0.2, 1] }
    }
  }

  return (
    <div className="flex flex-col min-h-[calc(100vh-64px)] justify-center items-center max-w-5xl mx-auto px-6 py-24 text-center">
      <motion.div variants={containerVariants} initial="hidden" animate="visible" className="w-full">
        
        <motion.div variants={itemVariants} className="flex items-center justify-center gap-3 mb-8">
          <Sparkles className="w-6 h-6 md:w-8 md:h-8 text-primary" />
          <span className="text-base md:text-xl font-bold text-primary uppercase tracking-wider">Autonomous Database Intelligence</span>
        </motion.div>
        
        <motion.h1 
          variants={titleVariants} 
          className="text-6xl md:text-8xl lg:text-9xl font-black mb-10 text-transparent bg-clip-text bg-gradient-to-b from-red-500 via-red-800 to-black leading-tight tracking-tighter"
        >
          DBSense AI
        </motion.h1>
        
        <motion.p variants={itemVariants} className="text-xl md:text-3xl text-gray-400 mb-16 leading-relaxed max-w-4xl mx-auto">
          Transform complex databases into actionable business intelligence using collaborative AI agents and retrieval-grounded reasoning.
        </motion.p>
        
        <motion.div variants={itemVariants} className="flex flex-col sm:flex-row items-center justify-center gap-6">
          <Link to="/upload" className="button-primary justify-center w-full sm:w-auto px-10 py-5 text-lg md:text-xl font-bold">
            Launch Demo <ArrowRight className="w-6 h-6 ml-2" />
          </Link>
          <Link to="/architecture" className="button-secondary justify-center w-full sm:w-auto px-10 py-5 text-lg md:text-xl font-bold">
            View Architecture
          </Link>
        </motion.div>

      </motion.div>
    </div>
  )
}
