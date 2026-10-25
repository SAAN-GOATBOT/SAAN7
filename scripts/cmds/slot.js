module.exports = {
config: {
name: "slot",
version: "10.0",
author: "Saan",
role: 0,
countDown: 8,
category: "GAMES",
guide: {
en: "{pn} <amount>"
}
},

onStart: async ({ message, event, args, usersData }) => {
const { senderID } = event;

const formatMoney = (num) => {
  const n = Number(num);

  if (!Number.isFinite(n)) return "∞";

  if (Math.abs(n) < 1000) {
    return n.toLocaleString("en-US", {
      maximumFractionDigits: 2
    });
  }

  const units = [
    { v: 1e12, s: "T" },
    { v: 1e9, s: "B" },
    { v: 1e6, s: "M" },
    { v: 1e3, s: "K" }
  ];

  for (const u of units) {
    if (Math.abs(n) >= u.v) {
      return (n / u.v)
        .toFixed(2)
        .replace(/\.00$/, "")
        .replace(/(\.\d)0$/, "$1") + u.s;
    }
  }

  return n.toLocaleString("en-US");
};

function parseAmount(input) {
  if (!input) return NaN;

  const value = input.toLowerCase().replace(/,/g, "").trim();
  const match = value.match(/^(\d+(?:\.\d+)?)(k|m|b|t)?$/);

  if (!match) return NaN;

  const number = Number(match[1]);

  const multipliers = {
    k: 1e3,
    m: 1e6,
    b: 1e9,
    t: 1e12
  };

  return number * (multipliers[match[2]] || 1);
}

const betAmount = parseAmount(args[0]);
const minBet = 100;
const maxBet = 500e9;
const maxSpins = 15;
const resetDuration = 12 * 60 * 60 * 1000;

if (!Number.isFinite(betAmount) || betAmount < minBet) {
  return message.reply(
    `🎰 𝗦𝗟𝗢𝗧 𝗠𝗔𝗖𝗛𝗜𝗡𝗘\n` +
    `╭────────────────╮\n` +
    `│ 💰 Minimum: 100$\n` +
    `│ 💎 Maximum: 500B$\n` +
    `│ 🎯 Example: /slot 1k\n` +
    `╰────────────────╯`
  );
}

if (betAmount > maxBet) {
  return message.reply(
    `🚫 𝗕𝗘𝗧 𝗟𝗜𝗠𝗜𝗧\n` +
    `💰 Maximum Bet: ${formatMoney(maxBet)}$`
  );
}

const userData = await usersData.get(senderID);

if (!userData) {
  return message.reply("⚠️ User data not found. Please try again.");
}

const currentMoney = Number(userData.money || 0);

if (!Number.isFinite(currentMoney) || currentMoney < betAmount) {
  return message.reply(
    `💸 𝗟𝗢𝗪 𝗕𝗔𝗟𝗔𝗡𝗖𝗘\n` +
    `💳 Balance: ${formatMoney(currentMoney)}$\n` +
    `🎯 Bet: ${formatMoney(betAmount)}$`
  );
}

if (!global.slotLimit) {
  global.slotLimit = {};
}

const now = Date.now();
let slotData = global.slotLimit[senderID];

if (!slotData || now - slotData.lastReset >= resetDuration) {
  slotData = {
    count: 0,
    wins: 0,
    lastReset: now
  };

  global.slotLimit[senderID] = slotData;
}

// Compatibility with existing slot counters.
if (!Number.isFinite(slotData.count)) slotData.count = 0;
if (!Number.isFinite(slotData.wins)) slotData.wins = 0;

if (slotData.count >= maxSpins) {
  return message.reply(
    `🎰 𝗦𝗟𝗢𝗧 𝗠𝗔𝗖𝗛𝗜𝗡𝗘\n` +
    `╭────────────────╮\n` +
    `│ ❌ All 15 spins used.\n` +
    `│ ⏳ Try again after reset.\n` +
    `╰────────────────╯`
  );
}

const hearts = ["❤️", "💙", "💚", "💛", "💜", "🧡", "🖤", "🤍"];

const isWin = Math.random() * 100 < 65;

let reels = [];
let multiplier = 0;

if (isWin) {
  const roll = Math.random() * 100;

  if (roll < 10) {
    multiplier = 5;
  } else if (roll < 40) {
    multiplier = 3;
  } else {
    multiplier = 1.5;
  }

  const matchCount = multiplier === 5 ? 4 : multiplier === 3 ? 3 : 2;
  const chosenHeart = hearts[Math.floor(Math.random() * hearts.length)];

  reels = Array(matchCount).fill(chosenHeart);

  while (reels.length < 4) {
    const otherHearts = hearts.filter(h => h !== chosenHeart);
    reels.push(otherHearts[Math.floor(Math.random() * otherHearts.length)]);
  }

  for (let i = reels.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [reels[i], reels[j]] = [reels[j], reels[i]];
  }
} else {
  // Ensure all four hearts are different on a loss.
  reels = [...hearts]
    .sort(() => Math.random() - 0.5)
    .slice(0, 4);
}

const winAmount = isWin ? betAmount * multiplier : 0;

const finalMoney = isWin
  ? currentMoney - betAmount + winAmount
  : currentMoney - betAmount;

userData.money = finalMoney;
await usersData.set(senderID, userData);

slotData.count++;

if (isWin) {
  slotData.wins++;
}

const winRate = ((slotData.wins / slotData.count) * 100).toFixed(0);

const resultTitle = isWin
  ? `🏆 𝗪𝗜𝗡𝗡𝗘𝗥 • ${multiplier}X`
  : `💔 𝗟𝗢𝗦𝗘𝗥 • NO MATCH`;

const payoutLine = isWin
  ? `💰 Won: +${formatMoney(winAmount)}$`
  : `💸 Lost: -${formatMoney(betAmount)}$`;

const resultMessage =
  `🎰 𝗦𝗟𝗢𝗧 𝗠𝗔𝗖𝗛𝗜𝗡𝗘\n` +
  `╭────────────────╮\n` +
  `│  ${reels[0]}  ${reels[1]}  ${reels[2]}  ${reels[3]}  │\n` +
  `╰────────────────╯\n` +
  `${resultTitle}\n` +
  `${payoutLine}\n` +
  `💳 Balance: ${formatMoney(finalMoney)}$\n` +
  `🎯 Win Rate: ${winRate}%\n` +
  `🎲 Spins: ${slotData.count}/${maxSpins}`;

return message.reply(resultMessage);

}
};