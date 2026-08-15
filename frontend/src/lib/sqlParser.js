/**
 * SQL File Dump Parser (Client-Side)
 * Mirrors the backend sqlParser.js so SQL uploads work without a server.
 * Extracts CREATE TABLE schema definitions, columns, primary keys, foreign keys, and INSERT INTO rows.
 */
export function parseSqlDump(sqlString, fileName = 'database.sql') {
  const tablesMap = {}
  const relationships = []

  // Clean comments
  const cleanSql = sqlString
    .replace(/--.*$/gm, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')

  // Match CREATE TABLE blocks
  const createTableRegex = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?`?([a-zA-Z0-9_]+)`?\s*\(([\s\S]*?)\);/gi
  let tableMatch

  while ((tableMatch = createTableRegex.exec(cleanSql)) !== null) {
    const tableName = tableMatch[1]
    const body = tableMatch[2]

    const lines = body.split(/,\n|\n,|,(?![^()]*\))/).map(l => l.trim()).filter(Boolean)
    const columns = []
    let primaryKey = 'id'

    lines.forEach(line => {
      // Primary Key Constraint Line
      if (/^PRIMARY\s+KEY/i.test(line)) {
        const pkMatch = line.match(/\(([^)]+)\)/)
        if (pkMatch) {
          primaryKey = pkMatch[1].replace(/[`"]/g, '').trim().split(',')[0]
        }
        return
      }

      // Foreign Key Constraint Line
      if (/^FOREIGN\s+KEY|CONSTRAINT/i.test(line) && /REFERENCES/i.test(line)) {
        const fkMatch = line.match(/FOREIGN\s+KEY\s*\(`?([a-zA-Z0-9_]+)`?\)\s*REFERENCES\s*`?([a-zA-Z0-9_]+)`?\s*\(`?([a-zA-Z0-9_]+)`?\)/i)
        if (fkMatch) {
          relationships.push({
            from: tableName,
            fromCol: fkMatch[1],
            to: fkMatch[2],
            toCol: fkMatch[3],
            type: 'Many-to-One',
            cardinality: 'n:1',
            status: 'Explicit FK'
          })
        }
        return
      }

      // Column Definition
      const colMatch = line.match(/^`?([a-zA-Z0-9_]+)`?\s+([a-zA-Z0-9_()]+)([\s\S]*)$/)
      if (colMatch) {
        const cName = colMatch[1]
        const cType = colMatch[2].toUpperCase()
        const rest = colMatch[3] || ''

        const isPk = rest.toUpperCase().includes('PRIMARY KEY') || cName === 'id' || cName === `${tableName}_id`
        if (isPk && !primaryKey) primaryKey = cName

        const isFk = cName.endsWith('_id') && cName !== 'id' && cName !== `${tableName}_id`

        columns.push({
          name: cName,
          type: cType,
          pk: isPk,
          fk: isFk,
          nullable: !rest.toUpperCase().includes('NOT NULL'),
          desc: `Extracted column '${cName}' from SQL DUMP`
        })
      }
    })

    tablesMap[tableName] = {
      name: tableName,
      columnsCount: columns.length,
      records: 0,
      size: '0.1 MB',
      description: `SQL Dump table '${tableName}'`,
      primaryKey,
      columns,
      sampleRows: []
    }
  }

  // Parse INSERT INTO statements for sample data
  const insertRegex = /INSERT\s+INTO\s+`?([a-zA-Z0-9_]+)`?\s*(?:\(([^)]+)\))?\s*VALUES\s*([\s\S]*?);/gi
  let insertMatch

  while ((insertMatch = insertRegex.exec(cleanSql)) !== null) {
    const tableName = insertMatch[1]
    const explicitCols = insertMatch[2] ? insertMatch[2].split(',').map(c => c.replace(/[`"]/g, '').trim()) : null
    const valuesBody = insertMatch[3]

    if (tablesMap[tableName]) {
      const colList = explicitCols || tablesMap[tableName].columns.map(c => c.name)
      const tupleRegex = /\(([^)]+)\)/g
      let tupleMatch

      while ((tupleMatch = tupleRegex.exec(valuesBody)) !== null) {
        if (tablesMap[tableName].sampleRows.length >= 150) break

        const rawVals = tupleMatch[1].split(/,(?=(?:[^']*'[^']*')*[^']*$)/).map(v => v.trim().replace(/^'|'$|^"|"$/g, ''))
        const rowObj = {}

        colList.forEach((cName, idx) => {
          rowObj[cName] = rawVals[idx] !== undefined ? rawVals[idx] : null
        })

        tablesMap[tableName].sampleRows.push(rowObj)
        tablesMap[tableName].records++
      }
    }
  }

  const tablesArray = Object.values(tablesMap)

  // Compute breakdown
  const typeCounts = {}
  let totalCols = 0
  let totalRows = 0

  tablesArray.forEach(t => {
    totalRows += t.records
    t.columns.forEach(c => {
      totalCols++
      const baseType = c.type.split('(')[0].toUpperCase()
      typeCounts[baseType] = (typeCounts[baseType] || 0) + 1
    })
  })

  const breakdown = Object.entries(typeCounts).map(([name, count]) => ({
    name,
    count,
    percentage: Math.round((count / Math.max(totalCols, 1)) * 100)
  }))

  return {
    name: fileName.replace(/\.[^/.]+$/, ''),
    tablesCount: tablesArray.length || 1,
    columnsCount: totalCols,
    relationshipsCount: relationships.length,
    totalRecords: totalRows || 0,
    totalSize: `${(sqlString.length / 1024).toFixed(1)} KB`,
    columnTypesBreakdown: breakdown,
    tables: tablesArray,
    relationships
  }
}
