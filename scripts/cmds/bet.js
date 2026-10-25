module.exports = {
  config: {
    name: "bet",
    version: "12.0",
    author: "Saan",
    role: 0,
    countDown: 10,
    category: "GAMES",
    shortDescription: {
      en: "Premium betting game"
    },
    longDescription: {
      en: "Bet your balance and try your luck."
    },
    guide: {
      en: "{pn} <amount/all>"
    }
  },

  langs: {
    en: {
      invalid_amount:
        "╭━━━〔 🎰 𝐁𝐄𝐓 〕━━━╮\n" +
        "┃ ❌ Invalid amount!\n" +
        "┃ 💰 Minimum: 1K\n" +
        "┃ 🎯 Example: /bet 100k\n" +
        "╰━━━━━━━━━━━━━━━━╯",

      not_enough_money:
        "╭━━━〔 💸 𝐋𝐎𝐖 𝐁𝐀𝐋𝐀𝐍𝐂𝐄 〕━━━╮\n" +
        "┃ 💳 Balance: %1$\n" +
        "┃ ❌ Insufficient funds!\n" +
        "╰━━━━━━━━━━━━━━━━━━━━╯",

      max_bet:
        "🚫 Maximum bet: 1000T$",

      limit_reached:
        "╭━━━〔 🎰 𝐁𝐄𝐓 〕━━━╮\n" +
        "┃ ❌ You've used all 15 plays.\n" +
        "┃ 🎮 Try again later.\n" +
        "╰━━━━━━━━━━━━━━━━╯",

      spinning:
        "╭━━━〔 🎰 𝐁𝐄𝐓 〕━━━╮\n" +
        "┃ 🎲 Rolling your luck...\n" +
        "┃ ✨ Good luck!\n" +
        "╰━━━━━━━━━━━━━━━━╯",

      win:
        "╭━━━〔 🏆 𝐁𝐄𝐓 𝐖𝐈𝐍 〕━━━╮\n" +
        "┃ ✨ Result: WINNER\n" +
        "┃ 🎯 Multiplier: %1x\n" +
        "┃ 💰 Profit: +%2$\n" +
        "┃ 💳 Balance: %3$\n" +
        "┃ 🎮 Plays: %4/15\n" +
        "╰━━━━━━━━━━━━━━━━━━╯\n" +
        "〲 𝐒𝐀𝐀𝐍 𝐄𝐗𝐇𝐀𝐔𝐒𝐓𝐄𝐃 〲",

      jackpot:
        "╭━━━〔 💎 𝐉𝐀𝐂𝐊𝐏𝐎𝐓 〕━━━╮\n" +
        "┃ 🔥 LEGENDARY WIN!\n" +
        "┃ 🎯 Multiplier: 50x\n" +
        "┃ 💰 Reward: +%1$\n" +
        "┃ 💳 Balance: %2$\n" +
        "┃ 🎮 Plays: %3/15\n" +
        "╰━━━━━━━━━━━━━━━━━━╯\n" +
        "〲 𝐒𝐀𝐀𝐍 𝐄𝐗𝐇𝐀𝐔𝐒𝐓𝐄𝐃 〲",

      lose:
        "╭━━━〔 💔 𝐁𝐄𝐓 𝐋𝐎𝐒𝐒 〕━━━╮\n" +
        "┃ 💀 Result: YOU LOST\n" +
        "┃ 💸 Lost: -%1$\n" +
        "┃ 💳 Balance: %2$\n" +
        "┃ 🎮 Plays: %3/15\n" +
        "╰━━━━━━━━━━━━━━━━━━╯\n" +
        "〲 𝐒𝐀𝐀𝐍 𝐄𝐗𝐇𝐀𝐔𝐒𝐓𝐄𝐃 〲"
    }
  },

  onStart: async function ({ args, message, event, usersData, api, getLang }) {
    const { senderID, threadID } = event;

    const format = (n) => {
      n = Number(n);

      if (!Number.isFinite(n)) return "∞";

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

      return n.toLocaleString("en-US", {
        maximumFractionDigits: 2
      });
    };

    const userData = await usersData.get(senderID);

    if (!userData) {
      return message.reply("⚠️ User data not found.");
    }

    const balance = Number(userData.money || 0);
    const input = args[0]?.toLowerCase();

    if (!input) {
      return message.reply(
        "🎰 𝐁𝐄𝐓 𝐆𝐀𝐌𝐄\n\n" +
        "➤ /bet 1k\n" +
        "➤ /bet 100k\n" +
        "➤ /bet all"
      );
    }

    function parseAmount(str, userBalance) {
      if (str === "all") return userBalance;

      const match = str.match(/^(\d+(?:\.\d+)?)([kmbt])?$/);

      if (!match) return NaN;

      const units = {
        k: 1e3,
        m: 1e6,
        b: 1e9,
        t: 1e12
      };

      return Number(match[1]) * (units[match[2]] || 1);
    }

    const bet = parseAmount(input, balance);
    const minBet = 1000;
    const maxBet = 1000e12;

    if (!Number.isFinite(bet) || bet < minBet) {
      return message.reply(getLang("invalid_amount"));
    }

    if (bet > maxBet) {
      return message.reply(getLang("max_bet"));
    }

    if (bet > balance) {
      return message.reply(getLang("not_enough_money", format(balance)));
    }

    if (!global.betLimit) global.betLimit = {};

    const now = Date.now();
    const resetDuration = 12 * 60 * 60 * 1000;
    let betData = global.betLimit[senderID];

    if (!betData || now - betData.lastReset >= resetDuration) {
      betData = {
        count: 0,
        lastReset: now
      };

      global.betLimit[senderID] = betData;
    }

    const maxPlays = 15;

    if (betData.count >= maxPlays) {
      return message.reply(getLang("limit_reached"));
    }

    betData.count++;

    const loader = await message.reply(getLang("spinning"));

    try {
      await new Promise(resolve => setTimeout(resolve, 1000));

      const roll = Math.random() * 100;
      let finalBalance;
      let result;

      if (roll < 1) {
        // 1% Jackpot chance.
        const reward = bet * 50;

        finalBalance = balance + reward;

        result = getLang(
          "jackpot",
          format(reward),
          format(finalBalance),
          betData.count
        );
      } else if (roll < 61) {
        // 60% regular win chance.
        const multiplier = Number(
          (1.2 + Math.random() * 0.8).toFixed(1)
        );

        const profit = Math.floor(bet * (multiplier - 1));

        finalBalance = balance + profit;

        result = getLang(
          "win",
          multiplier.toFixed(1),
          format(profit),
          format(finalBalance),
          betData.count
        );
      } else {
        // 39% loss chance.
        finalBalance = balance - bet;

        result = getLang(
          "lose",
          format(bet),
          format(finalBalance),
          betData.count
        );
      }

      userData.money = finalBalance;

      await usersData.set(senderID, userData);

      return api.editMessage(result, loader.messageID, threadID);
    } catch (error) {
      console.error("[BET ERROR]", error);

      return message.reply("⚠️ An error occurred while processing your bet.");
    }
  }
};