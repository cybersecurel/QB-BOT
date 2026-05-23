// generate-menu.js
// Run this once: node generate-menu.js
// It creates public/menu.png used when .menu is sent

const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

const W = 700, H = 900;
const canvas = createCanvas(W, H);
const ctx = canvas.getContext('2d');

// Background gradient
const bg = ctx.createLinearGradient(0, 0, W, H);
bg.addColorStop(0, '#070d0f');
bg.addColorStop(0.5, '#0d1a1f');
bg.addColorStop(1, '#070d0f');
ctx.fillStyle = bg;
ctx.fillRect(0, 0, W, H);

// Grid overlay
ctx.strokeStyle = 'rgba(0,229,170,0.04)';
ctx.lineWidth = 1;
for (let x = 0; x < W; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
for (let y = 0; y < H; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

// Glow circle
const glow = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, 350);
glow.addColorStop(0, 'rgba(0,229,170,0.08)');
glow.addColorStop(1, 'rgba(0,229,170,0)');
ctx.fillStyle = glow;
ctx.fillRect(0, 0, W, H);

// Outer border
ctx.strokeStyle = 'rgba(0,229,170,0.35)';
ctx.lineWidth = 2;
roundRect(ctx, 20, 20, W - 40, H - 40, 20);
ctx.stroke();

// Inner border
ctx.strokeStyle = 'rgba(0,184,255,0.15)';
ctx.lineWidth = 1;
roundRect(ctx, 28, 28, W - 56, H - 56, 16);
ctx.stroke();

// Top accent bar
const topBar = ctx.createLinearGradient(0, 0, W, 0);
topBar.addColorStop(0, 'transparent');
topBar.addColorStop(0.3, '#00e5aa');
topBar.addColorStop(0.7, '#00b8ff');
topBar.addColorStop(1, 'transparent');
ctx.fillStyle = topBar;
ctx.fillRect(20, 20, W - 40, 3);

// Bot icon circle
ctx.save();
const iconGrad = ctx.createRadialGradient(W / 2, 95, 0, W / 2, 95, 44);
iconGrad.addColorStop(0, '#00e5aa');
iconGrad.addColorStop(1, '#00b8ff');
ctx.fillStyle = iconGrad;
ctx.shadowColor = '#00e5aa';
ctx.shadowBlur = 30;
ctx.beginPath();
ctx.arc(W / 2, 95, 44, 0, Math.PI * 2);
ctx.fill();
ctx.restore();

ctx.font = '40px serif';
ctx.textAlign = 'center';
ctx.fillText('🤖', W / 2, 110);

// Title
ctx.font = 'bold 48px sans-serif';
ctx.textAlign = 'center';
const titleGrad = ctx.createLinearGradient(0, 0, W, 0);
titleGrad.addColorStop(0, '#00e5aa');
titleGrad.addColorStop(0.5, '#ffffff');
titleGrad.addColorStop(1, '#00b8ff');
ctx.fillStyle = titleGrad;
ctx.shadowColor = '#00e5aa';
ctx.shadowBlur = 20;
ctx.fillText('QB BOT v2.0', W / 2, 185);
ctx.shadowBlur = 0;

// Subtitle
ctx.font = '16px sans-serif';
ctx.fillStyle = '#4a7a8a';
ctx.letterSpacing = '4px';
ctx.fillText('POWERED BY QURBAN  ●  PAKISTAN 🇵🇰', W / 2, 215);

// Divider
const divGrad = ctx.createLinearGradient(0, 0, W, 0);
divGrad.addColorStop(0, 'transparent');
divGrad.addColorStop(0.2, '#00e5aa');
divGrad.addColorStop(0.8, '#00b8ff');
divGrad.addColorStop(1, 'transparent');
ctx.fillStyle = divGrad;
ctx.fillRect(60, 232, W - 120, 1.5);

// Menu categories
const categories = [
    { icon: '🛠️', title: 'GENERAL', desc: '.menu 1  →  ping, dp, weather, calc, wiki', color: '#00e5aa' },
    { icon: '👥', title: 'GROUP TOOLS', desc: '.menu 2  →  kick, mute, tagall, ginfo', color: '#00b8ff' },
    { icon: '🎮', title: 'FUN & GAMES', desc: '.menu 3  →  joke, dice, 8ball, riddle', color: '#7c3aed' },
    { icon: '🤖', title: 'AI & SEARCH', desc: '.menu 4  →  ask, translate, define, wiki', color: '#f59e0b' },
    { icon: '⚙️', title: 'SETTINGS', desc: '.menu 5  →  autoreact, antilink, antispam', color: '#10b981' },
    { icon: '🛡️', title: 'ADMIN TOOLS', desc: '.menu 6  →  broadcast, block, restart', color: '#ef4444' },
];

categories.forEach((cat, i) => {
    const y = 258 + i * 102;
    const x = 55;
    const cw = W - 110;

    // Card bg
    ctx.fillStyle = 'rgba(13,26,31,0.8)';
    roundRect(ctx, x, y, cw, 86, 12);
    ctx.fill();

    // Left accent bar
    ctx.fillStyle = cat.color;
    ctx.shadowColor = cat.color;
    ctx.shadowBlur = 8;
    roundRect(ctx, x, y, 4, 86, 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Icon bg
    ctx.fillStyle = cat.color + '22';
    roundRect(ctx, x + 16, y + 18, 50, 50, 10);
    ctx.fill();

    // Icon
    ctx.font = '26px serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#fff';
    ctx.fillText(cat.icon, x + 41, y + 50);

    // Title
    ctx.font = 'bold 18px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillStyle = cat.color;
    ctx.fillText(cat.title, x + 78, y + 36);

    // Desc
    ctx.font = '13px sans-serif';
    ctx.fillStyle = '#4a7a8a';
    ctx.fillText(cat.desc, x + 78, y + 58);

    // Number badge
    ctx.fillStyle = cat.color + '33';
    roundRect(ctx, x + cw - 44, y + 28, 30, 30, 8);
    ctx.fill();
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = cat.color;
    ctx.fillText(`${i + 1}`, x + cw - 29, y + 48);

    // Card border
    ctx.strokeStyle = cat.color + '30';
    ctx.lineWidth = 1;
    roundRect(ctx, x, y, cw, 86, 12);
    ctx.stroke();
});

// Bottom divider
ctx.fillStyle = divGrad;
ctx.fillRect(60, H - 80, W - 120, 1.5);

// Footer
ctx.font = '14px sans-serif';
ctx.textAlign = 'center';
ctx.fillStyle = '#4a7a8a';
ctx.fillText('Type  .menu [number]  to open any section', W / 2, H - 50);

ctx.font = 'bold 13px sans-serif';
ctx.fillStyle = '#00e5aa';
ctx.fillText('QB BOT  ●  Qurban  ●  Pakistan 🇵🇰', W / 2, H - 28);

// Save
function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
}

const outPath = path.join(__dirname, 'public', 'menu.png');
const out = fs.createWriteStream(outPath);
const stream = canvas.createPNGStream();
stream.pipe(out);
out.on('finish', () => console.log(`✅ menu.png saved to public/menu.png`));
