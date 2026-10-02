const axios = require("axios");

const API_CONFIG_URL =
  "https://raw.githubusercontent.com/goatbotnx/xalmanx210/refs/heads/main/apis.json";

const API_KEY = "xalman-hub";

let apiBaseUrl = null;
let apiConfigRequest = null;

async function getApiBaseUrl() {
  if (apiBaseUrl) return apiBaseUrl;

  if (!apiConfigRequest) {
    apiConfigRequest = axios
      .get(API_CONFIG_URL, { timeout: 15000 })
      .then(({ data }) => {
        const baseUrl = data?.[API_KEY];

        if (typeof baseUrl !== "string" || !baseUrl.trim()) {
          throw new Error(`Missing API key in apis.json: ${API_KEY}`);
        }

        apiBaseUrl = baseUrl.replace(/\/+$/, "");
        return apiBaseUrl;
      })
      .finally(() => {
        apiConfigRequest = null;
      });
  }

  return apiConfigRequest;
}

const CATEGORY_ALIASES = {
  bn: "bn",
  bangla: "bn",
  bengali: "bn",

  en: "en",
  english: "en",

  math: "math",
  maths: "math",
  mathematics: "math"
};

const CATEGORY_LABELS = {
  bn: "🇧🇩 Bangla",
  en: "🇬🇧 English",
  math: "🧮 Math"
};

function normalizeCategory(input) {
  if (!input) return null;

  const key = String(input).toLowerCase().trim();

  return CATEGORY_ALIASES[key] || null;
}

