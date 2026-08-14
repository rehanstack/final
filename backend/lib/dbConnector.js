import knex from 'knex'

/**
 * Test Database Connection
 * @param {Object} config - { dbType, host, dbName, username, password, port, filename }
 * @returns {Promise<Object>} Connection result
 */
export async function testDatabaseConnection(config) {
  const startTime = Date.now()
  let client = null

  try {
    const { dbType, host, dbName, username, password, filename } = config
    const clientType = normalizeClientType(dbType)

    const knexConfig = buildKnexConfig(clientType, { host, dbName, username, password, filename })
    client = knex(knexConfig)

    if (clientType === 'sqlite3') {
      await client.raw('SELECT 1')
    } else {
      await client.raw('SELECT 1+1 AS result')
    }

    const latency = Date.now() - startTime
    return {
      success: true,
      latencyMs: latency,
      message: `Successfully connected to ${dbType} database '${dbName || filename || 'main'}' (${latency}ms latency)`
    }
  } catch (err) {
    return {
      success: false,
      error: err.message || `Failed to connect to ${config.dbType} database`
    }
  } finally {
    if (client) {
      try { await client.destroy() } catch {}
    }
  }
}

/**
 * Extract Complete Database Schema & Profile Information
 * @param {Object} config - Connection config
 * @returns {Promise<Object>} Extracted schema, tables, columns, relationships, and samples
 */
export async function extractDatabaseSchema(config) {
  const { dbType, host, dbName, username, password, filename } = config
  const clientType = normalizeClientType(dbType)

  const knexConfig = buildKnexConfig(clientType, { host, dbName, username, password, filename })
  const db = knex(knexConfig)

  try {
    let tables = []
    let relationships = []

    if (clientType === 'pg') {
      tables = await extractPostgreSQLSchema(db)
      relationships = await extractPostgreSQLRelationships(db)
    } else if (clientType === 'mysql2') {
      tables = await extractMySQLSchema(db, dbName)
      relationships = await extractMySQLRelationships(db, dbName)
    } else if (clientType === 'sqlite3') {
      tables = await extractSQLiteSchema(db)
      relationships = await extractSQLiteRelationships(db)
    }

    // Calculate aggregated column breakdown
    const typeCounts = {}
    let totalCols = 0
    let totalRows = 0

    tables.forEach(t => {
      totalRows += t.records || 0
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
      name: `${dbName || filename || 'Database'} (${dbType})`,
      tablesCount: tables.length,
      columnsCount: totalCols,
      relationshipsCount: relationships.length,
      totalRecords: totalRows,
      totalSize: `${(totalRows * 0.5 / 1024).toFixed(1)} MB`,
      qualityScore: 92,
      anomaliesCount: 0,
      columnTypesBreakdown: breakdown,
      tables,
      relationships
    }
  } finally {
    try { await db.destroy() } catch {}
  }
}

function normalizeClientType(dbType = '') {
  const lower = dbType.toLowerCase()
  if (lower.includes('postgres') || lower.includes('pg')) return 'pg'
  if (lower.includes('mysql') || lower.includes('mariadb')) return 'mysql2'
  if (lower.includes('sqlite')) return 'sqlite3'
  return 'pg'
}

function buildKnexConfig(clientType, { host, dbName, username, password, filename }) {
  if (clientType === 'sqlite3') {
    return {
      client: 'sqlite3',
      connection: { filename: filename || ':memory:' },
      useNullAsDefault: true
    }
  }

  // Parse connection URI or object
  let hostName = host || 'localhost'
  let port = clientType === 'pg' ? 5432 : 3306

  if (hostName.includes('://')) {
    try {
      const parsed = new URL(hostName)
      return {
        client: clientType,
        connection: hostName,
        pool: { min: 1, max: 3 }
      }
    } catch {}
  }

  if (hostName.includes(':')) {
    const parts = hostName.split(':')
    hostName = parts[0]
    port = parseInt(parts[1], 10) || port
  }

  return {
    client: clientType,
    connection: {
      host: hostName,
      port,
      user: username,
      password: password || '',
      database: dbName
    },
    pool: { min: 1, max: 3 }
  }
}

async function extractPostgreSQLSchema(db) {
  const tablesRes = await db.raw(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    ORDER BY table_name;
  `)

  const tableNames = tablesRes.rows.map(r => r.table_name)
  const tables = []

  for (const tableName of tableNames) {
    const columnsRes = await db.raw(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = ?
      ORDER BY ordinal_position;
    `, [tableName])

    const pkRes = await db.raw(`
      SELECT kcu.column_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
      WHERE tc.constraint_type = 'PRIMARY KEY' AND tc.table_name = ?;
    `, [tableName])

    const pkCols = pkRes.rows.map(r => r.column_name)

    const countRes = await db(tableName).count('* as count').first()
    const recordCount = parseInt(countRes.count, 10) || 0

    const sampleRows = await db(tableName).limit(150)

    const columns = columnsRes.rows.map(col => ({
      name: col.column_name,
      type: col.data_type.toUpperCase(),
      pk: pkCols.includes(col.column_name),
      fk: false,
      nullable: col.is_nullable === 'YES',
      desc: `Column '${col.column_name}' in table '${tableName}'`
    }))

    tables.push({
      name: tableName,
      columnsCount: columns.length,
      records: recordCount,
      size: `${(recordCount * 0.4 / 1024).toFixed(1)} MB`,
      description: `PostgreSQL table '${tableName}'`,
      primaryKey: pkCols[0] || 'id',
      columns,
      sampleRows
    })
  }

  return tables
}

