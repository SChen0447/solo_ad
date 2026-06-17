const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', err => errors.push(err.message));

  console.log('=== 交互测试开始 ===\n');
  
  await page.goto('http://localhost:5199/');
  await page.waitForTimeout(3000);

  console.log('1. 页面加载:', errors.length === 0 ? 'PASS' : 'FAIL - ' + errors.join('; '));

  // 测试滑块交互
  await page.$eval('#viscosity', el => { el.value = '5'; el.dispatchEvent(new Event('input')); });
  await page.waitForTimeout(300);
  const sliderInputVal = await page.$eval('#viscosity-input', el => el.value);
  console.log('2. 滑块→输入框同步:', sliderInputVal === '5.0' ? 'PASS' : `FAIL (input=${sliderInputVal})`);

  // 测试输入框交互
  await page.click('#density-input');
  await page.fill('#density-input', '1.5');
  await page.press('#density-input', 'Enter');
  await page.waitForTimeout(300);
  const densitySliderVal = await page.$eval('#density', el => el.value);
  const densityInputVal = await page.$eval('#density-input', el => el.value);
  console.log('3. 输入框→滑块同步:', densitySliderVal === '1.5' && densityInputVal === '1.50' ? 'PASS' : `FAIL (slider=${densitySliderVal}, input=${densityInputVal})`);

  // 测试超出范围修正
  await page.click('#viscosity-input');
  await page.fill('#viscosity-input', '11');
  await page.press('#viscosity-input', 'Enter');
  await page.waitForTimeout(300);
  const viscAfterClamp = await page.$eval('#viscosity-input', el => el.value);
  console.log('4. 超出范围修正:', viscAfterClamp === '10.0' ? 'PASS' : `FAIL (val=${viscAfterClamp})`);

  // 测试多小数点过滤
  await page.click('#pressure-input');
  await page.fill('#pressure-input', '5.2.3');
  await page.waitForTimeout(100);
  const pressAfterFilter = await page.$eval('#pressure-input', el => el.value);
  const dotCount = (pressAfterFilter.match(/\./g) || []).length;
  console.log('5. 多小数点过滤:', dotCount <= 1 ? `PASS (val=${pressAfterFilter})` : `FAIL (val=${pressAfterFilter}, dots=${dotCount})`);

  // 测试预设切换
  await page.click('[data-preset="honey"]');
  await page.waitForTimeout(500);
  const honeyVisc = await page.$eval('#viscosity-input', el => el.value);
  const honeyPress = await page.$eval('#pressure-input', el => el.value);
  console.log('6. 预设切换(蜂蜜):', honeyVisc === '8.0' && honeyPress === '300' ? 'PASS' : `FAIL (visc=${honeyVisc}, press=${honeyPress})`);

  // 测试暂停
  await page.keyboard.press('Space');
  await page.waitForTimeout(300);
  const pauseVis = await page.$eval('#pause-indicator', el => el.classList.contains('visible'));
  console.log('7. 暂停功能:', pauseVis ? 'PASS' : 'FAIL');

  // 测试恢复
  await page.keyboard.press('Space');
  await page.waitForTimeout(300);
  const pauseHid = await page.$eval('#pause-indicator', el => !el.classList.contains('visible'));
  console.log('8. 恢复功能:', pauseHid ? 'PASS' : 'FAIL');

  // 测试粒子计数
  await page.waitForTimeout(2000);
  const pCount = await page.$eval('#particle-count', el => el.textContent);
  console.log('9. 粒子计数:', pCount !== null ? `PASS (count=${pCount})` : 'FAIL');

  // 测试面板标题
  const title = await page.$eval('.panel-title', el => el.textContent);
  console.log('10. 面板标题:', title === '流体控制面板' ? 'PASS' : `FAIL (title=${title})`);

  // 测试输入框边框颜色
  const borderClr = await page.$eval('.param-input', el => getComputedStyle(el).borderColor);
  console.log('11. 输入框边框颜色:', borderClr === 'rgb(0, 229, 255)' ? 'PASS' : `FAIL (color=${borderClr})`);

  // 测试文字阴影
  const textShadow = await page.$eval('.panel-title', el => getComputedStyle(el).textShadow);
  console.log('12. 标题文字阴影:', textShadow !== 'none' ? `PASS (shadow=${textShadow})` : 'FAIL');

  console.log('\n=== 交互测试结束 ===');
  
  await browser.close();
})().catch(e => { console.error('Test error:', e); process.exit(1); });
