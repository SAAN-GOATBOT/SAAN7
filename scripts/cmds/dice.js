module.exports = {
  config: {
    name: "dice",
    version: "1.0",
    author: "𝐒𝐈𝐀𝐌 𝐀𝐇𝐌𝐄𝐃 𝐒𝐀𝐀𝐍",
    role: 0,
    countDown: 8,
    category: "GAMES",
    guide: {
      en: "{pn} <amount> [guess]  | guess: 2-12 (optional, random if not given)"
    }
  },

  onStart: async ({ message, event, args, usersData, api }) => {
    const { senderID, threadID } = event;

    const formatMoney = (num) => {
      const n = Number(num);

      if (n === Infinity || isNaN(n)) return "∞";

      if (n < 1000) return n.toFixed(0);

      const units = [
        { v: 1e12, s: "T" },
        { v: 1e9, s: "B" },
        { v: 1e6, s: "M" },
        { v: 1e3, s: "K" }
      ];

      for (let u of units) {
        if (n >= u.v) {
          return (n / u.v)
            .toFixed(2)
            .replace(/\.00$/, "") + u.s;
        }
      }

      return n.toLocaleString();
    };

    function parseAmount(input) {
      if (!input) return NaN;

      let a = input.toLowerCase();

      if (a.endsWith("k")) return parseFloat(a) * 1e3;
      if (a.endsWith("m")) return parseFloat(a) * 1e6;
      if (a.endsWith("b")) return parseFloat(a) * 1e9;
      if (a.endsWith("t")) return parseFloat(a) * 1e12;

      return parseInt(a);
    }

    const betAmount = parseAmount(args[0]);

    const minBet = 100;
    const maxBet = 500000000000; // 500B

    if (isNaN(betAmount) || betAmount < minBet) {
      return message.reply(
        `🎲 Minimum bet is 100$\nExample: /dice 1k 7`
      );
    }

    if (betAmount > maxBet) {
      return message.reply(
        `🚫 Max bet: ${formatMoney(maxBet)}$`
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

    // =========================
    // DICE PLAY LIMIT
    // =========================

    if (!global.diceLimit) {
      global.diceLimit = {};
    }

    const now = Date.now();

    // Reset every 10 hours
    if (
      !global.diceLimit[senderID] ||
      (now - global.diceLimit[senderID].lastReset > 36000000)
    ) {
      global.diceLimit[senderID] = {
        count: 0,
        lastReset: now
      };
    }

    const maxPlays = 15;

    if (global.diceLimit[senderID].count >= maxPlays) {
      return message.reply(
        `🚫 Dice limit reached!\n📊 Limit: ${maxPlays} plays\n⏳ Reset: Every 10 hours`
      );
    }

    // =========================
    // 64.5% WIN RATE
    // =========================

    const winRate = 0.645;
    const win = Math.random() < winRate;

    let dice1;
    let dice2;
    let sum;

    if (win) {
      // Generate dice matching the user's guess
      const possiblePairs = [];

      for (let d1 = 1; d1 <= 6; d1++) {
        for (let d2 = 1; d2 <= 6; d2++) {
          if (d1 + d2 === guess) {
            possiblePairs.push([d1, d2]);
          }
        }
      }

      const pair =
        possiblePairs[
          Math.floor(Math.random() * possiblePairs.length)
        ];

      dice1 = pair[0];
      dice2 = pair[1];
      sum = guess;

    } else {
      // Generate a result different from the guess
      do {
        dice1 = Math.floor(Math.random() * 6) + 1;
        dice2 = Math.floor(Math.random() * 6) + 1;
        sum = dice1 + dice2;
      } while (sum === guess);
    }

    const diceEmojis = [
      "⚀",
      "⚁",
      "⚂",
      "⚃",
      "⚄",
      "⚅"
    ];

    const display =
      `${diceEmojis[dice1 - 1]} ${diceEmojis[dice2 - 1]} = ${sum}`;

    // =========================
    // PAYOUT MULTIPLIER
    // =========================

    let multiplier = 0;

    if (win) {
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

      const prob = probabilities[sum] || 0;

      if (prob > 0) {
        multiplier = Math.round(1 / prob);
      }
    }

    const bonus = win
      ? betAmount * multiplier
      : 0;

    const finalMoney = win
      ? currentMoney + bonus
      : currentMoney - betAmount;

    userData.money = finalMoney;

    await usersData.set(senderID, userData);

    global.diceLimit[senderID].count++;

    const status = win
      ? `WIN ${multiplier}x 🎉`
      : "LOSE 💀";

    const resultMsg = win
      ? `🎯 You guessed ${guess} and it matched!`
      : `❌ You guessed ${guess}, but the sum was ${sum}.`;

    const replyMsg = `🎲 𝗗𝗜𝗖𝗘 𝗚𝗔𝗠𝗘
──────────────
🎲 ${display}
📢 ${status}
${resultMsg}
💰 ${win ? "Won: " + formatMoney(bonus) : "Lost: " + formatMoney(betAmount)}$
💳 Balance: ${formatMoney(finalMoney)}$
📊 Usage: ${global.diceLimit[senderID].count}/${maxPlays}`;

    return message.reply(replyMsg);
  }
};