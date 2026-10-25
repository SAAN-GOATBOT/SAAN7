const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

const GIF_URLS = {
  loss: "https://i.imgur.com/1jkKESg.gif",
  "2x": "https://i.imgur.com/wGVdDKi.gif",
  "3x": "https://i.imgur.com/1EWNoe9.gif",
  "5x": "https://i.imgur.com/8thK7IV.gif",
  "7x": "https://i.imgur.com/bI428mz.gif",
  bonus: "https://i.imgur.com/wGVdDKi.gif"
};

const BRAND = "〲 𝐒𝐀𝐀𝐍 𝐄𝐗𝐇𝐀𝐔𝐒𝐓𝐄𝐃 〲";

module.exports = {
  config: {
    name: "wheel",
    version: "5.0",
    author: "Saan",
    role: 0,
    countDown: 18,
    category: "GAMES",
    guide: {
      en: "{pn} <amount>"
    }
  },

  onStart: async ({ message, event, args, usersData, api }) => {
    const { senderID, threadID } = event;

    const cacheDir = path.join(__dirname, "cache");
    await fs.ensureDir(cacheDir);

    const formatMoney = (num) => {
      const n = Number(num);

      if (!Number.isFinite(n)) return "∞";

      if (Math.abs(n) < 1000) {
        return n.toLocaleString("en-US", {
          maximumFractionDigits: 2
        });
      }

      const units = [
        { value: 1e12, suffix: "T" },
        { value: 1e9, suffix: "B" },
        { value: 1e6, suffix: "M" },
        { value: 1e3, suffix: "K" }
      ];

      for (const unit of units) {
        if (Math.abs(n) >= unit.value) {
          return (
            (n / unit.value)
              .toFixed(2)
              .replace(/\.00$/, "")
              .replace(/(\.\d)0$/, "$1") +
            unit.suffix
          );
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
      const suffix = match[2];

      const multipliers = {
        k: 1e3,
        m: 1e6,
        b: 1e9,
        t: 1e12
      };

      const amount = number * (multipliers[suffix] || 1);

      return Number.isFinite(amount) ? amount : NaN;
    }

    const betAmount = parseAmount(args[0]);
    const minBet = 100;
    const maxBet = 150e12;

    if (!Number.isFinite(betAmount) || betAmount < minBet) {
      return message.reply(
        `╭━━━〔 🎡 𝐖𝐇𝐄𝐄𝐋 〕━━━╮\n` +
        `┃ 💰 Minimum Bet: ${formatMoney(minBet)}$\n` +
        `┃ 🎯 Example: /wheel 1k\n` +
        `╰━━━━━━━━━━━━━━━━━━╯`
      );
    }

    if (betAmount > maxBet) {
      return message.reply(
        `🚫 Maximum Bet: ${formatMoney(maxBet)}$`
      );
    }

    let userData = await usersData.get(senderID);

    if (!userData) {
      return message.reply("⚠️ User data not found. Please try again.");
    }

    const currentMoney = Number(userData.money || 0);

    if (!Number.isFinite(currentMoney) || currentMoney < betAmount) {
      return message.reply(
        `╭━━━〔 💸 𝐋𝐎𝐖 𝐁𝐀𝐋𝐀𝐍𝐂𝐄 〕━━━╮\n` +
        `┃ 💳 Balance: ${formatMoney(currentMoney)}$\n` +
        `┃ 🎯 Bet: ${formatMoney(betAmount)}$\n` +
        `╰━━━━━━━━━━━━━━━━━━━━━━╯`
      );
    }

    if (!global.wheelLimit) {
      global.wheelLimit = {};
    }

    const now = Date.now();
    const resetDuration = 12 * 60 * 60 * 1000;
    let wheelData = global.wheelLimit[senderID];

    if (!wheelData || now - wheelData.lastReset >= resetDuration) {
      wheelData = {
        count: 0,
        lastReset: now
      };

      global.wheelLimit[senderID] = wheelData;
    }

    const maxSpins = 10;

    if (wheelData.count >= maxSpins) {
      return message.reply(
        `╭━━━〔 🎡 𝐖𝐇𝐄𝐄𝐋 〕━━━╮\n` +
        `┃ ❌ Your 10 spins have been used.\n` +
        `┃ ⏳ Try again after your limit resets.\n` +
        `╰━━━━━━━━━━━━━━━━━━╯`
      );
    }

    // Outcome probabilities:
    // 55% win, 40% loss, 5% bonus.
    const roll = Math.random() * 100;

    let winType;
    let multiplier = 0;

    if (roll < 40) {
      winType = "loss";
    } else if (roll < 60) {
      winType = "2x";
      multiplier = 2;
    } else if (roll < 75) {
      winType = "3x";
      multiplier = 3;
    } else if (roll < 85) {
      winType = "5x";
      multiplier = 5;
    } else if (roll < 95) {
      winType = "7x";
      multiplier = 7;
    } else {
      winType = "bonus";
      multiplier = 0.5;
    }

    const win = winType !== "loss";

    // Winning multiplier is the total bonus added to the balance.
    // Loss deducts the bet amount.
    const change = win
      ? betAmount * multiplier
      : -betAmount;

    const finalMoney = currentMoney + change;

    userData.money = finalMoney;

    await usersData.set(senderID, userData);

    wheelData.count++;

    let resultTitle;
    let resultAmount;

    if (winType === "loss") {
      resultTitle = "𝐘𝐎𝐔 𝐋𝐎𝐒𝐓 💔";
      resultAmount = `🔻 Lost: -${formatMoney(betAmount)}$`;
    } else if (winType === "bonus") {
      resultTitle = "𝐁𝐎𝐍𝐔𝐒 𝐖𝐈𝐍 ✨";
      resultAmount = `🎁 Bonus: +${formatMoney(betAmount * multiplier)}$`;
    } else {
      resultTitle = `𝐖𝐈𝐍 ${multiplier}𝐗 🎉`;
      resultAmount = `💰 Won: +${formatMoney(betAmount * multiplier)}$`;
    }

    const msgBody =
      `╭━━━〔 🎡 𝐖𝐇𝐄𝐄𝐋 𝐒𝐏𝐈𝐍 〕━━━╮\n` +
      `┃\n` +
      `┃ ${resultTitle}\n` +
      `┃\n` +
      `┃ 🎯 Bet: ${formatMoney(betAmount)}$\n` +
      `┃ ${resultAmount}\n` +
      `┃ 💳 Balance: ${formatMoney(finalMoney)}$\n` +
      `┃ 🎮 Spins: ${wheelData.count}/${maxSpins}\n` +
      `┃\n` +
      `╰━━━〔 𝐒𝐀𝐀𝐍 〕━━━╯\n` +
      `${BRAND}`;

    const filePath = path.join(
      cacheDir,
      `wheel_${senderID}_${now}.gif`
    );

    try {
      if (typeof api.setMessageReaction === "function") {
        api.setMessageReaction(
          "🌀",
          event.messageID,
          () => {},
          true
        );
      }

      const response = await axios({
        url: GIF_URLS[winType],
        method: "GET",
        responseType: "stream",
        timeout: 20000,
        headers: {
          "User-Agent": "Mozilla/5.0"
        }
      });

      const writer = fs.createWriteStream(filePath);

      response.data.pipe(writer);

      await new Promise((resolve, reject) => {
        writer.on("finish", resolve);
        writer.on("error", reject);
        response.data.on("error", reject);
      });

      await new Promise((resolve, reject) => {
        api.sendMessage(
          {
            body: msgBody,
            attachment: fs.createReadStream(filePath)
          },
          threadID,
          (err) => {
            if (err) reject(err);
            else resolve();
          },
          event.messageID
        );
      });

      if (typeof api.setMessageReaction === "function") {
        api.setMessageReaction(
          "✅",
          event.messageID,
          () => {},
          true
        );
      }
    } catch (error) {
      console.error("[WHEEL ERROR]", error.message);

      try {
        await message.reply(msgBody);
      } catch (replyError) {
        console.error("[WHEEL REPLY ERROR]", replyError.message);
      }
    } finally {
      setTimeout(() => {
        fs.remove(filePath).catch(() => {});
      }, 5000);
    }
  }
};