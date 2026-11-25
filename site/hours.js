/**
 * Conservative weekly opening-hours evaluation in the facility's local timezone.
 *
 * Supported: 24/7, weekday lists/ranges, HH:mm-HH:mm intervals (including
 * overnight), comma-separated intervals, and off/closed. Semicolon rules are
 * processed in order: later rules replace earlier rules for their stated days.
 * An overnight interval also applies on the next day until its end time, unless
 * a later rule for that day overrides it. Holidays, dates, seasonal schedules,
 * comments, solar times, and fallback expressions deliberately return unknown.
 *
 * The source dataset's Ukrainian weekly schedules are normalized here as well.
 * An "open" result describes published hours, not verified current availability.
 */
export const FACILITY_TIME_ZONE = 'Europe/Kyiv';

const DAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
const UKRAINIAN_DAYS = {
  ПН: 'Mo', ВТ: 'Tu', СР: 'We', ЧТ: 'Th', ПТ: 'Fr', СБ: 'Sa', НД: 'Su',
};
const clock = new Intl.DateTimeFormat('en-GB', {
  timeZone: FACILITY_TIME_ZONE,
  weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
});
const displayClock = new Intl.DateTimeFormat('uk-UA', {
  timeZone: FACILITY_TIME_ZONE,
  dateStyle: 'medium', timeStyle: 'short',
});
const WEEKDAY_INDEX = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 };

function parseDays(selector) {
  if (!selector) return DAYS.map((_, index) => index);
  const result = new Set();
  for (const group of selector.replace(/\s/g, '').split(',')) {
    const match = /^(Mo|Tu|We|Th|Fr|Sa|Su)(?:-(Mo|Tu|We|Th|Fr|Sa|Su))?$/.exec(group);
    if (!match) return null;
    const first = DAYS.indexOf(match[1]);
    const last = DAYS.indexOf(match[2] || match[1]);
    let day = first;
    for (;;) {
      result.add(day);
      if (day === last) break;
      day = (day + 1) % 7;
    }
  }
  return [...result];
}

function parseTime(value, allowMidnightEnd) {
  const [hour, minute] = value.split(':').map(Number);
  if (minute > 59 || hour > 24 || (hour === 24 && (!allowMidnightEnd || minute !== 0))) {
    return null;
  }
  return hour * 60 + minute;
}

function parseSchedule(value) {
  const rules = [];
  for (const rawRule of value.split(';')) {
    const rule = rawRule.trim();
    if (!rule) return null;
    if (rule === '24/7') {
      rules.push({ days: DAYS.map((_, index) => index), intervals: [[0, 1440]] });
      continue;
    }
    const match = /^(?:([A-Za-z,\s-]+?)\s+)?(off|closed|\d{2}:\d{2}.*)$/.exec(rule);
    if (!match) return null;
    const days = parseDays(match[1]?.trim());
    if (!days) return null;
    if (match[2] === 'off' || match[2] === 'closed') {
      rules.push({ days, intervals: [] });
      continue;
    }
    const intervals = [];
    for (const interval of match[2].split(',')) {
      const times = /^(\d{2}:\d{2})\s*-\s*(\d{2}:\d{2})$/.exec(interval.trim());
      if (!times) return null;
      const start = parseTime(times[1], false);
      let end = parseTime(times[2], true);
      // Equal start/end times are ambiguous in informal source schedules.
      // Explicit 00:00-24:00 or 24/7 should be used for full-day opening.
      if (start === null || end === null || start === end) return null;
      if (end < start) end += 1440;
      intervals.push([start, end]);
    }
    rules.push({ days, intervals });
  }
  return rules;
}

/** Return a supported weekly schedule, or null for missing/unsupported input. */
export function normalizeHours(raw) {
  if (typeof raw !== 'string' || !raw.trim()) return null;
  let value = raw
    .replace(/<br\s*\/?\s*>/gi, '; ')
    .replace(/&nbsp;|&#160;|&#x0*a0;/gi, ' ')
    .replace(/[\u00a0\u202f]/g, ' ')
    .replace(/[\u2010-\u2015\u2212]/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
  if (/^цілодобово$/iu.test(value)) value = '24/7';
  value = value.split(';').map((part) => {
    let rule = part.trim();
    rule = rule.replace(/^Щодня\s+з\s+(\d{2}:\d{2})\s+до\s+(\d{2}:\d{2})$/iu, 'Mo-Su $1-$2');
    rule = rule.replace(/(ПН|ВТ|СР|ЧТ|ПТ|СБ|НД)(?=\s|[-,:]|$)/giu, (day) => UKRAINIAN_DAYS[day.toUpperCase()]);
    rule = rule.replace(/^([A-Za-z,\s-]+):\s*/, '$1 ');
    rule = rule.replace(/\s*-\s*/g, '-').replace(/\s*,\s*/g, ',').replace(/\s+/g, ' ').trim();
    return rule;
  }).join('; ');
  return parseSchedule(value) ? value : null;
}

/**
 * @returns {{state: 'open'|'closed'|'unknown', reason?: string}}
 * Boundaries are start-inclusive/end-exclusive; visitor timezone is irrelevant.
 */
export function openingStatus(hours, date = new Date()) {
  if (!(date instanceof Date) || !Number.isFinite(date.getTime())) {
    return { state: 'unknown', reason: 'invalid-date' };
  }
  const normalized = normalizeHours(hours);
  if (normalized === null) {
    return {
      state: 'unknown',
      reason: typeof hours === 'string' && hours.trim() ? 'unsupported-hours' : 'missing-hours',
    };
  }
  const parts = Object.fromEntries(clock.formatToParts(date).map(({ type, value }) => [type, value]));
  const day = WEEKDAY_INDEX[parts.weekday];
  const previousDay = (day + 6) % 7;
  const minute = Number(parts.hour) * 60 + Number(parts.minute);
  let open = false;
  for (const rule of parseSchedule(normalized)) {
    const today = rule.days.includes(day);
    const overnight = rule.days.includes(previousDay)
      && rule.intervals.some(([start, end]) => end > 1440 && minute + 1440 >= start && minute + 1440 < end);
    if (today) {
      open = overnight || rule.intervals.some(([start, end]) => minute >= start && minute < end);
    } else if (overnight) {
      open = true;
    }
  }
  return { state: open ? 'open' : 'closed' };
}

/** Ukrainian calendar/time display, always in Kyiv's timezone. */
export function formatKyivDateTime(date = new Date()) {
  return date instanceof Date && Number.isFinite(date.getTime()) ? displayClock.format(date) : '';
}
