'use strict';

const express = require('express');
const {
  getTodayDateString,
  getPredictionByDate,
  upsertPrediction,
  listPredictions,
} = require('../db');
const { generatePrediction } = require('../services/aiService');

function createAdminAuth(config) {
  return (req, res, next) => {
    const token = req.headers['x-admin-token'] || req.query.token;
    if (!token || token !== config.adminPassword) {
      return res.status(401).json({ error: '无权窥探天机' });
    }
    next();
  };
}

function createAdminRouter(db, config) {
  const router = express.Router();
  const requireAdmin = createAdminAuth(config);

  router.post('/login', (req, res) => {
    const { password } = req.body || {};
    if (password === config.adminPassword) {
      return res.json({ ok: true, token: config.adminPassword });
    }
    res.status(401).json({ error: '口令有误' });
  });

  router.use(requireAdmin);

  router.get('/predictions', (req, res) => {
    res.json(listPredictions(db));
  });

  router.get('/today', (req, res) => {
    const today = getTodayDateString();
    const prediction = getPredictionByDate(db, today);
    res.json({
      prediction: prediction || null,
      adminWriteWindowHint: '可随时录入或更新今日卦象。',
    });
  });

  router.post('/predictions', async (req, res, next) => {
    try {
      const { stockCode, stockName, generateAi = true } = req.body || {};
      if (!stockCode || !stockName) {
        return res.status(400).json({ error: '请填写股票代码与名称' });
      }

      const normalizedCode = String(stockCode).trim();
      const normalizedName = String(stockName).trim();

      if (!/^\d{6}$/.test(normalizedCode)) {
        return res.status(400).json({ error: '股票代码须为 6 位数字（如 600519）' });
      }

      const today = getTodayDateString();

      let aiReason = null;
      if (generateAi) {
        aiReason = await generatePrediction(normalizedCode, normalizedName, {
          apiKey: config.aiApiKey,
          apiBase: config.aiApiBase,
          model: config.aiModel,
          maxTokens: 200,
        });
      }

      const saved = upsertPrediction(db, {
        date: today,
        stockCode: normalizedCode,
        stockName: normalizedName,
        aiReason,
      });

      res.json(saved);
    } catch (err) {
      next(err);
    }
  });

  router.post('/predictions/regenerate', async (req, res, next) => {
    try {
      const today = getTodayDateString();
      const existing = getPredictionByDate(db, today);
      if (!existing) {
        return res.status(404).json({ error: '今日尚无卦象，请先录入股票' });
      }

      const aiReason = await generatePrediction(existing.stock_code, existing.stock_name, {
        apiKey: config.aiApiKey,
        apiBase: config.aiApiBase,
        model: config.aiModel,
        maxTokens: 200,
      });

      const saved = upsertPrediction(db, {
        date: today,
        stockCode: existing.stock_code,
        stockName: existing.stock_name,
        aiReason,
      });

      res.json(saved);
    } catch (err) {
      next(err);
    }
  });

  return router;
}

module.exports = { createAdminRouter };
