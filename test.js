import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
  const page = await browser.newPage();
  
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('PAGE ERROR:', msg.text(), msg.location().url);
    }
  });
  
  page.on('pageerror', error => {
    console.log('PAGE EXCEPTION:', error.message);
  });

  await page.goto('http://localhost:3000');
  await new Promise(r => setTimeout(r, 2000));
  
  // Try to login if on login page
  try {
    await page.type('input[type="email"]', 'admin@gc.com');
    await page.click('button[type="submit"]');
    await new Promise(r => setTimeout(r, 2000));
  } catch (e) {}

  await browser.close();
})();
