'use strict';

const express = require('express');
const { getSiteStatus } = require('../services/timeWindow');
const { getTodayDateString, getPredictionByDate } = require('../db');

function createPublicRouter(db, config) {
  const router = express.Router();

  router.get('/status', (req, res) => {
    const debugUnlock = config.debugUnlock || req.query.debug === '1';
    const status = getSiteStatus(new Date(), debugUnlock);
    res.json(status);
  });

  router.get('/today', (req, res) => {
    const debugUnlock = config.debugUnlock || req.query.debug === '1';
    const status = getSiteStatus(new Date(), debugUnlock);

    if (!status.unlocked) {
      return res.status(403).json({
        error: '天机未到',
        phase: status.phase,
        countdownSeconds: status.countdownSeconds,
      });
    }

    const today = getTodayDateString();
    const prediction = getPredictionByDate(db, today);

    if (!prediction || !prediction.ai_reason) {
      return res.status(404).json({
        error: '天机混沌，今日尚无卦象',
        phase: status.phase,
      });
    }

    res.json({
      code: prediction.stock_code,
      name: prediction.stock_name,
      reason: prediction.ai_reason,
      date: prediction.date,
    });
  });

  return router;
}

module.exports = { createPublicRouter };
