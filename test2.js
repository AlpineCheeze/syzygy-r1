import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
  const page = await browser.newPage();
  
  page.on('console', msg => {
    console.log('PAGE LOG:', msg.text());
  });
  
  page.on('requestfailed', request => {
    console.log('REQUEST FAILED:', request.url(), request.failure()?.errorText);
  });
  
  page.on('response', response => {
    if (!response.ok()) {
      console.log('RESPONSE NOT OK:', response.url(), response.status());
    }
  });

  await page.goto('http://localhost:3000');
  await new Promise(r => setTimeout(r, 1000));
  
  // Login
  try {
    await page.type('input[type="email"]', 'admin@gc.com');
    await page.click('button[type="submit"]');
    await new Promise(r => setTimeout(r, 1000));
  } catch (e) {}
  
  // Go to project 1
  await page.goto('http://localhost:3000');
  await new Promise(r => setTimeout(r, 1000));
  
  // Get first project ID
  const projectLink = await page.$('a[href^="/projects/"]');
  if (projectLink) {
    const href = await page.evaluate(el => el.getAttribute('href'), projectLink);
    await page.goto(`http://localhost:3000${href}/milestones`);
    await new Promise(r => setTimeout(r, 1000));
    
    // Create milestone if none
    const milestones = await page.$$('.cursor-pointer');
    if (milestones.length === 0) {
      const newBtn = await page.$('button:has-text("New Milestone")') || await page.$('button');
      if (newBtn) {
        await newBtn.click();
        await new Promise(r => setTimeout(r, 500));
        await page.type('input[type="text"]', 'Test Milestone');
        await page.type('input[type="date"]', '2026-01-01');
        await page.click('button[type="submit"]');
        await new Promise(r => setTimeout(r, 1000));
      }
    }
    
    const milestones2 = await page.$$('.cursor-pointer');
    if (milestones2.length > 0) {
      await milestones2[0].click();
      await new Promise(r => setTimeout(r, 1000));
      
      const addDelivBtn = await page.$('button:has-text("+ Add Deliverable")');
      if (addDelivBtn) {
        await addDelivBtn.click();
        await new Promise(r => setTimeout(r, 500));
        
        // Fill form
        await page.type('input[type="text"]', 'Test Deliverable');
        await page.click('button:has-text("Add")');
        await new Promise(r => setTimeout(r, 1000));
        
        console.log('Submitted form');
      } else {
        console.log('Add Deliverable button not found');
      }
    } else {
      console.log('Still no milestones');
    }
  }

  await browser.close();
})();
