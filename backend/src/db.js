'use strict';

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DATA_DIR = path.join(__dirname, '..', '..', 'data');
const DB_PATH = path.join(DATA_DIR, 'trigram.db');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function initDb() {
  ensureDataDir();
  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.exec(`
    CREATE TABLE IF NOT EXISTS predictions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL UNIQUE,
      stock_code TEXT NOT NULL,
      stock_name TEXT NOT NULL,
      ai_reason TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);
  return db;
}

function getTodayDateString(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getPredictionByDate(db, date) {
  return db.prepare('SELECT * FROM predictions WHERE date = ?').get(date);
}

function upsertPrediction(db, { date, stockCode, stockName, aiReason }) {
  const existing = getPredictionByDate(db, date);
  if (existing) {
    db.prepare(`
      UPDATE predictions
      SET stock_code = ?, stock_name = ?, ai_reason = ?, updated_at = datetime('now')
      WHERE date = ?
    `).run(stockCode, stockName, aiReason ?? existing.ai_reason, date);
  } else {
    db.prepare(`
      INSERT INTO predictions (date, stock_code, stock_name, ai_reason)
      VALUES (?, ?, ?, ?)
    `).run(date, stockCode, stockName, aiReason ?? null);
  }
  return getPredictionByDate(db, date);
}

function listPredictions(db, limit = 30) {
  return db
    .prepare('SELECT * FROM predictions ORDER BY date DESC LIMIT ?')
    .all(limit);
}

module.exports = {
  initDb,
  getTodayDateString,
  getPredictionByDate,
  upsertPrediction,
  listPredictions,
};
