module.exports = {
  config: {
    name: "hunt",
    aliases: ["treasure"],
    version: "3.0",
    author: "Saan",
    role: 0,
    countDown: 10,
    shortDescription: "Premium Treasure Chest Hunting Game",
    longDescription: "Choose 1 of 5 mystery chests and discover hidden treasures!",
    category: "GAMES",
    guide: {
      en: "{pn} <amount>"
    }
  },

  formatMoney: function (num) {
    const n = Number(num);
    if (!Number.isFinite(n)) return "∞";
    if (n < 1000) return Math.floor(n).toString();

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

    return n.toLocaleString();
  },

  parseAmount: function (input) {
    if (!input) return NaN;

    const a = String(input).toLowerCase().trim();
    const match = a.match(/^(\d+(?:\.\d+)?)(k|m|b|t)?$/);

    if (!match) return NaN;

    const num = parseFloat(match[1]);
    const units = {
      k: 1e3,
      m: 1e6,
      b: 1e9,
      t: 1e12
    };

    return num * (units[match[2]] || 1);
  },

  onStart: async function ({ api, event, args, usersData, message }) {
    const { senderID } = event;

    if (!args[0]) {
      return message.reply(
        "╭━━━『 💎 𝐓𝐑𝐄𝐀𝐒𝐔𝐑𝐄 𝐇𝐔𝐍𝐓 』━━━╮\n" +
        "┃\n" +
        "┃ 💰 Minimum Bet: 1K\n" +
        "┃ 💎 Maximum Bet: 70B\n" +
        "┃ 🎁 Choose 1 of 5 mystery chests\n" +
        "┃\n" +
        "╰━━━━━━━━━━━━━━━━━━━━╯\n" +
        "➤ Usage: /hunt <amount>\n" +
        "➤ Example: /hunt 10k"
      );
    }

    const betAmount = this.parseAmount(args[0]);
    const minBet = 1000;
    const maxBet = 70e9;

    if (!Number.isFinite(betAmount) || betAmount < minBet) {
      return message.reply(
        "╭━━━『 ⚠️ 𝐈𝐍𝐕𝐀𝐋𝐈𝐃 𝐁𝐄𝐓 』━━━╮\n" +
        "┃ Minimum Bet: 1K\n" +
        "┃ Maximum Bet: 70B\n" +
        "╰━━━━━━━━━━━━━━━━━━━━╯"
      );
    }

    if (betAmount > maxBet) {
      return message.reply(
        "╭━━━『 🚫 𝐁𝐄𝐓 𝐋𝐈𝐌𝐈𝐓 』━━━╮\n" +
        "┃ Maximum Bet: 70B\n" +
        "╰━━━━━━━━━━━━━━━━━━━━╯"
      );
    }

    const userData = await usersData.get(senderID);
    const balance = Number(userData?.money || 0);

    if (betAmount > balance) {
      return message.reply(
        "╭━━━『 💸 𝐋𝐎𝐖 𝐁𝐀𝐋𝐀𝐍𝐂𝐄 』━━━╮\n" +
        "┃ Your Balance: $" + this.formatMoney(balance) + "\n" +
        "┃ Your Bet: $" + this.formatMoney(betAmount) + "\n" +
        "╰━━━━━━━━━━━━━━━━━━━━╯"
      );
    }

    if (!global.huntLimit) global.huntLimit = {};

    const now = Date.now();
    const resetTime = 12 * 60 * 60 * 1000;

    if (!global.huntLimit[senderID]) {
      global.huntLimit[senderID] = {
        count: 0,
        lastReset: now
      };
    }

    const userLimit = global.huntLimit[senderID];

    if (now - userLimit.lastReset >= resetTime) {
      userLimit.count = 0;
      userLimit.lastReset = now;
    }

    if (userLimit.count >= 15) {
      const remaining = resetTime - (now - userLimit.lastReset);
      const hours = Math.floor(remaining / (60 * 60 * 1000));
      const minutes = Math.ceil((remaining % (60 * 60 * 1000)) / (60 * 1000));

      return message.reply(
        "╭━━━『 🚫 𝐇𝐔𝐍𝐓 𝐋𝐈𝐌𝐈𝐓 』━━━╮\n" +
        "┃ You've used all 15 hunts.\n" +
        "┃ Try again in " + hours + "h " + minutes + "m.\n" +
        "╰━━━━━━━━━━━━━━━━━━━━╯"
      );
    }

    const promptMsg = await message.reply(
      "╭━━━『 🏴‍☠️ 𝐓𝐑𝐄𝐀𝐒𝐔𝐑𝐄 𝐇𝐔𝐍𝐓 』━━━╮\n" +
      "┃\n" +
      "┃ 💰 Bet Amount: $" + this.formatMoney(betAmount) + "\n" +
      "┃ 🎁 Choose your mystery chest!\n" +
      "┃\n" +
      "┃  ❶ 📦 Chest 1\n" +
      "┃  ❷ 📦 Chest 2\n" +
      "┃  ❸ 📦 Chest 3\n" +
      "┃  ❹ 📦 Chest 4\n" +
      "┃  ❺ 📦 Chest 5\n" +
      "┃\n" +
      "╰━━━━━━━━━━━━━━━━━━━━╯\n" +
      "➤ Reply with 1, 2, 3, 4 or 5."
    );

    global.GoatBot.onReply.set(promptMsg.messageID, {
      commandName: this.config.name,
      messageID: promptMsg.messageID,
      author: senderID,
      betAmount: betAmount
    });
  },

  onReply: async function ({ api, event, Reply, usersData, message }) {
    const { author, betAmount, messageID } = Reply;

    if (event.senderID !== author) return;

    const choiceText = String(event.body || "").trim();

    if (!/^[1-5]$/.test(choiceText)) {
      return message.reply(
        "⚠️ Invalid choice!\nReply with 1, 2, 3, 4 or 5."
      );
    }

    const choice = Number(choiceText);

    if (!global.huntLimit || !global.huntLimit[author]) {
      global.huntLimit ??= {};
      global.huntLimit[author] = {
        count: 0,
        lastReset: Date.now()
      };
    }

    const now = Date.now();
    const resetTime = 12 * 60 * 60 * 1000;
    const userLimit = global.huntLimit[author];

    if (now - userLimit.lastReset >= resetTime) {
      userLimit.count = 0;
      userLimit.lastReset = now;
    }

    if (userLimit.count >= 15) {
      global.GoatBot.onReply.delete(messageID);
      try {
        await api.unsendMessage(messageID);
      } catch (e) {}

      return message.reply(
        "🚫 You've reached your 15 hunts limit. Try again after the reset."
      );
    }

    const userData = await usersData.get(author);
    const currentBalance = Number(userData?.money || 0);

    if (currentBalance < betAmount) {
      global.GoatBot.onReply.delete(messageID);

      try {
        await api.unsendMessage(messageID);
      } catch (e) {}

      return message.reply("💸 Insufficient balance to complete this hunt!");
    }

    global.GoatBot.onReply.delete(messageID);

    try {
      await api.unsendMessage(messageID);
    } catch (e) {}

    userLimit.count++;

    const outcomes = ["jackpot", "gold", "coins", "bomb", "bomb"];

    for (let i = outcomes.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [outcomes[i], outcomes[j]] = [outcomes[j], outcomes[i]];
    }

    const resultMapping = {
      1: outcomes[0],
      2: outcomes[1],
      3: outcomes[2],
      4: outcomes[3],
      5: outcomes[4]
    };

    const chosenResult = resultMapping[choice];

    const chestDisplay = [1, 2, 3, 4, 5].map(id => {
      const res = resultMapping[id];
      const icons = {
        jackpot: "💎",
        gold: "🥇",
        coins: "🪙",
        bomb: "💣"
      };

      return id === choice
        ? "👉 " + icons[res] + " [" + id + "]"
        : icons[res] + " [" + id + "]";
    }).join("\n");

    let finalMoney;
    let replyText;

    if (chosenResult === "jackpot") {
      const profit = Math.floor(betAmount * 5);
      finalMoney = currentBalance + profit;

      replyText =
        "╭━━━『 💎 𝐑𝐎𝐘𝐀𝐋 𝐉𝐀𝐂𝐊𝐏𝐎𝐓 』━━━╮\n" +
        "┃\n" +
        "┃ ✨ You discovered the Diamond Chest!\n" +
        "┃ 💰 Profit: +$" + this.formatMoney(profit) + "\n" +
        "┃ 🎯 Reward: 5x\n" +
        "┃ 💳 Balance: $" + this.formatMoney(finalMoney) + "\n" +
        "┃ 🎮 Hunts: " + userLimit.count + "/15\n" +
        "┃\n" +
        "╰━━━━━━━━━━━━━━━━━━━━╯\n\n" +
        chestDisplay;
    } else if (chosenResult === "gold") {
      const profit = Math.floor(betAmount * 2.5);
      finalMoney = currentBalance + profit;

      replyText =
        "╭━━━『 🥇 𝐆𝐎𝐋𝐃 𝐓𝐑𝐄𝐀𝐒𝐔𝐑𝐄 』━━━╮\n" +
        "┃\n" +
        "┃ ✨ You found a Gold Chest!\n" +
        "┃ 💰 Profit: +$" + this.formatMoney(profit) + "\n" +
        "┃ 🎯 Reward: 2.5x\n" +
        "┃ 💳 Balance: $" + this.formatMoney(finalMoney) + "\n" +
        "┃ 🎮 Hunts: " + userLimit.count + "/15\n" +
        "┃\n" +
        "╰━━━━━━━━━━━━━━━━━━━━╯\n\n" +
        chestDisplay;
    } else if (chosenResult === "coins") {
      const profit = Math.floor(betAmount * 1.5);
      finalMoney = currentBalance + profit;

      replyText =
        "╭━━━『 🪙 𝐒𝐈𝐋𝐕𝐄𝐑 𝐂𝐎𝐈𝐍𝐒 』━━━╮\n" +
        "┃\n" +
        "┃ ✨ You found a Silver Chest!\n" +
        "┃ 💰 Profit: +$" + this.formatMoney(profit) + "\n" +
        "┃ 🎯 Reward: 1.5x\n" +
        "┃ 💳 Balance: $" + this.formatMoney(finalMoney) + "\n" +
        "┃ 🎮 Hunts: " + userLimit.count + "/15\n" +
        "┃\n" +
        "╰━━━━━━━━━━━━━━━━━━━━╯\n\n" +
        chestDisplay;
    } else {
      finalMoney = currentBalance - betAmount;

      replyText =
        "╭━━━『 💥 𝐓𝐑𝐀𝐏 𝐂𝐇𝐄𝐒𝐓 』━━━╮\n" +
        "┃\n" +
        "┃ 💀 You triggered a hidden trap!\n" +
        "┃ 📉 Loss: -$" + this.formatMoney(betAmount) + "\n" +
        "┃ 💳 Balance: $" + this.formatMoney(finalMoney) + "\n" +
        "┃ 🎮 Hunts: " + userLimit.count + "/15\n" +
        "┃\n" +
        "╰━━━━━━━━━━━━━━━━━━━━╯\n\n" +
        chestDisplay;
    }

    userData.money = finalMoney;
    await usersData.set(author, userData);

    return message.reply(replyText);
  }
};