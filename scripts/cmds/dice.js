module.exports = {
  config: {
    name: "dice",
    version: "2.0",
    author: "Saan",
    role: 0,
    countDown: 8,
    category: "GAMES",
    guide: {
      en: "{pn} <amount> [guess] | guess: 2-12 (optional)"
    }
  },

  onStart: async ({ message, event, args, usersData }) => {
    const { senderID } = event;

    const formatMoney = (num) => {
      const n = Number(num);
      if (!Number.isFinite(n)) return "∞";
      if (n < 1000) return Math.floor(n).toLocaleString();

      const units = [
        { v: 1e12, s: "T" },
        { v: 1e9, s: "B" },
        { v: 1e6, s: "M" },
        { v: 1e3, s: "K" }
      ];

      for (const u of units) {
        if (n >= u.v) {
          return (n / u.v).toFixed(2).replace(/\.00$/, "") + u.s;
        }
      }

      return n.toLocaleString();
    };

    function parseAmount(input) {
      if (!input) return NaN;

      const a = input.toLowerCase().trim();
      const value = parseFloat(a);

      if (!Number.isFinite(value)) return NaN;

      if (a.endsWith("k")) return value * 1e3;
      if (a.endsWith("m")) return value * 1e6;
      if (a.endsWith("b")) return value * 1e9;
      if (a.endsWith("t")) return value * 1e12;

      return Number(a);
    }

    const betAmount = parseAmount(args[0]);
    const minBet = 100;
    const maxBet = 800000000;

    if (!Number.isFinite(betAmount) || betAmount < minBet) {
      return message.reply(
        `🎲 Minimum bet: ${formatMoney(minBet)}$\nExample: /dice 1k 7`
      );
    }

    if (betAmount > maxBet) {
      return message.reply(
        `🚫 Maximum bet: ${formatMoney(maxBet)}$`
      );
    }

    let userData = await usersData.get(senderID);

    if (!userData) {
      userData = { money: 0 };
    }

    const currentMoney = Number(userData.money || 0);

    if (betAmount > currentMoney) {
      return message.reply(
        `💸 Not enough balance!\nBalance: ${formatMoney(currentMoney)}$`
      );
    }

    let guess = parseInt(args[1]);

    if (isNaN(guess) || guess < 2 || guess > 12) {
      guess = Math.floor(Math.random() * 11) + 2;
    }

    // Play limit: 15 plays per 10 hours
    if (!global.diceLimit) global.diceLimit = {};

    const now = Date.now();
    const resetTime = 10 * 60 * 60 * 1000;
    const maxPlays = 15;

    if (
      !global.diceLimit[senderID] ||
      now - global.diceLimit[senderID].lastReset >= resetTime
    ) {
      global.diceLimit[senderID] = {
        count: 0,
        lastReset: now
      };
    }

    const limitData = global.diceLimit[senderID];

    if (limitData.count >= maxPlays) {
      const remaining = resetTime - (now - limitData.lastReset);
      const hours = Math.floor(remaining / 3600000);
      const minutes = Math.floor((remaining % 3600000) / 60000);

      return message.reply(
        `🚫 Daily limit reached!\n` +
        `🎮 Usage: ${limitData.count}/${maxPlays}\n` +
        `⏳ Reset in: ${hours}h ${minutes}m`
      );
    }

    // Roll two dice
    const dice1 = Math.floor(Math.random() * 6) + 1;
    const dice2 = Math.floor(Math.random() * 6) + 1;
    const sum = dice1 + dice2;

    const diceEmojis = ["⚀", "⚁", "⚂", "⚃", "⚄", "⚅"];
    const display = `${diceEmojis[dice1 - 1]} ${diceEmojis[dice2 - 1]} = ${sum}`;

    const win = guess === sum;

    const probabilities = {
      2: 1 / 36,
      3: 2 / 36,
      4: 3 / 36,
      5: 4 / 36,
      6: 5 / 36,
      7: 6 / 36,
      8: 5 / 36,
      9: 4 / 36,
      10: 3 / 36,
      11: 2 / 36,
      12: 1 / 36
    };

    const multiplier = win
      ? Math.round(1 / probabilities[sum])
      : 0;

    const bonus = win ? betAmount * multiplier : 0;

    const finalMoney = win
      ? currentMoney + bonus
      : currentMoney - betAmount;

    userData.money = finalMoney;
    await usersData.set(senderID, userData);

    limitData.count++;

    const status = win
      ? `WIN ${multiplier}x 🎉`
      : "LOSE 💀";

    const resultMsg = win
      ? `🎯 Your guess ${guess} matched the result!`
      : `❌ Your guess: ${guess}\n🎲 Actual result: ${sum}`;

    const replyMsg =
`🎲 𝗦𝗔𝗔𝗡 𝗗𝗜𝗖𝗘 𝗚𝗔𝗠𝗘
━━━━━━━━━━━━━━━━━━
🎲 Dice: ${display}

🎯 Guess: ${guess}
📢 Result: ${status}

${resultMsg}

💰 ${win ? "Won: " + formatMoney(bonus) : "Lost: " + formatMoney(betAmount)}$
💳 Balance: ${formatMoney(finalMoney)}$

📊 Usage: ${limitData.count}/${maxPlays}
⏳ Reset: 10 Hours
━━━━━━━━━━━━━━━━━━
⚡ 𝐒𝐀𝐀𝐍 𝐄𝐗𝐇𝐀𝐔𝐒𝐓𝐄𝐃`;

    return message.reply(replyMsg);
  }
};