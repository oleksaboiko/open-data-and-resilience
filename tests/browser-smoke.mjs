/**
 * Browser integration checks against a running static site.
 * Install Playwright separately, then run:
 *   PLAYWRIGHT_MODULE=/path/to/node_modules/playwright/index.mjs \
 *   node tests/browser-smoke.mjs http://127.0.0.1:8000
 * Screenshots and downloaded test artifacts go to /tmp, never site/.
 */
import assert from 'node:assert/strict';
import { mkdir, readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const moduleName = process.env.PLAYWRIGHT_MODULE || 'playwright';
const { chromium } = await import(moduleName.startsWith('/') ? pathToFileURL(moduleName).href : moduleName);
// Normalize directory URLs so data requests never contain a doubled slash.
const baseURL = (process.argv[2] || 'http://127.0.0.1:8000').replace(/\/+$/, '');
const artifacts = process.env.BROWSER_ARTIFACTS || '/tmp/resilience-browser-qa';
await mkdir(artifacts, { recursive: true });
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
const failures = [];
const notes = [];
const checks = [];
const fixedTime = new Date('2026-11-24T10:00:00Z');

async function check(name, operation) {
  await operation();
  checks.push(name);
  console.log(`PASS ${name}`);
}
async function count(page) {
  const value = await page.locator('#result-count').textContent();
  const match = value.match(/[\d\s.,]+/);
  return match ? Number(match[0].replace(/\D/g, '')) : NaN;
}
async function expectCount(page, expected) {
  await page.waitForFunction((n) => {
    const text = document.querySelector('#result-count').textContent;
    const match = text.match(/[\d\s.,]+/);
    return match && Number(match[0].replace(/\D/g, '')) === n;
  }, expected);
}
async function downloadJSON(page, selector, name) {
  const downloadPromise = page.waitForEvent('download');
  await page.locator(selector).click();
  const download = await downloadPromise;
  assert.equal(await download.failure(), null);
  const file = `${artifacts}/${name}`;
  await download.saveAs(file);
  return JSON.parse(await readFile(file, 'utf8'));
}
async function attachMonitoring(page) {
  page.on('pageerror', error => failures.push(error.message));
  page.on('requestfailed', request => {
    const entry = `${request.url()}: ${request.failure()?.errorText}`;
    if (request.url().startsWith(baseURL)) failures.push(entry);
    else notes.push(entry);
  });
  page.on('response', response => {
    if (response.status() >= 400 && response.url().startsWith(baseURL)) failures.push(`${response.status()} ${response.url()}`);
  });
  await page.clock.install({ time: fixedTime });
}
async function load(page) {
  await attachMonitoring(page);
  await page.goto(baseURL, { waitUntil: 'domcontentloaded' });
  await page.locator('#loading').waitFor({ state: 'hidden', timeout: 30000 });
  await page.locator('.facility-row').first().waitFor({ state: 'attached' });
  await waitForBasemap(page);
}
async function waitForBasemap(page) {
  await page.waitForFunction(() => {
    const tiles = [...document.querySelectorAll('#map img.leaflet-tile')];
    return tiles.length > 0 && tiles.every(image => image.complete && image.naturalWidth > 0 && getComputedStyle(image).opacity === '1');
  }, null, { timeout: 20000 });
}

try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, acceptDownloads: true, timezoneId: 'America/Los_Angeles' });
  const page = await context.newPage();
  await load(page);
  const facilitiesResponse = await page.request.get(`${baseURL}/data/facilities.geojson`);
  assert.equal(facilitiesResponse.ok(), true);
  const facilities = (await facilitiesResponse.json()).features;
  const active = facilities.filter(f => f.properties.is_operational !== false);
  const baseline = await count(page);

  await check('desktop renders real map, facilities, population, and Kyiv time', async () => {
    assert.equal(baseline, active.length);
    assert.ok(await page.locator('#map .leaflet-pane').count() > 0);
    assert.ok(await page.locator('#map canvas').count() > 0);
    const tiles = await page.locator('#map img.leaflet-tile-loaded').count();
    assert.ok(tiles > 0);
    console.log(`Loaded basemap tiles: ${tiles}`);
    assert.match(await page.locator('#clock').textContent(), /12:00/);
    assert.equal(await page.locator('html').getAttribute('lang'), 'uk');
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await page.screenshot({ path: `${artifacts}/desktop.png`, fullPage: true });
  });

  await check('English switch updates controls and preserves map state', async () => {
    await page.locator('[data-lang="en"]').click();
    assert.equal(await page.locator('html').getAttribute('lang'), 'en');
    assert.match(await page.locator('#search').getAttribute('placeholder'), /name|address/i);
    assert.equal(await count(page), baseline);
  });

  await check('inactive records can be included and reset', async () => {
    await page.locator('#include-inactive').check();
    await expectCount(page, facilities.length);
    await page.locator('#reset').click();
    await expectCount(page, baseline);
    assert.equal(await page.locator('#include-inactive').isChecked(), false);
  });

  const district = active.find(f => f.properties.district)?.properties.district;
  await check('district filter and downloaded facilities agree', async () => {
    assert.ok(district);
    await page.locator('#district').selectOption(district);
    const expected = active.filter(f => f.properties.district === district).length;
    await expectCount(page, expected);
    await page.locator('#download-button').click();
    const data = await downloadJSON(page, '#export-facilities', 'facilities-filtered.geojson');
    assert.equal(data.type, 'FeatureCollection');
    assert.equal(data.features.length, expected);
    assert.ok(data.features.every(f => f.properties.district === district));
    await page.locator('#download-dialog [data-close]').click();
    await page.locator('#reset').click();
  });

  await check('amenity filter reflects recorded availability', async () => {
    const amenity = await page.locator('#amenity option').nth(1).getAttribute('value');
    assert.ok(amenity);
    await page.locator('#amenity').selectOption(amenity);
    const expected = active.filter(f => f.properties.amenities[amenity] === true).length;
    await expectCount(page, expected);
    assert.ok(expected > 0 && expected < baseline);
    await page.locator('#reset').click();
  });

  await check('attribute filter exposes source values', async () => {
    await page.locator('.advanced summary').click();
    await page.locator('#attribute').selectOption('district');
    assert.equal(await page.locator('#attribute-value').isEnabled(), true);
    await page.locator('#attribute-value').selectOption(district);
    await expectCount(page, active.filter(f => f.properties.district === district).length);
    await page.locator('#reset').click();
  });

  await check('search supports a no-results state and reset', async () => {
    await page.locator('#search').fill('no-matching-facility-xyz-987654321');
    await expectCount(page, 0);
    assert.equal(await page.locator('.facility-row').count(), 0);
    assert.equal(await page.locator('.empty-state').isVisible(), true);
    await page.locator('#reset').click();
    await expectCount(page, baseline);
  });

  await check('schedule filters classify open, closed, and unknown independently', async () => {
    const totals = [];
    for (const status of ['open', 'closed', 'unknown']) {
      await page.locator('#status').selectOption(status);
      totals.push(await count(page));
      await page.locator('#download-button').click();
      const data = await downloadJSON(page, '#export-facilities', `facilities-${status}.geojson`);
      assert.equal(data.features.length, totals.at(-1));
      assert.ok(data.features.every(f => f.properties.schedule_state === status));
      await page.locator('#download-dialog [data-close]').click();
    }
    assert.equal(totals.reduce((a, b) => a + b, 0), baseline);
    assert.ok(totals[0] > 0);
    await page.locator('#reset').click();
  });

  await check('population layer toggles and updates its legend', async () => {
    await page.locator('#population-layer').uncheck();
    assert.equal(await page.locator('#heat-legend').isVisible(), false);
    await page.locator('#population-layer').check();
    assert.equal(await page.locator('#heat-legend').isVisible(), true);
  });

  await check('facility details and walking polygons render and export', async () => {
    await page.locator('.facility-row').first().click();
    assert.equal(await page.locator('#detail').isVisible(), true);
    assert.ok((await page.locator('#detail-content').textContent()).trim().length > 100);
    await page.locator('#isochrone-layer').check();
    await page.locator('#walk-legend').waitFor({ state: 'visible' });
    await page.locator('#download-button').click();
    const data = await downloadJSON(page, '#export-isochrones', 'isochrones-filtered.geojson');
    assert.equal(data.type, 'FeatureCollection');
    assert.ok(data.features.length > 0);
    assert.ok(data.features.every(f => ['Polygon', 'MultiPolygon'].includes(f.geometry.type)));
    await page.locator('#download-dialog [data-close]').click();
    await waitForBasemap(page);
    await page.screenshot({ path: `${artifacts}/desktop-detail.png`, fullPage: true });
    await page.locator('#close-detail').click();
    assert.equal(await page.locator('#detail').isVisible(), false);
  });

  await check('data explanation dialog opens and closes', async () => {
    await page.locator('#about-button').click();
    assert.equal(await page.locator('#about-dialog').isVisible(), true);
    assert.match(await page.locator('#about-content').textContent(), /WorldPop/);
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('#about-dialog').isVisible(), false);
  });

  const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1 });
  const phone = await mobile.newPage();
  await load(phone);
  await check('mobile map renders without horizontal overflow', async () => {
    assert.equal(await phone.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    assert.equal(await phone.locator('#mobile-filters').isVisible(), true);
    assert.equal(await phone.locator('.sidebar').isVisible(), false);
    await phone.screenshot({ path: `${artifacts}/mobile.png`, fullPage: true });
  });
  await check('mobile filter drawer can close by keyboard after a no-results search', async () => {
    await phone.locator('#mobile-filters').click();
    await phone.locator('#search').fill('no-matching-facility-xyz-987654321');
    await expectCount(phone, 0);
    await phone.locator('#close-sidebar').focus();
    await phone.keyboard.press('Enter');
    assert.equal(await phone.locator('.sidebar').isVisible(), false);
    assert.equal(await phone.evaluate(() => document.activeElement.id), 'mobile-filters');
    await phone.locator('#mobile-filters').click();
    await phone.locator('#reset').click();
    await expectCount(phone, baseline);
    await phone.locator('#close-sidebar').click();
  });
  await check('mobile filters and facility selection remain usable', async () => {
    await phone.locator('#mobile-filters').click();
    assert.equal(await phone.locator('.sidebar').isVisible(), true);
    const query = active[0].properties.name;
    await phone.locator('#search').fill(query);
    await expectCount(phone, active.filter(f => [f.properties.name, f.properties.address, f.properties.district, f.properties.category].filter(Boolean).join(' ').toLocaleLowerCase('uk').includes(query.toLocaleLowerCase('uk'))).length);
    await phone.locator('.facility-row').first().click();
    assert.equal(await phone.locator('#detail').isVisible(), true);
    assert.equal(await phone.locator('.sidebar').isVisible(), false);
    const rect = await phone.locator('#detail').boundingBox();
    assert.ok(rect.x >= 0 && rect.x + rect.width <= 390);
    await waitForBasemap(phone);
    await phone.screenshot({ path: `${artifacts}/mobile-detail.png`, fullPage: true });
    await phone.locator('#close-detail').click();
  });
  await check('browser has no application exceptions or failed local resources', async () => {
    assert.deepEqual([...new Set(failures)], []);
  });
  console.log(JSON.stringify({ checks: checks.length, artifacts, externalResourceNotes: [...new Set(notes)].slice(0, 8) }, null, 2));
} finally {
  await browser.close();
}
