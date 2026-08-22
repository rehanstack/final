import React from 'react'
import { motion } from 'framer-motion'
import { Users, Code, Terminal, Cpu, Sparkles, Database } from 'lucide-react'

export default function Team() {
  const members = [
    { name: 'Atharva Sharma', role: 'Developer', icon: Terminal, color: 'text-primary' },
    { name: 'Rehan Shaikh', role: 'Developer', icon: Database, color: 'text-secondary' },
    { name: 'Shubham Pawar', role: 'Developer', icon: Code, color: 'text-accent' },
    { name: 'Uzaif Siiddiqui', role: 'Developer', icon: Cpu, color: 'text-green-400' }
  ]

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.2, delayChildren: 0.1 }
    }
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.8, ease: "easeOut" }
    }
  }

  return (
    <div className="pt-24 pb-16 min-h-[calc(100vh-64px)] relative overflow-hidden flex flex-col justify-center">
      {/* Background ambient blobs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-[100px] -z-10 mix-blend-screen animate-pulse-slow"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-secondary/20 rounded-full blur-[100px] -z-10 mix-blend-screen animate-pulse-slow" style={{ animationDelay: '2s' }}></div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 w-full">
        <motion.div 
          initial="hidden"
          animate="visible"
          variants={containerVariants}
          className="text-center mb-20"
        >
          <motion.div variants={itemVariants} className="flex items-center justify-center gap-2 mb-6">
            <Sparkles className="w-6 h-6 text-primary animate-pulse" />
            <span className="text-sm md:text-base font-bold text-primary uppercase tracking-[0.2em]">Meet The Minds</span>
            <Sparkles className="w-6 h-6 text-primary animate-pulse" />
          </motion.div>
          
          <motion.h1 
            variants={itemVariants} 
            className="text-5xl md:text-7xl font-black mb-6 tracking-tighter"
          >
            Developed by <br className="md:hidden" />
            <span className="bg-gradient-to-r from-primary via-secondary to-accent text-transparent bg-clip-text animate-text-gradient glow-text">
              CRUD CREW
            </span>
          </motion.h1>
          
          <motion.p variants={itemVariants} className="text-xl md:text-2xl text-gray-400 max-w-2xl mx-auto font-light">
            Building the future of Autonomous Database Intelligence, one query at a time.
          </motion.p>
        </motion.div>

        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8"
        >
          {members.map((member, idx) => {
            const Icon = member.icon;
            return (
              <motion.div
                key={idx}
                variants={itemVariants}
                whileHover={{ y: -10, scale: 1.02 }}
                className="group card-glow glass-dark p-8 rounded-3xl flex flex-col items-center text-center relative z-10"
              >
                <div className={`w-20 h-20 rounded-2xl bg-dark-900 flex items-center justify-center mb-6 shadow-xl border border-white/5 animate-float-slow`} style={{ animationDelay: `${idx * 0.5}s` }}>
                  <Icon className={`w-10 h-10 ${member.color}`} />
                </div>
                
                <h3 className="text-2xl font-bold mb-2 text-white tracking-tight">{member.name}</h3>
                
                <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 mt-auto">
                  <Users className="w-4 h-4 text-gray-400" />
                  <span className="text-sm font-medium text-gray-300">{member.role}</span>
                </div>
              </motion.div>
            )
          })}
        </motion.div>
      </div>
    </div>
  )
}
