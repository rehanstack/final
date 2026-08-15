import express from 'express'
import cors from 'cors'
import multer from 'multer'
import Papa from 'papaparse'
import dotenv from 'dotenv'
import Groq from 'groq-sdk'
import axios from 'axios'
import { testDatabaseConnection, extractDatabaseSchema } from './lib/dbConnector.js'
import { parseSqlDump } from './lib/sqlParser.js'

dotenv.config()

// Initialize Groq LLM Client
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY || ''
})

// Configure multer to store files in memory
const storage = multer.memoryStorage()
const upload = multer({ storage: storage })

const app = express()
let PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 5001

// Middleware
app.use(cors())
app.use(express.json())

// Health Check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'DBSense AI Backend',
    version: '1.0.0'
  })
})

// CSV Upload Endpoint
app.post('/api/upload-csv', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' })
  }

  const csvData = req.file.buffer.toString('utf8')
  
  Papa.parse(csvData, {
    header: true,
    preview: 150, // Analyze up to 150 rows
    skipEmptyLines: true,
    complete: async (results) => {
      try {
        const data = results.data
        if (!data || data.length === 0) {
          return res.status(400).json({ error: 'CSV file is empty or invalid.' })
        }
      
      const fields = results.meta.fields || Object.keys(data[0])
      
      const columns = fields.map((field, idx) => {
        let type = 'VARCHAR'
        const sampleVal = data[0][field]
        if (sampleVal !== null && sampleVal !== undefined && sampleVal !== '') {
          if (!isNaN(sampleVal)) {
            type = Number.isInteger(Number(sampleVal)) ? 'INT' : 'DECIMAL'
          } else if (!isNaN(Date.parse(sampleVal))) {
            type = 'TIMESTAMP'
          }
        }
        
        const isIdLike = field.toLowerCase().includes('id')
        return {
          name: field,
          type,
          pk: isIdLike && idx === 0, // Heuristic: first ID column is PK
          fk: isIdLike && idx !== 0,
          nullable: true,
          desc: `Inferred column from CSV header '${field}'`
        }
      })

      const typeCounts = {}
      columns.forEach(c => typeCounts[c.type] = (typeCounts[c.type] || 0) + 1)
      const breakdown = Object.entries(typeCounts).map(([k, v]) => ({
        name: k, count: v, percentage: Math.round((v / columns.length) * 100)
      }))

      const tableName = req.file.originalname.replace(/\.[^/.]+$/, "").replace(/[^a-zA-Z0-9]/g, '_')

      // ----------------------------------------------------
      // LLM-Driven Dynamic Business Intelligence Engine
      // ----------------------------------------------------
      let aiConfig = { kpis: [], charts: [] };

      if (process.env.GROQ_API_KEY) {
        const filteredColumns = columns.filter(c => !/(^id$|_id$)/i.test(c.name));
        const columnsInfo = filteredColumns.map(c => `${c.name} (${c.type})`).join(', ');
        const sampleData = JSON.stringify(data.slice(0, 3));
        
        const systemPrompt = `You are an expert Data Analyst. Given the following CSV schema and sample data, recommend 3 top KPIs and exactly 4 charts that provide the best business intelligence for a dashboard. 
        Schema: ${columnsInfo}
        Sample Data: ${sampleData}
        
        Return ONLY a strict JSON object with this exact structure:
        {
          "kpis": [
            { "title": "Total Revenue", "column": "amount", "aggregation": "sum", "prefix": "$" } 
          ],
          "charts": [
            { "id": "chart1", "title": "Revenue by Month", "type": "line", "xAxis": "date", "yAxis": "amount", "aggregation": "sum" } 
          ]
        }
        Rules:
        - "aggregation" must be one of: "sum", "count", "avg"
        - "xAxis" must be a valid column name from the schema.
        - "yAxis" must be a valid numeric column name from the schema (or null if aggregation is count).
        - NEVER use surrogate keys, primary keys, foreign keys, or any column ending in "id" or "_id" for xAxis or yAxis. These are meaningless in business charts.
        - "type" MUST BE DYNAMICALLY CHOSEN BASED ON DATA TYPE:
          * Use "line" for date, timestamp, or release_year trends.
          * Use "pie" for categories with < 7 unique values (proportions/distribution).
          * Use "bar" for comparing categorical metrics.
          * Use "area" for continuous cumulative volume.
        - "prefix" for KPIs is optional (e.g. "$" or "").
        `;

        try {
          const chatCompletion = await groq.chat.completions.create({
            messages: [{ role: 'user', content: systemPrompt }],
            model: 'llama-3.1-8b-instant',
            temperature: 0.0, // Fully deterministic (no randomness)
            response_format: { type: "json_object" }
          });
          aiConfig = JSON.parse(chatCompletion.choices[0].message.content);
        } catch (e) {
          console.error("Groq LLM Error during BI generation (using deterministic fallback):", e.message || e);
        }
      }

      // Statistical Heuristic Fallback Engine (Guarantees dynamic charts even if Groq API key is invalid/missing)
      if (!aiConfig.charts || aiConfig.charts.length === 0) {
        const dateCol = columns.find(c => c.type === 'TIMESTAMP' || c.name.toLowerCase().includes('date') || c.name.toLowerCase().includes('time'))?.name;
        const numCol = columns.find(c => (c.type === 'DECIMAL' || c.type === 'INT') && !/(^id$|_id$)/i.test(c.name))?.name;
        const catCol = columns.find(c => (c.name.toLowerCase().includes('category') || c.name.toLowerCase().includes('type') || c.name.toLowerCase().includes('status') || c.name.toLowerCase().includes('method')) && !/(^id$|_id$)/i.test(c.name))?.name || (columns.find(c => !/(^id$|_id$)/i.test(c.name))?.name || columns[0].name);
        const geoCol = columns.find(c => (c.name.toLowerCase().includes('region') || c.name.toLowerCase().includes('country') || c.name.toLowerCase().includes('city') || c.name.toLowerCase().includes('state')) && !/(^id$|_id$)/i.test(c.name))?.name;

        aiConfig = {
          kpis: [
            { title: 'Total Rows Analyzed', column: columns[0]?.name || '', aggregation: 'count', prefix: '' },
            { title: numCol ? `Total ${numCol}` : 'Record Volume', column: numCol || columns[0]?.name, aggregation: numCol ? 'sum' : 'count', prefix: (numCol && (numCol.toLowerCase().includes('amount') || numCol.toLowerCase().includes('price') || numCol.toLowerCase().includes('revenue'))) ? '$' : '' },
            { title: catCol ? `Segments (${catCol})` : 'Data Groups', column: catCol || columns[0]?.name, aggregation: 'count', prefix: '' }
          ],
          charts: [
            { id: 'chart1', title: dateCol ? `Trend Over Time (${dateCol})` : 'Primary Volume Analysis', type: 'line', xAxis: dateCol || catCol || columns[0]?.name, yAxis: numCol, aggregation: numCol ? 'sum' : 'count' },
            { id: 'chart2', title: catCol ? `Distribution by ${catCol}` : 'Category Analysis', type: 'bar', xAxis: catCol || columns[0]?.name, yAxis: numCol, aggregation: numCol ? 'sum' : 'count' },
            { id: 'chart3', title: catCol ? `${catCol} Percentage Share` : 'Category Breakdown', type: 'pie', xAxis: catCol || columns[0]?.name, yAxis: numCol, aggregation: numCol ? 'sum' : 'count' },
            { id: 'chart4', title: geoCol ? `Regional Overview (${geoCol})` : (dateCol ? `Growth Trajectory (${dateCol})` : 'Volume Profile'), type: 'area', xAxis: geoCol || dateCol || columns[0]?.name, yAxis: numCol, aggregation: numCol ? 'sum' : 'count' }
          ]
        };
      }

      // Execute AI Math Requests safely (Strictly reject any KPIs that hallucinate ID columns)
      const validKpis = (aiConfig.kpis || []).filter(kpi => !/(^id$|_id$)/i.test(String(kpi.column || '')))
      const computedKpis = validKpis.map(kpi => {
        let value = 0;
        const colName = String(kpi.column || '');
        data.forEach(row => {
          const v = parseCleanNumber(row[colName]);
          if (!isNaN(v)) {
            if (kpi.aggregation === 'sum') value += v;
            else if (kpi.aggregation === 'count') value += 1;
            else if (kpi.aggregation === 'avg') value += v;
          } else if (kpi.aggregation === 'count') {
            value += 1;
          }
        });
        if (kpi.aggregation === 'avg' && data.length > 0) value /= data.length;
        
        // Formatting: preserve numbers under 100,000 cleanly as 1,932 instead of 1.9K
        let formattedValue = Math.round(value * 100) / 100;
        let formattedStr = '';
        if (formattedValue >= 1000000000) formattedStr = (formattedValue / 1000000000).toFixed(2) + 'B';
        else if (formattedValue >= 1000000) formattedStr = (formattedValue / 1000000).toFixed(2) + 'M';
        else if (formattedValue >= 100000) formattedStr = (formattedValue / 1000).toFixed(1) + 'K';
        else formattedStr = Number(formattedValue).toLocaleString('en-IN');
        
        return { ...kpi, value: (kpi.prefix || '') + formattedStr };
      });

      // Generate dynamic charts (Strictly reject any charts that hallucinate ID columns)
      const validCharts = (aiConfig.charts || []).filter(chart => 
        !/(^id$|_id$)/i.test(String(chart.xAxis || '')) && 
        !/(^id$|_id$)/i.test(String(chart.yAxis || ''))
      )
      const computedCharts = validCharts.map(chart => {
        const map = {};
        const xAxisKey = String(chart.xAxis || '');
        const yAxisKey = String(chart.yAxis || '');

        data.forEach(row => {
          let xVal = row[xAxisKey] !== undefined && row[xAxisKey] !== null ? String(row[xAxisKey]) : 'Unknown';
          
          // Heuristic Date Grouping
          if (xAxisKey && (xAxisKey.toLowerCase().includes('date') || xAxisKey.toLowerCase().includes('time'))) {
             const d = new Date(xVal);
             if (!isNaN(d.getTime())) {
               xVal = d.toLocaleString('default', { month: 'short' }) + " '" + String(d.getFullYear()).slice(-2);
             }
          }
          
          const parsed = parseCleanNumber(row[yAxisKey]);
          const yVal = isNaN(parsed) ? 0 : parsed;
          
          if (!map[xVal]) map[xVal] = { y: 0, count: 0 };
          
          if (chart.aggregation === 'sum') map[xVal].y += yVal;
          else if (chart.aggregation === 'count') map[xVal].y += 1;
          else if (chart.aggregation === 'avg') {
            map[xVal].y += yVal;
            map[xVal].count += 1;
          }
        });
        
        let chartData = Object.keys(map).map(k => {
          const val = chart.aggregation === 'avg' ? (map[k].y / map[k].count) : map[k].y;
          return { 
            name: String(k || 'Unknown').trim().slice(0, 30), 
            value: Math.max(0, Math.round(val * 100) / 100) 
          };
        }).filter(item => item.value > 0);

        // Sort descending
        chartData.sort((a, b) => b.value - a.value);

        // For Pie Charts: collapse long tails into "Other" so Pie Chart is clean
        if (chart.type === 'pie' && chartData.length > 6) {
          const topSlices = chartData.slice(0, 5);
          const otherValue = chartData.slice(5).reduce((sum, item) => sum + item.value, 0);
          chartData = [...topSlices, { name: 'Other', value: Math.round(otherValue * 100) / 100 }];
        } else {
          chartData = chartData.slice(0, 12);
        }
        
        return { ...chart, data: chartData.length > 0 ? chartData : [{ name: 'N/A', value: 1 }] };
      });

      const customData = {
        name: req.file.originalname + ' (Backend Parsed)',
        tablesCount: 1,
        totalRecords: data.length, 
        columnTypesBreakdown: breakdown,
        tables: [{
          name: tableName,
          columns: columns,
          columnsCount: columns.length,
          records: data.length,
          size: (req.file.size / 1024).toFixed(1) + ' KB',
          description: `Server imported table from ${req.file.originalname}`,
          sampleRows: data.slice(0, 150)
        }],
        relationships: [],
        dynamicKpis: computedKpis,
        dynamicCharts: computedCharts,
        businessMetrics: {}, // Deprecated in favor of dynamic
        ragChunks: [],
        insights: []
      }

        return res.json({
          success: true,
          datasetKey: 'Custom CSV',
          customDetails: {
            ...customData,
            name: req.file.originalname,
            size: (req.file.size / (1024 * 1024)).toFixed(2) + ' MB',
            tablesCount: 1,
            dynamicKpis: computedKpis,
            dynamicCharts: computedCharts
          }
        })
      } catch (err) {
        console.error('Server processing error during CSV parse:', err);
        return res.status(500).json({ error: 'Failed to process CSV file with AI' })
      }
    },
    error: (err) => {
      console.error(err)
      return res.status(500).json({ error: 'Failed to parse CSV on server' })
    }
  })
})

