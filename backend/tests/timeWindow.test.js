'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  getSiteStatus,
  formatCountdown,
  isSealedWindow,
} = require('../src/services/timeWindow');

describe('timeWindow', () => {
  it('returns unlocked outside 9:00-14:18', () => {
    assert.equal(isSealedWindow(new Date('2026-07-01T08:30:00')), false);
    assert.equal(isSealedWindow(new Date('2026-07-01T15:00:00')), false);
    assert.equal(isSealedWindow(new Date('2026-07-01T23:00:00')), false);

    const evening = getSiteStatus(new Date('2026-07-01T20:00:00'), false);
    assert.equal(evening.unlocked, true);
    assert.equal(evening.phase, 'unlocked');
  });

  it('returns locked during 9:00-14:18 with countdown to 14:18', () => {
    assert.equal(isSealedWindow(new Date('2026-07-01T10:00:00')), true);
    assert.equal(isSealedWindow(new Date('2026-07-01T14:17:59')), true);
    assert.equal(isSealedWindow(new Date('2026-07-01T14:18:00')), false);

    const status = getSiteStatus(new Date('2026-07-01T10:00:00'), false);
    assert.equal(status.phase, 'locked');
    assert.equal(status.unlocked, false);
    assert.equal(status.countdownSeconds, 4 * 3600 + 18 * 60);
    assert.equal(status.countdownText, formatCountdown(4 * 3600 + 18 * 60));
  });

  it('returns unlocked from 14:18 onward', () => {
    const status = getSiteStatus(new Date('2026-07-01T14:18:00'), false);
    assert.equal(status.unlocked, true);
    assert.equal(status.countdownText, '星轨运转中');
  });

  it('returns unlocked before 9:00', () => {
    const status = getSiteStatus(new Date('2026-07-01T07:00:00'), false);
    assert.equal(status.unlocked, true);
  });

  it('debug unlock bypasses time gate', () => {
    const status = getSiteStatus(new Date('2026-07-01T12:00:00'), true);
    assert.equal(status.unlocked, true);
  });

  it('formatCountdown pads values', () => {
    assert.equal(formatCountdown(3661), '01:01:01');
  });
});
