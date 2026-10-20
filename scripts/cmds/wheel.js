const fs = require("fs-extra");
const path = require("path");

module.exports = {
  config: {
    name: "wheel",
    version: "6.0",
    author: "𝐒𝐈𝐀𝐌 𝐀𝐇𝐌𝐄𝐃 𝐒𝐀𝐀𝐍",
    role: 0,
    countDown: 18,
    category: "GAMES",
    guide: {
      en: "{pn} <amount>"
    }
  },

  onStart: async ({ message, event, args, usersData, api }) => {
    const { senderID, threadID } = event;

    // =========================
    // MONEY FORMAT
    // =========================
    const formatMoney = (num) => {
      const n = Number(num);

      if (!Number.isFinite(n)) {
        return "∞";
      }

      if (n < 1000) {
        return n.toFixed(0);
      }

      const units = [
        { v: 1e15, s: "Q" },
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
              .replace(/\.00$/, "") + u.s
          );
        }
      }

      return n.toLocaleString();
    };

    // =========================
    // AMOUNT PARSER
    // =========================
    function parseAmount(input) {
      if (!input) {
        return NaN;
      }

      const a = input.toLowerCase().replace(/,/g, "");

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

      if (a.endsWith("q")) {
        return parseFloat(a) * 1e15;
      }

      return parseFloat(a);
    }

    // =========================
    // SETTINGS
    // =========================
    const minBet = 100;
    const maxBet = 150e12; // Maximum: 150T

    const maxSpins = 10;
    const resetTime = 12 * 60 * 60 * 1000;

    const winRate = 55;
    const lossRate = 40;
    const refundRate = 5;

    // =========================
    // BET CHECK
    // =========================
    const betAmount = parseAmount(args[0]);

    if (
      !Number.isFinite(betAmount) ||
      betAmount < minBet
    ) {
      return message.reply(
        `🎡 𝗪𝗛𝗘𝗘𝗟 𝗦𝗣𝗜𝗡\n\n` +
        `❌ Minimum bet: ${formatMoney(minBet)}$\n` +
        `💡 Example: /wheel 1k`
      );
    }

    if (betAmount > maxBet) {
      return message.reply(
        `🚫 𝗠𝗔𝗫𝗜𝗠𝗨𝗠 𝗕𝗘𝗧 𝗥𝗘𝗔𝗖𝗛𝗘𝗗\n\n` +
        `🎯 Maximum bet: ${formatMoney(maxBet)}$\n` +
        `💡 Example: /wheel 150t`
      );
    }

    // =========================
    // USER BALANCE
    // =========================
    let userData = await usersData.get(senderID);

    if (!userData) {
      userData = { money: 0 };
    }

    const currentMoney = Number(userData.money || 0);

    if (
      !Number.isFinite(currentMoney) ||
      currentMoney < betAmount
    ) {
      return message.reply(
        `💸 𝗡𝗢𝗧 𝗘𝗡𝗢𝗨𝗚𝗛 𝗕𝗔𝗟𝗔𝗡𝗖𝗘\n\n` +
        `💳 Balance: ${formatMoney(currentMoney)}$\n` +
        `🎯 Bet: ${formatMoney(betAmount)}$`
      );
    }

    // =========================
    // SPIN LIMIT
    // 10 SPINS THEN 12 HOURS
    // =========================
    if (!global.wheelLimit) {
      global.wheelLimit = {};
    }

    const now = Date.now();

    let limitData = global.wheelLimit[senderID];

    if (!limitData) {
      limitData = {
        count: 0,
        lastReset: now
      };

      global.wheelLimit[senderID] = limitData;
    }

    // Reset after 12 hours from the 10th spin.
    if (
      limitData.count >= maxSpins &&
      now - limitData.lastReset >= resetTime
    ) {
      limitData.count = 0;
      limitData.lastReset = now;
    }

    // Stop spinning if all 10 spins are used.
    if (limitData.count >= maxSpins) {
      const remaining = Math.max(
        0,
        resetTime - (now - limitData.lastReset)
      );

      const hours = Math.floor(
        remaining / (60 * 60 * 1000)
      );

      const minutes = Math.floor(
        (remaining % (60 * 60 * 1000)) / (60 * 1000)
      );

      const seconds = Math.floor(
        (remaining % (60 * 1000)) / 1000
      );

      return message.reply(
        `🚫 𝗪𝗛𝗘𝗘𝗟 𝗟𝗜𝗠𝗜𝗧 𝗥𝗘𝗔𝗖𝗛𝗘𝗗\n\n` +
        `🎲 Spins Used: ${maxSpins}/${maxSpins}\n` +
        `⏳ Time Remaining: ${hours}h ${minutes}m ${seconds}s\n\n` +
        `🔄 Try again after 12 hours.`
      );
    }

    // =========================
    // RESULT SYSTEM
    // WIN 55%
    // LOSS 40%
    // REFUND 5%
    // =========================
    const chance = Math.floor(Math.random() * 100);

    let resultType;
    let multiplier = 0;

    if (chance < winRate) {
      const rewardChance = Math.floor(
        Math.random() * 100
      );

      if (rewardChance < 50) {
        resultType = "2x";
        multiplier = 2;
      } else if (rewardChance < 80) {
        resultType = "3x";
        multiplier = 3;
      } else if (rewardChance < 95) {
        resultType = "5x";
        multiplier = 5;
      } else {
        resultType = "7x";
        multiplier = 7;
      }
    } else if (chance < winRate + lossRate) {
      resultType = "loss";
    } else {
      resultType = "refund";
    }

    // =========================
    // BALANCE CALCULATION
    // =========================
    let finalMoney;
    let statusText;
    let payoutText;
    let outcomeEmoji;

    if (resultType === "loss") {
      finalMoney = currentMoney - betAmount;

      statusText = "NO MATCH FOUND";
      payoutText =
        `Lost: -${formatMoney(betAmount)}$`;
      outcomeEmoji = "💀";
    } else if (resultType === "refund") {
      finalMoney = currentMoney;

      statusText = "REFUND";
      payoutText =
        `Returned: +${formatMoney(betAmount)}$`;
      outcomeEmoji = "🔄";
    } else {
      const bonus = betAmount * multiplier;

      finalMoney = currentMoney + bonus;

      statusText = `WIN (${multiplier}X)`;
      payoutText =
        `Won: +${formatMoney(bonus)}$`;
      outcomeEmoji = "🎉";
    }

    // =========================
    // SAVE BALANCE
    // =========================
    userData.money = finalMoney;

    await usersData.set(senderID, userData);

    // Count completed spin.
    limitData.count++;

    // Start the 12-hour timer when
    // the 10th spin has been completed.
    if (limitData.count === maxSpins) {
      limitData.lastReset = Date.now();
    }

    const spinsLeft = maxSpins - limitData.count;

    // =========================
    // RESULT MESSAGE
    // =========================
    const msgBody =
      `🎡 𝗪𝗛𝗘𝗘𝗟 𝗦𝗣𝗜𝗡\n\n` +
      `${outcomeEmoji} Result: ${statusText}\n` +
      `💰 ${payoutText}\n` +
      `💳 Balance: ${formatMoney(finalMoney)}$\n\n` +
      `🎯 Win Rate: ${winRate}%\n` +
      `🎲 Spins Left: ${spinsLeft}/${maxSpins}`;

    // =========================
    // REACTION
    // =========================
    try {
      api.setMessageReaction(
        "🌀",
        event.messageID,
        () => {},
        true
      );
    } catch (e) {
      console.error("[WHEEL REACTION]", e);
    }

    // =========================
    // SEND RESULT
    // =========================
    try {
      return api.sendMessage(
        msgBody,
        threadID,
        () => {
          try {
            api.setMessageReaction(
              resultType === "loss" ? "❌" : "✅",
              event.messageID,
              () => {},
              true
            );
          } catch (e) {
            console.error("[WHEEL REACTION]", e);
          }
        },
        event.messageID
      );
    } catch (e) {
      console.error("[WHEEL ERROR]", e);
      return message.reply(msgBody);
    }
  }
};
