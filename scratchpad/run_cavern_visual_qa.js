const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({
    headless: false,
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    args: [
      '--enable-webgl',
      '--disable-background-timer-throttling',
      '--disable-backgrounding-occluded-windows',
      '--disable-renderer-backgrounding',
    ],
  });
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  const errors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('response', (response) => {
    if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`);
  });

  await page.goto('http://127.0.0.1:8777/?smoke=1', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.SMOKE_RESULT && window.SMOKE_RESULT.verdict !== 'RUNNING', null, { timeout: 60000 });
  await page.keyboard.press('Backquote');
  await page.getByRole('button', { name: '📍 Test Travel' }).click();
  await page.getByText('Training Cavern — Mine Gatehouse', { exact: true }).click();
  await page.waitForTimeout(1500);
  await page.keyboard.press('Backquote');
  await page.waitForTimeout(800);
  await page.screenshot({ path: 'scratchpad/holm_training_cavern_v1/runtime_gatehouse.png' });
  await page.locator('.tab-btn[data-tab="combat"]').click();
  await page.waitForTimeout(250);
  await page.screenshot({ path: 'scratchpad/holm_training_cavern_v1/runtime_ui_combat.png' });
  await page.locator('.tab-btn[data-tab="skills"]').click();
  await page.waitForTimeout(250);
  await page.screenshot({ path: 'scratchpad/holm_training_cavern_v1/runtime_ui_skills.png' });
  await page.locator('.tab-btn[data-tab="inv"]').click();
  await page.waitForTimeout(150);

  // Project the visible production ladder into canvas pixels, then click it.
  // This exercises the same raycast/input path as a player click.
  const ladderPoint = await page.evaluate(() => {
    let target = null;
    scene.traverse((object) => {
      if (!target && object.userData && /Training cavern/i.test(object.userData.label || '')) target = object;
    });
    if (!target) return null;
    const point = new THREE.Vector3();
    target.getWorldPosition(point);
    point.project(camera);
    return { x: (point.x + 1) * innerWidth / 2, y: (1 - point.y) * innerHeight / 2 };
  });
  if (!ladderPoint) throw new Error('Production mine ladder was not found in the live scene');
  await page.mouse.click(ladderPoint.x, ladderPoint.y);
  await page.waitForTimeout(3200);
  await page.screenshot({ path: 'scratchpad/holm_training_cavern_v1/runtime_entry.png' });

  // Stage at the far end for framing, then exercise the second production
  // ladder normally. Entry itself was reached only through the first ladder.
  await page.keyboard.press('Backquote');
  await page.getByRole('button', { name: '📍 Test Travel' }).click();
  await page.getByText('Training Cavern — Combat Hall ladder', { exact: true }).click();
  await page.waitForTimeout(900);
  await page.keyboard.press('Backquote');
  await page.waitForTimeout(700);
  await page.screenshot({ path: 'scratchpad/holm_training_cavern_v1/runtime_exit.png' });

  const exitPoint = await page.evaluate(() => {
    let target = null;
    scene.traverse((object) => {
      if (!target && object.userData && /Cavern exit/i.test(object.userData.label || '')) target = object;
    });
    if (!target) return null;
    const point = new THREE.Vector3();
    target.getWorldPosition(point); point.project(camera);
    return { x: (point.x + 1) * innerWidth / 2, y: (1 - point.y) * innerHeight / 2 };
  });
  if (!exitPoint) throw new Error('Far cavern exit ladder was not found in the live scene');
  await page.mouse.click(exitPoint.x, exitPoint.y);
  await page.waitForFunction(() => Player.plane === 0, null, { timeout: 8000 });
  await page.waitForTimeout(700);
  await page.screenshot({ path: 'scratchpad/holm_training_cavern_v1/runtime_exit_surface.png' });

  const snapshot = await page.evaluate(() => ({
    player: typeof player !== 'undefined' ? { x: player.position.x, z: player.position.z, plane: Player.plane } : null,
    smoke: window.SMOKE_RESULT,
  }));
  snapshot.ladderPoint = ladderPoint;
  snapshot.exitPoint = exitPoint;

  console.log(JSON.stringify({ errors, snapshot }));
  await browser.close();
})();
