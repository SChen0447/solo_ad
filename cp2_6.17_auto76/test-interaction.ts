import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  let errors: string[] = [];
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', err => errors.push(err.message));

  console.log('=== 交互测试开始 ===\n');
  
  await page.goto('http://localhost:5199/');
  await page.waitForTimeout(3000);

  console.log('1. 页面加载测试:', errors.length === 0 ? 'PASS' : 'FAIL');
  if (errors.length > 0) console.log('   错误:', errors.join('; '));

  // 测试滑块交互
  const viscositySlider = await page.$('#viscosity');
  if (viscositySlider) {
    await viscositySlider.fill('5');
    await page.waitForTimeout(500);
    const inputVal = await page.$eval('#viscosity-input', el => (el as HTMLInputElement).value);
    const sliderVal = await page.$eval('#viscosity', el => (el as HTMLInputElement).value);
    console.log('2. 滑块→输入框同步:', inputVal === '5.0' ? 'PASS' : `FAIL (input=${inputVal}, slider=${sliderVal})`);
  } else {
    console.log('2. 滑块→输入框同步: FAIL (滑块不存在)');
  }

  // 测试输入框交互
  const densityInput = await page.$('#density-input');
  if (densityInput) {
    await densityInput.click();
    await densityInput.fill('1.5');
    await densityInput.press('Enter');
    await page.waitForTimeout(300);
    const sliderVal = await page.$eval('#density', el => (el as HTMLInputElement).value);
    const inputVal = await page.$eval('#density-input', el => (el as HTMLInputElement).value);
    console.log('3. 输入框→滑块同步:', sliderVal === '1.5' && inputVal === '1.50' ? 'PASS' : `FAIL (slider=${sliderVal}, input=${inputVal})`);
  } else {
    console.log('3. 输入框→滑块同步: FAIL (输入框不存在)');
  }

  // 测试输入验证：超出范围自动修正
  const viscInput = await page.$('#viscosity-input');
  if (viscInput) {
    await viscInput.click();
    await viscInput.fill('11');
    await viscInput.press('Enter');
    await page.waitForTimeout(300);
    const inputVal = await page.$eval('#viscosity-input', el => (el as HTMLInputElement).value);
    console.log('4. 超出范围自动修正:', inputVal === '10.0' ? 'PASS' : `FAIL (input=${inputVal}, expected=10.0)`);
  } else {
    console.log('4. 超出范围自动修正: FAIL');
  }

  // 测试输入验证：多个小数点
  const pressInput = await page.$('#pressure-input');
  if (pressInput) {
    await pressInput.click();
    await pressInput.fill('5.2.3');
    await page.waitForTimeout(100);
    const inputVal = await page.$eval('#pressure-input', el => (el as HTMLInputElement).value);
    console.log('5. 多小数点过滤:', !inputVal.includes('..') && inputVal.split('.').length <= 2 ? 'PASS' : `FAIL (input=${inputVal})`);
  } else {
    console.log('5. 多小数点过滤: FAIL');
  }

  // 测试预设按钮
  const honeyBtn = await page.$('[data-preset="honey"]');
  if (honeyBtn) {
    await honeyBtn.click();
    await page.waitForTimeout(500);
    const viscVal = await page.$eval('#viscosity-input', el => (el as HTMLInputElement).value);
    const pressVal = await page.$eval('#pressure-input', el => (el as HTMLInputElement).value);
    console.log('6. 预设切换(蜂蜜):', viscVal === '8.0' && pressVal === '300' ? 'PASS' : `FAIL (visc=${viscVal}, press=${pressVal})`);
  } else {
    console.log('6. 预设切换(蜂蜜): FAIL');
  }

  // 测试暂停功能
  await page.keyboard.press('Space');
  await page.waitForTimeout(500);
  const pauseVisible = await page.$eval('#pause-indicator', el => el.classList.contains('visible'));
  console.log('7. 暂停功能:', pauseVisible ? 'PASS' : 'FAIL');

  // 恢复
  await page.keyboard.press('Space');
  await page.waitForTimeout(500);
  const pauseHidden = await page.$eval('#pause-indicator', el => !el.classList.contains('visible'));
  console.log('8. 恢复功能:', pauseHidden ? 'PASS' : 'FAIL');

  // 测试粒子计数实时更新
  await page.waitForTimeout(2000);
  const particleCount = await page.$eval('#particle-count', el => el.textContent);
  console.log('9. 粒子计数实时更新:', particleCount !== null && particleCount !== '1500' ? `PASS (count=${particleCount})` : `INFO (count=${particleCount}, 可能全部存活)`);

  // 测试面板标题
  const titleText = await page.$eval('.panel-title', el => el.textContent);
  console.log('10. 面板标题:', titleText === '流体控制面板' ? 'PASS' : `FAIL (text=${titleText})`);

  // 测试输入框边框颜色
  const borderColor = await page.$eval('.param-input', el => getComputedStyle(el).borderColor);
  console.log('11. 输入框边框颜色:', borderColor === 'rgb(0, 229, 255)' ? 'PASS' : `FAIL (color=${borderColor})`);

  console.log('\n=== 交互测试结束 ===');
  
  await browser.close();
})();
