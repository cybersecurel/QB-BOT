# 🤖 QB Bot v2.0 — Powered by Qurban

A powerful, feature-rich WhatsApp Bot built with Node.js + Baileys + Express.

---

## 📋 FEATURES

- ✅ 35+ Commands across 6 menu categories
- ✅ Beautiful Web Dashboard to get pairing code
- ✅ Anti-Link, Anti-Spam, Anti-Delete protection
- ✅ AI mode with smart auto-replies
- ✅ Welcome/Goodbye messages for groups
- ✅ Group management (kick, promote, demote, mute)
- ✅ Fun commands (jokes, riddles, dice, 8ball)
- ✅ Weather, Wikipedia, Dictionary, Translator
- ✅ Auto-React with random emojis
- ✅ Typing indicator simulation
- ✅ Admin broadcast to all groups
- ✅ Beautiful menu image (menu.png)
- ✅ Pakistan time & number format support

---

## 🚀 SETUP

### Step 1 — Install
```bash
npm install
```

### Step 2 — Generate Menu Image
```bash
node generate-menu.js
```

### Step 3 — Configure
Edit `server.js` top section:
```js
const CONFIG = {
    ADMIN_NAME: "Qurban",
    BOT_NAME: "𝗤𝗕 𝗕𝗢𝗧",
    OWNER_NUMBER: "923001234567",  // ← Your number here
    PREFIX: ".",
};
```

### Step 4 — Run
```bash
node server.js
```

### Step 5 — Link WhatsApp
1. Open browser: `http://localhost:3000`
2. Enter your number: `923001234567` (no + or 0 prefix)
3. Click **Generate Pairing Code**
4. Open WhatsApp → Settings → Linked Devices → Link with Phone Number
5. Enter the 8-digit code shown

---

## 📋 COMMANDS

### 🛠️ General (.menu 1)
| Command | Description |
|---------|-------------|
| `.menu` | Show main menu with image |
| `.ping` | Bot response speed |
| `.alive` | Status + uptime |
| `.info` | Bot information |
| `.dp [@user]` | Profile picture |
| `.weather [city]` | Live weather |
| `.calc [expr]` | Calculator |
| `.wiki [topic]` | Wikipedia |
| `.define [word]` | Dictionary |
| `.translate [lang] [text]` | Translate text |

### 👥 Group Tools (.menu 2)
| Command | Description |
|---------|-------------|
| `.kick @user` | Remove member |
| `.promote @user` | Make admin |
| `.demote @user` | Remove admin |
| `.mute / .unmute` | Control messaging |
| `.everyone` | Tag all members |
| `.tagadmins` | Tag all admins |
| `.ginfo` | Group information |
| `.glink` | Get invite link |

### 🎮 Fun (.menu 3)
| Command | Description |
|---------|-------------|
| `.joke` | Random joke |
| `.fact` | Random fact |
| `.quote` | Inspirational quote |
| `.8ball [q]` | Magic 8-Ball |
| `.flip` | Coin flip |
| `.dice` | Dice roll |
| `.rps [choice]` | Rock Paper Scissors |
| `.riddle` | Riddle game |
| `.roast @user` | Roast someone |
| `.choose a\|b\|c` | Random choice |

### 🤖 AI (.menu 4)
| Command | Description |
|---------|-------------|
| `.ai [text]` | Ask AI anything |
| `.ask [q]` | Quick question |
| `.translate [lang] [text]` | Translate |
| `.ai on/off` | Toggle auto AI |

### ⚙️ Settings (.menu 5)
| Command | Values |
|---------|--------|
| `.autoreact` | on/off |
| `.antilink` | on/off |
| `.antispam` | on/off |
| `.welcome` | on/off |
| `.typing` | on/off |
| `.autoread` | on/off |
| `.antidelete` | on/off |

### 🛡️ Admin (.menu 6) — Owner Only
| Command | Description |
|---------|-------------|
| `.broadcast [msg]` | Message all groups |
| `.block [number]` | Block contact |
| `.unblock [number]` | Unblock contact |
| `.clearcache` | Clear bot cache |
| `.restart` | Restart bot |

---

## 🌐 DEPLOY TO RENDER (FREE)

1. Push to GitHub (don't include `node_modules/` or `auth_info/`)
2. Go to [render.com](https://render.com) → **New** → **Web Service**
3. Connect GitHub repo
4. Settings:
   - **Build Command:** `npm install && node generate-menu.js`
   - **Start Command:** `node server.js`
   - **Instance Type:** Free
5. Deploy → Visit your live URL → Enter number → Get code → Link!

---

## 👑 Credits

**Bot by:** Qurban  
**Country:** 🇵🇰 Pakistan  
**Library:** [@whiskeysockets/baileys](https://github.com/WhiskeySockets/Baileys)
