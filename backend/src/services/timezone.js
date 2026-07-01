'use strict';

/** 业务时区：封坛/开坛按北京时间 */
const BUSINESS_TZ = process.env.BUSINESS_TZ || 'Asia/Shanghai';

function getZonedParts(date = new Date(), timeZone = BUSINESS_TZ) {
  const dtf = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  const map = {};
  for (const p of dtf.formatToParts(date)) {
    if (p.type !== 'literal') map[p.type] = p.value;
  }
  let hour = Number(map.hour);
  if (hour === 24) hour = 0;
  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    hour,
    minute: Number(map.minute),
    second: Number(map.second),
  };
}

/** 将北京时间各字段转为 UTC Date（Asia/Shanghai 无夏令时，恒 UTC+8） */
function makeZonedDate({ year, month, day, hour, minute, second }, timeZone = BUSINESS_TZ) {
  if (timeZone === 'Asia/Shanghai') {
    return new Date(Date.UTC(year, month - 1, day, hour - 8, minute, second));
  }
  let ts = Date.UTC(year, month - 1, day, hour, minute, second);
  for (let i = 0; i < 5; i++) {
    const p = getZonedParts(new Date(ts), timeZone);
    const diff =
      Date.UTC(year, month - 1, day, hour, minute, second) -
      Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
    if (diff === 0) break;
    ts += diff;
  }
  return new Date(ts);
}

function getTodayDateString(date = new Date(), timeZone = BUSINESS_TZ) {
  const p = getZonedParts(date, timeZone);
  return `${p.year}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`;
}

module.exports = {
  BUSINESS_TZ,
  getZonedParts,
  makeZonedDate,
  getTodayDateString,
};
