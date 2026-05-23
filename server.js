const express = require('express');
const path = require('path');
const fs = require('fs');
const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion,
    jidDecode,
    proto,
    getContentType
} = require('@whiskeysockets/baileys');
const pino = require('pino');
const NodeCache = require('node-cache');
const axios = require('axios');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// =============================================
//         BOT CONFIGURATION (EDIT HERE)
// =============================================
const CONFIG = {
    ADMIN_NAME: "Qurban",
    BOT_NAME: "𝗤𝗕 𝗕𝗢𝗧",
    BOT_VERSION: "v2.0",
    PREFIX: ".",
    OWNER_NUMBER: "923012237137", // Change to your number
    FOOTER: "𝗣𝗼𝘄𝗲𝗿𝗲𝗱 𝗯𝘆 𝗤𝘂𝗿𝗯𝗮𝗻 | QB BOT",
};

// =============================================
//         SETTINGS & STATE
// =============================================
let sock;
let botSettings = {
    autoreact: false,
    antilink: false,
    ai: false,
    welcome: true,
    antispam: false,
    autoread: false,
    typing: true,
    antidelete: false,
};

// Simple spam tracker
const spamTracker = {};
const msgRetryCounterCache = new NodeCache();
const groupCache = {};

// =============================================
//         UTILITY FUNCTIONS
// =============================================
function getTime() {
    return new Date().toLocaleString('en-PK', { timeZone: 'Asia/Karachi' });
}

function cleanText(text) {
    return text ? text.trim() : "";
}

async function getProfilePic(jid) {
    try {
        return await sock.profilePictureUrl(jid, 'image');
    } catch {
        return null;
    }
}

async function isAdmin(groupJid, userJid) {
    try {
        const meta = await sock.groupMetadata(groupJid);
        return meta.participants.some(p => p.id === userJid && (p.admin === 'admin' || p.admin === 'superadmin'));
    } catch {
        return false;
    }
}

async function isBotAdmin(groupJid) {
    try {
        const meta = await sock.groupMetadata(groupJid);
        const botId = sock.user.id.split(':')[0] + '@s.whatsapp.net';
        return meta.participants.some(p => p.id === botId && (p.admin === 'admin' || p.admin === 'superadmin'));
    } catch {
        return false;
    }
}

async function sendWithTyping(jid, content, quoted) {
    if (botSettings.typing) {
        await sock.sendPresenceUpdate('composing', jid);
        await new Promise(r => setTimeout(r, 800));
        await sock.sendPresenceUpdate('paused', jid);
    }
    return await sock.sendMessage(jid, content, quoted ? { quoted } : {});
}

// =============================================
//         MENU BUILDER
// =============================================
function buildMenu(category) {
    const menus = {
        main: `
╔══════════════════════════╗
║   🤖 *${CONFIG.BOT_NAME} ${CONFIG.BOT_VERSION}*   ║
╚══════════════════════════╝

👑 *Admin:* ${CONFIG.ADMIN_NAME}
🕐 *Time:* ${getTime()}

📋 *COMMAND CATEGORIES*

  1️⃣  *.menu 1* — 🛠️ General
  2️⃣  *.menu 2* — 👥 Group Tools
  3️⃣  *.menu 3* — 🎮 Fun & Games
  4️⃣  *.menu 4* — 🤖 AI & Search
  5️⃣  *.menu 5* — ⚙️ Settings
  6️⃣  *.menu 6* — 🛡️ Admin Tools

> _Type any number to open that menu_

━━━━━━━━━━━━━━━━━━━━━━
${CONFIG.FOOTER}`,

        1: `
╔══════════════════════╗
║  🛠️ *GENERAL MENU*  ║
╚══════════════════════╝

• *.menu* — Show main menu
• *.ping* — Check bot speed
• *.time* — Pakistan time
• *.alive* — Check if bot is online
• *.info* — Bot information
• *.owner* — Owner contact
• *.dp* — View profile picture
• *.bio* — Get user bio/about
• *.sticker* — Image to sticker
• *.weather [city]* — Live weather
• *.calc [expr]* — Calculator
• *.joke* — Random joke
• *.fact* — Random fact
• *.quote* — Inspirational quote

━━━━━━━━━━━━━━━━━━━━━━
${CONFIG.FOOTER}`,

        2: `
╔══════════════════════╗
║  👥 *GROUP MENU*     ║
╚══════════════════════╝

_Requires Bot to be Admin_

• *.kick @user* — Remove member
• *.add [number]* — Add member
• *.promote @user* — Make admin
• *.demote @user* — Remove admin
• *.mute* — Mute group
• *.unmute* — Unmute group
• *.ginfo* — Group information
• *.glink* — Get invite link
• *.revoke* — Revoke invite link
• *.everyone* — Tag all members
• *.tagadmins* — Tag all admins
• *.ban @user* — Ban user

━━━━━━━━━━━━━━━━━━━━━━
${CONFIG.FOOTER}`,

        3: `
╔══════════════════════╗
║  🎮 *FUN MENU*       ║
╚══════════════════════╝

• *.joke* — Random joke
• *.fact* — Random fact
• *.quote* — Random quote
• *.roast @user* — Roast someone
• *.flip* — Flip a coin
• *.dice* — Roll a dice
• *.8ball [question]* — Magic 8ball
• *.choose [a|b|c]* — Random choice
• *.rps [rock/paper/scissors]* — Play RPS
• *.numguess* — Number guessing game
• *.riddle* — Get a riddle
• *.lyrics [song]* — Song lyrics search

━━━━━━━━━━━━━━━━━━━━━━
${CONFIG.FOOTER}`,

        4: `
╔══════════════════════╗
║  🤖 *AI & SEARCH*    ║
╚══════════════════════╝

• *.ai [message]* — Ask AI anything
• *.ask [question]* — Quick AI answer
• *.translate [lang] [text]* — Translate
• *.define [word]* — Dictionary
• *.wiki [topic]* — Wikipedia search
• *.news* — Latest Pakistan news
• *.weather [city]* — Weather info
• *.calc [expr]* — Smart calculator

_.ai on/off_ — Toggle auto-AI reply

━━━━━━━━━━━━━━━━━━━━━━
${CONFIG.FOOTER}`,

        5: `
╔══════════════════════╗
║  ⚙️ *BOT SETTINGS*   ║
╚══════════════════════╝

• *.autoreact on/off* — React to msgs
• *.antilink on/off* — Block links
• *.antispam on/off* — Anti-spam
• *.autoread on/off* — Auto read msgs
• *.typing on/off* — Typing indicator
• *.welcome on/off* — Welcome new members
• *.antidelete on/off* — Anti-delete
• *.ai on/off* — Auto AI replies

📊 *Current Status:*
  AutoReact: ${botSettings.autoreact ? '✅' : '❌'}
  AntiLink: ${botSettings.antilink ? '✅' : '❌'}
  AntiSpam: ${botSettings.antispam ? '✅' : '❌'}
  Welcome: ${botSettings.welcome ? '✅' : '❌'}
  AI Mode: ${botSettings.ai ? '✅' : '❌'}

━━━━━━━━━━━━━━━━━━━━━━
${CONFIG.FOOTER}`,

        6: `
╔══════════════════════╗
║  🛡️ *ADMIN TOOLS*    ║
╚══════════════════════╝

_Owner Only Commands_

• *.broadcast [msg]* — Message all groups
• *.setname [name]* — Change bot name
• *.setstatus [text]* — Set bot status
• *.block [number]* — Block a contact
• *.unblock [number]* — Unblock contact
• *.clearcache* — Clear bot cache
• *.restart* — Restart bot
• *.shutdown* — Shut down bot

━━━━━━━━━━━━━━━━━━━━━━
${CONFIG.FOOTER}`
    };
    return menus[category] || menus.main;
}

