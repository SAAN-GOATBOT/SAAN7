module.exports = {
  config: {
    name: "trade",
    aliases: ["quotex", "qx"],
    version: "3.7",
    author: "Saan",
    countDown: 13,
    role: 0,
    shortDescription: "Binary Options Trading Game",
    longDescription: "Predict market movement (up/down) and win virtual money.",
    category: "GAMES",
    guide: "{pn} <amount> <up/down>"
  },

  onStart: async function ({ api, event, args, usersData, message }) {
    const { senderID } = event;

    const formatMoney = (num) => {
      const n = Number(num);
      if (!Number.isFinite(n)) return "∞";
      if (n < 1000) return n.toLocaleString("en-US");

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

      return n.toLocaleString("en-US");
    };

    function parseAmount(input) {
      if (!input) return NaN;

      const a = input.toLowerCase().replace(/,/g, "");
      const match = a.match(/^(\d+(?:\.\d+)?)([kmbt]?)$/);

      if (!match) return NaN;

      const value = parseFloat(match[1]);
      const suffix = match[2];

      const multipliers = {
        "": 1,
        k: 1e3,
        m: 1e6,
        b: 1e9,
        t: 1e12
      };

      return value * multipliers[suffix];
    }

    const minBet = 10;
    const maxBet = 1e9;
    const tradeLimit = 15;
    const resetTime = 12 * 60 * 60 * 1000;

    // Per-user trade limit; stored globally while the bot process runs.
    if (!global.tradeLimits) global.tradeLimits = {};

    const now = Date.now();
    let userLimit = global.tradeLimits[senderID];

    if (!userLimit || now - userLimit.startTime >= resetTime) {
      userLimit = {
        count: 0,
        startTime: now
      };
      global.tradeLimits[senderID] = userLimit;
    }

    if (userLimit.count >= tradeLimit) {
      const remaining = resetTime - (now - userLimit.startTime);
      const hours = Math.floor(remaining / 3600000);
      const minutes = Math.floor((remaining % 3600000) / 60000);

      return message.reply(
        `⏳ 𝗧𝗥𝗔𝗗𝗘 𝗟𝗜𝗠𝗜𝗧 𝗥𝗘𝗔𝗖𝗛𝗘𝗗\n` +
        `━━━━━━━━━━━━━━━━━━━━━━\n` +
        `📊 Trades Used: ${tradeLimit}/${tradeLimit}\n` +
        `🔄 Reset In: ${hours}h ${minutes}m\n` +
        `━━━━━━━━━━━━━━━━━━━━━━\n` +
        `💎 Please come back after the reset.`
      );
    }

    if (args.length < 2) {
      return message.reply(
        `⚠️ 𝗜𝗡𝗩𝗔𝗟𝗜𝗗 𝗙𝗢𝗥𝗠𝗔𝗧\n` +
        `━━━━━━━━━━━━━━━━━━━━━━\n` +
        `📌 Example: /trade 1k up\n` +
        `📌 Example: /trade 5m down`
      );
    }

    const betAmount = parseAmount(args[0]);
    const prediction = args[1].toLowerCase();

    if (!Number.isFinite(betAmount) || betAmount < minBet) {
      return message.reply(
        `🎰 Minimum trade: $${formatMoney(minBet)}`
      );
    }

    if (betAmount > maxBet) {
      return message.reply(
        `🚫 Maximum trade: $${formatMoney(maxBet)}`
      );
    }

    if (!["up", "down", "call", "put"].includes(prediction)) {
      return message.reply(
        `⚠️ Predict either UP (CALL) or DOWN (PUT)!`
      );
    }

    const userData = await usersData.get(senderID);

    if (!userData) {
      return message.reply("💸 User data not found. Please try again.");
    }

    const balance = Number(userData.money || 0);

    if (!Number.isFinite(balance) || balance < betAmount) {
      return message.reply(
        `💸 𝗜𝗡𝗦𝗨𝗙𝗙𝗜𝗖𝗜𝗘𝗡𝗧 𝗕𝗔𝗟𝗔𝗡𝗖𝗘\n` +
        `━━━━━━━━━━━━━━━━━━━━━━\n` +
        `💳 Balance: $${formatMoney(balance)}\n` +
        `🎯 Investment: $${formatMoney(betAmount)}`
      );
    }

    // Count this trade only after all validation succeeds.
    userLimit.count++;

    const isCall = prediction === "up" || prediction === "call";
    const dirText = isCall ? "🟢 CALL (UP)" : "🔴 PUT (DOWN)";

    const sentMsg = await message.reply(
      `📊 𝗤𝗨𝗢𝗧𝗘 𝗧𝗥𝗔𝗗𝗘 𝗦𝗧𝗔𝗥𝗧𝗘𝗗\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n` +
      `🎯 Direction: ${dirText}\n` +
      `💰 Investment: $${formatMoney(betAmount)}\n` +
      `📈 Trade: ${userLimit.count}/${tradeLimit}\n` +
      `⏳ Status: Analyzing Market Trends...`
    );

    setTimeout(async () => {
      try {
        const winChance = Math.floor(Math.random() * 100);
        const isWin = winChance < 70;
        const payoutMultiplier = 1.85;

        let finalMoney;
        let resultText;

        // Fetch the latest balance before applying the result.
        const latestUserData = await usersData.get(senderID);

        if (!latestUserData) {
          return message.reply("⚠️ Could not retrieve your account data.");
        }

        const latestBalance = Number(latestUserData.money || 0);

        if (isWin) {
          const profit = Math.floor(betAmount * (payoutMultiplier - 1));
          finalMoney = latestBalance + profit;
          latestUserData.money = finalMoney;

          await usersData.set(senderID, latestUserData);

          resultText =
            `🎉 𝗜𝗧𝗠 (𝗜𝗡 𝗧𝗛𝗘 𝗠𝗢𝗡𝗘𝗬)\n` +
            `━━━━━━━━━━━━━━━━━━━━━━\n` +
            `📈 Result: ${isCall ? "UP 🟢" : "DOWN 🔴"} ✅\n` +
            `💰 Profit: +$${formatMoney(profit)}\n` +
            `💳 Balance: $${formatMoney(finalMoney)}\n` +
            `📊 Trades: ${userLimit.count}/${tradeLimit}`;
        } else {
          finalMoney = Math.max(0, latestBalance - betAmount);
          latestUserData.money = finalMoney;

          await usersData.set(senderID, latestUserData);

          resultText =
            `💀 𝗢𝗧𝗠 (𝗢𝗨𝗧 𝗢𝗙 𝗧𝗛𝗘 𝗠𝗢𝗡𝗘𝗬)\n` +
            `━━━━━━━━━━━━━━━━━━━━━━\n` +
            `📉 Result: ${isCall ? "DOWN 🔴" : "UP 🟢"} ❌\n` +
            `📉 Loss: -$${formatMoney(betAmount)}\n` +
            `💳 Balance: $${formatMoney(finalMoney)}\n` +
            `📊 Trades: ${userLimit.count}/${tradeLimit}`;
        }

        if (sentMsg && sentMsg.messageID) {
          try {
            await api.unsendMessage(sentMsg.messageID);
          } catch (e) {}
        }

        return message.reply(resultText);
      } catch (error) {
        console.error("[TRADE ERROR]", error);

        return message.reply(
          "⚠️ An error occurred while processing your trade. Please contact the bot administrator."
        );
      }
    }, 7000);
  }
};