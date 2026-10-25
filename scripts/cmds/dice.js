module.exports = {
  config: {
    name: "dice",
    version: "2.0",
    author: "Saan",
    role: 0,
    countDown: 8,
    shortDescription: "Premium Dice Betting Game",
    longDescription: "Guess the sum of two dice and win rewards!",
    category: "GAMES",
    guide: {
      en: "{pn} <amount> [guess]"
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

    const match = String(input).toLowerCase().trim()
      .match(/^(\d+(?:\.\d+)?)(k|m|b|t)?$/);

    if (!match) return NaN;

    const units = { k: 1e3, m: 1e6, b: 1e9, t: 1e12 };
    return parseFloat(match[1]) * (units[match[2]] || 1);
  },

  onStart: async function ({ message, event, args, usersData }) {
    const { senderID } = event;

    if (!args[0]) {
      return message.reply(
        "╭━━━『 🎲 𝐃𝐈𝐂𝐄 𝐆𝐀𝐌𝐄 』━━━╮\n" +
        "┃\n" +
        "┃ 💰 Minimum Bet: 1K\n" +
        "┃ 💎 Maximum Bet: 800M\n" +
        "┃ 🎯 Guess: 2–12\n" +
        "┃\n" +
        "╰━━━━━━━━━━━━━━━━━━╯\n" +
        "➤ Usage: /dice <amount> [guess]\n" +
        "➤ Example: /dice 10k 7"
      );
    }

    const betAmount = this.parseAmount(args[0]);
    const minBet = 1000;
    const maxBet = 800e6;

    if (!Number.isFinite(betAmount) || betAmount < minBet) {
      return message.reply(
        "⚠️ Invalid bet!\nMinimum: 1K\nExample: /dice 10k 7"
      );
    }

    if (betAmount > maxBet) {
      return message.reply("🚫 Maximum bet limit: 800M");
    }

    const userData = await usersData.get(senderID);
    const currentMoney = Number(userData?.money || 0);

    if (betAmount > currentMoney) {
      return message.reply(
        "╭━━━『 💸 𝐋𝐎𝐖 𝐁𝐀𝐋𝐀𝐍𝐂𝐄 』━━━╮\n" +
        "┃ Balance: " + this.formatMoney(currentMoney) + "\n" +
        "┃ Bet: " + this.formatMoney(betAmount) + "\n" +
        "╰━━━━━━━━━━━━━━━━━━╯"
      );
    }

    const guessInput = args[1];
    let guess;

    if (guessInput !== undefined) {
      if (!/^\d+$/.test(guessInput)) {
        return message.reply("⚠️ Guess must be a number from 2 to 12.");
      }

      guess = Number(guessInput);

      if (guess < 2 || guess > 12) {
        return message.reply("⚠️ Guess must be between 2 and 12.");
      }
    } else {
      guess = Math.floor(Math.random() * 11) + 2;
    }

    if (!global.diceLimit) global.diceLimit = {};

    const now = Date.now();
    const resetTime = 10 * 60 * 60 * 1000;

    if (
      !global.diceLimit[senderID] ||
      now - global.diceLimit[senderID].lastReset >= resetTime
    ) {
      global.diceLimit[senderID] = {
        count: 0,
        lastReset: now
      };
    }

    const userLimit = global.diceLimit[senderID];
    const maxPlays = 15;

    if (userLimit.count >= maxPlays) {
      const remaining = resetTime - (now - userLimit.lastReset);
      const hours = Math.floor(remaining / 3600000);
      const minutes = Math.ceil((remaining % 3600000) / 60000);

      return message.reply(
        "╭━━━『 🚫 𝐃𝐈𝐂𝐄 𝐋𝐈𝐌𝐈𝐓 』━━━╮\n" +
        "┃ You've used all 15 plays.\n" +
        "┃ Try again in " + hours + "h " + minutes + "m.\n" +
        "╰━━━━━━━━━━━━━━━━━━╯"
      );
    }

    const dice1 = Math.floor(Math.random() * 6) + 1;
    const dice2 = Math.floor(Math.random() * 6) + 1;
    const sum = dice1 + dice2;

    const diceEmojis = ["⚀", "⚁", "⚂", "⚃", "⚄", "⚅"];
    const display = diceEmojis[dice1 - 1] + " + " +
      diceEmojis[dice2 - 1] + " = " + sum;

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

    const reward = win ? Math.floor(betAmount * multiplier) : 0;
    const finalMoney = win
      ? currentMoney + reward
      : currentMoney - betAmount;

    userLimit.count++;

    userData.money = finalMoney;
    await usersData.set(senderID, userData);

    const resultMsg = win
      ? "🎯 Your guess matched the dice sum!"
      : "❌ Your guess was " + guess + ", but the sum was " + sum + ".";

    const replyMsg = win
      ? "╭━━━『 🎉 𝐃𝐈𝐂𝐄 𝐖𝐈𝐍 』━━━╮\n" +
        "┃\n" +
        "┃ 🎲 Result: " + display + "\n" +
        "┃ 🎯 Your Guess: " + guess + "\n" +
        "┃ ✨ Multiplier: " + multiplier + "x\n" +
        "┃ 💰 Reward: +" + this.formatMoney(reward) + "\n" +
        "┃ 💳 Balance: " + this.formatMoney(finalMoney) + "\n" +
        "┃ 🎮 Plays: " + userLimit.count + "/15\n" +
        "┃\n" +
        "╰━━━━━━━━━━━━━━━━━━╯"
      : "╭━━━『 💀 𝐃𝐈𝐂𝐄 𝐋𝐎𝐒𝐒 』━━━╮\n" +
        "┃\n" +
        "┃ 🎲 Result: " + display + "\n" +
        "┃ 🎯 Your Guess: " + guess + "\n" +
        "┃ " + resultMsg + "\n" +
        "┃ 📉 Lost: -" + this.formatMoney(betAmount) + "\n" +
        "┃ 💳 Balance: " + this.formatMoney(finalMoney) + "\n" +
        "┃ 🎮 Plays: " + userLimit.count + "/15\n" +
        "┃\n" +
        "╰━━━━━━━━━━━━━━━━━━╯";

    return message.reply(replyMsg);
  }
};