// =============================================
//         BOT START
// =============================================
async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info');
    const { version } = await fetchLatestBaileysVersion();

    sock = makeWASocket({
        version,
        auth: state,
        printQRInTerminal: false,
        logger: pino({ level: 'silent' }),
        browser: ["Ubuntu", "Chrome", "20.0.04"],
        msgRetryCounterCache,
        generateHighQualityLinkPreview: true,
    });

    sock.ev.on('creds.update', saveCreds);

    // =============================================
    //         CONNECTION EVENTS
    // =============================================
    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'close') {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log('🔴 Connection closed. Reconnecting:', shouldReconnect);
            if (shouldReconnect) startBot();
        } else if (connection === 'open') {
            console.log(`✅ ${CONFIG.BOT_NAME} is connected and ready!`);
        }
    });

    // =============================================
    //         GROUP PARTICIPANT EVENTS
    // =============================================
    sock.ev.on('group-participants.update', async ({ id, participants, action }) => {
        if (!botSettings.welcome) return;
        if (action === 'add') {
            for (const p of participants) {
                const ppUrl = await getProfilePic(p);
                const welcomeMsg = `╔══════════════════╗\n║  🎉 *WELCOME!*  ║\n╚══════════════════╝\n\n` +
                    `Welcome to the group, @${p.split('@')[0]}! 🎊\n\n` +
                    `We're happy to have you here.\nPlease read the group rules and enjoy your stay!\n\n` +
                    `_— ${CONFIG.BOT_NAME} ${CONFIG.BOT_VERSION}_`;
                await sock.sendMessage(id, {
                    text: welcomeMsg,
                    mentions: [p]
                });
            }
        } else if (action === 'remove') {
            await sock.sendMessage(id, {
                text: `👋 Goodbye @${participants[0].split('@')[0]}!\nWe hope to see you again.`,
                mentions: participants
            });
        }
    });

    // =============================================
    //         MESSAGE HANDLER
    // =============================================
    sock.ev.on('messages.upsert', async (m) => {
        if (m.type !== 'notify') return;

        const msg = m.messages[0];
        if (!msg.message) return;
        if (msg.key.fromMe) return; // Ignore own messages

        const remoteJid = msg.key.remoteJid;
        const isGroup = remoteJid.endsWith('@g.us');
        const sender = isGroup ? msg.key.participant : remoteJid;
        const senderNumber = sender?.split('@')[0];
        const isOwner = senderNumber === CONFIG.OWNER_NUMBER;

        // Auto-read
        if (botSettings.autoread) {
            await sock.readMessages([msg.key]);
        }

        // Extract text from all message types
        let text = "";
        const type = getContentType(msg.message);
        if (type === 'conversation') text = msg.message.conversation;
        else if (type === 'extendedTextMessage') text = msg.message.extendedTextMessage.text;
        else if (type === 'ephemeralMessage') {
            const inner = msg.message.ephemeralMessage?.message;
            if (inner) {
                const innerType = getContentType(inner);
                if (innerType === 'conversation') text = inner.conversation;
                else if (innerType === 'extendedTextMessage') text = inner.extendedTextMessage.text;
            }
        } else if (type === 'imageMessage') {
            text = msg.message.imageMessage?.caption || "";
        }

        text = cleanText(text);
        if (!text) return;

        console.log(`📩 [${isGroup ? 'Group' : 'DM'}] ${senderNumber}: "${text}"`);

        // ─── AUTO FEATURES ───────────────────────────────────

        // AutoReact
        if (botSettings.autoreact) {
            const emojis = ['❤️', '🔥', '😂', '👏', '🤩', '💯', '⚡', '😎'];
            await sock.sendMessage(remoteJid, {
                react: { text: emojis[Math.floor(Math.random() * emojis.length)], key: msg.key }
            });
        }

        // AntiSpam
        if (botSettings.antispam && isGroup) {
            const key = `${remoteJid}:${sender}`;
            const now = Date.now();
            if (!spamTracker[key]) spamTracker[key] = [];
            spamTracker[key] = spamTracker[key].filter(t => now - t < 5000);
            spamTracker[key].push(now);
            if (spamTracker[key].length > 5) {
                await sock.sendMessage(remoteJid, {
                    text: `⚠️ @${senderNumber} please don't spam!`,
                    mentions: [sender]
                });
                return;
            }
        }

        // AntiLink (Groups)
        if (botSettings.antilink && isGroup) {
            const hasLink = /https?:\/\/|chat\.whatsapp\.com|t\.me\/|wa\.me\//i.test(text);
            if (hasLink && !isOwner) {
                const botIsAdmin = await isBotAdmin(remoteJid);
                if (botIsAdmin) {
                    await sock.sendMessage(remoteJid, { delete: msg.key });
                    await sendWithTyping(remoteJid,
                        { text: `🚫 @${senderNumber} links are NOT allowed here!\n_Message deleted by ${CONFIG.BOT_NAME}_`, mentions: [sender] }
                    );
                    return;
                }
            }
        }

        // AntiDelete
        if (botSettings.antidelete && msg.message?.protocolMessage?.type === 0) {
            await sock.sendMessage(remoteJid, {
                text: `🕵️ @${senderNumber} tried to delete a message!`,
                mentions: [sender]
            });
        }

        // ─── COMMAND HANDLER ──────────────────────────────────
        if (!text.startsWith(CONFIG.PREFIX)) {
            // AI auto-reply if enabled
            if (botSettings.ai) {
                const reply = await getAIReply(text);
                await sendWithTyping(remoteJid, { text: `🤖 *QB AI:* ${reply}` }, msg);
            }
            return;
        }

        const args = text.slice(CONFIG.PREFIX.length).trim().split(/\s+/);
        const command = args[0].toLowerCase();
        const body = args.slice(1).join(' ');

        // ─── GENERAL COMMANDS ─────────────────────────────────

        if (command === 'menu') {
            const cat = args[1] || '';
            const menuText = buildMenu(cat);
            // Send menu with image
            const menuImagePath = path.join(__dirname, 'public', 'menu.png');
            if (fs.existsSync(menuImagePath)) {
                await sendWithTyping(remoteJid, {
                    image: fs.readFileSync(menuImagePath),
                    caption: menuText
                }, msg);
            } else {
                await sendWithTyping(remoteJid, { text: menuText }, msg);
            }
        }

        else if (command === 'ping') {
            const start = Date.now();
            const m = await sendWithTyping(remoteJid, { text: '📡 Pinging...' }, msg);
            const latency = Date.now() - start;
            await sock.sendMessage(remoteJid, { text: `🏓 *Pong!*\n⚡ Speed: *${latency}ms*\n✅ Bot is alive!` }, { edit: m.key });
        }

        else if (command === 'alive') {
            await sendWithTyping(remoteJid, {
                text: `╔══════════════════╗\n║ ✅ *BOT STATUS*  ║\n╚══════════════════╝\n\n` +
                    `🤖 *${CONFIG.BOT_NAME}* is online!\n` +
                    `👑 *Admin:* ${CONFIG.ADMIN_NAME}\n` +
                    `🕐 *Time:* ${getTime()}\n` +
                    `🔋 *Uptime:* ${Math.floor(process.uptime() / 60)}m ${Math.floor(process.uptime() % 60)}s\n` +
                    `📦 *Version:* ${CONFIG.BOT_VERSION}\n\n` +
                    `_Everything is running perfectly!_ ✨`
            }, msg);
        }

        else if (command === 'time') {
            await sendWithTyping(remoteJid, {
                text: `🕐 *Pakistan Time (PKT)*\n${getTime()}`
            }, msg);
        }

        else if (command === 'info') {
            await sendWithTyping(remoteJid, {
                text: `╔══════════════════╗\n║ 🤖 *BOT INFO*    ║\n╚══════════════════╝\n\n` +
                    `• *Name:* ${CONFIG.BOT_NAME}\n` +
                    `• *Version:* ${CONFIG.BOT_VERSION}\n` +
                    `• *Admin:* ${CONFIG.ADMIN_NAME}\n` +
                    `• *Language:* Node.js\n` +
                    `• *Library:* Baileys\n` +
                    `• *Country:* 🇵🇰 Pakistan\n\n` +
                    `${CONFIG.FOOTER}`
            }, msg);
        }

        else if (command === 'owner') {
            await sendWithTyping(remoteJid, {
                text: `👑 *Bot Owner*\n\n` +
                    `• *Name:* ${CONFIG.ADMIN_NAME}\n` +
                    `• *Number:* wa.me/${CONFIG.OWNER_NUMBER}\n\n` +
                    `_Contact for support or partnership_`
            }, msg);
        }

        else if (command === 'dp') {
            const target = args[1] ? args[1].replace(/\D/g, '') + '@s.whatsapp.net' : sender;
            const ppUrl = await getProfilePic(target);
            if (ppUrl) {
                await sendWithTyping(remoteJid, {
                    image: { url: ppUrl },
                    caption: `📸 *Profile Picture*\n👤 @${target.split('@')[0]}`,
                    mentions: [target]
                }, msg);
            } else {
                await sendWithTyping(remoteJid, { text: `⚠️ No profile picture found or privacy is on.` }, msg);
            }
        }

        else if (command === 'calc') {
            try {
                const expr = body.replace(/[^0-9+\-*/().^ %]/g, '');
                // eslint-disable-next-line no-eval
                const result = Function(`"use strict"; return (${expr})`)();
                await sendWithTyping(remoteJid, {
                    text: `🧮 *Calculator*\n\n📝 Input: \`${body}\`\n✅ Result: *${result}*`
                }, msg);
            } catch {
                await sendWithTyping(remoteJid, { text: '❌ Invalid expression! Example: `.calc 5 * (3 + 2)`' }, msg);
            }
        }

        else if (command === 'flip') {
            const result = Math.random() > 0.5 ? '🪙 HEADS' : '🪙 TAILS';
            await sendWithTyping(remoteJid, { text: `🎲 Coin Flip Result: *${result}*` }, msg);
        }

        else if (command === 'dice') {
            const roll = Math.floor(Math.random() * 6) + 1;
            const faces = ['', '1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣'];
            await sendWithTyping(remoteJid, { text: `🎲 Dice Roll: *${faces[roll]} (${roll})*` }, msg);
        }

        else if (command === '8ball') {
            const answers = [
                '✅ Yes, definitely!', '✅ It is certain.', '✅ Without a doubt.',
                '🤔 Maybe...', '🤔 Ask again later.', '🤔 Cannot predict now.',
                '❌ No, definitely not.', '❌ Don\'t count on it.', '❌ Very doubtful.'
            ];
            const answer = answers[Math.floor(Math.random() * answers.length)];
            await sendWithTyping(remoteJid, {
                text: `🎱 *Magic 8-Ball*\n\n❓ *Question:* ${body || 'No question asked'}\n\n🔮 *Answer:* ${answer}`
            }, msg);
        }

        else if (command === 'choose') {
            const choices = body.split('|').map(c => c.trim()).filter(c => c);
            if (choices.length < 2) {
                await sendWithTyping(remoteJid, { text: '❌ Usage: `.choose option1 | option2 | option3`' }, msg);
            } else {
                const chosen = choices[Math.floor(Math.random() * choices.length)];
                await sendWithTyping(remoteJid, {
                    text: `🎯 *Random Choice*\n\n📋 Options: ${choices.join(', ')}\n\n✅ I choose: *${chosen}*`
                }, msg);
            }
        }

        else if (command === 'rps') {
            const choices = ['rock', 'paper', 'scissors'];
            const bot = choices[Math.floor(Math.random() * 3)];
            const user = body.toLowerCase();
            const icons = { rock: '🪨', paper: '📄', scissors: '✂️' };
            let result = '';
            if (!choices.includes(user)) {
                await sendWithTyping(remoteJid, { text: '❌ Usage: `.rps rock/paper/scissors`' }, msg);
                return;
            }
            if (user === bot) result = '🤝 Draw!';
            else if ((user === 'rock' && bot === 'scissors') || (user === 'paper' && bot === 'rock') || (user === 'scissors' && bot === 'paper')) result = '🏆 You Win!';
            else result = '🤖 Bot Wins!';

            await sendWithTyping(remoteJid, {
                text: `🎮 *Rock Paper Scissors*\n\n${icons[user]} You: *${user}*\n${icons[bot]} Bot: *${bot}*\n\n${result}`
            }, msg);
        }

        else if (command === 'joke') {
            const jokes = [
                'Why don\'t scientists trust atoms?\nBecause they make up everything! 😄',
                'Why did the math book look so sad?\nBecause it had too many problems! 😂',
                'What do you call a fish without eyes?\nA fsh! 😆',
                'Why can\'t a nose be 12 inches long?\nBecause then it would be a foot! 👃',
                'I told my wife she was drawing her eyebrows too high.\nShe looked surprised! 😅',
                'What do you call a lazy kangaroo?\nA pouch potato! 🦘',
                'Why did the bicycle fall over?\nBecause it was two-tired! 🚲',
            ];
            await sendWithTyping(remoteJid, {
                text: `😂 *Random Joke*\n\n${jokes[Math.floor(Math.random() * jokes.length)]}`
            }, msg);
        }

        else if (command === 'fact') {
            const facts = [
                '🌍 Honey never spoils. Archaeologists have found 3000-year-old honey in Egyptian tombs.',
                '🐙 Octopuses have three hearts and blue blood.',
                '⚡ Lightning strikes Earth about 100 times every second.',
                '🦈 Sharks are older than trees. They\'ve existed for over 400 million years.',
                '🧠 The human brain uses about 20% of the body\'s total energy.',
                '🌙 A day on Venus is longer than a year on Venus.',
                '🐦 Flamingos are naturally white. Their diet gives them their pink color.',
                '🇵🇰 Pakistan has the second largest salt mine in the world — Khewra!',
            ];
            await sendWithTyping(remoteJid, {
                text: `🤓 *Random Fact*\n\n${facts[Math.floor(Math.random() * facts.length)]}`
            }, msg);
        }

        else if (command === 'quote') {
            const quotes = [
                '"Believe you can and you\'re halfway there." – Theodore Roosevelt',
                '"It does not matter how slowly you go as long as you do not stop." – Confucius',
                '"Success is not final, failure is not fatal." – Winston Churchill',
                '"The best time to plant a tree was 20 years ago. The second best is now." – Chinese Proverb',
                '"Education is the most powerful weapon." – Nelson Mandela',
                '"In the middle of every difficulty lies opportunity." – Albert Einstein',
                '"Dream big and dare to fail." – Norman Vaughan',
            ];
            await sendWithTyping(remoteJid, {
                text: `💬 *Inspirational Quote*\n\n${quotes[Math.floor(Math.random() * quotes.length)]}`
            }, msg);
        }

        else if (command === 'roast') {
            const roasts = [
                'You\'re like a cloud ☁️ - when you disappear, it\'s a beautiful day!',
                'I\'d agree with you but then we\'d both be wrong 😏',
                'You bring everyone so much joy... when you leave the room! 😂',
                'I\'d call you smart but that would be lying 🤥',
                'Your secrets are always safe with me. I never even listen when you tell me them 😴',
            ];
            const target = msg.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
            const targetName = target ? `@${target.split('@')[0]}` : 'you';
            const roast = roasts[Math.floor(Math.random() * roasts.length)];
            await sendWithTyping(remoteJid, {
                text: `🔥 *Roasting ${targetName}*\n\n${roast}`,
                mentions: target ? [target] : []
            }, msg);
        }

        else if (command === 'riddle') {
            const riddles = [
                { q: 'I speak without a mouth and hear without ears. I have no body, but I come alive with wind. What am I?', a: 'An Echo' },
                { q: 'The more you take, the more you leave behind. What am I?', a: 'Footsteps' },
                { q: 'What has hands but can\'t clap?', a: 'A clock' },
                { q: 'What gets wetter as it dries?', a: 'A towel' },
                { q: 'I have cities, but no houses live there. I have mountains, but no trees grow there. What am I?', a: 'A map' },
            ];
            const r = riddles[Math.floor(Math.random() * riddles.length)];
            await sendWithTyping(remoteJid, {
                text: `🧩 *Riddle Time!*\n\n❓ ${r.q}\n\n_Reply with your answer, then type_ *.answer* _to see the solution!_`
            }, msg);
            // Store riddle answer temporarily
            groupCache[`riddle_${remoteJid}`] = r.a;
        }

        else if (command === 'answer') {
            const ans = groupCache[`riddle_${remoteJid}`];
            if (ans) {
                await sendWithTyping(remoteJid, {
                    text: `💡 *Riddle Answer*\n\n✅ The answer is: *${ans}*`
                }, msg);
                delete groupCache[`riddle_${remoteJid}`];
            } else {
                await sendWithTyping(remoteJid, { text: '❓ No active riddle. Use *.riddle* first!' }, msg);
            }
        }

        else if (command === 'weather') {
            if (!body) {
                await sendWithTyping(remoteJid, { text: '❌ Usage: `.weather Karachi`' }, msg);
                return;
            }
            try {
                const res = await axios.get(`https://wttr.in/${encodeURIComponent(body)}?format=j1`, { timeout: 5000 });
                const w = res.data.current_condition[0];
                const area = res.data.nearest_area[0];
                const city = area.areaName[0].value;
                const country = area.country[0].value;
                await sendWithTyping(remoteJid, {
                    text: `🌤️ *Weather: ${city}, ${country}*\n\n` +
                        `🌡️ Temp: *${w.temp_C}°C* (feels ${w.FeelsLikeC}°C)\n` +
                        `💧 Humidity: *${w.humidity}%*\n` +
                        `💨 Wind: *${w.windspeedKmph} km/h*\n` +
                        `🌥️ Condition: *${w.weatherDesc[0].value}*\n` +
                        `👁️ Visibility: *${w.visibility} km*`
                }, msg);
            } catch {
                await sendWithTyping(remoteJid, { text: `❌ Could not get weather for "${body}". Try again!` }, msg);
            }
        }

        else if (command === 'wiki') {
            if (!body) {
                await sendWithTyping(remoteJid, { text: '❌ Usage: `.wiki Pakistan`' }, msg);
                return;
            }
            try {
                const res = await axios.get(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(body)}`, { timeout: 5000 });
                const data = res.data;
                if (data.type === 'disambiguation' || !data.extract) {
                    await sendWithTyping(remoteJid, { text: `🔍 No clear result for "${body}". Try being more specific.` }, msg);
                    return;
                }
                await sendWithTyping(remoteJid, {
                    text: `📖 *Wikipedia: ${data.title}*\n\n${data.extract.slice(0, 600)}...\n\n🔗 ${data.content_urls?.desktop?.page || ''}`
                }, msg);
            } catch {
                await sendWithTyping(remoteJid, { text: `❌ Wikipedia search failed for "${body}".` }, msg);
            }
        }

        else if (command === 'define') {
            if (!body) {
                await sendWithTyping(remoteJid, { text: '❌ Usage: `.define serendipity`' }, msg);
                return;
            }
            try {
                const res = await axios.get(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(body)}`, { timeout: 5000 });
                const entry = res.data[0];
                const meanings = entry.meanings.slice(0, 2).map(m =>
                    `*${m.partOfSpeech}*: ${m.definitions[0].definition}`
                ).join('\n');
                await sendWithTyping(remoteJid, {
                    text: `📚 *Definition: ${entry.word}*\n\n${meanings}${entry.phonetic ? `\n\n🗣️ Pronunciation: ${entry.phonetic}` : ''}`
                }, msg);
            } catch {
                await sendWithTyping(remoteJid, { text: `❌ Definition not found for "${body}".` }, msg);
            }
        }

        else if (command === 'translate') {
            if (!body) {
                await sendWithTyping(remoteJid, { text: '❌ Usage: `.translate ur Hello how are you`\n(ur=Urdu, ar=Arabic, fr=French, es=Spanish, hi=Hindi)' }, msg);
                return;
            }
            const [lang, ...textParts] = args.slice(1);
            const textToTranslate = textParts.join(' ');
            try {
                const res = await axios.get(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(textToTranslate)}&langpair=en|${lang}`, { timeout: 5000 });
                const translation = res.data.responseData.translatedText;
                await sendWithTyping(remoteJid, {
                    text: `🌐 *Translation*\n\n📝 Original: ${textToTranslate}\n🔄 Translated (${lang}): *${translation}*`
                }, msg);
            } catch {
                await sendWithTyping(remoteJid, { text: '❌ Translation failed. Try again later.' }, msg);
            }
        }

        else if (command === 'ai' || command === 'ask') {
            if (!body && command !== 'ai') {
                await sendWithTyping(remoteJid, { text: '❌ Usage: `.ai What is the capital of Pakistan?`' }, msg);
                return;
            }
            if (body === 'on' || body === 'off') {
                botSettings.ai = body === 'on';
                await sendWithTyping(remoteJid, { text: `🤖 AI Mode: ${botSettings.ai ? 'ON ✅' : 'OFF ❌'}` }, msg);
                return;
            }
            if (!body) return;
            await sock.sendPresenceUpdate('composing', remoteJid);
            const reply = await getAIReply(body);
            await sendWithTyping(remoteJid, { text: `🤖 *QB AI*\n\n${reply}` }, msg);
        }

        // ─── SETTINGS COMMANDS ────────────────────────────────

        else if (command === 'autoreact') {
            botSettings.autoreact = body === 'on';
            await sendWithTyping(remoteJid, { text: `✨ AutoReact: ${botSettings.autoreact ? 'ON ✅' : 'OFF ❌'}` }, msg);
        }

        else if (command === 'antilink') {
            botSettings.antilink = body === 'on';
            await sendWithTyping(remoteJid, { text: `🛡️ AntiLink: ${botSettings.antilink ? 'ON ✅' : 'OFF ❌'}` }, msg);
        }

        else if (command === 'antispam') {
            botSettings.antispam = body === 'on';
            await sendWithTyping(remoteJid, { text: `🛡️ AntiSpam: ${botSettings.antispam ? 'ON ✅' : 'OFF ❌'}` }, msg);
        }

        else if (command === 'welcome') {
            botSettings.welcome = body === 'on';
            await sendWithTyping(remoteJid, { text: `👋 Welcome Messages: ${botSettings.welcome ? 'ON ✅' : 'OFF ❌'}` }, msg);
        }

        else if (command === 'typing') {
            botSettings.typing = body === 'on';
            await sendWithTyping(remoteJid, { text: `⌨️ Typing Indicator: ${botSettings.typing ? 'ON ✅' : 'OFF ❌'}` }, msg);
        }

        else if (command === 'autoread') {
            botSettings.autoread = body === 'on';
            await sendWithTyping(remoteJid, { text: `👁️ Auto Read: ${botSettings.autoread ? 'ON ✅' : 'OFF ❌'}` }, msg);
        }

        else if (command === 'antidelete') {
            botSettings.antidelete = body === 'on';
            await sendWithTyping(remoteJid, { text: `🔍 Anti Delete: ${botSettings.antidelete ? 'ON ✅' : 'OFF ❌'}` }, msg);
        }

        // ─── GROUP COMMANDS ───────────────────────────────────

        else if (command === 'ginfo' && isGroup) {
            try {
                const meta = await sock.groupMetadata(remoteJid);
                const admins = meta.participants.filter(p => p.admin).map(p => `• @${p.id.split('@')[0]}`).join('\n');
                await sendWithTyping(remoteJid, {
                    text: `👥 *Group Information*\n\n` +
                        `📌 *Name:* ${meta.subject}\n` +
                        `👤 *Members:* ${meta.participants.length}\n` +
                        `👑 *Admins:*\n${admins}\n` +
                        `📅 *Created:* ${new Date(meta.creation * 1000).toLocaleDateString('en-PK')}\n` +
                        `📝 *Description:* ${meta.desc || 'None'}`,
                    mentions: meta.participants.filter(p => p.admin).map(p => p.id)
                }, msg);
            } catch {
                await sendWithTyping(remoteJid, { text: '❌ Could not fetch group info.' }, msg);
            }
        }

        else if (command === 'everyone' && isGroup) {
            try {
                const meta = await sock.groupMetadata(remoteJid);
                const mentions = meta.participants.map(p => p.id);
                const tagText = mentions.map(m => `@${m.split('@')[0]}`).join(' ');
                await sendWithTyping(remoteJid, {
                    text: `📢 *Attention Everyone!*\n\n${body || 'You have been tagged!'}\n\n${tagText}`,
                    mentions
                }, msg);
            } catch {
                await sendWithTyping(remoteJid, { text: '❌ Failed to tag everyone.' }, msg);
            }
        }

        else if (command === 'tagadmins' && isGroup) {
            try {
                const meta = await sock.groupMetadata(remoteJid);
                const admins = meta.participants.filter(p => p.admin);
                const mentions = admins.map(p => p.id);
                const tagText = mentions.map(m => `@${m.split('@')[0]}`).join(' ');
                await sendWithTyping(remoteJid, {
                    text: `👑 *Calling All Admins!*\n\n${body || 'Attention needed!'}\n\n${tagText}`,
                    mentions
                }, msg);
            } catch {
                await sendWithTyping(remoteJid, { text: '❌ Failed to tag admins.' }, msg);
            }
        }

        else if (command === 'glink' && isGroup) {
            try {
                const code = await sock.groupInviteCode(remoteJid);
                await sendWithTyping(remoteJid, {
                    text: `🔗 *Group Invite Link*\n\nhttps://chat.whatsapp.com/${code}`
                }, msg);
            } catch {
                await sendWithTyping(remoteJid, { text: '❌ Need admin rights to get invite link.' }, msg);
            }
        }

        else if (command === 'mute' && isGroup) {
            const adminCheck = await isAdmin(remoteJid, sender);
            if (!adminCheck && !isOwner) {
                await sendWithTyping(remoteJid, { text: '❌ Only admins can mute the group!' }, msg);
                return;
            }
            await sock.groupSettingUpdate(remoteJid, 'announcement');
            await sendWithTyping(remoteJid, { text: '🔇 Group has been *muted*. Only admins can send messages.' }, msg);
        }

        else if (command === 'unmute' && isGroup) {
            const adminCheck = await isAdmin(remoteJid, sender);
            if (!adminCheck && !isOwner) {
                await sendWithTyping(remoteJid, { text: '❌ Only admins can unmute the group!' }, msg);
                return;
            }
            await sock.groupSettingUpdate(remoteJid, 'not_announcement');
            await sendWithTyping(remoteJid, { text: '🔊 Group has been *unmuted*. Everyone can send messages.' }, msg);
        }

        else if (command === 'kick' && isGroup) {
            const botAdmin = await isBotAdmin(remoteJid);
            const userAdmin = await isAdmin(remoteJid, sender);
            if (!botAdmin) { await sendWithTyping(remoteJid, { text: '❌ Bot needs to be admin to kick!' }, msg); return; }
            if (!userAdmin && !isOwner) { await sendWithTyping(remoteJid, { text: '❌ Only admins can kick members!' }, msg); return; }
            const target = msg.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0] ||
                (args[1] ? args[1].replace(/\D/g, '') + '@s.whatsapp.net' : null);
            if (!target) { await sendWithTyping(remoteJid, { text: '❌ Tag or mention the user to kick!' }, msg); return; }
            await sock.groupParticipantsUpdate(remoteJid, [target], 'remove');
            await sendWithTyping(remoteJid, {
                text: `✅ @${target.split('@')[0]} has been kicked from the group!`,
                mentions: [target]
            }, msg);
        }

        else if (command === 'promote' && isGroup) {
            const botAdmin = await isBotAdmin(remoteJid);
            if (!botAdmin) { await sendWithTyping(remoteJid, { text: '❌ Bot needs admin rights!' }, msg); return; }
            const target = msg.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
            if (!target) { await sendWithTyping(remoteJid, { text: '❌ Tag someone to promote!' }, msg); return; }
            await sock.groupParticipantsUpdate(remoteJid, [target], 'promote');
            await sendWithTyping(remoteJid, {
                text: `👑 @${target.split('@')[0]} has been promoted to *Admin*!`,
                mentions: [target]
            }, msg);
        }

        else if (command === 'demote' && isGroup) {
            const botAdmin = await isBotAdmin(remoteJid);
            if (!botAdmin) { await sendWithTyping(remoteJid, { text: '❌ Bot needs admin rights!' }, msg); return; }
            const target = msg.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
            if (!target) { await sendWithTyping(remoteJid, { text: '❌ Tag someone to demote!' }, msg); return; }
            await sock.groupParticipantsUpdate(remoteJid, [target], 'demote');
            await sendWithTyping(remoteJid, {
                text: `⬇️ @${target.split('@')[0]} has been removed from *Admin*!`,
                mentions: [target]
            }, msg);
        }

        // ─── OWNER ONLY COMMANDS ──────────────────────────────

        else if (command === 'broadcast' && isOwner) {
            if (!body) { await sendWithTyping(remoteJid, { text: '❌ Usage: `.broadcast Your message here`' }, msg); return; }
            try {
                const groups = await sock.groupFetchAllParticipating();
                let count = 0;
                for (const gid of Object.keys(groups)) {
                    await sock.sendMessage(gid, {
                        text: `📢 *Broadcast from ${CONFIG.ADMIN_NAME}*\n\n${body}\n\n_${CONFIG.FOOTER}_`
                    });
                    count++;
                    await new Promise(r => setTimeout(r, 1000));
                }
                await sendWithTyping(remoteJid, { text: `✅ Broadcast sent to *${count}* groups!` }, msg);
            } catch {
                await sendWithTyping(remoteJid, { text: '❌ Broadcast failed.' }, msg);
            }
        }

        else if (command === 'block' && isOwner) {
            const target = (args[1] || '').replace(/\D/g, '') + '@s.whatsapp.net';
            await sock.updateBlockStatus(target, 'block');
            await sendWithTyping(remoteJid, { text: `🚫 Blocked: ${target.split('@')[0]}` }, msg);
        }

        else if (command === 'unblock' && isOwner) {
            const target = (args[1] || '').replace(/\D/g, '') + '@s.whatsapp.net';
            await sock.updateBlockStatus(target, 'unblock');
            await sendWithTyping(remoteJid, { text: `✅ Unblocked: ${target.split('@')[0]}` }, msg);
        }

        else if (command === 'clearcache' && isOwner) {
            msgRetryCounterCache.flushAll();
            Object.keys(groupCache).forEach(k => delete groupCache[k]);
            Object.keys(spamTracker).forEach(k => delete spamTracker[k]);
            await sendWithTyping(remoteJid, { text: '🧹 Cache cleared successfully!' }, msg);
        }

        else if (command === 'restart' && isOwner) {
            await sendWithTyping(remoteJid, { text: '🔄 Bot restarting... Please wait!' }, msg);
            setTimeout(() => process.exit(0), 2000);
        }

        else {
            // Unknown command
            await sendWithTyping(remoteJid, {
                text: `❓ Unknown command: *.${command}*\n\nType *.menu* to see all available commands!`
            }, msg);
        }
    });
}

