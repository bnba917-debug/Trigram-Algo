'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  getSiteStatus,
  formatCountdown,
  isSealedWindow,
} = require('../src/services/timeWindow');

/** 北京时间 wall-clock → UTC Date */
function beijing(y, m, d, h, min = 0, s = 0) {
  return new Date(Date.UTC(y, m - 1, d, h - 8, min, s));
}

describe('timeWindow (Asia/Shanghai)', () => {
  it('returns unlocked outside 9:00-14:18 Beijing time', () => {
    assert.equal(isSealedWindow(beijing(2026, 7, 1, 8, 30)), false);
    assert.equal(isSealedWindow(beijing(2026, 7, 1, 15, 0)), false);
    assert.equal(isSealedWindow(beijing(2026, 7, 1, 23, 0)), false);

    const evening = getSiteStatus(beijing(2026, 7, 1, 20, 0), false);
    assert.equal(evening.unlocked, true);
    assert.equal(evening.phase, 'unlocked');
  });

  it('returns locked during 9:00-14:18 Beijing with countdown to 14:18', () => {
    assert.equal(isSealedWindow(beijing(2026, 7, 1, 10, 0)), true);
    assert.equal(isSealedWindow(beijing(2026, 7, 1, 14, 17, 59)), true);
    assert.equal(isSealedWindow(beijing(2026, 7, 1, 14, 18, 0)), false);

    const status = getSiteStatus(beijing(2026, 7, 1, 10, 0), false);
    assert.equal(status.phase, 'locked');
    assert.equal(status.unlocked, false);
    assert.equal(status.countdownSeconds, 4 * 3600 + 18 * 60);
    assert.equal(status.countdownText, formatCountdown(4 * 3600 + 18 * 60));
  });

  it('uses Beijing time even when server runs in UTC', () => {
    const utcMorning = new Date('2026-07-01T02:00:00.000Z');
    assert.equal(isSealedWindow(utcMorning), true);
    assert.equal(isSealedWindow(new Date('2026-07-01T06:18:00.000Z')), false);
  });

  it('returns unlocked from 14:18 onward', () => {
    const status = getSiteStatus(beijing(2026, 7, 1, 14, 18, 0), false);
    assert.equal(status.unlocked, true);
    assert.equal(status.countdownText, '星轨运转中');
  });

  it('returns unlocked before 9:00', () => {
    const status = getSiteStatus(beijing(2026, 7, 1, 7, 0), false);
    assert.equal(status.unlocked, true);
  });

  it('debug unlock bypasses time gate', () => {
    const status = getSiteStatus(beijing(2026, 7, 1, 12, 0), true);
    assert.equal(status.unlocked, true);
  });

  it('formatCountdown pads values', () => {
    assert.equal(formatCountdown(3661), '01:01:01');
  });
});
