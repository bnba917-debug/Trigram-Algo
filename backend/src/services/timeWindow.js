'use strict';

const { getZonedParts, makeZonedDate } = require('./timezone');

/** 封坛起始：每日 9:00 起天机不可窥（北京时间） */
const SEAL_START = { hour: 9, minute: 0, second: 0 };
/** 开坛时刻：每日 14:18 解封（北京时间） */
const UNLOCK_AT = { hour: 14, minute: 18, second: 0 };

function toSecondsOfDay(date) {
  const p = getZonedParts(date);
  return p.hour * 3600 + p.minute * 60 + p.second;
}

function toDaySeconds({ hour, minute, second = 0 }) {
  return hour * 3600 + minute * 60 + second;
}

/** 是否处于封坛时段 9:00 – 14:18（不含 14:18，北京时间） */
function isSealedWindow(now = new Date()) {
  const seconds = toSecondsOfDay(now);
  const sealStart = toDaySeconds(SEAL_START);
  const unlockAt = toDaySeconds(UNLOCK_AT);
  return seconds >= sealStart && seconds < unlockAt;
}

function getNextUnlockTime(from = new Date()) {
  const p = getZonedParts(from);
  const todayUnlock = makeZonedDate({
    year: p.year,
    month: p.month,
    day: p.day,
    ...UNLOCK_AT,
  });
  if (from < todayUnlock) return todayUnlock;

  const midnight = makeZonedDate({
    year: p.year,
    month: p.month,
    day: p.day,
    hour: 0,
    minute: 0,
    second: 0,
  });
  const nextDay = new Date(midnight.getTime() + 24 * 60 * 60 * 1000);
  const np = getZonedParts(nextDay);
  return makeZonedDate({
    year: np.year,
    month: np.month,
    day: np.day,
    ...UNLOCK_AT,
  });
}

function getSiteStatus(now = new Date(), debugUnlock = false) {
  if (debugUnlock) {
    return {
      phase: 'unlocked',
      unlocked: true,
      message: '【天罡星图已就位】',
      countdownLabel: '星轨重合',
      countdownSeconds: 0,
      countdownText: '星轨重合',
    };
  }

  if (!isSealedWindow(now)) {
    return {
      phase: 'unlocked',
      unlocked: true,
      message: '今日契机已至，速速占卜',
      countdownLabel: '天机大开！',
      countdownSeconds: 0,
      countdownText: '星轨运转中',
    };
  }

  const nextUnlock = getNextUnlockTime(now);
  const countdownSeconds = Math.max(0, Math.floor((nextUnlock - now) / 1000));

  return {
    phase: 'locked',
    unlocked: false,
    message: '封坛时辰，天机不可泄露',
    countdownLabel: '距离开坛还有：',
    countdownSeconds,
    countdownText: formatCountdown(countdownSeconds),
  };
}

function formatCountdown(totalSeconds) {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

module.exports = {
  SEAL_START,
  UNLOCK_AT,
  getSiteStatus,
  formatCountdown,
  isSealedWindow,
  getNextUnlockTime,
  toSecondsOfDay,
};
