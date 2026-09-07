import { createRequire } from 'node:module';
import { join } from 'node:path';

const require = createRequire(join(process.env.TEMP || '/tmp', 'sc-e2e', 'package.json'));
const { chromium } = require('playwright-core');

const BASE = process.env.E2E_BASE || 'http://localhost:5173';
const USER = process.env.E2E_USER || 'demo';
const PASS = process.env.E2E_PASS || 'Demo@2026';

const fails = [];
const notes = [];

/** 记录失败 */
function fail(name, detail) {
  fails.push(`${name}: ${detail}`);
  console.log(`FAIL  ${name} — ${detail}`);
}

/** 记录通过 */
function pass(name, extra = '') {
  notes.push(name);
  console.log(`PASS  ${name}${extra ? ` — ${extra}` : ''}`);
}

/** 等待并断言 */
async function assert(name, cond, detail) {
  if (cond) {
    pass(name);
  } else {
    fail(name, detail || 'condition false');
  }
}

/** 组件库条目（兼容两种 class） */
function libItems(page) {
  return page.locator('.lib-item, .lib-item');
}

/** 画布组件 */
function canvasComps(page) {
  return page.locator('.cv-comp, .cv-comp');
}

/** 添加指定分类下的组件 */
async function addLibItem(page, cat, name) {
  await page.getByRole('button', { name: cat, exact: true }).click();
  const item = libItems(page).filter({ hasText: name }).first();
  await item.waitFor({ timeout: 8000 });
  await item.click();
  await page.waitForTimeout(700);
}

