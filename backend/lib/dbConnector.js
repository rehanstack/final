import knex from 'knex'
import { MongoClient } from 'mongodb'

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

    if (clientType === 'mongodb') {
      let mongoUrl = host || 'mongodb://localhost:27017'
      if (!mongoUrl.startsWith('mongodb')) {
          mongoUrl = `mongodb://${username ? username + ':' + password + '@' : ''}${host}`
      }
      client = new MongoClient(mongoUrl, { serverSelectionTimeoutMS: 5000 })
      await client.connect()
      await client.db(dbName || 'admin').command({ ping: 1 })
    } else {
      const knexConfig = buildKnexConfig(clientType, { host, dbName, username, password, filename })
      client = knex(knexConfig)
  
      if (clientType === 'sqlite3') {
        await client.raw('SELECT 1')
      } else {
        await client.raw('SELECT 1+1 AS result')
      }
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
      try { if (clientType === 'mongodb') { await client.close() } else { await client.destroy() } } catch {}
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

  let db = null
  let mongoClient = null

  try {
    let tables = []
    let relationships = []

    if (clientType === 'mongodb') {
      let mongoUrl = host || 'mongodb://localhost:27017'
      if (!mongoUrl.startsWith('mongodb')) {
          mongoUrl = `mongodb://${username ? username + ':' + password + '@' : ''}${host}`
      }
      mongoClient = new MongoClient(mongoUrl, { serverSelectionTimeoutMS: 5000 })
      await mongoClient.connect()
      tables = await extractMongoSchema(mongoClient, dbName)
    } else {
      const knexConfig = buildKnexConfig(clientType, { host, dbName, username, password, filename })
      db = knex(knexConfig)
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
    try { if (db) await db.destroy(); if (mongoClient) await mongoClient.close() } catch {}
  }
}

/**
 * Execute dynamic SQL query on external database
 * @param {Object} config - Connection config
 * @param {string} sql - SQL query to execute
 * @returns {Promise<Array>} Query results
 */
export async function executeDynamicQuery(config, sql) {
  const { dbType, host, dbName, username, password, filename } = config
  const clientType = normalizeClientType(dbType)

  if (clientType === 'mongodb') {
    let mongoUrl = host || 'mongodb://localhost:27017'
    if (!mongoUrl.startsWith('mongodb')) {
        mongoUrl = `mongodb://${username ? username + ':' + password + '@' : ''}${host}`
    }
    const mongoClient = new MongoClient(mongoUrl, { serverSelectionTimeoutMS: 5000 })
    try {
      await mongoClient.connect()
      const mdb = mongoClient.db(dbName)
      
      // Basic SQL to Mongo translation
      // Expects: SELECT * FROM collection_name LIMIT 100
      let collectionName = ''
      let limit = 100
      
      const fromMatch = sql.match(/FROM\s+([a-zA-Z0-9_]+)/i)
      if (fromMatch) collectionName = fromMatch[1]
      
      const limitMatch = sql.match(/LIMIT\s+(\d+)/i)
      if (limitMatch) limit = parseInt(limitMatch[1], 10)
      
      if (collectionName) {
         return await mdb.collection(collectionName).find().limit(limit).toArray()
      }
      return []
    } finally {
      await mongoClient.close()
    }
  }

  const knexConfig = buildKnexConfig(clientType, { host, dbName, username, password, filename })
  const db = knex(knexConfig)

  try {
    const res = await db.raw(sql)
    // pg returns an object with a .rows array, mysql2 returns an array [rows, fields], sqlite3 returns an array
    if (clientType === 'pg') {
      return res.rows || []
    } else if (clientType === 'mysql2') {
      return res[0] || []
    } else {
      return res || []
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
  if (lower.includes('mongo')) return 'mongodb'
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
        pool: { min: 1, max: 3, acquireTimeoutMillis: 5000 },
        acquireConnectionTimeout: 5000
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
      database: dbName,
      connectTimeout: 5000
    },
    pool: { min: 1, max: 3, acquireTimeoutMillis: 5000 },
    acquireConnectionTimeout: 5000
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


async function extractMongoSchema(client, dbName) {
  const db = client.db(dbName)
  const collections = await db.listCollections().toArray()
  const tables = []

  for (const coll of collections) {
    if (coll.type !== 'collection' && coll.type !== undefined) continue
    
    const collectionName = coll.name
    const recordCount = await db.collection(collectionName).countDocuments()
    const sampleRows = await db.collection(collectionName).find().limit(150).toArray()
    
    const columns = []
    if (sampleRows.length > 0) {
      const keys = Object.keys(sampleRows[0])
      keys.forEach(k => {
        let type = 'VARCHAR'
        const val = sampleRows[0][k]
        if (typeof val === 'number') type = 'FLOAT'
        else if (typeof val === 'boolean') type = 'BOOLEAN'
        else if (val instanceof Date) type = 'TIMESTAMP'
        else if (typeof val === 'object') type = 'JSON'
        
        columns.push({
          name: k,
          type,
          pk: k === '_id',
          fk: false,
          nullable: true,
          desc: `Field '${k}' in MongoDB collection '${collectionName}'`
        })
      })
    }

    tables.push({
      name: collectionName,
      columnsCount: columns.length,
      records: recordCount,
      size: `${(recordCount * 0.4 / 1024).toFixed(1)} MB`,
      description: `MongoDB collection '${collectionName}'`,
      primaryKey: '_id',
      columns,
      sampleRows
    })
  }
  return tables
}
