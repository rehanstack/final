import sqlite3 from 'sqlite3'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const dbPath = path.join(__dirname, '../dbsense.db')
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) console.error("Error connecting to local SQLite:", err);
  else console.log(`✅ Connected to local Agentic RAG SQLite Database at ${dbPath}`);
})

export const dbRun = (query, params = []) => new Promise((resolve, reject) => {
  db.run(query, params, function (err) {
    if (err) reject(err);
    else resolve(this);
  });
});

export const dbAll = (query, params = []) => new Promise((resolve, reject) => {
  db.all(query, params, (err, rows) => {
    if (err) reject(err);
    else resolve(rows);
  });
});