async function extractPostgreSQLRelationships(db) {
  const fkRes = await db.raw(`
    SELECT
        tc.table_name AS from_table,
        kcu.column_name AS from_column,
        ccu.table_name AS to_table,
        ccu.column_name AS to_column
    FROM information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.constraint_column_usage AS ccu ON ccu.constraint_name = tc.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY';
  `)

  return fkRes.rows.map(r => ({
    from: r.from_table,
    fromCol: r.from_column,
    to: r.to_table,
    toCol: r.to_column,
    type: 'Many-to-One',
    cardinality: 'n:1',
    status: 'Explicit FK'
  }))
}

async function extractMySQLSchema(db, dbName) {
  const tablesRes = await db.raw(`SHOW TABLES;`)
  const key = Object.keys(tablesRes[0][0] || {})[0]
  const tableNames = tablesRes[0].map(r => r[key])
  const tables = []

  for (const tableName of tableNames) {
    const colsRes = await db.raw(`DESCRIBE \`${tableName}\`;`)
    const columnsData = colsRes[0]

    const countRes = await db(tableName).count('* as count').first()
    const recordCount = parseInt(countRes.count, 10) || 0

    const sampleRows = await db(tableName).limit(150)

    const columns = columnsData.map(col => ({
      name: col.Field,
      type: col.Type.toUpperCase(),
      pk: col.Key === 'PRI',
      fk: col.Key === 'MUL',
      nullable: col.Null === 'YES',
      desc: `Column '${col.Field}' in MySQL table '${tableName}'`
    }))

    tables.push({
      name: tableName,
      columnsCount: columns.length,
      records: recordCount,
      size: `${(recordCount * 0.4 / 1024).toFixed(1)} MB`,
      description: `MySQL table '${tableName}'`,
      primaryKey: columns.find(c => c.pk)?.name || 'id',
      columns,
      sampleRows
    })
  }

  return tables
}

async function extractMySQLRelationships(db, dbName) {
  const res = await db.raw(`
    SELECT TABLE_NAME as from_table, COLUMN_NAME as from_column, REFERENCED_TABLE_NAME as to_table, REFERENCED_COLUMN_NAME as to_column
    FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
    WHERE REFERENCED_TABLE_SCHEMA = ? AND REFERENCED_TABLE_NAME IS NOT NULL;
  `, [dbName])

  return (res[0] || []).map(r => ({
    from: r.from_table,
    fromCol: r.from_column,
    to: r.to_table,
    toCol: r.to_column,
    type: 'Many-to-One',
    cardinality: 'n:1',
    status: 'Explicit FK'
  }))
}

async function extractSQLiteSchema(db) {
  const tablesRes = await db.raw(`SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';`)
  const tableNames = tablesRes.map(r => r.name)
  const tables = []

  for (const tableName of tableNames) {
    const colsRes = await db.raw(`PRAGMA table_info(\`${tableName}\`);`)
    const countRes = await db(tableName).count('* as count').first()
    const recordCount = parseInt(countRes.count, 10) || 0
    const sampleRows = await db(tableName).limit(150)

    const columns = colsRes.map(col => ({
      name: col.name,
      type: (col.type || 'VARCHAR').toUpperCase(),
      pk: col.pk === 1,
      fk: false,
      nullable: col.notnull === 0,
      desc: `Column '${col.name}' in SQLite table '${tableName}'`
    }))

    tables.push({
      name: tableName,
      columnsCount: columns.length,
      records: recordCount,
      size: `${(recordCount * 0.4 / 1024).toFixed(1)} MB`,
      description: `SQLite table '${tableName}'`,
      primaryKey: columns.find(c => c.pk)?.name || 'id',
      columns,
      sampleRows
    })
  }

  return tables
}

async function extractSQLiteRelationships(db) {
  const tablesRes = await db.raw(`SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';`)
  const relationships = []

  for (const r of tablesRes) {
    const fkRes = await db.raw(`PRAGMA foreign_key_list(\`${r.name}\`);`)
    fkRes.forEach(fk => {
      relationships.push({
        from: r.name,
        fromCol: fk.from,
        to: fk.table,
        toCol: fk.to,
        type: 'Many-to-One',
        cardinality: 'n:1',
        status: 'Explicit FK'
      })
    })
  }

  return relationships
}
