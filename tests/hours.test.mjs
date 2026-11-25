import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

// Import browser ESM without requiring a repository-wide package.json setting.
const source = await readFile(new URL('../site/hours.js', import.meta.url), 'utf8');
const { openingStatus, normalizeHours, formatKyivDateTime, FACILITY_TIME_ZONE } =
  await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
const status = (hours, instant) => openingStatus(hours, new Date(instant)).state;

test('uses Kyiv local time and inclusive opening/exclusive closing boundaries', () => {
  const hours = 'Mo-Fr 09:00-18:00; Sa 10:00-14:00; Su off';
  assert.equal(FACILITY_TIME_ZONE, 'Europe/Kyiv');
  assert.equal(status(hours, '2026-11-23T06:59:59Z'), 'closed');
  assert.equal(status(hours, '2026-11-23T07:00:00Z'), 'open');
  assert.equal(status(hours, '2026-11-23T15:59:59Z'), 'open');
  assert.equal(status(hours, '2026-11-23T16:00:00Z'), 'closed');
  assert.equal(status(hours, '2026-11-28T08:00:00Z'), 'open');
  assert.equal(status(hours, '2026-11-28T12:00:00Z'), 'closed');
  assert.equal(status(hours, '2026-11-29T10:00:00Z'), 'closed');
});

test('understands day lists, wraparound ranges, and split daily intervals', () => {
  const hours = 'Mo,We,Fr 09:00-12:00,13:00-18:00';
  assert.equal(status(hours, '2026-11-23T09:59:59Z'), 'open');
  assert.equal(status(hours, '2026-11-23T10:00:00Z'), 'closed');
  assert.equal(status(hours, '2026-11-23T11:00:00Z'), 'open');
  assert.equal(status(hours, '2026-11-24T11:00:00Z'), 'closed');
  assert.equal(status('Fr-Mo 09:00-18:00', '2026-11-29T10:00:00Z'), 'open');
  assert.equal(status('09:00-18:00', '2026-11-29T10:00:00Z'), 'open');
});

test('carries overnight opening into the next day and week', () => {
  assert.equal(status('Mo 22:00-02:00', '2026-11-23T19:59:59Z'), 'closed');
  assert.equal(status('Mo 22:00-02:00', '2026-11-23T20:00:00Z'), 'open');
  assert.equal(status('Mo 22:00-02:00', '2026-11-23T23:59:59Z'), 'open');
  assert.equal(status('Mo 22:00-02:00', '2026-11-24T00:00:00Z'), 'closed');
  assert.equal(status('Mo-Fr 22:00-02:00', '2026-11-24T23:00:00Z'), 'open');
  assert.equal(status('Su 22:00-02:00', '2026-11-22T23:00:00Z'), 'open');
});

test('supports 24/7 and midnight end times', () => {
  assert.equal(status('24/7', '2026-11-23T00:00:00Z'), 'open');
  assert.equal(status('Mo 00:00-24:00', '2026-11-23T21:59:59Z'), 'open');
  assert.equal(status('Mo 00:00-24:00', '2026-11-23T22:00:00Z'), 'closed');
  assert.equal(status('Mo 05:00-00:00', '2026-11-23T21:59:59Z'), 'open');
  assert.equal(status('Mo 05:00-00:00', '2026-11-23T22:00:00Z'), 'closed');
});

test('later weekday rules replace earlier rules, including explicit closures', () => {
  assert.equal(status('24/7; Su off', '2026-11-29T10:00:00Z'), 'closed');
  assert.equal(status('Mo-Fr 09:00-18:00; Mo 10:00-14:00', '2026-11-23T07:30:00Z'), 'closed');
  assert.equal(status('Mo-Fr 09:00-18:00; Mo 10:00-14:00', '2026-11-23T09:00:00Z'), 'open');
  assert.equal(status('Mo 22:00-02:00; Tu off', '2026-11-23T23:00:00Z'), 'closed');
  assert.equal(status('Mo off; Mo 10:00-14:00', '2026-11-23T09:00:00Z'), 'open');
  assert.equal(status('closed', '2026-11-23T09:00:00Z'), 'closed');
});

