const axios = require("axios");

const API_CONFIG_URL = "https://raw.githubusercontent.com/codex-xalman/xalmanx210/refs/heads/main/apis.json";
const API_KEY = "xalman-hub";
const MAX_MAILS = 5;

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

const box = (title, lines) =>
  [
    "┏━━━━━━━━━━━━━━━━━━━━━┓",
    `   ${title}`,
    "┗━━━━━━━━━━━━━━━━━━━━━┛",
    "",
    ...lines
  ].join("\n");

const HELP = box("✦ 𝗧𝗘𝗠𝗣 𝗚𝗠𝗔𝗜𝗟 ✦", [
  "◈ 𝗖𝗿𝗲𝗮𝘁𝗲",
  "   ➜ /gmail create",
  "",
  "◈ 𝗜𝗻𝗯𝗼𝘅",
  "   ➜ /gmail inbox <email>"
]);

module.exports = {
  config: {
    name: "tempgmail",
    version: "1.5",
    aliases: ["gmail"],
    author: "Saan",
    countDown: 5,
    role: 0,
    shortDescription: "Generate temp Gmail and check inbox",
    longDescription: "Create a public temp Gmail and check its inbox using xalman API",
    category: "utility",
    guide: "{pn} create\n{pn} inbox [email]"
  },

  onStart: async function ({ api, event, args }) {
    const { threadID, messageID } = event;
    const action = args[0]?.toLowerCase();
    const email = args[1]?.trim();
    const reply = (text) => api.sendMessage(text, threadID, messageID);

    if (!["create", "gen", "inbox"].includes(action)) return reply(HELP);

    if (action === "create" || action === "gen") {
      const waitMsg = await api.sendMessage("⏳ 𝗚𝗲𝗻𝗲𝗿𝗮𝘁𝗶𝗻𝗴 𝘆𝗼𝘂𝗿 𝗚𝗺𝗮𝗶𝗹...", threadID);

      try {
        const baseUrl = `${await getApiBaseUrl()}/api/temp-gmail`;
        const { data } = await axios.get(`${baseUrl}?action=create`, { timeout: 30000 });
        api.unsendMessage(waitMsg.messageID);

        if (!data?.status || !data.email) {
          return reply(box("✖ 𝗙𝗔𝗜𝗟𝗘𝗗", [`❖ ${data?.message || "Could not generate Gmail."}`]));
        }

        return reply(
          box("✔ 𝗚𝗠𝗔𝗜𝗟 𝗥𝗘𝗔𝗗𝗬", [
            "◈ 𝗠𝗮𝗶𝗹",
            `   ➜ ${data.email}`,
            "",
            "◈ 𝗧𝘆𝗽𝗲",
            `   ➜ ${data.type || "PUBLIC"}`,
            "",
            "◈ 𝗤𝘂𝗶𝗰𝗸 𝗖𝗵𝗲𝗰𝗸",
            `   ➜ /gmail inbox ${data.email}`
          ])
        );
      } catch (error) {
        api.unsendMessage(waitMsg.messageID);
        return reply(box("✖ 𝗘𝗥𝗥𝗢𝗥", [`❖ ${error.response?.data?.message || error.message}`]));
      }
    }

    if (!email) {
      return reply(box("⚠ 𝗘𝗠𝗔𝗜𝗟 𝗠𝗜𝗦𝗦𝗜𝗡𝗚", ["❖ Please provide your Gmail.", "   ➜ /gmail inbox example@gmail.com"]));
    }

    const waitMsg = await api.sendMessage("🔍 𝗖𝗵𝗲𝗰𝗸𝗶𝗻𝗴 𝗶𝗻𝗯𝗼𝘅...", threadID);

    try {
      const baseUrl = `${await getApiBaseUrl()}/api/temp-gmail`;
      const { data } = await axios.get(`${baseUrl}?action=inbox&email=${encodeURIComponent(email)}`, { timeout: 30000 });
      api.unsendMessage(waitMsg.messageID);

      if (!data?.status) {
        return reply(box("✖ 𝗘𝗥𝗥𝗢𝗥", [`❖ ${data?.message || "Could not fetch inbox."}`]));
      }

      const mails = (data.emails || [])
        .filter((mail) => !mail.locked)
        .sort((a, b) => Number(b.timestamp) - Number(a.timestamp))
        .slice(0, MAX_MAILS);

      if (!mails.length) {
        return reply(box("📭 𝗜𝗡𝗕𝗢𝗫 𝗘𝗠𝗣𝗧𝗬", ["◈ 𝗠𝗮𝗶𝗹", `   ➜ ${data.email || email}`, "", "❖ No messages received yet."]));
      }

      const items = mails.flatMap((mail, i) => [
        `┌─ 📩 𝗠𝗔𝗜𝗟 #${i + 1}`,
        `├ 👤 ${mail.from}`,
        `├ 📌 ${mail.subject}`,
        `└ 🕒 ${mail.time_ago || "N/A"}`,
        ""
      ]);

      return reply(
        box("📥 𝗜𝗡𝗕𝗢𝗫 𝗠𝗘𝗦𝗦𝗔𝗚𝗘𝗦", [
          "◈ 𝗠𝗮𝗶𝗹",
          `   ➜ ${data.email || email}`,
          "",
          "◈ 𝗟𝗮𝘁𝗲𝘀𝘁",
          `   ➜ ${mails.length} mail(s)`,
          "",
          ...items
        ]).trim()
      );
    } catch (error) {
      api.unsendMessage(waitMsg.messageID);
      return reply(box("✖ 𝗘𝗥𝗥𝗢𝗥", [`❖ ${error.response?.data?.message || error.message}`]));
    }
  }
};
