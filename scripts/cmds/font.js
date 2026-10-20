"use strict";

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
          throw new Error("Font API base URL is missing.");
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

module.exports = {
  config: {
    name: "font",
    aliases: ["fontstyle"],
    version: "5.0",
    author: "𝐒𝐈𝐀𝐌 𝐀𝐇𝐌𝐄𝐃 𝐒𝐀𝐀𝐍",
    countDown: 5,
    role: 0,
    shortDescription: "Generate stylish fonts & see font list",
    category: "tools",
    guide: {
      en: "{pn} [text] [style_id] or {pn} list"
    }
  },

  onStart: async function ({ api, event, args }) {
    const { threadID, messageID } = event;

    try {
      const API_URL = `${await getApiBaseUrl()}/api/font`;

      // FONT LIST
      if (args[0]?.toLowerCase() === "list") {
        api.setMessageReaction("📜", messageID, () => {}, true);

        const res = await axios.get(API_URL, {
          params: {
            text: "Saan",
            style: "List"
          },
          timeout: 15000
        });

        const previews = res.data?.previews;

        if (
          !previews ||
          typeof previews !== "object" ||
          Array.isArray(previews)
        ) {
          throw new Error("Invalid font list response.");
        }

        let listMsg =
          "╭━━━〔 𝐒𝐀𝐀𝐍 𝐅𝐎𝐍𝐓 𝐒𝐓𝐘𝐋𝐈𝐒𝐓 〕━━━╮\n" +
          "┃\n" +
          "┃  ✦ 𝐒𝐀𝐀𝐍 𝐄𝐗𝐇𝐀𝐔𝐒𝐓𝐄𝐃\n" +
          "┃  ✦ 𝐅𝐎𝐍𝐓 𝐏𝐑𝐄𝐕𝐈𝐄𝐖\n" +
          "┃\n" +
          "╰━━━━━━━━━━━━━━━━━━╯\n\n";

        for (const [id, preview] of Object.entries(previews)) {
          // Replace the old preview name with Saan.
          // Also handle different letter cases.
          let formattedPreview = String(preview);

          formattedPreview = formattedPreview.replace(
            /xalman/gi,
            "Saan"
          );

          listMsg += `${id}. ${formattedPreview}\n`;
        }

        listMsg +=
          "\n━━━━━━━━━━━━━━━━━━\n" +
          "✧ 𝐔𝐒𝐀𝐆𝐄\n" +
          "➤ /font Saan 15\n" +
          "➤ /font list\n\n" +
          "〲 𝐒𝐀𝐀𝐍 𝐄𝐗𝐇𝐀𝐔𝐒𝐓𝐄𝐃 〲";

        api.setMessageReaction("✅", messageID, () => {}, true);

        return api.sendMessage(listMsg, threadID, messageID);
      }

      // FONT GENERATOR
      if (args.length < 2) {
        return api.sendMessage(
          "╭━━━〔 𝐒𝐀𝐀𝐍 𝐅𝐎𝐍𝐓 〕━━━╮\n" +
            "┃\n" +
            "┃ ✧ Usage: /font [text] [style_id]\n" +
            "┃ ✧ Example: /font Saan 15\n" +
            "┃ ✧ Font list: /font list\n" +
            "┃\n" +
            "╰━━━━━━━━━━━━━━━━━━╯\n" +
            "〲 𝐒𝐀𝐀𝐍 𝐄𝐗𝐇𝐀𝐔𝐒𝐓𝐄𝐃 〲",
          threadID,
          messageID
        );
      }

      const styleID = args[args.length - 1];
      const text = args.slice(0, -1).join(" ");

      if (!text.trim() || !/^\d+$/.test(styleID)) {
        return api.sendMessage(
          "✕ Invalid input!\n\n" +
            "Use: /font Saan 15\n" +
            "Font list: /font list",
          threadID,
          messageID
        );
      }

      api.setMessageReaction("✍️", messageID, () => {}, true);

      const res = await axios.get(API_URL, {
        params: {
          text,
          style: styleID
        },
        timeout: 15000
      });

      if (
        res.data?.status === false ||
        typeof res.data?.result !== "string"
      ) {
        api.setMessageReaction("❌", messageID, () => {}, true);

        return api.sendMessage(
          "✕ Invalid style ID!\nUse /font list to see available styles.",
          threadID,
          messageID
        );
      }

      api.setMessageReaction("✅", messageID, () => {}, true);

      return api.sendMessage(
        `${res.data.result}\n\n〲 𝐒𝐀𝐀𝐍 𝐄𝐗𝐇𝐀𝐔𝐒𝐓𝐄𝐃 〲`,
        threadID,
        messageID
      );
    } catch (error) {
      console.error("[SAAN FONT ERROR]", error.message);

      api.setMessageReaction("❌", messageID, () => {}, true);

      return api.sendMessage(
        "✕ Font API error!\nPlease try again later.",
        threadID,
        messageID
      );
    }
  }
};
