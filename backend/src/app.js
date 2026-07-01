'use strict';

const express = require('express');
const path = require('path');
const { initDb } = require('./db');
const { createPublicRouter } = require('./routes/public');
const { createAdminRouter } = require('./routes/admin');
const { resolveAiConfig } = require('./services/aiConfig');

function loadConfig() {
  const ai = resolveAiConfig();
  return {
    port: Number(process.env.PORT) || 3000,
    adminPassword: process.env.ADMIN_PASSWORD || 'changeme',
    debugUnlock: process.env.DEBUG_UNLOCK === 'true',
    aiProvider: ai.provider,
    aiApiKey: ai.apiKey,
    aiApiBase: ai.apiBase,
    aiModel: ai.model,
  };
}

function createApp(config = loadConfig()) {
  const db = initDb();
  const app = express();

  app.use(express.json());

  const publicDir = path.join(__dirname, '..', '..', 'public');
  app.use(express.static(publicDir));

  app.use('/api', createPublicRouter(db, config));
  app.use('/api/admin', createAdminRouter(db, config));

  app.get('/admin', (_req, res) => {
    res.sendFile(path.join(publicDir, 'admin.html'));
  });

  app.use((err, _req, res, _next) => {
    console.error(err);
    res.status(500).json({ error: err.message || '服务器天机紊乱' });
  });

  return { app, db, config };
}

module.exports = { createApp, loadConfig };
