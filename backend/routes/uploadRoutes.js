import express from 'express'
import multer from 'multer'
import Papa from 'papaparse'
import { dbRun } from '../config/database.js'
import { getLLMClient } from '../services/llmService.js'
import { parseSqlDump } from '../lib/sqlParser.js'

const storage = multer.memoryStorage()
const upload = multer({ storage: storage })
const router = express.Router()

// Helper to safely parse formatted currency or comma-separated numbers (e.g. "$52,400.00" -> 52400)
function parseCleanNumber(val) {
  if (val === null || val === undefined) return NaN
  if (typeof val === 'number') return val
  const str = String(val).replace(/[^0-9.-]/g, '')
  const num = parseFloat(str)
  return isNaN(num) ? NaN : num
}



// CSV Upload Endpoint
router.post('/api/upload-csv', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' })
  }

  const csvData = req.file.buffer.toString('utf8')
  
  Papa.parse(csvData, {
    header: true,
    skipEmptyLines: true,
    complete: async (results) => {
      try {
        const fullData = results.data
        if (!fullData || fullData.length === 0) {
          return res.status(400).json({ error: 'CSV file is empty or invalid.' })
        }
      
      const fields = results.meta.fields || Object.keys(fullData[0])
      
      const columns = fields.map((field, idx) => {
        let type = 'VARCHAR'
        const sampleVal = fullData[0][field]
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

      const tableName = req.file.originalname.replace(/\.[^/.]+$/, "").replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase()

      // --- SQLITE DATA INGESTION ---
      try {
        await dbRun(`DROP TABLE IF EXISTS "${tableName}"`);
        const colDefs = columns.map(c => `"${c.name}" ${c.type}`).join(', ')
        await dbRun(`CREATE TABLE "${tableName}" (${colDefs})`);
        
        // Bulk insert
        const placeholders = columns.map(() => '?').join(',')
        const insertQuery = `INSERT INTO "${tableName}" VALUES (${placeholders})`
        
        // Using a transaction for speed
        await dbRun('BEGIN TRANSACTION');
        for (const row of fullData) {
          const values = columns.map(c => row[c.name] !== undefined ? row[c.name] : null);
          await dbRun(insertQuery, values);
        }
        await dbRun('COMMIT');
        console.log(`✅ Ingested ${fullData.length} rows into SQLite table '${tableName}'`);
      } catch (err) {
        console.error("SQLite Ingestion Error:", err);
        await dbRun('ROLLBACK').catch(() => {});
      }
      
      // Limit data for frontend dashboard/charts to 150 rows
      const data = fullData.slice(0, 150);

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
          const chatCompletion = await getLLMClient(req).chat.completions.create({
            messages: [{ role: 'user', content: systemPrompt }],
            model: 'openai/gpt-oss-20b',
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


// JSON Upload Endpoint
router.post('/api/upload-json', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No JSON file uploaded' })
  }
  try {
    const jsonContent = req.file.buffer.toString('utf8')
    const parsedData = JSON.parse(jsonContent)
    
    let dataArray = []
    if (Array.isArray(parsedData)) {
      dataArray = parsedData
    } else if (typeof parsedData === 'object' && parsedData !== null) {
      // Find the first array property
      const arrayProp = Object.values(parsedData).find(v => Array.isArray(v))
      if (arrayProp) {
        dataArray = arrayProp
      } else {
        dataArray = [parsedData] // fallback to single object array
      }
    }

    if (dataArray.length === 0) {
      return res.status(400).json({ error: 'JSON does not contain any records' })
    }

    const fields = Object.keys(dataArray[0])
    const columns = fields.map((field, idx) => {
      let type = 'VARCHAR'
      const sampleVal = dataArray[0][field]
      if (sampleVal !== null && sampleVal !== undefined && sampleVal !== '') {
        if (typeof sampleVal === 'number') {
          type = Number.isInteger(sampleVal) ? 'INTEGER' : 'FLOAT'
        } else if (typeof sampleVal === 'boolean') {
          type = 'BOOLEAN'
        }
      }
      return {
        name: field,
        type: type,
        pk: idx === 0,
        fk: false,
        nullable: true,
        desc: `Column '${field}' extracted from JSON upload`
      }
    })

    const tableName = req.file.originalname.replace(/\.[^/.]+$/, "").replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()

    // SQLite data ingestion
    await dbRun('BEGIN TRANSACTION');
    await dbRun(`DROP TABLE IF EXISTS "${tableName}"`);
    
    const colDefs = columns.map(c => `"${c.name}" ${c.type}`).join(', ');
    await dbRun(`CREATE TABLE "${tableName}" (${colDefs})`);

    const placeholders = columns.map(() => '?').join(', ');
    const insertSql = `INSERT INTO "${tableName}" VALUES (${placeholders})`;

    for (const row of dataArray) {
      const values = columns.map(c => {
        const val = row[c.name]
        if (typeof val === 'object') return JSON.stringify(val)
        return val
      });
      await dbRunParam(insertSql, values);
    }
    await dbRun('COMMIT');

    const result = {
      name: req.file.originalname + ' (Uploaded)',
      tablesCount: 1,
      columnsCount: columns.length,
      relationshipsCount: 0,
      totalRecords: dataArray.length,
      totalSize: `${(req.file.size / 1024).toFixed(1)} KB`,
      qualityScore: 98,
      tables: [{
        name: tableName,
        size: `${(req.file.size / 1024).toFixed(1)} KB`,
        records: dataArray.length,
        quality: 98,
        primaryKey: columns[0]?.name || 'id',
        columns,
        sampleRows: dataArray.slice(0, 150)
      }],
      sampleRows: dataArray.slice(0, 150)
    }

    return res.json(result)
  } catch (err) {
    console.error('Error processing JSON upload:', err);
    try { await dbRun('ROLLBACK'); } catch (e) {}
    return res.status(500).json({ error: 'Failed to process JSON file' })
  }
})


router.post('/api/upload-sql', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No SQL file uploaded' })
  }
  try {
    const sqlContent = req.file.buffer.toString('utf8')
    const parsed = parseSqlDump(sqlContent, req.file.originalname)

    // --- SQLITE DATA INGESTION ---
    try {
      await dbRun('BEGIN TRANSACTION');
      for (const table of parsed.tables) {
        // Sanitize table name
        const tName = table.name.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase();
        await dbRun(`DROP TABLE IF EXISTS ${tName}`);
        
        // Use VARCHAR as default for all extracted SQL columns since SQLite is flexible
        const colDefs = table.columns.map(c => `"${c.name}" VARCHAR`).join(', ');
        if (colDefs.length > 0) {
          await dbRun(`CREATE TABLE ${tName} (${colDefs})`);
          
          if (table.sampleRows && table.sampleRows.length > 0) {
            const placeholders = table.columns.map(() => '?').join(',');
            const insertQuery = `INSERT INTO ${tName} VALUES (${placeholders})`;
            for (const row of table.sampleRows) {
              const values = table.columns.map(c => row[c.name] !== undefined ? row[c.name] : null);
              await dbRun(insertQuery, values);
            }
            console.log(`✅ Ingested ${table.sampleRows.length} rows into SQLite table '${tName}'`);
          }
        }
      }
      await dbRun('COMMIT');
    } catch (err) {
      console.error("SQLite Ingestion Error (SQL Dump):", err);
      await dbRun('ROLLBACK').catch(() => {});
      return res.status(500).json({ error: `Failed to ingest SQL data into the backend engine: ${err.message}. Please check if the SQL file contains valid syntax.` });
    }

    // Slice sampleRows to 150 max to prevent massive frontend payloads
    parsed.tables.forEach(t => {
      if (t.sampleRows) t.sampleRows = t.sampleRows.slice(0, 150);
    });

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
        const completion = await getLLMClient(req).chat.completions.create({
          messages: [{ role: 'user', content: systemPrompt }],
          model: 'openai/gpt-oss-20b',
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



export default router;
