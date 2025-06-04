const puppeteer = require('puppeteer');
const fs = require('fs');

const SESSION_FILE = './session.json';
const TARGET_URL = 'https://aternos.org/server/';

(async () => {
  const browser = await puppeteer.launch({ headless: false, defaultViewport: null });
  const page = await browser.newPage();

  await page.goto(TARGET_URL, { waitUntil: 'networkidle2' });

  // Espera 10 segundos para você fazer login manualmente ou a página carregar totalmente
  console.log('⏳ Aguarde para fazer login, se necessário...');
  await new Promise(r => setTimeout(r, 90000));

  // Pega cookies
  const cookies = await page.cookies();

  // Pega localStorage
  const localStorageData = await page.evaluate(() => {
    let data = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      data[key] = localStorage.getItem(key);
    }
    return data;
  });

  // Salva em arquivo
  fs.writeFileSync(SESSION_FILE, JSON.stringify({ cookies, localStorage: localStorageData }, null, 2));

  console.log('✅ Sessão salva em', SESSION_FILE);

  await browser.close();
})();
