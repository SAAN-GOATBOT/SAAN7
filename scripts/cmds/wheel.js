module.exports = {
config: {
name: "wheel",
version: "6.0",
author: "Saan",
role: 0,
countDown: 18,
category: "GAMES",
guide: {
en: "{pn} <amount>"
}
},

onStart: async ({ message, event, args, usersData, api }) => {
const { senderID, threadID, messageID } = event;

const formatMoney = (num) => {
  const n = Number(num);

  if (!Number.isFinite(n)) return "∞";

  if (n >= 1e12)
    return (n / 1e12).toFixed(2).replace(/\.00$/, "") + "T";

  if (n >= 1e9)
    return (n / 1e9).toFixed(2).replace(/\.00$/, "") + "B";

  if (n >= 1e6)
    return (n / 1e6).toFixed(2).replace(/\.00$/, "") + "M";

  if (n >= 1e3)
    return (n / 1e3).toFixed(2).replace(/\.00$/, "") + "K";

  return Math.floor(n).toLocaleString("en-US");
};

const parseAmount = (input) => {
  if (!input) return NaN;

  const value = input.toLowerCase().trim();
  const match = value.match(/^(\d+(?:\.\d+)?)([kmbt])?$/);

  if (!match) return NaN;

  const number = parseFloat(match[1]);

  const multipliers = {
    k: 1e3,
    m: 1e6,
    b: 1e9,
    t: 1e12
  };

  return number * (multipliers[match[2]] || 1);
};

const minBet = 100;
const maxBet = 150e12;
const maxSpins = 10;
const resetTime = 12 * 60 * 60 * 1000;

const betAmount = parseAmount(args[0]);

if (!Number.isFinite(betAmount) || betAmount < minBet) {
  return message.reply(
    `🎡 𝗪𝗛𝗘𝗘𝗟 𝗦𝗣𝗜𝗡\n` +
    `━━━━━━━━━━━━━━━━━━\n\n` +
    `💰 Minimum Bet: 100$\n` +
    `📌 Example: /wheel 5m`
  );
}

if (betAmount > maxBet) {
  return message.reply(
    `🚫 Maximum Bet: ${formatMoney(maxBet)}$`
  );
}

let userData = await usersData.get(senderID);

if (!userData) {
  userData = { money: 0 };
}

const currentMoney = Number(userData.money || 0);

if (!Number.isFinite(currentMoney) || currentMoney < betAmount) {
  return message.reply(
    `💸 𝗜𝗡𝗦𝗨𝗙𝗙𝗜𝗖𝗜𝗘𝗡𝗧 𝗕𝗔𝗟𝗔𝗡𝗖𝗘\n` +
    `━━━━━━━━━━━━━━━━━━\n\n` +
    `💳 Balance: ${formatMoney(currentMoney)}$\n` +
    `🎯 Bet: ${formatMoney(betAmount)}$`
  );
}

// Spin Limit & Statistics
if (!global.wheelLimit) {
  global.wheelLimit = {};
}

const now = Date.now();

if (
  !global.wheelLimit[senderID] ||
  now - global.wheelLimit[senderID].lastReset >= resetTime
) {
  global.wheelLimit[senderID] = {
    count: 0,
    wins: 0,
    lastReset: now
  };
}

const playerLimit = global.wheelLimit[senderID];

// Compatibility
if (!Number.isFinite(playerLimit.count)) {
  playerLimit.count = 0;
}

if (!Number.isFinite(playerLimit.wins)) {
  playerLimit.wins = 0;
}

if (playerLimit.count >= maxSpins) {
  const remaining = Math.ceil(
    (resetTime - (now - playerLimit.lastReset)) / 60000
  );

  const hours = Math.floor(remaining / 60);
  const minutes = remaining % 60;

  return message.reply(
    `🚫 𝗦𝗣𝗜𝗡 𝗟𝗜𝗠𝗜𝗧 𝗥𝗘𝗔𝗖𝗛𝗘𝗗\n` +
    `━━━━━━━━━━━━━━━━━━\n\n` +
    `🎡 Spins: ${maxSpins}/${maxSpins}\n` +
    `⏳ Available in: ${hours}h ${minutes}m`
  );
}

// Winning System
const winChance = Math.random() * 100;

const win = winChance < 55;

let multiplier = 0;

if (win) {
  const roll = Math.random() * 100;

  if (roll < 50) {
    multiplier = 2;
  } else if (roll < 80) {
    multiplier = 3;
  } else if (roll < 95) {
    multiplier = 5;
  } else {
    multiplier = 7;
  }
}

// Calculate Money
const bonus = win ? betAmount * multiplier : 0;

const finalMoney = win
  ? currentMoney + bonus
  : currentMoney - betAmount;

userData.money = finalMoney;

await usersData.set(senderID, userData);

// Update Statistics
playerLimit.count++;

if (win) {
  playerLimit.wins++;
}

// Dynamic Win Rate
const winRate = (
  (playerLimit.wins / playerLimit.count) * 100
).toFixed(0);

// Result
const resultText = win
  ? `🎉 𝗪𝗜𝗡 (${multiplier}𝗫)`
  : `💀 𝗬𝗢𝗨 𝗟𝗢𝗦𝗧`;

const payoutText = win
  ? `🤑 Won: +${formatMoney(bonus)}$`
  : `💸 Lost: -${formatMoney(betAmount)}$`;

// Premium Message
const msgBody =
  `🎡 𝗪𝗛𝗘𝗘𝗟 𝗦𝗣𝗜𝗡\n` +
  `━━━━━━━━━━━━━━━━━━\n\n` +
  `${resultText}\n\n` +
  `🎯 Bet: ${formatMoney(betAmount)}$\n` +
  `${payoutText}\n` +
  `💳 Balance: ${formatMoney(finalMoney)}$\n\n` +
  `━━━━━━━━━━━━━━━━━━\n` +
  `🏆 Win Rate: ${winRate}%\n` +
  `🎮 Spins: ${playerLimit.count}/${maxSpins}\n` +
  `━━━━━━━━━━━━━━━━━━`;

// Reaction
api.setMessageReaction(
  win ? "🎉" : "💀",
  messageID,
  () => {},
  true
);

return api.sendMessage(
  msgBody,
  threadID,
  () => {},
  messageID
);

}
};