import React from 'react'
import { motion } from 'framer-motion'
import { LineChart, Line, AreaChart, Area, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Brush, Legend, ComposedChart } from 'recharts'
import { BarChart3, TrendingUp, Users, ShoppingBag, Map, Activity } from 'lucide-react'
import { loadAnalysis, DATASETS } from '../lib/analysisState'

export default function BusinessIntel() {
  const analysis = loadAnalysis()
  const currentDatasetKey = analysis.datasetKey || 'E-Commerce Dataset'
  const datasetMeta = DATASETS[currentDatasetKey] || DATASETS['E-Commerce Dataset']
  
  // Default to empty array if businessMetrics is missing (should be patched)
  const businessMetrics = datasetMeta.businessMetrics || {
    monthlyRevenue: [],
    userGrowth: [],
    salesByCategory: []
  }

  const isHealthcare = currentDatasetKey === 'Healthcare Dataset'

  const COLORS = ['#7c3aed', '#06b6d4', '#ec4899', '#f59e0b', '#10b981', '#6366f1']

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  }

  return (
    <div className="p-8 pb-20 max-w-7xl mx-auto w-full">
      <motion.div variants={containerVariants} initial="hidden" animate="visible">
        
        {/* Header */}
        <motion.div variants={itemVariants} className="mb-10">
          <h1 className="text-3xl font-bold mb-2">Business Intelligence & Analytics</h1>
          <p className="text-gray-400">Marketing, growth, and operational research metrics derived from your data</p>
        </motion.div>

        {/* Top KPI Cards */}
        <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <div className="glass-dark p-6 rounded-2xl border border-primary/30">
            <div className="flex items-center gap-4 mb-2">
              <div className="p-3 bg-primary/20 text-primary rounded-xl">
                <TrendingUp className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs text-gray-400 font-semibold uppercase">{isHealthcare ? 'Total Admissions (YTD)' : 'Total Revenue (YTD)'}</p>
                <p className="text-2xl font-bold text-white">{isHealthcare ? '8,750' : '$3.75M'}</p>
              </div>
            </div>
            <p className="text-xs text-green-400 mt-2 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" /> +14.2% vs last year
            </p>
          </div>

          <div className="glass-dark p-6 rounded-2xl border border-secondary/30">
            <div className="flex items-center gap-4 mb-2">
              <div className="p-3 bg-secondary/20 text-secondary rounded-xl">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs text-gray-400 font-semibold uppercase">{isHealthcare ? 'Total Patients' : 'Total Active Users'}</p>
                <p className="text-2xl font-bold text-white">{isHealthcare ? '55,400' : '56,000'}</p>
              </div>
            </div>
            <p className="text-xs text-green-400 mt-2 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" /> +22.4% vs last year
            </p>
          </div>

          <div className="glass-dark p-6 rounded-2xl border border-accent/30">
            <div className="flex items-center gap-4 mb-2">
              <div className="p-3 bg-accent/20 text-accent rounded-xl">
                <ShoppingBag className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs text-gray-400 font-semibold uppercase">{isHealthcare ? 'Treatment Success Rate' : 'Total Orders'}</p>
                <p className="text-2xl font-bold text-white">{isHealthcare ? '94.2%' : '108.4K'}</p>
              </div>
            </div>
            <p className="text-xs text-green-400 mt-2 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" /> +5.1% vs last year
            </p>
          </div>
        </motion.div>

        {/* Charts Grid */}
        <div className="grid lg:grid-cols-2 gap-6 mb-10">
          {/* Main Trend Line Chart with Brush */}
          <motion.div variants={itemVariants} className="glass-dark p-6 rounded-2xl border border-white/10 lg:col-span-2">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-primary" />
                {isHealthcare ? 'Admissions vs Discharges Trend' : 'Revenue & Order Volume Trend'}
              </h2>
            </div>
            <ResponsiveContainer width="100%" height={350}>
              <LineChart data={businessMetrics.monthlyRevenue} margin={{ top: 10, right: 30, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                <XAxis dataKey="month" stroke="rgba(255,255,255,0.5)" />
                <YAxis yAxisId="left" stroke="rgba(255,255,255,0.5)" />
                <YAxis yAxisId="right" orientation="right" stroke="rgba(255,255,255,0.5)" />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }} />
                <Legend verticalAlign="top" height={36} />
                
                {isHealthcare ? (
                  <>
                    <Line yAxisId="left" type="monotone" dataKey="admissions" name="Admissions" stroke="#7c3aed" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 8 }} />
                    <Line yAxisId="right" type="monotone" dataKey="discharges" name="Discharges" stroke="#06b6d4" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 8 }} />
                  </>
                ) : (
                  <>
                    <Line yAxisId="left" type="monotone" dataKey="revenue" name="Revenue ($)" stroke="#7c3aed" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 8 }} />
                    <Line yAxisId="right" type="monotone" dataKey="orders" name="Orders" stroke="#06b6d4" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 8 }} />
                  </>
                )}
                <Brush dataKey="month" height={30} stroke="#7c3aed" fill="rgba(15, 23, 42, 0.9)" />
              </LineChart>
            </ResponsiveContainer>
          </motion.div>

          {/* Area Chart: User/Patient Growth */}
          <motion.div variants={itemVariants} className="glass-dark p-6 rounded-2xl border border-white/10">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Users className="w-5 h-5 text-secondary" />
                {isHealthcare ? 'Cumulative Patient Growth' : 'Cumulative User Growth'}
              </h2>
            </div>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={businessMetrics.userGrowth} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                <XAxis dataKey="month" stroke="rgba(255,255,255,0.5)" />
                <YAxis stroke="rgba(255,255,255,0.5)" />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }} />
                <Area type="monotone" dataKey={isHealthcare ? 'patients' : 'users'} stroke="#06b6d4" strokeWidth={3} fillOpacity={1} fill="url(#colorUsers)" />
              </AreaChart>
            </ResponsiveContainer>
          </motion.div>

          {/* Pie Chart: Distribution */}
          <motion.div variants={itemVariants} className="glass-dark p-6 rounded-2xl border border-white/10">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-accent" />
                {isHealthcare ? 'Cases by Department' : 'Sales by Category'}
              </h2>
            </div>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={businessMetrics.salesByCategory}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={95}
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, value }) => `${name} (${value}%)`}
                  labelLine={false}
                >
                  {businessMetrics.salesByCategory.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }} />
              </PieChart>
            </ResponsiveContainer>
          </motion.div>

          {/* Demographics: Composed Chart */}
          <motion.div variants={itemVariants} className="glass-dark p-6 rounded-2xl border border-white/10">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Activity className="w-5 h-5 text-pink-500" />
                {isHealthcare ? 'Patient Demographics' : 'User Demographics'}
              </h2>
            </div>
            <ResponsiveContainer width="100%" height={280}>
              <ComposedChart data={businessMetrics.demographics} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                <XAxis dataKey="ageGroup" stroke="rgba(255,255,255,0.5)" />
                <YAxis stroke="rgba(255,255,255,0.5)" />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }} />
                <Legend />
                <Bar dataKey="male" name="Male" fill="#06b6d4" barSize={20} radius={[4, 4, 0, 0]} />
                <Bar dataKey="female" name="Female" fill="#ec4899" barSize={20} radius={[4, 4, 0, 0]} />
              </ComposedChart>
            </ResponsiveContainer>
          </motion.div>

          {/* Geography: Horizontal Bar Chart */}
          <motion.div variants={itemVariants} className="glass-dark p-6 rounded-2xl border border-white/10">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Map className="w-5 h-5 text-emerald-500" />
                {isHealthcare ? 'Admissions by Location' : 'Revenue by Region'}
              </h2>
            </div>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={businessMetrics.geography} layout="vertical" margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                <XAxis type="number" stroke="rgba(255,255,255,0.5)" />
                <YAxis dataKey="region" type="category" stroke="rgba(255,255,255,0.5)" tick={{ fontSize: 12 }} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }} />
                <Bar dataKey={isHealthcare ? 'users' : 'revenue'} name={isHealthcare ? 'Patients' : 'Revenue ($)'} fill="#10b981" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </motion.div>

        </div>
      </motion.div>
    </div>
  )
}
