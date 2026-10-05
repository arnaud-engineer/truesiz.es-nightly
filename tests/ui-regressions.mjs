import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';

// Install Playwright externally, or pass its module path as PLAYWRIGHT_MODULE.
const { chromium, firefox, webkit } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.NIGHTLY_URL || 'http://127.0.0.1:8788/';
const output = path.resolve(process.argv[2] || 'qa-output/ui-regressions');
await fs.mkdir(output, { recursive: true });
const rows = [], errors = [];
const viewports = [['desktop', 1440, 900], ['small', 320, 568], ['phone', 390, 664], ['landscape', 667, 375]];

async function checkPanel(page) {
    const panel = await page.locator('#square').boundingBox();
    const controls = await page.locator('#input-form').boundingBox();
    const viewport = page.viewportSize();
    assert(panel.width > 100 && panel.height > 30);
    assert(panel.x >= 0 && panel.y >= 0 && panel.x + panel.width <= viewport.width + 1 && panel.y + panel.height <= viewport.height + 1, 'settings must fit the viewport');
    assert(panel.x + panel.width <= controls.x || controls.x + controls.width <= panel.x || panel.y + panel.height <= controls.y || controls.y + controls.height <= panel.y, 'settings must not overlap size controls');
    assert.equal(await page.locator('#app-settings-button').getAttribute('aria-expanded'), 'true');
    assert.equal(await page.locator('#userPreferences').evaluate(el => el.scrollWidth <= el.clientWidth + 1), true, 'no horizontal settings overflow');
}

for (const [engine, launcher] of Object.entries({ chromium, firefox, webkit })) {
    const browser = await launcher.launch();
    try {
        for (const [name, width, height] of viewports) {
            const page = await browser.newPage({ viewport: { width, height }, colorScheme: 'light' });
            page.on('pageerror', error => errors.push({ engine, name, message: error.message }));
            page.on('console', message => { if (message.type() === 'error') errors.push({ engine, name, message: message.text() }); });
            await page.goto(base);
            await page.waitForFunction(() => window.TrueSizes?.state.initialized);
            assert.equal(await page.title(), 'truesiz.es');
            const author = page.locator('#credits h1 a');
            assert.equal((await author.textContent()).trim(), '', 'wordmark must not have duplicate visible text');
            assert.equal(await author.locator('img').getAttribute('alt'), 'arnaud.cool');
            assert.equal(await author.locator('img').evaluate(el => el.complete && el.naturalWidth > 0), true);
            assert.equal(await page.locator('#credits a[href="https://ko-fi.com/arnaudcool"]').count(), 1);
            await page.locator('#calibration-button').click();
            await page.locator('#calibrationObjectsList').selectOption('6');
            await page.locator('#calibration-button').click();
            await page.locator('#xVal').fill('2');
            await page.locator('#yVal').fill('2');
            const scale = await page.evaluate(() => TrueSizes.q());
            assert.equal(await page.evaluate(() => TrueSizes.state.basis), 'reference');
            await page.locator('#app-settings-button').click();
            await page.waitForTimeout(450);
            await checkPanel(page);
            await page.screenshot({ path: path.join(output, engine + '-' + name + '-settings.png') });
            for (const theme of ['dark', 'light', 'auto']) {
                await page.locator('#' + theme + '-mode-button').click();
                assert.equal(await page.evaluate(() => app.theme), theme);
                assert.equal(await page.locator('#' + theme + '-mode-button').evaluate(el => el.classList.contains('selected')), true);
            }
            await page.locator('#graduation-button').click();
            assert.equal(await page.evaluate(() => app.showGraduations), false);
            await page.locator('#graduation-button').click();
            await page.locator('#preferredUnit').selectOption('inches');
            assert.equal(await page.locator('#sizeUnit').inputValue(), 'inches');
            assert(Math.abs(Number(await page.locator('#xVal').inputValue()) * 2.54 - 2) < 1e-9);
            await page.locator('#preferredUnit').selectOption('cm');
            const reset = page.getByRole('button', { name: 'erase new settings and profiles' });
            await reset.scrollIntoViewIfNeeded();
            const visibleReset = await reset.evaluate(el => {
                const r = el.getBoundingClientRect(), p = document.getElementById('userPreferences').getBoundingClientRect();
                return r.top >= p.top && r.bottom <= p.bottom + 1;
            });
            assert(visibleReset, 'last settings action must be reachable by scrolling');
            await page.screenshot({ path: path.join(output, engine + '-' + name + '-settings-bottom.png') });
            await page.locator('#app-settings-button').click();
            assert.equal(await page.locator('#app-settings-button').getAttribute('aria-expanded'), 'false');
            assert.equal(await page.evaluate(() => TrueSizes.q()), scale);
            assert.equal(await page.evaluate(() => TrueSizes.state.basis), 'reference');
            assert.equal(await page.locator('#xVal').isEnabled(), true);
            const frame = await page.locator('#square').boundingBox();
            assert(Math.abs(frame.width - scale * 2) < 0.03 && Math.abs(frame.height - scale * 2) < 0.03);
            if (name === 'desktop') {
                await page.screenshot({ path: path.join(output, engine + '-desktop-light.png') });
                await page.locator('#credits').screenshot({ path: path.join(output, engine + '-credit-light.png') });
                await page.locator('#app-settings-button').click();
                await page.locator('#dark-mode-button').click();
                await page.locator('#app-settings-button').click();
                await page.screenshot({ path: path.join(output, engine + '-desktop-dark.png') });
                await page.locator('#credits').screenshot({ path: path.join(output, engine + '-credit-dark.png') });
                await page.locator('#app-settings-button').click();
                for (const [, w, h] of viewports.slice(1)) {
                    await page.setViewportSize({ width: w, height: h });
                    await page.waitForTimeout(500);
                    await checkPanel(page);
                }
            }
            rows.push({ engine, version: browser.version(), viewport: name, passed: 'single author wordmark; settings geometry, scrolling, themes, units and graduation controls; unchanged scale on close' });
            await page.close();
        }
    } finally { await browser.close(); }
}
await fs.writeFile(path.join(output, 'results.json'), JSON.stringify({ at: new Date().toISOString(), base, environment: 'Isolated Playwright; Browser plugin not available', rows, errors, physicalValidation: false }, null, 2) + '\n', { flag: 'wx' });
assert.deepEqual(errors, []);
console.log(JSON.stringify({ passed: rows.length, errors: errors.length, output }));
