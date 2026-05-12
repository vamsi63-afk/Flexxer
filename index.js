// ==========================================
// FULL FIXED INDEX.JS - NO ERRORS (TOKEN UPDATED)
// ==========================================

const { Client, GatewayIntentBits, ActivityType } = require('discord.js');
const { Riffy } = require('riffy');
const config = require('./config.js');
let prefix = config.prefix || "!";
const express = require('express');
require('dotenv').config();

// Fix: Declared only once
let isLavalinkConnected = false; 

function startExpressServer() {
  if (config.express.enabled) {
    const app = express();
    app.get('/', (req, res) => {
      res.json({
        status: 'online',
        lavalink: isLavalinkConnected ? 'connected' : 'disconnected'
      });
    });
    app.listen(config.express.port, '0.0.0.0', () => {
      console.log(`🌐 Express server running on port ${config.express.port}`);
    });
  }
}
startExpressServer();

const intents = [
  GatewayIntentBits.Guilds,
  GatewayIntentBits.GuildVoiceStates,
  GatewayIntentBits.GuildMessages,
  GatewayIntentBits.MessageContent
];

const client = new Client({ intents });

// Fix Riffy Node initialization error
const RiffyNode = require('riffy/build/structures/Node').Node;
const originalDefineProperty = Object.defineProperty;

Object.defineProperty = function(obj, prop, descriptor) {
    if (obj instanceof RiffyNode && (prop === 'host' || prop === 'port' || prop === 'password' || prop === 'secure' || prop === 'identifier')) {
        return originalDefineProperty(obj, prop, { value: descriptor.value, writable: true, enumerable: true, configurable: true });
    }
    try { return originalDefineProperty(obj, prop, descriptor); } catch (e) {
        if (e instanceof TypeError && e.message.includes('Invalid property descriptor')) {
            return originalDefineProperty(obj, prop, { value: descriptor.value, writable: true, enumerable: true, configurable: true });
        }
        throw e;
    }
};

const riffy = new Riffy(client, config.lavalink.nodes, {
  send: (payload) => {
    const guild = client.guilds.cache.get(payload.d.guild_id);
    if (guild) guild.shard.send(payload);
  },
  defaultSearchPlatform: "ytmsearch",
  restVersion: "v4"
});

client.on('ready', async () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
  riffy.init(client.user.id);
  client.user.setActivity(config.activity.name, { type: ActivityType.Listening });
});

// MAIN COMMAND HANDLER
client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.guild) return;
    if (!message.content.startsWith(prefix)) return;

    const args = message.content.slice(prefix.length).trim().split(/ +/g);
    const command = args.shift().toLowerCase();

    // PREFIX CHANGE COMMAND
    if (command === 'prefix') {
        const newPrefix = args[0];
        if (!newPrefix) return message.reply(`❌ Ippudu unna prefix: \`${prefix}\` \nKotha prefix icchey: \`${prefix}prefix .\``);
        prefix = newPrefix;
        return message.reply(`✅ Prefix successful ga marindi! Ippatnundi commands ki \`${newPrefix}\` use chey.`);
    }

    // 1. PLAY COMMAND
    if (command === 'play' || command === 'p') {
        const query = args.join(' ');
        if (!query) return message.reply('❌ Song name pampu mamu!');
        if (!message.member.voice.channel) return message.reply('❌ VC lo join avvu mundhu!');
        
        const player = riffy.createConnection({
            guildId: message.guild.id,
            voiceChannel: message.member.voice.channel.id,
            textChannel: message.channel.id,
            deaf: true
        });

        const resolve = await riffy.resolve({ query, requester: message.author.id });
        if (!resolve.tracks || !resolve.tracks.length) return message.reply('❌ Song dhorakaledhu mamu!');

        player.queue.add(resolve.tracks[0]);
        if (!player.playing && !player.paused) player.play();
        return message.reply(`🎵 Added: **${resolve.tracks[0].info.title}**`);
    }

    // 2. VKICK COMMAND
    if (command === 'vkick') {
        const member = message.mentions.members.first();
        if (!member || !member.voice.channel) return message.reply('❌ User VC lo ledhu');
        await member.voice.disconnect();
        return message.reply(`👢 ${member.user.tag} disconnected`);
    }

    // 3. MUTE COMMAND
    if (command === 'mute') {
        const member = message.mentions.members.first();
        if (!member || !member.voice.channel) return message.reply('❌ User VC lo ledhu');
        await member.voice.setMute(true);
        return message.reply(`🔇 ${member.user.tag} muted`);
    }

    // 4. UNMUTE COMMAND
    if (command === 'unmute') {
        const member = message.mentions.members.first();
        if (!member || !member.voice.channel) return message.reply('❌ User VC lo ledhu');
        await member.voice.setMute(false);
        return message.reply(`🔊 ${member.user.tag} unmuted`);
    }
});

// Riffy Events
riffy.on('nodeConnect', (node) => {
    console.log(`🌐 Node "${node.name}" connected.`);
    isLavalinkConnected = true;
});

riffy.on('nodeError', (node, error) => {
    console.log(`❌ Node error: ${error.message}`);
    isLavalinkConnected = false;
});

// Render Environment Variable DISCORD_TOKEN vaaduthunnam
client.login(process.env.DISCORD_TOKEN || config.token);
