const axios = require("axios");

const API_CONFIG_URL = "https://raw.githubusercontent.com/codex-xalman/xalmanx210/refs/heads/main/apis.json";
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

const TYPES = {
  truth: { title: "🤍 𝗧𝗥𝗨𝗧𝗛", label: "𝗧𝗿𝘂𝘁𝗵" },
  dare: { title: "🔥 𝗗𝗔𝗥𝗘", label: "𝗗𝗮𝗿𝗲" }
};

const ALIASES = { "1": "truth", t: "truth", truth: "truth", "2": "dare", d: "dare", dare: "dare" };

const box = (title, lines) =>
  [
    "┏━━━━━━━━━━━━━━━━━━━━━┓",
    `   ${title}`,
    "┗━━━━━━━━━━━━━━━━━━━━━┛",
    "",
    ...lines
  ].join("\n");

const MENU = box("✦ 𝗧𝗥𝗨𝗧𝗛 𝗢𝗥 𝗗𝗔𝗥𝗘 ✦", [
  "◈ 𝟭  ➜ 𝗧𝗿𝘂𝘁𝗵 🤍",
  "◈ 𝟮  ➜ 𝗗𝗮𝗿𝗲 🔥",
  "",
  "❖ Reply with 1 or 2"
]);

async function fetchQuestion(type) {
  const baseUrl = `${await getApiBaseUrl()}/api/truthordare`;
  const { data } = await axios.get(`${baseUrl}?type=${type}`, { timeout: 20000 });

  if (!data?.status || !data.result) {
    throw new Error(data?.message || "No data received.");
  }

  return box(TYPES[type].title, [
    "◈ 𝗤𝘂𝗲𝘀𝘁𝗶𝗼𝗻",
    `   ➜ ${data.result}`,
    "",
    `❖ ${data.total_available || "500+"} ${TYPES[type].label.toLowerCase()}s available`
  ]);
}

module.exports = {
  config: {
    name: "truthordare",
    aliases: ["tod", "td", "tord"],
    version: "2.0",
    author: "Saan",
    role: 0,
    countDown: 5,
    shortDescription: "Play truth or dare",
    longDescription: "Get a random truth or dare question.",
    category: "GAMES",
    guide: { en: "{pn}\n{pn} truth\n{pn} dare" }
  },

  onStart: async function ({ message, event, args }) {
    const direct = ALIASES[args[0]?.toLowerCase()];

    if (direct) {
      try {
        return message.reply(await fetchQuestion(direct));
      } catch (error) {
        return message.reply(box("✖ 𝗘𝗥𝗥𝗢𝗥", [`❖ ${error.message}`]));
      }
    }

    return message.reply(MENU, (err, info) => {
      if (err || !info) return;
      global.GoatBot.onReply.set(info.messageID, {
        commandName: "truthordare",
        author: event.senderID
      });
    });
  },

  onReply: async function ({ event, message, Reply }) {
    if (Reply?.author && event.senderID !== Reply.author) return;

    const type = ALIASES[event.body?.trim().toLowerCase()];
    if (!type) return;

    try {
      return message.reply(await fetchQuestion(type));
    } catch (error) {
      return message.reply(box("✖ 𝗘𝗥𝗥𝗢𝗥", [`❖ ${error.message}`]));
    }
  }
};
  