module.exports = {
  config: {
    name: "quiz",
    aliases: ["qz"],
    version: "8.0",
    author: "𝐒𝐈𝐀𝐌 𝐀𝐇𝐌𝐄𝐃 𝐒𝐀𝐀𝐍",

    // Cooldown: 10 seconds
    countDown: 10,

    role: 0,
    description: "Play a random quiz",
    category: "GAMES",

    guide:
      "{pn} : random quiz\n" +
      "{pn} bn / bangla : bangla quiz\n" +
      "{pn} en / english : english quiz\n" +
      "{pn} math : math quiz\n" +
      "{pn} list : total questions"
  },

  onStart: async function ({ event, message, args, api }) {
    const { senderID } = event;

    const BASE_URL = `${await getApiBaseUrl()}/api/quiz`;

    // =========================
    // QUIZ LIST
    // =========================

    if (args[0] === "list" || args[0] === "total") {
      const rawCategory = args[1];
      const category = normalizeCategory(rawCategory);

      if (rawCategory && !category) {
        return message.reply(
          `❌ Invalid category: "${rawCategory}"\n` +
          `✅ Use: bn, en or math`
        );
      }

      try {
        const url = category
          ? `${BASE_URL}?list=true&category=${category}`
          : `${BASE_URL}?list=true`;

        const res = await axios.get(url);
        const data = res.data;

        let listMsg;

        if (data.by_category) {
          listMsg =
            `📊 𝗤𝗨𝗜𝗭 𝗦𝗧𝗔𝗧𝗜𝗦𝗧𝗜𝗖𝗦\n` +
            `📝 Total: ${data.total_questions}\n` +
            `🇧🇩 Bangla: ${data.by_category.bn}\n` +
            `🇬🇧 English: ${data.by_category.en}\n` +
            `🧮 Math: ${data.by_category.math}\n` +
            `🟢 Status: Active`;
        } else {
          listMsg =
            `📊 𝗤𝗨𝗜𝗭 𝗦𝗧𝗔𝗧𝗜𝗦𝗧𝗜𝗖𝗦\n` +
            `📝 ${data.category}: ${data.total_questions}\n` +
            `🟢 Status: Active`;
        }

        return message.reply(listMsg);

      } catch (e) {
        console.error(e);

        return message.reply(
          "❌ Unable to fetch quiz database."
        );
      }
    }

    // =========================
    // CATEGORY
    // =========================

    const rawCategory = args[0];
    const requestedCategory = normalizeCategory(rawCategory);

    if (rawCategory && !requestedCategory) {
      return message.reply(
        `❌ Invalid category: "${rawCategory}"\n` +
        `✅ Use: bn, en or math`
      );
    }

    try {
      const url = requestedCategory
        ? `${BASE_URL}?category=${requestedCategory}`
        : BASE_URL;

      const res = await axios.get(url);
      const quiz = res.data;

      if (!quiz.status) {
        return message.reply(
          "❌ API returned an invalid response."
        );
      }

      const categoryLabel =
        CATEGORY_LABELS[quiz.category] ||
        quiz.category;

      // =========================
      // OPTIONS
      // =========================

      const labels = ["A", "B", "C", "D"];

      let optionsText = "";

      quiz.options.forEach((opt, index) => {
        // [ B ] format prevents emoji conversion
        optionsText += `[ ${labels[index]} ] ${opt}\n`;
      });

      // =========================
      // COMPACT QUIZ MESSAGE
      // =========================

      const msgText =
        `🧠 𝗤𝗨𝗜𝗭 • ${categoryLabel}\n` +
        `❓ ${quiz.question}\n\n` +
        `${optionsText}` +
        `⏳ 60s • Reply [ A ], [ B ], [ C ] or [ D ]`;

      return message.reply(msgText, (err, info) => {
        if (err) return;

        global.GoatBot.onReply.set(info.messageID, {
          commandName: this.config.name,
          messageID: info.messageID,
          author: senderID,
          correctAnswer: quiz.answer,
          correctText: quiz.correct_text
        });

        // Auto delete after 60 seconds
        setTimeout(() => {
          if (global.GoatBot.onReply.has(info.messageID)) {
            api.unsendMessage(info.messageID);

            global.GoatBot.onReply.delete(
              info.messageID
            );
          }
        }, 60000);
      });

    } catch (e) {
      console.error(e);

      return message.reply(
        "❌ Unable to establish a connection with the quiz server."
      );
    }
  },

  // =========================
  // ANSWER HANDLER
  // =========================

  onReply: async function ({
    event,
    Reply,
    message,
    usersData,
    api
  }) {
    const { senderID, body } = event;

    // Only original player can answer
    if (senderID !== Reply.author) {
      return;
    }

    const userAnswer = body
      .trim()
      .toUpperCase()
      .replace(/[\[\]]/g, "")
      .trim();

    const validOptions = ["A", "B", "C", "D"];

    if (!validOptions.includes(userAnswer)) {
      return;
    }

    try {
      // Remove quiz message
      api.unsendMessage(Reply.messageID);

      let resultMsg = "";

      // =========================
      // CORRECT ANSWER
      // =========================

      if (userAnswer === Reply.correctAnswer) {

        // Reward: 5,000
        const reward = 5000;

        const userData =
          await usersData.get(senderID);

        const currentMoney =
          parseInt(userData.money || 0);

        await usersData.set(senderID, {
          money: currentMoney + reward
        });

        resultMsg =
          `🎉 𝗖𝗢𝗥𝗥𝗘𝗖𝗧!\n` +
          `✅ Answer: [ ${userAnswer} ]\n` +
          `📖 ${Reply.correctText}\n` +
          `💰 +${reward.toLocaleString()} ৳`;

      } else {

        // =========================
        // WRONG ANSWER
        // =========================

        resultMsg =
          `😞 𝗪𝗥𝗢𝗡𝗚!\n` +
          `❌ Your answer: [ ${userAnswer} ]\n` +
          `✅ Correct: [ ${Reply.correctAnswer} ]\n` +
          `📖 ${Reply.correctText}`;
      }

      message.reply(resultMsg);

      global.GoatBot.onReply.delete(
        Reply.messageID
      );

    } catch (e) {
      console.error(e);

      return message.reply(
        "❌ An unexpected error occurred while processing your answer."
      );
    }
  }
};