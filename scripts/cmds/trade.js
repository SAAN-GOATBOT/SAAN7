// ============================================
// TRADE LIMIT STORAGE
// ============================================
if (!global.tradeLimitData) {
  global.tradeLimitData = new Map();
}

module.exports = {
  config: {
    name: "trade",
    aliases: ["quotex", "qx"],
    version: "3.8",
    author: "𝐒𝐈𝐀𝐌 𝐀𝐇𝐌𝐄𝐃 𝐒𝐀𝐀𝐍",
    countDown: 13,
    role: 0,
    shortDescription: "Binary Options Trading Game",
    longDescription: "Predict market movement (up/down) and win virtual money.",
    category: "GAMES",
    guide: "{pn} <amount> <up/down>"
  },

  onStart: async function ({ api, event, args, usersData, message }) {
    const { senderID } = event;

    // ============================================
    // SETTINGS
    // ============================================
    const MIN_BET = 10;
    const MAX_BET = 900e6; // 900M
    const TRADE_LIMIT = 15;
    const RESET_TIME = 12 * 60 * 60 * 1000; // 12 hours
    const WIN_RATE = 65;
    const PAYOUT = 1.85;

    // ============================================
    // FORMAT MONEY
    // ============================================
    const formatMoney = (num) => {
      const n = Number(num);

      if (n === Infinity || isNaN(n)) {
        return "∞";
      }

      if (n < 1000) {
        return n.toFixed(0);
      }

      const units = [
        { v: 1e12, s: "T" },
        { v: 1e9, s: "B" },
        { v: 1e6, s: "M" },
        { v: 1e3, s: "K" }
      ];

      for (const u of units) {
        if (n >= u.v) {
          return (
            (n / u.v)
              .toFixed(2)
              .replace(/\.00$/, "")
          ) + u.s;
        }
      }

      return n.toLocaleString();
    };

    // ============================================
    // PARSE AMOUNT
    // ============================================
    const parseAmount = (input) => {
      if (!input) {
        return NaN;
      }

      const a = input
        .toLowerCase()
        .trim();

      if (a.endsWith("k")) {
        return parseFloat(a) * 1e3;
      }

      if (a.endsWith("m")) {
        return parseFloat(a) * 1e6;
      }

      if (a.endsWith("b")) {
        return parseFloat(a) * 1e9;
      }

      if (a.endsWith("t")) {
        return parseFloat(a) * 1e12;
      }

      return parseInt(a);
    };

    // ============================================
    // FORMAT CHECK
    // ============================================
    if (args.length < 2) {
      return message.reply(
        "⚠️ Invalid format!\n" +
        "Example: /trade 1k up\n" +
        "Example: /trade 5m down"
      );
    }

    const betAmount = parseAmount(args[0]);
    const prediction = args[1].toLowerCase();

    // ============================================
    // MINIMUM BET
    // ============================================
    if (
      isNaN(betAmount) ||
      betAmount < MIN_BET
    ) {
      return message.reply(
        `🎰 Minimum trade is $${formatMoney(MIN_BET)}`
      );
    }

    // ============================================
    // MAXIMUM BET
    // ============================================
    if (betAmount > MAX_BET) {
      return message.reply(
        `🚫 Maximum trade limit is $${formatMoney(MAX_BET)}`
      );
    }

    // ============================================
    // PREDICTION CHECK
    // ============================================
    if (
      prediction !== "up" &&
      prediction !== "down" &&
      prediction !== "call" &&
      prediction !== "put"
    ) {
      return message.reply(
        "⚠️ Please predict either 'up' (Call) or 'down' (Put)!"
      );
    }

    // ============================================
    // GET USER DATA
    // ============================================
    let userData = await usersData.get(senderID);

    if (!userData) {
      userData = {
        money: 0
      };
    }

    const balance = Number(
      userData.money || 0
    );

    // ============================================
    // BALANCE CHECK
    // ============================================
    if (betAmount > balance) {
      return message.reply(
        `💸 Not enough balance!\n` +
        `Balance: $${formatMoney(balance)}`
      );
    }

    // ============================================
    // CURRENT TIME
    // ============================================
    const now = Date.now();

    // ============================================
    // GET TRADE DATA FROM MAP
    // ============================================
    let tradeData =
      global.tradeLimitData.get(senderID);

    // ============================================
    // FIRST TRADE
    // ============================================
    if (!tradeData) {
      tradeData = {
        count: 0,
        resetAt: now + RESET_TIME
      };
    }

    // ============================================
    // 12 HOUR RESET
    // ============================================
    if (
      now >= tradeData.resetAt
    ) {
      tradeData = {
        count: 0,
        resetAt: now + RESET_TIME
      };
    }

    // ============================================
    // 15 TRADE LIMIT CHECK
    // ============================================
    if (
      tradeData.count >= TRADE_LIMIT
    ) {
      const remaining =
        tradeData.resetAt - now;

      const hours = Math.floor(
        remaining /
        (60 * 60 * 1000)
      );

      const minutes = Math.floor(
        (remaining %
          (60 * 60 * 1000)) /
        (60 * 1000)
      );

      return message.reply(
        `🚫 𝗧𝗥𝗔𝗗𝗘 𝗟𝗜𝗠𝗜𝗧 𝗥𝗘𝗔𝗖𝗛𝗘𝗗\n` +
        `━━━━━━━━━━━━━━━━━━━━━━\n` +
        `📊 Used: ${TRADE_LIMIT}/${TRADE_LIMIT}\n` +
        `⏳ Reset in: ${hours}h ${minutes}m\n` +
        `🔒 You cannot trade again until the limit resets.`
      );
    }

    // ============================================
    // ADD ONE TRADE
    // ============================================
    tradeData.count++;

    // ============================================
    // SAVE UPDATED DATA TO MAP
    // ============================================
    global.tradeLimitData.set(
      senderID,
      tradeData
    );

    // ============================================
    // DIRECTION
    // ============================================
    const isCall =
      prediction === "up" ||
      prediction === "call";

    const dirText = isCall
      ? "🟢 CALL (UP)"
      : "🔴 PUT (DOWN)";

    // ============================================
    // START MESSAGE
    // ============================================
    const sentMsg =
      await message.reply(
        `📊 𝗤𝗨𝗢𝗧𝗘 𝗧𝗥𝗔𝗗𝗘 𝗦𝗧𝗔𝗥𝗧𝗘𝗗\n` +
        `━━━━━━━━━━━━━━━━━━━━━━\n` +
        `🎯 Direction: ${dirText}\n` +
        `💰 Investment: $${formatMoney(betAmount)}\n` +
        `📊 Trade: ${tradeData.count}/${TRADE_LIMIT}\n` +
        `⏳ Status: Analyzing Market Trends...`
      );

    // ============================================
    // MARKET RESULT
    // ============================================
    setTimeout(async () => {
      try {
        const randomNumber =
          Math.floor(
            Math.random() * 100
          );

        // ========================================
        // 65% WIN CHANCE
        // ========================================
        const isWin =
          randomNumber < WIN_RATE;

        let finalMoney = balance;
        let resultText = "";

        // ========================================
        // WIN
        // ========================================
        if (isWin) {
          const profit =
            Math.floor(
              betAmount *
              (PAYOUT - 1)
            );

          finalMoney =
            balance + profit;

          userData.money =
            finalMoney;

          await usersData.set(
            senderID,
            userData
          );

          resultText =
            `🎉 𝗜𝗧𝗠 (𝗜𝗡 𝗧𝗛𝗘 𝗠𝗢𝗡𝗘𝗬)\n` +
            `━━━━━━━━━━━━━━━━━━━━━━\n` +
            `📈 Result: ${
              isCall
                ? "UP 🟢"
                : "DOWN 🔴"
            } ✅\n` +
            `💰 Profit: +$${formatMoney(profit)}\n` +
            `💳 Balance: $${formatMoney(finalMoney)}\n` +
            `📊 Trades: ${tradeData.count}/${TRADE_LIMIT}`;
        }

        // ========================================
        // LOSS
        // ========================================
        else {
          finalMoney =
            balance - betAmount;

          userData.money =
            finalMoney;

          await usersData.set(
            senderID,
            userData
          );

          resultText =
            `💀 𝗢𝗧𝗠 (𝗢𝗨𝗧 𝗢𝗙 𝗧𝗛𝗘 𝗠𝗢𝗡𝗘𝗬)\n` +
            `━━━━━━━━━━━━━━━━━━━━━━\n` +
            `📉 Result: ${
              isCall
                ? "DOWN 🔴"
                : "UP 🟢"
            } ❌\n` +
            `📉 Loss: -$${formatMoney(betAmount)}\n` +
            `💳 Balance: $${formatMoney(finalMoney)}\n` +
            `📊 Trades: ${tradeData.count}/${TRADE_LIMIT}`;
        }

        // ========================================
        // DELETE START MESSAGE
        // ========================================
        if (
          sentMsg &&
          sentMsg.messageID
        ) {
          try {
            await api.unsendMessage(
              sentMsg.messageID
            );
          } catch (e) {}
        }

        // ========================================
        // SEND RESULT
        // ========================================
        return message.reply(
          resultText
        );

      } catch (error) {
        console.error(
          "Trade Error:",
          error
        );

        if (
          sentMsg &&
          sentMsg.messageID
        ) {
          try {
            await api.unsendMessage(
              sentMsg.messageID
            );
          } catch (e) {}
        }

        return message.reply(
          "❌ An error occurred while processing your trade."
        );
      }
    }, 7000);
  }
};