test('normalizes the provided Ukrainian schedules and HTML separators', () => {
  assert.equal(normalizeHours('Цілодобово'), '24/7');
  assert.equal(normalizeHours('Щодня з 08:00 до 22:00'), 'Mo-Su 08:00-22:00');
  assert.equal(normalizeHours('ПН — ПТ: 08:00–20:00<br> СБ — НД: 09:00–15:00'),
    'Mo-Fr 08:00-20:00; Sa-Su 09:00-15:00');
  assert.equal(normalizeHours('ПН — ПТ, НД: 10:00–18:00\u00a0'), 'Mo-Fr,Su 10:00-18:00');
  assert.equal(normalizeHours('ПН — ЧТ: 08:00–17:00<br /> ПТ : 08:00–15:45&nbsp;'),
    'Mo-Th 08:00-17:00; Fr 08:00-15:45');
  assert.equal(status('Щодня з 08:00 до 22:00', '2026-11-23T07:00:00Z'), 'open');
  assert.equal(status('ПН — ПТ, НД: 10:00–18:00', '2026-11-29T10:00:00Z'), 'open');
});

test('unparseable or incomplete schedules stay unknown, even alongside valid rules', () => {
  const unsupported = [
    '', null, undefined, 24, {}, 'За графіком', 'Щодня',
    '24/7; PH off', 'Mo-Fr 09:00-18:00; SH off', 'Mo-Fr 09:00-18:00 || "call"',
    'Mo-Fr sunrise-sunset', 'Jan-Mar 09:00-18:00', 'Mo[1] 09:00-18:00',
    'Mo-Fr 25:00-26:00', 'Mo 09:60-18:00', 'Mo 24:00-01:00',
    'Mo 00:00-24:01', 'Mo 09:00-09:00', 'Mo 09:00-18:00;',
    'Mo,,Tu 09:00-18:00', 'Mo 09:00-18:00 garbage', '<b>24/7</b>',
  ];
  for (const hours of unsupported) {
    assert.equal(status(hours, '2026-11-23T09:00:00Z'), 'unknown', String(hours));
  }
  assert.equal(openingStatus('24/7', new Date('invalid')).reason, 'invalid-date');
  assert.equal(openingStatus(null).reason, 'missing-hours');
  assert.equal(openingStatus('За графіком').reason, 'unsupported-hours');
});

test('uses Kyiv DST transitions, including both occurrences of a repeated hour', () => {
  assert.equal(status('09:00-10:00', '2026-01-05T07:00:00Z'), 'open');
  assert.equal(status('09:00-10:00', '2026-07-06T06:00:00Z'), 'open');
  // Kyiv jumps from 02:59 EET to 04:00 EEST on 29 March 2026.
  assert.equal(status('Su 03:00-04:00', '2026-03-29T00:59:00Z'), 'closed');
  assert.equal(status('Su 03:00-04:00', '2026-03-29T01:00:00Z'), 'closed');
  assert.equal(status('Su 04:00-05:00', '2026-03-29T01:00:00Z'), 'open');
  // The 03:30 local clock reading occurs twice on 25 October 2026.
  assert.equal(status('Su 03:00-04:00', '2026-10-25T00:30:00Z'), 'open');
  assert.equal(status('Su 03:00-04:00', '2026-10-25T01:30:00Z'), 'open');
  assert.equal(status('Su 03:00-04:00', '2026-10-25T02:00:00Z'), 'closed');
});

test('host timezone has no effect on results or Kyiv date display', () => {
  const previous = process.env.TZ;
  const at = new Date('2026-11-23T07:00:00Z');
  try {
    const displays = [];
    for (const timezone of ['UTC', 'America/Los_Angeles', 'Pacific/Auckland']) {
      process.env.TZ = timezone;
      assert.equal(openingStatus('Mo 09:00-10:00', at).state, 'open');
      displays.push(formatKyivDateTime(at));
    }
    assert.equal(new Set(displays).size, 1);
    assert.match(displays[0], /09:00/);
    assert.equal(formatKyivDateTime(new Date('invalid')), '');
  } finally {
    if (previous === undefined) delete process.env.TZ;
    else process.env.TZ = previous;
  }
});