// Test Direct Database Connection Endpoint
app.post('/api/test-db', async (req, res) => {
  try {
    const result = await testDatabaseConnection(req.body)
    return res.json(result)
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message || 'Connection test failed' })
  }
})

// Connect & Analyze Database Schema Endpoint
app.post('/api/connect-db', async (req, res) => {
  try {
    const aiLayerUrl = process.env.AI_LAYER_URL || 'http://127.0.0.1:8000'
    const response = await axios.post(`${aiLayerUrl}/api/analyze`, req.body)
    
    // Reshape Python payload to match legacy Node payload expected by React
    const pyData = response.data?.results || {}
    const pySchema = pyData.schema || {}
    const tablesArray = Object.values(pySchema.tables || {})
    const relationships = pyData.relationships || []
    
    const customDetails = {
      name: `${req.body.dbName || req.body.filename || 'Database'} (${req.body.dbType || 'Unknown'})`,
      tablesCount: pySchema.table_count || tablesArray.length,
      columnsCount: pySchema.column_count || 0,
      relationshipsCount: relationships.length,
      totalRecords: tablesArray.reduce((acc, t) => acc + (t.row_count || 0), 0),
      qualityScore: pyData.quality?.score || 92,
      anomaliesCount: (pyData.quality?.anomalies || []).length,
      tables: tablesArray.map(t => ({
        ...t,
        records: t.row_count || 0,
        columns: t.columns || []
      })),
      relationships: relationships,
      ragChunks: pyData.rag?.index || []
    }

    return res.json({
      success: true,
      datasetKey: 'Custom Database',
      customDetails
    })
  } catch (err) {
    console.error('Database analysis error:', err)
    return res.status(500).json({ error: err.response?.data?.detail || err.message || 'Failed to extract schema from database via AI Layer' })
  }
})

