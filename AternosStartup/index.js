const puppeteer = require('puppeteer');
const fs = require('fs');

const SESSION_FILE = './session.json';
const TARGET_URL = 'https://aternos.org/server/';

(async () => {
  const browser = await puppeteer.launch({ headless: false, defaultViewport: null });
  const page = await browser.newPage();

  // Restaurar cookies e localStorage
  if (fs.existsSync(SESSION_FILE)) {
    const session = JSON.parse(fs.readFileSync(SESSION_FILE, 'utf-8'));
    if (session.cookies) await page.setCookie(...session.cookies);
  }

  await page.goto(TARGET_URL, { waitUntil: 'networkidle2' });

  if (fs.existsSync(SESSION_FILE)) {
    const session = JSON.parse(fs.readFileSync(SESSION_FILE, 'utf-8'));
    if (session.localStorage) {
      await page.evaluate(localStorageData => {
        for (const [key, value] of Object.entries(localStorageData)) {
          localStorage.setItem(key, value);
        }
      }, session.localStorage);
      await page.reload({ waitUntil: 'networkidle2' });
    }
  }

  // Tenta clicar no botão "Ligar"
  try {
    await page.waitForSelector('#start', { timeout: 20000 });
    const startBtn = await page.$('#start');
    if (startBtn) {
      await startBtn.click();
      console.log('Botão "Ligar" clicado.');
    } else {
      console.warn('Botão "Ligar" não encontrado.');
    }
  } catch (err) {
    console.warn('Erro ao tentar clicar no botão "Ligar":', err.message);
  }

  // Loop para esperar botão "Confirmar" e clicar nele
// Loop para esperar o botão "Confirmar agora!" e clicar nele
const maxRetries = 2000;  // tenta por até 60 segundos (20 x 3s)
let retries = 0;

while (retries < maxRetries) {
  try {
    await page.waitForTimeout(3000); // espera 3 segundos

    const confirmButton = await page.$x('/html/body/div[3]/main/section/div[3]/div[5]/div[5]');
    
    if (confirmButton.length > 0) {
      await confirmButton[0].click();
      console.log('✅ Botão "Confirmar agora!" clicado.');
      break;
    } else {
      console.log('🔁 Botão "Confirmar agora!" ainda não apareceu. Tentando novamente...');
    }
  } catch (err) {
    console.warn('⚠️ Erro ao buscar ou clicar no botão "Confirmar agora!":', err.message);
  }
  retries++;
}

  // Salvar nova sessão
  const cookies = await page.cookies();
  const localStorageData = await page.evaluate(() => {
    const data = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      data[key] = localStorage.getItem(key);
    }
    return data;
  });

  fs.writeFileSync(SESSION_FILE, JSON.stringify({ cookies, localStorage: localStorageData }, null, 2));
  console.log('Sessão salva.');

  // Se quiser fechar o navegador, descomente a linha abaixo:
await browser.close();
})();
