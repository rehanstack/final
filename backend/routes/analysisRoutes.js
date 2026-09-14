import express from 'express'
import axios from 'axios'
import { dbAll, dbRun } from '../config/database.js'
import { getAiForwardHeaders, getLLMClient } from '../services/llmService.js'
import { executeDynamicQuery } from '../lib/dbConnector.js'

const router = express.Router()

// Helper to safely parse formatted currency or comma-separated numbers (e.g. "$52,400.00" -> 52400)
function parseCleanNumber(val) {
  if (val === null || val === undefined) return NaN
  if (typeof val === 'number') return val
  const str = String(val).replace(/[^0-9.-]/g, '')
  const num = parseFloat(str)
  return isNaN(num) ? NaN : num
}



// Analyze existing dbsense.db Endpoint (used after CSV/SQL upload)
router.post('/api/analyze', async (req, res) => {
  try {
    const aiLayerUrl = process.env.AI_LAYER_URL || 'http://127.0.0.1:8000'
    const response = await axios.post(`${aiLayerUrl}/api/analyze`, req.body)
    
    const pyData = response.data?.results || {}
    const pySchema = pyData.schema || {}
    const tablesArray = Object.values(pySchema.tables || {})
    const relationships = pyData.relationships || []
    
    const customDetails = {
      name: `${req.body.filename || 'Uploaded Database'}`,
      tablesCount: pySchema.table_count || tablesArray.length,
      columnsCount: pySchema.column_count || 0,
      relationshipsCount: relationships.length,
      totalRecords: tablesArray.reduce((acc, t) => acc + (t.row_count || 0), 0),
      qualityScore: pyData.quality?.overall_score || 92,
      anomaliesCount: (pyData.quality?.anomalies || []).length,
      tables: tablesArray.map(t => ({
        ...t,
        records: t.row_count || 0,
        columns: t.columns || []
      })),
      relationships: relationships,
      ragChunks: pyData.rag?.index || [],
      insights: pyData.insights || null,
      dynamicCharts: pyData.visualizations?.charts || null
    }

    return res.json({
      success: true,
      datasetKey: 'Custom Database',
      customDetails,
      agentTimes: response.data?.agent_times || {}
    })
  } catch (err) {
    console.error('AI Analysis error:', err)
    return res.status(500).json({ error: err.response?.data?.detail || err.message || 'Failed to run AI analysis' })
  }
})


// SSE Streaming endpoint for dynamic real-time progress
router.post('/api/analyze-stream', async (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.flushHeaders(); // Establish the SSE connection immediately

  try {
    const aiLayerUrl = process.env.AI_LAYER_URL || 'http://127.0.0.1:8000'
    const response = await axios.post(`${aiLayerUrl}/api/analyze-stream`, req.body, {
      responseType: 'stream',
      timeout: 300000, // 5 minutes timeout for the stream
      ...getAiForwardHeaders(req)
    })

    // Listen to the data events and write explicitly to ensure flushing
    response.data.on('data', chunk => {
      res.write(chunk);
      if (res.flush) res.flush();
    });

    response.data.on('end', () => res.end());
    
    response.data.on('error', err => {
      console.error("AI layer stream transmission error:", err.message);
      res.end();
    });
  } catch (err) {
    console.error("AI layer stream error:", err.message)
    res.write(`data: ${JSON.stringify({ type: 'error', error: "Failed to run AI streaming analysis" })}\n\n`)
    res.end()
  }
})