/** 跑前端主流程 */
async function run() {
  const browser = await chromium.launch({
    channel: 'chrome',
    headless: true,
    args: ['--disable-gpu', '--window-size=1440,900'],
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const pageErrors = [];
  const ignoreErr = /ResizeObserver|favicon|Failed to load resource|net::ERR|hydration/;
  page.on('pageerror', (err) => {
    if (!ignoreErr.test(err.message)) {
      pageErrors.push(err.message);
    }
  });
  page.on('console', (msg) => {
    if (msg.type() === 'error' && !ignoreErr.test(msg.text())) {
      pageErrors.push(msg.text());
    }
  });

  try {
    await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
    await page.waitForSelector('input[placeholder="请输入用户名"]', { timeout: 15000 });
    pass('打开登录页');

    await page.fill('input[placeholder="请输入用户名"]', USER);
    await page.fill('input[placeholder="请输入密码"]', 'wrong-password');
    await page.getByRole('button', { name: '登 录' }).click();
    await page.waitForTimeout(800);
    const stillLogin = page.url().includes('/login');
    const pwdMarked = await page.locator('input[placeholder="请输入密码"].is-err, input[placeholder="请输入密码"].is-err').count();
    await assert('错误密码停留在登录页', stillLogin, page.url());
    await assert('错误密码框标红', pwdMarked > 0, `marked=${pwdMarked}`);

    await page.fill('input[placeholder="请输入密码"]', PASS);
    await page.getByRole('button', { name: '登 录' }).click();
    await page.waitForURL('**/projects', { timeout: 15000 });
    pass('demo 登录进入项目列表');

    await assert(
      '成员看不到管理后台入口',
      (await page.locator('[data-nav="admin"]').count()) === 0,
      '出现了管理后台导航',
    );
    await assert(
      '成员看不到 API 配置入口',
      (await page.locator('[data-nav="api-config"]').count()) === 0,
      '出现了 API 配置导航',
    );

    await page.goto(`${BASE}/admin`);
    await page.waitForURL('**/projects', { timeout: 8000 });
    await assert('成员访问 /admin 被带回项目页', page.url().includes('/projects'), page.url());
    await page.goto(`${BASE}/api-configs`);
    await page.waitForURL('**/projects', { timeout: 8000 });
    await assert('成员访问 /api-configs 被带回项目页', page.url().includes('/projects'), page.url());
    await page.goto(`${BASE}/projects`);

    const projCards = page.locator('.proj-card, .proj-card');
    await projCards.first().waitFor({ timeout: 10000 });
    const projCount = await projCards.count();
    await assert('项目列表非空', projCount > 0, `count=${projCount}`);

    await projCards.filter({ hasText: '能源看板' }).first().click();
    await page.waitForURL('**/projects/**/screens', { timeout: 10000 });
    pass('进入能源看板大屏列表');

    const createBtn = page.getByRole('button', { name: /新建空白大屏|新建空白大屏/ });
    await createBtn.waitFor();
    pass('大屏列表有新建入口');

    for (const chip of ['通用', '工业', '政务', '医疗', '交通', '能源']) {
      await assert(`分类 chip「${chip}」存在`, (await page.getByRole('button', { name: chip, exact: true }).count()) > 0, '缺失');
    }

    await page.getByRole('button', { name: '模板库' }).click();
    await page.waitForTimeout(400);
    const tplState = (await page.getByText(/公共模板|暂无模板|以此新建/).count()) > 0;
    await assert('模板库 Tab 可打开', tplState, '未看到模板库内容');
    await page.getByRole('button', { name: '大屏列表' }).click();

    const screenName = `e2e-${Date.now()}`;
    await createBtn.click();
    const dlg = page.locator('.el-dialog').filter({ hasText: /新建空白大屏|新建空白大屏/ });
    await dlg.locator('input').first().fill(screenName);
    await page.getByRole('button', { name: /创建并编辑|创建并编辑/ }).click();
    await page.waitForURL('**/editor/**', { timeout: 15000 });
    await page.waitForSelector('.ed-canvas, .ed-canvas', { timeout: 15000 });
    pass('打开编辑器');

    const libTab = page.getByRole('button', { name: '组件' });
    if (await libTab.count()) {
      await libTab.click();
    }
    await addLibItem(page, '图表', '折线图·样式1');
    let comps = canvasComps(page);
    await assert('添加折线图·样式1', (await comps.count()) >= 1, `count=${await comps.count()}`);
    await assert(
      '新组件处于选中态',
      (await page.locator('.cv-comp.selected, .cv-comp.selected').count()) === 1,
      `selected=${await page.locator('.cv-comp.selected, .cv-comp.selected').count()}`,
    );

    await addLibItem(page, '图表', '柱状图·样式1');
    comps = canvasComps(page);
    const afterAdd = await comps.count();
    await assert('再添加柱状图后画布有 2 个组件', afterAdd >= 2, `count=${afterAdd}`);

    const line = page.locator('.cv-comp[data-template="chart-line-1"], .cv-comp[data-template="chart-line-1"]');
    const bar = page.locator('.cv-comp[data-template="chart-bar-1"], .cv-comp[data-template="chart-bar-1"]');
    await assert(
      '画布同时有折线与柱状',
      (await line.count()) === 1 && (await bar.count()) === 1,
      `line=${await line.count()} bar=${await bar.count()}`,
    );

    const lineBox = await line.boundingBox();
    const barBox = await bar.boundingBox();
    if (!lineBox || !barBox) {
      fail('读取组件包围盒', 'boundingBox empty');
    } else {
      const uncovered = {
        x: lineBox.x + Math.min(12, lineBox.width / 8),
        y: lineBox.y + Math.min(12, lineBox.height / 8),
      };
      const covered =
        uncovered.x >= barBox.x &&
        uncovered.x <= barBox.x + barBox.width &&
        uncovered.y >= barBox.y &&
        uncovered.y <= barBox.y + barBox.height;
      if (covered) {
        await bar.dragTo(bar, { targetPosition: { x: 80, y: 80 }, force: true });
        await page.waitForTimeout(300);
      }
      await page.mouse.click(uncovered.x, uncovered.y);
      await page.waitForTimeout(400);
      const firstSelected = await line.evaluate((el) => el.classList.contains('selected'));
      const secondSelected = await bar.evaluate((el) => el.classList.contains('selected'));
      await assert('点击第一个组件后能选中原来的组件', firstSelected && !secondSelected, `line=${firstSelected} bar=${secondSelected}`);
    }

    await page.getByRole('button', { name: '数据绑定' }).click();
    await page.waitForTimeout(200);
    await assert('折线数据面板有静态表格或 JSON', (await page.locator('.vxe-table, textarea.json, .data-panel').count()) > 0, '数据面板空');

    await addLibItem(page, '装饰', '天气·样式1');
    await page.getByRole('button', { name: '数据绑定' }).click();
    await page.waitForTimeout(300);
    const weatherHint = await page.getByText(/天气只走系统内置|内置天气/).count();
    await assert('天气组件数据源为内置接口', weatherHint > 0, '未看到天气内置提示');

    await addLibItem(page, '控件', '按钮·常规');
    await addLibItem(page, '控件', '下拉框');
    const afterMore = await canvasComps(page).count();
    await assert('画布已有天气/按钮/下拉框', afterMore >= 5, `count=${afterMore}`);

    await page.getByRole('button', { name: '样式设置' }).click();
    await page.waitForTimeout(200);
    await assert('样式面板可打开', (await page.locator('.style-form, .p-sec').count()) > 0, '样式面板空');

    const beforeUndo = await canvasComps(page).count();
    await page.locator('button[title*="撤销"]').click();
    await page.waitForTimeout(300);
    const afterUndo = await canvasComps(page).count();
    await assert('撤销减少组件', afterUndo === beforeUndo - 1, `before=${beforeUndo} after=${afterUndo}`);
    await page.locator('button[title*="重做"]').click();
    await page.waitForTimeout(300);
    await assert('重做恢复组件', (await canvasComps(page).count()) === beforeUndo, `count=${await canvasComps(page).count()}`);

    await page.getByRole('button', { name: '页面' }).click();
    await page.getByRole('button', { name: /新建页面|新建页面/ }).click();
    await page.waitForTimeout(300);
    const pageNodes = await page.locator('.tree-node, .tree-node').count();
    await assert('可新建页面', pageNodes >= 2, `nodes=${pageNodes}`);
    await page.locator('.tree-node, .tree-node').first().click();
    await page.getByRole('button', { name: '组件' }).click();

    const btnComp = page.locator('.cv-comp[data-template="control-button"], .cv-comp[data-template="control-button"]').first();
    if (await btnComp.count()) {
      await btnComp.click({ force: true });
      await page.getByRole('button', { name: '交互事件' }).click();
      await page.getByRole('button', { name: /新增事件|新增事件/ }).click();
      const evDlg = page.locator('.el-dialog').filter({ hasText: /事件配置|事件配置/ });
      await evDlg.waitFor({ timeout: 5000 });
      const actionSelect = evDlg.locator('.el-select').nth(1);
      await actionSelect.click();
      await page.getByRole('option', { name: /显示\/隐藏|显示\/隐藏/ }).click();
      await evDlg.locator('.el-select').nth(2).click();
      await page.getByRole('option', { name: '折线图·样式1' }).click();
      await page.keyboard.press('Escape');
      await evDlg.getByRole('button', { name: '保存' }).click();
      await page.waitForTimeout(400);
      await assert('按钮已配置显示/隐藏事件', (await page.locator('.event-card, .event-card').count()) > 0, '事件卡片未出现');
    } else {
      fail('选中按钮组件', '画布上没有 control-button');
    }

    await page.locator('.ai-fab, .ai-fab').click();
    await page.getByRole('button', { name: /如何添加图表/ }).click();
    await page.waitForTimeout(2500);
    const botMsgs = await page.locator('.ai-msg.bot, .ai-msg.bot').count();
    await assert('AI 客服能回答快捷问题', botMsgs >= 2, `bot=${botMsgs}`);
    await page.locator('.ai-head .x, .ai-head .x').click().catch(() => undefined);

    await page.getByRole('button', { name: '保存', exact: true }).click();
    try {
      await page.locator('.tag-ok, .tag-ok').filter({ hasText: '已保存' }).waitFor({ timeout: 25000 });
      pass('保存成功');
    } catch {
      fail('保存成功', '未看到已保存标签');
    }

    const previewPagePromise = page.context().waitForEvent('page', { timeout: 8000 }).catch(() => null);
    await page.getByRole('button', { name: '预览', exact: true }).click();
    const confirmPreview = page.getByRole('button', { name: /保存并预览|直接预览/ });
    if (await confirmPreview.count()) {
      await page.getByRole('button', { name: '保存并预览' }).click().catch(async () => {
        await page.getByRole('button', { name: '直接预览' }).click();
      });
    }
    const preview = await previewPagePromise;
    if (!preview) {
      fail('预览新标签', '未打开新标签');
    } else {
      await preview.waitForLoadState('domcontentloaded');
      await preview.waitForTimeout(1500);
      const hasChrome = await preview.locator('.ctrl-bar, .ctrl-bar').count();
      const hasStage = await preview.locator('.stage-inner, .stage, .stage-inner, .stage').count();
      await assert('预览页无展示控制条', hasChrome === 0, `ctrl-bar=${hasChrome}`);
      await assert('预览页有画布', hasStage > 0, `stage=${hasStage}`);
      const weatherOk = await preview.getByText(/杭州|多云|晴|数据加载失败|天气/).count();
      await assert('预览页天气有内容或失败占位', weatherOk > 0, '天气区域空白');
      const lineRt = preview.locator('[data-template="chart-line-1"]');
      const btnRt = preview.locator('[data-template="control-button"]');
      if ((await lineRt.count()) && (await btnRt.count())) {
        const beforeHide = await lineRt.count();
        await btnRt.click({ force: true });
        await preview.waitForTimeout(400);
        const afterHide = await lineRt.count();
        await assert('预览中按钮可隐藏折线', afterHide < beforeHide, `before=${beforeHide} after=${afterHide}`);
      } else {
        fail('预览事件目标', `line=${await lineRt.count()} btn=${await btnRt.count()}`);
      }
      await preview.close();
    }

    const displayPromise = page.context().waitForEvent('page', { timeout: 8000 }).catch(() => null);
    await page.locator('.ed-top-right .el-dropdown, .ed-top-right .el-dropdown').click();
    await page.getByRole('menuitem', { name: /进入展示页|进入展示页/ }).click();
    const display = await displayPromise;
    if (!display) {
      fail('展示页新标签', '未打开新标签');
    } else {
      await display.waitForLoadState('domcontentloaded');
      await display.waitForTimeout(1200);
      await display.mouse.move(20, 20);
      const chrome = await display.locator('.ctrl-bar, .ctrl-bar').count();
      await assert('展示页有控制条', chrome > 0, `ctrl-bar=${chrome}`);
      await assert(
        '展示页有截图/配置/全屏',
        (await display.getByRole('button', { name: '截图' }).count()) > 0 &&
          (await display.getByRole('button', { name: /大屏配置|大屏配置/ }).count()) > 0 &&
          (await display.getByRole('button', { name: '全屏' }).count()) > 0,
        '控制条按钮缺失',
      );
      await display.close();
    }

    const cloneErrors = pageErrors.filter((m) => m.includes('DataCloneError') || m.includes('structuredClone'));
    await assert('无 structuredClone 崩溃', cloneErrors.length === 0, cloneErrors.join(' | '));

    await page.getByRole('button', { name: '返回' }).click();
    const leave = page.getByRole('button', { name: '确定' });
    if (await leave.count()) {
      await leave.click();
    }
    await page.waitForURL('**/screens', { timeout: 10000 });

    const card = page.locator('.screen-card, .screen-card, .scr-card').filter({ hasText: screenName }).first();
    await card.waitFor({ timeout: 8000 });
    await card.locator('.thumb-btn, .thumb-btn, .icon-btn').hover();
    await card.getByRole('button', { name: '复制', exact: true }).click();
    await page.waitForTimeout(800);
    const copied = await page.locator('.screen-card, .screen-card').filter({ hasText: /副本/ }).count();
    await assert('复制大屏名称带副本', copied > 0, '未看到副本卡片');

    await page.goto(`${BASE}/projects`);
    await page.waitForSelector('.proj-card, .proj-card');
    pass('返回项目列表');
  } catch (error) {
    fail('流程中断', error instanceof Error ? error.message : String(error));
  } finally {
    const shot = join(process.cwd(), 'scripts', 'e2e-last.png');
    await page.screenshot({ path: shot, fullPage: true }).catch(() => undefined);
    await browser.close();
  }

  console.log('\n--- summary ---');
  console.log(`passed: ${notes.length}`);
  console.log(`failed: ${fails.length}`);
  if (fails.length) {
    fails.forEach((item) => console.log(` - ${item}`));
    process.exitCode = 1;
  }
}

run();