// =============================================
//         AI RESPONSE FUNCTION
// =============================================
async function getAIReply(text) {
    // Simple AI responses (you can replace with real API like OpenAI)
    const responses = {
        'hello': 'Hello! 👋 How can I help you today?',
        'hi': 'Hi there! 😊 I\'m QB Bot, your smart assistant!',
        'how are you': 'I\'m running perfectly! 💯 All systems online. How about you?',
        'thanks': 'You\'re welcome! 😊 Always here to help!',
        'who are you': `I'm *${CONFIG.BOT_NAME}*, a powerful WhatsApp bot created by *${CONFIG.ADMIN_NAME}*! 🤖`,
        'pakistan': '🇵🇰 Pakistan Zindabad! A great country with amazing people!',
        'karachi': '🌆 Karachi – the City of Lights, Pakistan\'s largest city!',
        'lahore': '🕌 Lahore – the heart of Pakistan! Food, culture, and history!',
    };

    const lower = text.toLowerCase();
    for (const [key, val] of Object.entries(responses)) {
        if (lower.includes(key)) return val;
    }
    return `That's interesting! 🤔 You said: "${text}"\n\nI'm a demo AI. To connect a real AI, add an OpenAI API key in the code!`;
}

// =============================================
//         EXPRESS API ROUTES
// =============================================
app.post('/get-code', async (req, res) => {
    const phone = req.body.phone;
    if (!phone) return res.json({ success: false, message: 'No phone number provided.' });
    if (!sock) return res.json({ success: false, message: 'Bot is still starting, wait 5 seconds.' });
    if (sock.authState.creds.registered) return res.json({ success: false, message: 'Bot is already linked to a WhatsApp account!' });

    try {
        const formattedNumber = phone.replace(/[^0-9]/g, '');
        const code = await sock.requestPairingCode(formattedNumber);
        res.json({ success: true, code });
    } catch (err) {
        console.error(err);
        res.json({ success: false, message: 'Error generating code. Make sure the number is correct.' });
    }
});

app.get('/status', (req, res) => {
    res.json({
        botName: CONFIG.BOT_NAME,
        admin: CONFIG.ADMIN_NAME,
        version: CONFIG.BOT_VERSION,
        connected: sock?.authState?.creds?.registered || false,
        settings: botSettings,
        uptime: Math.floor(process.uptime()),
    });
});

// =============================================
//         START SERVER
// =============================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`\n╔══════════════════════════════════╗`);
    console.log(`║   🤖 ${CONFIG.BOT_NAME} ${CONFIG.BOT_VERSION} STARTING...   ║`);
    console.log(`╚══════════════════════════════════╝`);
    console.log(`🌐 Dashboard: http://localhost:${PORT}`);
    console.log(`👑 Admin: ${CONFIG.ADMIN_NAME}`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
    startBot();
});