// Groq Agentic RAG Endpoint (Text-to-SQL Pipeline)
router.post('/api/rag-query', async (req, res) => {
  try {
    if (!process.env.GROQ_API_KEY && !req.headers?.['x-groq-api-key']) {
      throw new Error("GROQ_API_KEY is missing")
    }
    
    const { query, chatHistory, schemaContext, dbConfig } = req.body
    
    let dialect = 'SQLite'
    if (dbConfig && dbConfig.dbType) {
      if (dbConfig.dbType.toLowerCase().includes('postgres') || dbConfig.dbType.toLowerCase().includes('pg')) dialect = 'PostgreSQL'
      else if (dbConfig.dbType.toLowerCase().includes('mysql') || dbConfig.dbType.toLowerCase().includes('mariadb')) dialect = 'MySQL'
    }

    let schemaStr = "No schema provided."
    if (schemaContext && schemaContext.tables && schemaContext.tables.length > 0) {
      // Extract SCHEMA chunks to provide table context, limited to top 10 chunks to avoid TPM limits
      const schemaChunks = schemaContext.tables.filter(t => t.category === 'SCHEMA' || !t.category).slice(0, 10)
      schemaStr = schemaChunks.map(t => `${t.title || 'Table'}: ${t.content || ''}`).join('\n\n')
    }

    // Step 1: SQL Generation Agent (with Self-Correction Loop)
    let sqlQuery = "";
    let dbResult = null;
    let executionError = null;
    let retries = 0;
    const maxRetries = 2;

    let chatContextStr = "No previous chat history.";
    if (Array.isArray(chatHistory) && chatHistory.length > 0) {
      chatContextStr = chatHistory.slice(-3).map(msg => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content)}`).join('\n');
    }

    let currentSqlPrompt = `You are a ${dialect} database expert. Given the following database schema:
${schemaStr}

Write a valid ${dialect} query to answer the user's question. 
Rules:
- Return ONLY the raw SQL query string.
- If the user's input is a general greeting (like "hi", "hello") or a question that absolutely does NOT require querying the database, return EXACTLY the string "NO_SQL".
- Do NOT wrap it in markdown code blocks (\`\`\`sql ... \`\`\`).
- Do NOT provide any explanations.
- Ensure the table and column names exactly match the schema.
- IMPORTANT: Always use \`LIKE '%keyword%'\` (or ILIKE if PostgreSQL) instead of strict equality (\`=\`) for text/string comparisons to handle case insensitivity and partial matches.

Recent Chat History for Context:
${chatContextStr}

User Question: ${query}`;

    while (retries <= maxRetries) {
      try {
        const sqlCompletion = await getLLMClient(req).chat.completions.create({
          messages: [{ role: 'user', content: currentSqlPrompt }],
          model: "llama-3.3-70b-versatile",
          temperature: 0.1,
          max_tokens: 500
        });
        sqlQuery = sqlCompletion.choices[0]?.message?.content?.trim() || "";
        // Strip markdown backticks
        sqlQuery = sqlQuery.replace(/```sql/gi, '').replace(/```/g, '').trim();
        
        if (sqlQuery === "NO_SQL" || sqlQuery.includes("NO_SQL")) {
          executionError = "No database query required.";
          break; // Skip SQL execution for greetings
        }

        // Extract from SELECT onwards in case the LLM included conversational text
        const selectIdx = sqlQuery.toUpperCase().indexOf('SELECT');
        if (selectIdx !== -1) {
          sqlQuery = sqlQuery.substring(selectIdx).trim();
        }

        // Step 2: Autonomous Execution
        executionError = null;
        
        // Strictly reject any destructive statements
        const destructiveKeywords = ['insert', 'update', 'delete', 'drop', 'alter', 'truncate', 'grant', 'revoke'];
        const isDestructive = destructiveKeywords.some(keyword => new RegExp(`\\b${keyword}\\b`, 'i').test(sqlQuery));

        if (isDestructive) {
          executionError = "Query contains destructive or unauthorized operations and was blocked.";
        } else if (sqlQuery && sqlQuery.toLowerCase().startsWith('select')) {
          try {
            if (dbConfig && dbConfig.dbType) {
              dbResult = await executeDynamicQuery(dbConfig, sqlQuery);
            } else {
              dbResult = await dbAll(sqlQuery);
            }
            break; // Success! Exit the retry loop.
          } catch (e) {
             executionError = e.message;
          }
        } else {
             executionError = "Query was not a SELECT statement or was empty.";
        }

        // If execution failed, prepare prompt for the next retry
        retries++;
        if (retries <= maxRetries) {
           currentSqlPrompt = `You are a ${dialect} database expert. Given the following database schema:
${schemaStr}

You previously generated this query:
${sqlQuery}

However, it resulted in this error when executed in ${dialect}:
${executionError}

Please fix the SQL query and write a valid ${dialect} query to answer the user's question. 
Rules:
- Return ONLY the raw SQL query string.
- If the user's input is a general greeting (like "hi", "hello") or a question that absolutely does NOT require querying the database, return EXACTLY the string "NO_SQL".
- Do NOT wrap it in markdown code blocks (\`\`\`sql ... \`\`\`).
- Do NOT provide any explanations.
- Ensure the table and column names exactly match the schema.
- IMPORTANT: Always use \`LIKE '%keyword%'\` (or ILIKE if PostgreSQL) instead of strict equality (\`=\`) for text/string comparisons to handle case insensitivity and partial matches.

Recent Chat History for Context:
${chatContextStr}

User Question: ${query}`;
        }
      } catch (e) {
        console.warn(`Agentic RAG SQL Generation failed on attempt ${retries + 1}:`, e.message || e);
        if (e.status === 429 || (e.message && e.message.includes('429'))) {
           executionError = "Groq API Rate Limit Exceeded (429) during SQL generation.";
           break; // Stop retrying on rate limit to prevent spam
        }
        retries++;
      }
    }

    // Step 3: Synthesis Agent
    const sysPrompt = `You are an expert Data Analyst assistant.
Use the provided Context to accurately answer the user's questions about their data.
Be concise, professional, and do not hallucinate.

Context:
Schema:
${schemaStr}

${sqlQuery ? `Attempted SQL Query: ${sqlQuery}` : ''}
${dbResult ? `Query Execution Results (JSON): ${JSON.stringify(dbResult).slice(0, 2500)}` : ''}
${executionError ? `Query Error: ${executionError}` : ''}

If the query results are provided, formulate a natural language answer based on them. If there was an error, try to answer based on the schema or acknowledge the limitation.`

    const messages = [
      { role: 'system', content: sysPrompt }
    ]

    if (Array.isArray(chatHistory)) {
      chatHistory.forEach(msg => {
        if (msg.role === 'user' || msg.role === 'assistant') {
          messages.push({ role: msg.role, content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content) })
        }
      })
    }

    messages.push({ role: 'user', content: query || "Hello" })

    let answer = "No response generated.";
    try {
      const chatCompletion = await getLLMClient(req).chat.completions.create({
        messages: messages,
        model: "llama-3.3-70b-versatile",
        temperature: 0.2,
        max_tokens: 1200
      });
      answer = chatCompletion.choices[0]?.message?.content || answer;
    } catch (e) {
      console.error("Synthesis Agent Error:", e.message || e);
      if (e.status === 429 || (e.message && e.message.includes('429'))) {
        answer = "I apologize, but we have temporarily hit the Groq API rate limit (429 Too Many Requests) across all fallback models. Please wait a few moments for the token quota to reset, or provide a Groq key from another account.";
      } else {
        answer = "I apologize, but I encountered an error while synthesizing the response. Please try again.";
      }
    }

    return res.json({
      success: true,
      answer: answer,
      confidence: dbResult ? 99 : 85,
      provider: "Agentic RAG (SQL Engine)",
      retrievedChunks: schemaContext?.tables?.slice(0, 3) || []
    })

  } catch (err) {
    console.error('RAG query error:', err)
    // Fallback to AI layer if local Groq fails (e.g. no key)
    try {
      const aiLayerUrl = process.env.AI_LAYER_URL || 'http://127.0.0.1:8000'
      const response = await axios.post(`${aiLayerUrl}/api/rag-query`, req.body, getAiForwardHeaders(req))
      return res.json(response.data)
    } catch (aiErr) {
      return res.status(500).json({ error: err.message || 'Failed to process RAG query with Groq and AI Layer' })
    }
  }
})


