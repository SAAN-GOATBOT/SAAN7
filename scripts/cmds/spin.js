const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

const GIF_URLS = {
  loss: "https://i.imgur.com/GDNNKbs.gif",
  "1x": "https://i.imgur.com/oQExgHx.gif",
  "2x": "https://i.imgur.com/0AmSYWc.gif",
  "3x": "https://i.imgur.com/urR3V6F.gif",
  "4x": "https://i.imgur.com/RGDTCQ8.gif"
};

module.exports = {
  config: {
    name: "spin",
    version: "3.0",
    author: "Saan",
    role: 0,
    countDown: 16,
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
      if (n < 1000) return n.toLocaleString("en-US");

      const units = [
        { v: 1e12, s: "T" },
        { v: 1e9, s: "B" },
        { v: 1e6, s: "M" },
        { v: 1e3, s: "K" }
      ];

      for (const u of units) {
        if (n >= u.v) {
          return (n / u.v).toFixed(2).replace(/\.00$/, "").replace(/(\.\d)0$/, "$1") + u.s;
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

      return number * (multipliers[suffix] || 1);
    }

    const betAmount = parseAmount(args[0]);
    const minBet = 100;
    const maxBet = 1e12;

    if (!Number.isFinite(betAmount) || betAmount < minBet) {
      return message.reply(
        `╭━━━〔 🎰 𝐒𝐏𝐈𝐍 〕━━━╮\n` +
        `┃ 💰 Minimum Bet: 100$\n` +
        `┃ 🎯 Example: /spin 1k\n` +
        `╰━━━━━━━━━━━━━━━━╯`
      );
    }

    if (betAmount > maxBet) {
      return message.reply(
        `🚫 Maximum Bet: ${formatMoney(maxBet)}$`
      );
    }

    const userData = await usersData.get(senderID);

    if (!userData) {
      return message.reply("⚠️ User data not found. Please try again.");
    }

    const currentMoney = Number(userData.money || 0);

    if (betAmount > currentMoney) {
      return message.reply(
        `╭━━━〔 💸 𝐋𝐎𝐖 𝐁𝐀𝐋𝐀𝐍𝐂𝐄 〕━━━╮\n` +
        `┃ 💳 Balance: ${formatMoney(currentMoney)}$\n` +
        `┃ 🎯 Bet: ${formatMoney(betAmount)}$\n` +
        `╰━━━━━━━━━━━━━━━━━━━━╯`
      );
    }

    if (!global.spinLimit) global.spinLimit = {};

    const now = Date.now();
    const resetDuration = 12 * 60 * 60 * 1000;

    if (
      !global.spinLimit[senderID] ||
      now - global.spinLimit[senderID].lastReset >= resetDuration
    ) {
      global.spinLimit[senderID] = {
        count: 0,
        lastReset: now
      };
    }

    const spinData = global.spinLimit[senderID];
    const maxSpins = 12;

    if (spinData.count >= maxSpins) {
      return message.reply(
        `╭━━━〔 🎰 𝐒𝐏𝐈𝐍 〕━━━╮\n` +
        `┃ ❌ All 12 spins have been used.\n` +
        `┃ ⏳ Please try again later.\n` +
        `╰━━━━━━━━━━━━━━━━╯`
      );
    }

    // 63% win chance, 37% loss chance.
    const spinChance = Math.random() * 100;

    let winType = "loss";
    let multiplier = 0;

    if (spinChance < 63) {
      const roll = Math.random() * 100;

      if (roll < 40) {
        winType = "1x";
        multiplier = 1;
      } else if (roll < 70) {
        winType = "2x";
        multiplier = 2;
      } else if (roll < 90) {
        winType = "3x";
        multiplier = 3;
      } else {
        winType = "4x";
        multiplier = 4;
      }
    }

    const win = winType !== "loss";
    const bonus = win ? betAmount * multiplier : 0;
    const finalMoney = win
      ? currentMoney + bonus
      : currentMoney - betAmount;

    userData.money = finalMoney;
    await usersData.set(senderID, userData);

    spinData.count++;

    const statusText = win
      ? `𝐉𝐀𝐂𝐊𝐏𝐎𝐓 ${multiplier}𝐗 ✨`
      : "𝐍𝐎 𝐌𝐀𝐓𝐂𝐇 💔";

    const payoutText = win
      ? `💰 Won: +${formatMoney(bonus)}$`
      : `💸 Lost: -${formatMoney(betAmount)}$`;

    const outcomeEmoji = win ? "🎉" : "💔";

    const msgBody =
      `╭━━━〔 🎰 𝐒𝐏𝐈𝐍 〕━━━╮\n` +
      `┃\n` +
      `┃ ${outcomeEmoji} ${statusText}\n` +
      `┃\n` +
      `┃ 🎯 Bet: ${formatMoney(betAmount)}$\n` +
      `┃ ${payoutText}\n` +
      `┃ 💳 Balance: ${formatMoney(finalMoney)}$\n` +
      `┃ 🎮 Spins: ${spinData.count}/${maxSpins}\n` +
      `┃\n` +
      `╰━━━〔 𝐒𝐀𝐀𝐍 〕━━━╯\n` +
      `〲 𝐒𝐀𝐀𝐍 𝐄𝐗𝐇𝐀𝐔𝐒𝐓𝐄𝐃 〲`;

    const filePath = path.join(
      cacheDir,
      `spin_${senderID}_${now}.gif`
    );

    try {
      if (typeof api.setMessageReaction === "function") {
        api.setMessageReaction("🌀", event.messageID, () => {}, true);
      }

      const imageResponse = await axios({
        url: GIF_URLS[winType],
        method: "GET",
        responseType: "stream",
        timeout: 20000,
        headers: {
          "User-Agent": "Mozilla/5.0"
        }
      });

      const writer = fs.createWriteStream(filePath);
      imageResponse.data.pipe(writer);

      await new Promise((resolve, reject) => {
        writer.on("finish", resolve);
        writer.on("error", reject);
        imageResponse.data.on("error", reject);
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
        api.setMessageReaction("✅", event.messageID, () => {}, true);
      }
    } catch (error) {
      console.error("[SPIN ERROR]", error.message);

      if (typeof api.setMessageReaction === "function") {
        api.setMessageReaction("❌", event.messageID, () => {}, true);
      }

      return message.reply(msgBody);
    } finally {
      setTimeout(() => {
        fs.remove(filePath).catch(() => {});
      }, 5000);
    }
  }
};