// SQL Dump File Upload Endpoint
app.post('/api/upload-sql', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No SQL file uploaded' })
  }
  try {
    const sqlContent = req.file.buffer.toString('utf8')
    const parsed = parseSqlDump(sqlContent, req.file.originalname)

    // Gather all sample rows across all tables
    const allRows = parsed.tables.flatMap(t => t.sampleRows || [])
    const allColumns = parsed.tables.flatMap(t => t.columns || [])

    // ──────────────────────────────────────────────────────────────────
    // AI-Driven Chart + KPI Generation (same pipeline as CSV upload)
    // ──────────────────────────────────────────────────────────────────
    let aiConfig = { kpis: [], charts: [] }

    if (process.env.GROQ_API_KEY && parsed.tables.length > 0) {
      const schemaDescription = parsed.tables.map(t => {
        const cols = (t.columns || []).filter(c => !/(^id$|_id$)/i.test(c.name)).map(c => `${c.name} (${c.type || 'TEXT'})`).join(', ')
        return `Table ${t.name}: ${cols}`
      }).join('\n      ')

      const tableNames = parsed.tables.map(t => t.name).join(', ')

      const systemPrompt = `You are an expert Data Analyst. Given a SQL database dump with the following tables and schemas:
      ${schemaDescription}

      Recommend 3 KPIs and exactly 4 charts for the best business intelligence dashboard.
      Use column names EXACTLY as listed in the schemas.

      Return ONLY strict JSON:
      {
        "kpis": [{ "title": "string", "table": "exact_table_name", "column": "exact_col_name", "aggregation": "count"|"sum"|"avg", "prefix": "" }],
        "charts": [{ "id": "chart1", "title": "string", "type": "bar"|"line"|"pie"|"area", "table": "exact_table_name", "xAxis": "exact_col_name", "yAxis": "exact_col_name_or_null", "aggregation": "count"|"sum"|"avg" }]
      }
      Rules:
      - 'table' MUST be an exact table name from the list above.
      - 'xAxis' and 'yAxis' MUST be exact column names belonging to the specified 'table'.
      - NEVER use surrogate keys, primary keys, foreign keys, or any column ending in "id" or "_id" for xAxis or yAxis. These are meaningless in business charts.
      - If no numeric columns exist, use aggregation "count" and set yAxis to null.
      - Use "pie" for categorical columns with few unique values.
      - Use "bar" for comparing categories.
      - Use "line" or "area" for date/year columns.`

      try {
        const completion = await groq.chat.completions.create({
          messages: [{ role: 'user', content: systemPrompt }],
          model: 'llama-3.1-8b-instant',
          temperature: 0.0,
          response_format: { type: 'json_object' }
        })
        aiConfig = JSON.parse(completion.choices[0].message.content)
      } catch (e) {
        console.error('Groq SQL chart generation error:', e.message || e)
      }
    }

    // Statistical heuristic fallback (if Groq missing or failed)
    if (!aiConfig.charts || aiConfig.charts.length === 0) {
      const cols = allColumns
      const dateCol = cols.find(c => /date|time|year|month/i.test(c.name) || /TIMESTAMP|DATE/i.test(c.type || ''))?.name
      const numCol = cols.find(c => /int|decimal|float|double|numeric/i.test(c.type || '') && !c.pk && !/(^id$|_id$)/i.test(c.name))?.name
      const catCol = cols.find(c => !c.pk && !/(^id$|_id$)/i.test(c.name) && /varchar|text|char|enum/i.test(c.type || ''))?.name
                  || cols.find(c => !c.pk && !/(^id$|_id$)/i.test(c.name))?.name

      // Schema-only chart: columns per table
      const schemaChartData = parsed.tables.map(t => ({ name: t.name, value: t.columns?.length || 0 })).filter(d => d.value > 0)

      aiConfig = {
        kpis: [
          { title: 'Tables in Schema', column: null, aggregation: 'count', prefix: '', staticValue: parsed.tables.length },
          { title: 'Total Columns', column: null, aggregation: 'count', prefix: '', staticValue: allColumns.length },
          { title: 'Sample Rows', column: null, aggregation: 'count', prefix: '', staticValue: allRows.length }
        ],
        charts: [
          {
            id: 'chart1', title: 'Columns per Table (Schema Overview)', type: 'bar',
            xAxis: '__table__', yAxis: '__columns__', aggregation: 'count',
            precomputedData: schemaChartData
          },
          ...(catCol ? [{
            id: 'chart2', title: `Distribution by ${catCol}`, type: 'pie',
            xAxis: catCol, yAxis: null, aggregation: 'count'
          }] : []),
          ...(catCol && numCol ? [{
            id: 'chart3', title: `${numCol} by ${catCol}`, type: 'bar',
            xAxis: catCol, yAxis: numCol, aggregation: 'sum'
          }] : []),
          ...(dateCol ? [{
            id: 'chart4', title: `Trend over ${dateCol}`, type: 'line',
            xAxis: dateCol, yAxis: numCol || null, aggregation: numCol ? 'sum' : 'count'
          }] : [])
        ]
      }
    }

    // Compute KPI values (Strictly reject any KPIs that hallucinate ID columns)
    const validKpis = (aiConfig.kpis || []).filter(kpi => !/(^id$|_id$)/i.test(String(kpi.column || '')))
    const computedKpis = validKpis.map(kpi => {
      if (kpi.staticValue !== undefined) {
        return { title: kpi.title, value: String(kpi.staticValue) }
      }
      let value = 0
      const colName = String(kpi.column || '')
      const cleanTarget = String(kpi.table || '').replace(/[`'"]/g, '').toLowerCase()
      const targetTable = parsed.tables.find(t => String(t.name).replace(/[`'"]/g, '').toLowerCase() === cleanTarget)
      const targetRows = targetTable ? (targetTable.sampleRows || []) : allRows

      targetRows.forEach(row => {
        const v = parseCleanNumber(row[colName])
        if (!isNaN(v)) {
          if (kpi.aggregation === 'sum') value += v
          else if (kpi.aggregation === 'avg') value += v
        }
        if (kpi.aggregation === 'count') value++
      })
      if (kpi.aggregation === 'avg' && targetRows.length > 0) value /= targetRows.length
      const fmt = Math.round(value * 100) / 100
      let str = fmt >= 1e9 ? (fmt/1e9).toFixed(1)+'B' : fmt >= 1e6 ? (fmt/1e6).toFixed(1)+'M' : fmt >= 1e4 ? (fmt/1e3).toFixed(1)+'K' : Number(fmt).toLocaleString()
      return { title: kpi.title, value: (kpi.prefix || '') + str }
    })

    // Compute chart data (Strictly reject any charts that hallucinate ID columns)
    const validCharts = (aiConfig.charts || []).filter(chart => 
      !/(^id$|_id$)/i.test(String(chart.xAxis || '')) && 
      !/(^id$|_id$)/i.test(String(chart.yAxis || ''))
    )
    const computedCharts = validCharts.map(chart => {
      // Pre-computed (e.g. schema overview chart)
      if (chart.precomputedData) {
        return { ...chart, data: chart.precomputedData, isAutoGenerated: true }
      }

      const xKey = String(chart.xAxis || '')
      const yKey = String(chart.yAxis || '')
      const map = {}

      const cleanTarget = String(chart.table || '').replace(/[`'"]/g, '').toLowerCase()
      const targetTable = parsed.tables.find(t => String(t.name).replace(/[`'"]/g, '').toLowerCase() === cleanTarget)
      const targetRows = targetTable ? (targetTable.sampleRows || []) : allRows

      targetRows.forEach(row => {
        if (!row) return
        const xRaw = row[xKey]
        const xVal = (xRaw != null && String(xRaw).trim() !== '') ? String(xRaw).trim().slice(0, 28) : 'Unknown'
        if (!map[xVal]) map[xVal] = { y: 0, count: 0 }
        const yVal = yKey ? parseCleanNumber(row[yKey]) : NaN
        if (chart.aggregation === 'sum' && !isNaN(yVal)) map[xVal].y += yVal
        else if (chart.aggregation === 'avg' && !isNaN(yVal)) { map[xVal].y += yVal; map[xVal].count++ }
        else map[xVal].count++
      })

      let chartData = Object.entries(map).map(([name, { y, count }]) => ({
        name,
        value: chart.aggregation === 'avg' ? (count ? y / count : 0) : chart.aggregation === 'sum' ? y : count
      })).filter(d => d.value > 0).sort((a, b) => b.value - a.value)

      // If no rows, just return empty state rather than hallucinating schema metrics
      if (chartData.length === 0) {
        chartData = [{ name: 'No Data / Invalid Column', value: 1 }]
      }

      if (chart.type === 'pie' && chartData.length > 6) {
        const top5 = chartData.slice(0, 5)
        const other = chartData.slice(5).reduce((s, d) => s + d.value, 0)
        chartData = [...top5, { name: 'Other', value: Math.round(other * 100) / 100 }]
      } else {
        chartData = chartData.slice(0, 12)
      }

      return { ...chart, data: chartData, isAutoGenerated: true }
    })

    return res.json({
      success: true,
      datasetKey: 'SQL Dump',
      customDetails: {
        ...parsed,
        name: req.file.originalname,
        dynamicKpis: computedKpis,
        dynamicCharts: computedCharts
      }
    })
  } catch (err) {
    console.error('SQL dump parse error:', err)
    return res.status(500).json({ error: 'Failed to parse SQL dump file' })
  }
})

// Groq RAG Knowledge Base Question Answering Endpoint
app.post('/api/rag-query', async (req, res) => {
  try {
    if (!process.env.GROQ_API_KEY) {
      throw new Error("GROQ_API_KEY is missing")
    }
    
    const { query, chatHistory, schemaContext } = req.body
    
    let contextStr = "No context provided."
    let retrievedChunks = []
    
    if (schemaContext && schemaContext.tables && schemaContext.tables.length > 0) {
      const tables = schemaContext.tables
      contextStr = tables.map(t => `${t.title || 'Table'}: ${t.content || ''}`).join('\n\n')
      retrievedChunks = tables.slice(0, 3)
    }

    const systemPrompt = `You are an expert Database Architect and Data Analyst assistant.
Use the provided Context (which contains database schema details, columns, and sample data) to accurately answer the user's questions about their data.
Be concise, professional, and do not hallucinate tables or columns not present in the context.

Context:
${contextStr}`

    const messages = [
      { role: 'system', content: systemPrompt }
    ]

    if (Array.isArray(chatHistory)) {
      chatHistory.forEach(msg => {
        if (msg.role === 'user' || msg.role === 'assistant') {
          // ensure string content
          messages.push({ role: msg.role, content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content) })
        }
      })
    }

    messages.push({ role: 'user', content: query || "Hello" })

    const chatCompletion = await groq.chat.completions.create({
      messages: messages,
      model: "llama-3.3-70b-versatile",
      temperature: 0.2
    })

    const answer = chatCompletion.choices[0]?.message?.content || "No response generated."

    return res.json({
      success: true,
      answer: answer,
      confidence: 96,
      provider: "Groq (llama-3.3-70b-versatile)",
      retrievedChunks: retrievedChunks
    })

  } catch (err) {
    console.error('RAG query error:', err)
    // Fallback to AI layer if local Groq fails (e.g. no key)
    try {
      const aiLayerUrl = process.env.AI_LAYER_URL || 'http://127.0.0.1:8000'
      const response = await axios.post(`${aiLayerUrl}/api/rag-query`, req.body)
      return res.json(response.data)
    } catch (aiErr) {
      return res.status(500).json({ error: err.message || 'Failed to process RAG query with Groq and AI Layer' })
    }
  }
})

// Groq LLM Chat Endpoint (Phase 2 LLM Integration)
app.post('/api/chat', async (req, res) => {
  try {
    const aiLayerUrl = process.env.AI_LAYER_URL || 'http://127.0.0.1:8000'
    const response = await axios.post(`${aiLayerUrl}/api/chat`, req.body)
    return res.json(response.data)
  } catch (error) {
    console.error('AI Layer Chat Error:', error)
    res.status(500).json({ error: error.response?.data?.detail || 'Failed to process request with AI Layer' })
  }
})

// Helper to safely parse formatted currency or comma-separated numbers (e.g. "$52,400.00" -> 52400)
function parseCleanNumber(val) {
  if (val === null || val === undefined) return NaN
  if (typeof val === 'number') return val
  const str = String(val).replace(/[^0-9.-]/g, '')
  const num = parseFloat(str)
  return isNaN(num) ? NaN : num
}

// Interactive Custom AI Chart Generation Endpoint
app.post('/api/generate-chart', async (req, res) => {
  try {
    const { prompt, xAxis, yAxis, aggregation, chartType, data, columns, isSynthetic } = req.body

    const cleanData = Array.isArray(data) ? data.filter(Boolean) : []

    // Parse column names from schema descriptor strings sent by frontend ("col_name (TYPE)")
    // Strictly exclude ID columns
    const colNames = Array.isArray(columns)
      ? columns.map(c => typeof c === 'string' ? c.replace(/\s*\(.*\)$/, '').trim() : (c.name || String(c))).filter(c => !/(^id$|_id$)/i.test(c))
      : []

    if (cleanData.length === 0 && colNames.length > 0) {
      // Schema-aware synthetic rows: use actual column names from the SQL schema
      const xCol = xAxis || colNames.find(c => !c.toLowerCase().endsWith('_id') && !['id'].includes(c.toLowerCase())) || colNames[0] || 'name'
      const yCol = yAxis || colNames.find(c => c !== xCol && !c.toLowerCase().endsWith('_id') && !['id', 'name'].includes(c.toLowerCase())) || null
      ;[1, 2, 3, 4, 5].forEach(i => {
        const row = { [xCol]: `${xCol}_${i}` }
        if (yCol) row[yCol] = i * 10
        cleanData.push(row)
      })
    } else if (cleanData.length === 0) {
      // Absolute last resort — only hits if no columns and no data
      cleanData.push(
        { name: 'Category A', value: 40 },
        { name: 'Category B', value: 30 },
        { name: 'Category C', value: 20 },
        { name: 'Category D', value: 10 }
      )
    }


    let config = {
      title: prompt || `${yAxis || 'Count'} by ${xAxis || 'Category'}`,
      type: chartType && chartType !== 'auto' ? chartType : 'auto',
      xAxis: xAxis,
      yAxis: yAxis,
      aggregation: aggregation && aggregation !== 'auto' ? aggregation : 'sum'
    }

    // If natural language prompt is given and Groq key exists, use Groq to infer chart config
    if (prompt && process.env.GROQ_API_KEY) {
      const filteredKeys = Object.keys(cleanData[0] || {}).filter(c => !/(^id$|_id$)/i.test(c))
      const columnsInfo = colNames.length > 0 ? colNames.join(', ') : filteredKeys.join(', ')
      const sample = isSynthetic ? '(schema-only upload, no INSERT INTO rows in SQL dump)' : JSON.stringify(cleanData.slice(0, 3))
      
      const systemPrompt = `You are an expert Data Analyst. The user wants a custom chart based on this request: "${prompt}".
      Schema columns: ${columnsInfo}
      Sample data: ${sample}

      Select the best matching columns, chart type, and aggregation for this request.
      Rules for choosing "type":
      - Use "line" if the query or column involves dates, timestamps, release years, or trends over time.
      - Use "pie" if the query involves categorical distribution with few items (< 7 categories like genre, status).
      - Use "bar" if comparing discrete categories or rankings.
      - Use "area" for cumulative volume or growth.
      - NEVER use surrogate keys, primary keys, foreign keys, or any column ending in "id" or "_id" for xAxis or yAxis. These are meaningless in business charts.

      Return ONLY a strict JSON object:
      {
        "title": "Descriptive Chart Title",
        "type": "bar" | "line" | "pie" | "area",
        "xAxis": "exact_column_name_from_schema",
        "yAxis": "exact_numeric_column_name_or_null",
        "aggregation": "sum" | "count" | "avg"
      }`

      try {
        const chatCompletion = await groq.chat.completions.create({
          messages: [{ role: 'user', content: systemPrompt }],
          model: 'llama-3.1-8b-instant',
          temperature: 0.1,
          response_format: { type: "json_object" }
        })
        const inferred = JSON.parse(chatCompletion.choices[0].message.content)
        
        // Post-filter to block any hallucinated ID charts
        if (inferred.xAxis && !/(^id$|_id$)/i.test(inferred.xAxis) && !/(^id$|_id$)/i.test(String(inferred.yAxis || ''))) {
          config = { ...config, ...inferred }
        }
      } catch (e) {
        console.error("Groq chart inference error:", e.message || e)
      }
    }

    // Fuzzy Column Matcher for Prompts
    function findBestColumnMatches(promptText, cols) {
      const promptWords = promptText.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(w => w.length > 1)
      const scored = cols.map(colName => {
        const colLower = colName.toLowerCase()
        const colTokens = colLower.split(/[^a-z0-9]/).filter(Boolean)
        let score = 0
        if (promptWords.includes(colLower)) score += 100
        promptWords.forEach(pw => {
          if (colLower.includes(pw) && pw.length > 2) score += 50
          if (pw.includes(colLower) && colLower.length > 2) score += 40
          colTokens.forEach(ct => {
            if (pw === ct) score += 80
            else if (pw.includes(ct) && ct.length > 2) score += 30
            else if (ct.includes(pw) && pw.length > 2) score += 30
          })
        })
        return { colName, score }
      })
      scored.sort((a, b) => b.score - a.score)
      return scored.filter(c => c.score > 0).map(c => c.colName)
    }

    const availableCols = (columns && columns.length > 0) 
      ? columns.map(c => typeof c === 'string' ? c : c.name) 
      : Object.keys(cleanData[0] || {})

    // Smart Column Resolution if prompt is given
    if (prompt) {
      const matched = findBestColumnMatches(prompt, availableCols)
      const lowerP = prompt.toLowerCase()

      // Find any numeric metric column (e.g. total_amount, revenue, sales, budget, price, amount)
      const numericMetricCol = availableCols.find(c => {
        const cl = c.toLowerCase()
        return (cl.includes('revenue') || cl.includes('amount') || cl.includes('sales') || cl.includes('total') || cl.includes('budget') || cl.includes('price') || cl.includes('value') || cl.includes('cost')) && !cl.includes('id')
      }) || availableCols.find(c => {
        const sampleVal = cleanData[0]?.[c]
        return sampleVal !== undefined && !isNaN(parseCleanNumber(sampleVal)) && !c.toLowerCase().includes('id') && !c.toLowerCase().includes('year')
      })

      if (matched.length >= 2) {
        const dateMatch = matched.find(c => c.toLowerCase().includes('year') || c.toLowerCase().includes('date') || c.toLowerCase().includes('time'))
        const numMatch = matched.find(c => c === numericMetricCol || c.toLowerCase().includes('revenue') || c.toLowerCase().includes('amount') || c.toLowerCase().includes('sales'))
        
        if (dateMatch) {
          config.xAxis = dateMatch
          config.yAxis = numMatch || matched.find(c => c !== dateMatch) || numericMetricCol
        } else {
          config.xAxis = matched[0]
          config.yAxis = matched[1]
        }
      } else if (matched.length === 1) {
        const singleMatch = matched[0]
        const singleLower = singleMatch.toLowerCase()

        if (singleLower.includes('revenue') || singleLower.includes('amount') || singleLower.includes('sales') || singleLower.includes('budget')) {
          config.yAxis = singleMatch
          config.xAxis = availableCols.find(c => c !== singleMatch && !c.toLowerCase().includes('id')) || availableCols[0]
        } else {
          config.xAxis = singleMatch
          if (numericMetricCol && numericMetricCol !== singleMatch) {
            config.yAxis = numericMetricCol
          }
        }
      } else {
        // Fallback: prompt didn't match column names directly (e.g. "country wise revenue" when col is "region")
        if (lowerP.includes('country') || lowerP.includes('region') || lowerP.includes('location')) {
          config.xAxis = availableCols.find(c => c.toLowerCase().includes('country') || c.toLowerCase().includes('region') || c.toLowerCase().includes('location') || c.toLowerCase().includes('state')) || availableCols[0]
        }
        if (lowerP.includes('revenue') || lowerP.includes('sales') || lowerP.includes('amount') || lowerP.includes('budget')) {
          if (numericMetricCol) config.yAxis = numericMetricCol
        }
      }

      // Format clean title
      if (config.xAxis && config.yAxis && config.yAxis !== config.xAxis) {
        config.title = `${config.yAxis.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())} by ${config.xAxis.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}`
      } else if (config.xAxis) {
        config.title = `${prompt.replace(/\b\w/g, l => l.toUpperCase())}`
      }
    }

    // Heuristic Fallback if xAxis is still not specified or invalid
    if (!config.xAxis || !availableCols.includes(config.xAxis)) {
      config.xAxis = availableCols[0] || 'category'
    }

    // Smart Automatic Chart Type Decision Engine
    if (prompt || !req.body.chartType || req.body.chartType === 'auto') {
      const lowerX = String(config.xAxis || '').toLowerCase()
      const lowerY = String(config.yAxis || '').toLowerCase()
      const lowerP = String(prompt || '').toLowerCase()
      const uniqueXCount = new Set(cleanData.map(r => String(r?.[config.xAxis] || ''))).size

      if (lowerX.includes('year') || lowerX.includes('date') || lowerX.includes('time') || lowerY.includes('year') || lowerY.includes('date') || lowerP.includes('year') || lowerP.includes('trend')) {
        config.type = 'line'
      } else if (lowerP.includes('share') || lowerP.includes('pie') || lowerP.includes('distribution') || lowerP.includes('percentage') || (uniqueXCount >= 2 && uniqueXCount <= 6)) {
        config.type = 'pie'
      } else if (lowerP.includes('growth') || lowerP.includes('volume') || lowerP.includes('cumulative') || lowerP.includes('area')) {
        config.type = 'area'
      } else {
        config.type = 'bar'
      }
    }

    // Execute Math Aggregation
    const map = {}
    const xAxisKey = String(config.xAxis || '')
    const yAxisKey = String(config.yAxis || '')

    cleanData.forEach(row => {
      if (!row) return
      let xVal = row[xAxisKey] !== undefined && row[xAxisKey] !== null && String(row[xAxisKey]).trim() !== '' ? String(row[xAxisKey]).trim() : 'Unknown'
      
      // Preserve 4-digit release years (e.g. "2022") as "2022" instead of converting to "Jan '22"
      if (xAxisKey && (xAxisKey.toLowerCase().includes('date') || xAxisKey.toLowerCase().includes('time') || xAxisKey.toLowerCase().includes('year'))) {
        if (!/^\d{4}$/.test(xVal)) {
          const d = new Date(xVal)
          if (!isNaN(d.getTime()) && xVal.length > 4) {
            xVal = d.toLocaleString('default', { month: 'short' }) + " '" + String(d.getFullYear()).slice(-2)
          }
        }
      }

      let yVal = 1
      if (config.aggregation !== 'count' && yAxisKey && yAxisKey !== 'count' && yAxisKey !== 'none' && yAxisKey !== '') {
        const parsed = parseCleanNumber(row[yAxisKey])
        if (!isNaN(parsed)) {
          yVal = parsed
        }
      }

      if (!map[xVal]) map[xVal] = { y: 0, count: 0 }

      if (config.aggregation === 'sum') map[xVal].y += yVal
      else if (config.aggregation === 'count') map[xVal].y += 1
      else if (config.aggregation === 'avg') {
        map[xVal].y += yVal
        map[xVal].count += 1
      }
    })

    let chartData = Object.keys(map).map(k => {
      const val = config.aggregation === 'avg' ? (map[k].y / map[k].count) : map[k].y
      return { 
        name: String(k || 'Unknown').trim().slice(0, 30), 
        value: Math.max(0, Math.round(val * 100) / 100) 
      }
    }).filter(item => item.value > 0)

    chartData.sort((a, b) => b.value - a.value)

    if (config.type === 'pie' && chartData.length > 6) {
      const topSlices = chartData.slice(0, 5)
      const otherValue = chartData.slice(5).reduce((sum, item) => sum + item.value, 0)
      chartData = [...topSlices, { name: 'Other', value: Math.round(otherValue * 100) / 100 }]
    } else {
      chartData = chartData.slice(0, 12)
    }

    const newChart = {
      id: `custom-${Date.now()}`,
      title: config.title || `${config.yAxis || 'Count'} by ${config.xAxis}`,
      type: config.type || 'bar',
      xAxis: config.xAxis,
      yAxis: config.yAxis,
      aggregation: config.aggregation,
      isCustomPin: true,
      data: chartData.length > 0 ? chartData : [{ name: 'N/A', value: 1 }]
    }

    return res.json({ success: true, chart: newChart })
  } catch (err) {
    console.error('Custom chart generation error:', err)
    return res.status(500).json({ error: 'Failed to generate custom chart' })
  }
})

// Analyze Database Endpoint
app.post('/analyze', (req, res) => {
  setTimeout(() => {
    res.json({
      success: true,
      jobId: 'job-' + Date.now(),
      status: 'processing',
      message: 'Database analysis started',
      estimatedTime: '2-5 minutes',
      data: {
        tablesFound: 12,
        relationships: 42,
        columns: 156,
        estimatedSize: '42.5 GB'
      }
    })
  }, 300)
})

// Dashboard Data Endpoint
app.get('/dashboard', (req, res) => {
  res.json({
    tables: 12,
    relationships: 42,
    dataQualityScore: 91,
    anomaliesDetected: 3,
    totalRecords: 9893000,
    totalSize: '42.5 GB',
    lastAnalyzed: new Date().toISOString(),
    tableDetails: [
      { name: 'Orders', size: '12GB', records: 2840000, quality: 94 },
      { name: 'Customers', size: '8.5GB', records: 450000, quality: 87 },
      { name: 'Products', size: '6.2GB', records: 125000, quality: 99 },
      { name: 'Inventory', size: '4.1GB', records: 98000, quality: 85 },
      { name: 'Payments', size: '6.8GB', records: 2700000, quality: 92 }
    ]
  })
})

// Insights Data Endpoint
app.get('/insights', (req, res) => {
  res.json({
    insights: [
      {
        id: 'ins-1',
        title: 'Revenue Anomaly Detected',
        description: 'Unusual spike in order values detected in the Orders table on specific dates.',
        confidence: 94,
        severity: 'high',
        type: 'anomaly',
        affectedTable: 'Orders',
        recommendation: 'Manual review recommended for orders >$50,000'
      },
      {
        id: 'ins-2',
        title: 'Duplicate Customer Records',
        description: '27% of customer records have potential duplicates based on email and phone matching.',
        confidence: 89,
        severity: 'warning',
        type: 'quality',
        affectedTable: 'Customers',
        recommendation: 'Run deduplication process'
      }
    ],
    summary: {
      totalInsights: 2,
      critical: 1,
      warnings: 1,
      generatedAt: new Date().toISOString()
    }
  })
})

// RAG Knowledge Base Endpoint
app.get('/rag-knowledge', (req, res) => {
  res.json({
    vectorCount: 1247,
    embeddingDimensions: 1536,
    vectorDatabaseSize: '3.2 GB',
    chunks: [
      {
        id: '5f8a-b2c3-9d1e',
        title: 'Order Table Schema',
        content: 'orders(id UUID, customer_id UUID, created_at TIMESTAMP, total_amount DECIMAL, status VARCHAR)',
        metadata: 'Schema - Orders',
        tokens: 18,
        relevance: 0.94
      }
    ],
    lastUpdated: new Date().toISOString()
  })
})

// Processing Status Endpoint
app.get('/status/:jobId', (req, res) => {
  const { jobId } = req.params
  res.json({
    jobId,
    overallProgress: 100,
    status: 'completed',
    results: {
      tablesAnalyzed: 12,
      relationshipsDiscovered: 42,
      embeddings: 1247,
      quality: 91,
      anomalies: 3
    }
  })
})

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    path: req.path,
    method: req.method
  })
})

// Start Server with Automatic Port Fallback for macOS AirPlay (Port 5000 conflict)
function startListening(port) {
  const server = app.listen(port, () => {
    console.log(`🚀 DBSense Backend running at http://localhost:${port}`)
    console.log(`📊 Health check: http://localhost:${port}/health`)
  })

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.warn(`⚠️ Port ${port} is in use (often by macOS AirPlay Receiver / ControlCenter). Retrying on port ${port + 1}...`)
      startListening(port + 1)
    } else {
      console.error('Server error:', err)
    }
  })
}

startListening(PORT)