// Groq LLM Chat Endpoint (Phase 2 LLM Integration)
router.post('/api/chat', async (req, res) => {
  try {
    const aiLayerUrl = process.env.AI_LAYER_URL || 'http://127.0.0.1:8000'
    const response = await axios.post(`${aiLayerUrl}/api/chat`, req.body, getAiForwardHeaders(req))
    return res.json(response.data)
  } catch (error) {
    console.error('AI Layer Chat Error:', error)
    res.status(500).json({ error: error.response?.data?.detail || 'Failed to process request with AI Layer' })
  }
})


// Machine Learning Endpoints
router.post('/api/ml/:action', async (req, res) => {
  try {
    const { action } = req.params
    const aiLayerUrl = process.env.AI_LAYER_URL || 'http://127.0.0.1:8000'
    const response = await axios.post(`${aiLayerUrl}/api/ml/${action}`, req.body, { 
      timeout: 60000,
      ...getAiForwardHeaders(req)
    })
    return res.json(response.data)
  } catch (error) {
    const detail = error.response?.data?.detail || error.message || 'Failed to process ML request with AI Layer'
    console.error(`ML Layer Error (${req.params.action}):`, detail, error.code, error.cause)
    res.status(500).json({ error: detail })
  }
})



// Interactive Custom AI Chart Generation Endpoint
router.post('/api/generate-chart', async (req, res) => {
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
        const chatCompletion = await getLLMClient(req).chat.completions.create({
          messages: [{ role: 'user', content: systemPrompt }],
          model: 'openai/gpt-oss-20b',
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
router.post('/analyze', (req, res) => {
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



export default router;
