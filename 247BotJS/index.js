const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, Events } = require('discord.js');
const { createClient } = require('bedrock-protocol');

const DISCORD_TOKEN = ''; //  TOKEN DO SEU BOT
const CLIENT_ID = ''; // ID do seu bot
const GUILD_ID = '';   // ID do servidor (guild)

const BEDROCK_SERVER = {
  host: '',
  port: '',
  username: '',
  offline: true
};

let mcClient = null;

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

// Comandos disponíveis
const commands = [
  new SlashCommandBuilder()
    .setName('entrar')
    .setDescription('Conecta o bot ao servidor Minecraft Bedrock'),

  new SlashCommandBuilder()
    .setName('sair')
    .setDescription('Desconecta o bot do servidor Minecraft'),
].map(command => command.toJSON());

// Registra os comandos no servidor
const rest = new REST({ version: '10' }).setToken(DISCORD_TOKEN);
(async () => {
  try {
    console.log('⏳ Registrando comandos...');
    await rest.put(
      Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
      { body: commands },
    );
    console.log('✅ Comandos registrados com sucesso.');
  } catch (error) {
    console.error('Erro ao registrar comandos:', error);
  }
})();

// Quando o bot estiver pronto
client.once(Events.ClientReady, () => {
  console.log(`🤖 Bot online como ${client.user.tag}`);
});

// Quando um comando for usado
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

    mcClient.on('text', (packet) => {
      console.log(`[Chat Minecraft] ${packet.source_name}: ${packet.message}`);
    });

    mcClient.on('disconnect', () => {
      mcClient = null;
      console.log('❌ Fui desconectado do servidor Minecraft.');
    });

    mcClient.on('error', (err) => {
      console.error('Erro do cliente MC:', err);
      interaction.followUp('❌ Erro ao conectar no servidor Minecraft.');
    });

  } else if (commandName === 'sair') {
    if (mcClient) {
      mcClient.disconnect();
      mcClient = null;
      interaction.reply('👋 Saí do servidor Minecraft.');
    } else {
      interaction.reply('⚠️ Não estou conectado.');
    }
  }
});

client.login(DISCORD_TOKEN);
