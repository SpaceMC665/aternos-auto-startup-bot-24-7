const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, Events } = require('discord.js');
const { createClient } = require('bedrock-protocol');
const puppeteer = require('puppeteer');
const fs = require('fs');

// Configurações do Discord e Minecraft
const DISCORD_TOKEN = ''; // Coloque seu token aqui
const CLIENT_ID = '';
const GUILD_ID = '';

const BEDROCK_SERVER = {
  host: '',
  port: 19132, // SUA PORTA
  username: 'ZllaBOT',
  offline: true
};

const allowedRoleIds = [  // ID DOS CARGO
  '',
  '',
  ''
];

let mcClient = null;

const SESSION_FILE = './session.json';
const TARGET_URL = 'https://aternos.org/server/';

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

const commands = [
  new SlashCommandBuilder().setName('entrar').setDescription('Conecta o bot ao servidor Minecraft Bedrock'),
  new SlashCommandBuilder().setName('sair').setDescription('Desconecta o bot do servidor Minecraft'),
  new SlashCommandBuilder().setName('ligar').setDescription('Liga o servidor Aternos automaticamente')
].map(cmd => cmd.toJSON());

const rest = new REST({ version: '10' }).setToken(DISCORD_TOKEN);
(async () => {
  try {
    console.log('⏳ Registrando comandos...');
    await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: commands });
    console.log('✅ Comandos registrados com sucesso.');
  } catch (error) {
    console.error('Erro ao registrar comandos:', error);
  }
})();

client.once(Events.ClientReady, () => {
  console.log(`🤖 Bot online como ${client.user.tag}`);
});

client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const { commandName } = interaction;

  if (commandName === 'entrar') {
    if (mcClient) return interaction.reply('⚠️ Já estou conectado ao servidor.');
    await interaction.deferReply();
    mcClient = createClient({ ...BEDROCK_SERVER });

    mcClient.once('join', () => {
      interaction.editReply('✅ Entrei no servidor Minecraft Bedrock!');
    });

    mcClient.on('text', packet => {
      console.log(`[Chat Minecraft] ${packet.source_name}: ${packet.message}`);
    });

    mcClient.on('disconnect', () => {
      mcClient = null;
      console.log('❌ Fui desconectado do servidor Minecraft.');
    });

    mcClient.on('error', err => {
      console.error('Erro do cliente MC:', err);
      interaction.followUp('❌ Erro ao conectar no servidor Minecraft.');
    });

  } else if (commandName === 'sair') {
    const member = interaction.member;
    const hasRole = member.roles.cache.some(role => allowedRoleIds.includes(role.id));
    if (!hasRole) {
      return interaction.reply({
        content: '❌ Você não tem permissão para usar este comando.',
        ephemeral: true
      });
    }

    if (mcClient) {
      mcClient.disconnect();
      mcClient = null;
      interaction.reply('👋 Saí do servidor Minecraft.');
    } else {
      interaction.reply('⚠️ Não estou conectado.');
    }

  } else if (commandName === 'ligar') {
    await interaction.reply('🔄 Tentando ligar o servidor Aternos...');

    try {
      const browser = await puppeteer.launch({ headless: false, defaultViewport: null });
      const page = await browser.newPage();

      if (fs.existsSync(SESSION_FILE)) {
        const session = JSON.parse(fs.readFileSync(SESSION_FILE, 'utf-8'));
        if (session.cookies) await page.setCookie(...session.cookies);
      }

      await page.goto(TARGET_URL, { waitUntil: 'networkidle2' });

      if (fs.existsSync(SESSION_FILE)) {
        const session = JSON.parse(fs.readFileSync(SESSION_FILE, 'utf-8'));
        if (session.localStorage) {
          await page.evaluate(data => {
            for (const [key, value] of Object.entries(data)) {
              localStorage.setItem(key, value);
            }
          }, session.localStorage);
          await page.reload({ waitUntil: 'networkidle2' });
        }
      }

      await page.waitForSelector('#start', { timeout: 20000 });
      const startBtn = await page.$('#start');
      if (startBtn) {
        await startBtn.click();
        console.log('🟢 Botão "Ligar" clicado.');
      }

      const maxRetries = 2000;
      let retries = 0;

      while (retries < maxRetries) {
        try {
          await new Promise(resolve => setTimeout(resolve, 3000));
          const confirmBtn = await page.$('div#confirm.btn-clickme');
          if (confirmBtn) {
            await confirmBtn.click();
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
      console.log('💾 Sessão atualizada.');

      await interaction.editReply('✅ Servidor Aternos foi iniciado com sucesso!');
      await browser.close();

    } catch (err) {
      console.error('Erro ao tentar ligar o servidor Aternos:', err);
      interaction.editReply('❌ Erro ao tentar ligar o servidor Aternos. Verifique o console.');
    }
  }
});

client.login(DISCORD_TOKEN);
