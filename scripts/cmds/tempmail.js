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

module.exports = {
  config: {
    name: "tempmail",
    aliases: ["tm"],
    version: "1.3",
    author: "Saan",
    countDown: 5,
    role: 0,
    shortDescription: "Generate temporary email and check inbox",
    longDescription: "Create custom temp mail addresses and fetch inbox messages using xalman API",
    category: "utility",
    guide: "{pn} create\n{pn} inbox [your_token]"
  },

  onStart: async function ({ api, event, args }) {
    const action = args[0]?.toLowerCase();
    const token = args[1];

    if (!action || (action !== "create" && action !== "gen" && action !== "inbox")) {
      return api.sendMessage(
        "╭─────────────╮\n" +
        "   📬 TEMPMAIL GUIDE   \n" +
        "╰─────────────╯\n\n" +
        "✨ Create Email:\n» `/tempmail create`\n\n" +
        "📥 Check Inbox:\n» `/tempmail inbox <token>`",
        event.threadID,
        event.messageID
      );
    }

    if (action === "create" || action === "gen") {
      const waitMsg = await api.sendMessage("⏳ Generating temporary email...", event.threadID);

      try {
        const baseUrl = `${await getApiBaseUrl()}/api/tempmail`;
        const res = await axios.get(`${baseUrl}?action=create`);
        const data = res.data;

        api.unsendMessage(waitMsg.messageID);

        if (!data.status) {
          return api.sendMessage(`❌ Failed: ${data.message || "Could not generate email."}`, event.threadID, event.messageID);
        }

        const replyMsg = "╭─────────────────╮\n" +
                         "  🎉 EMAIL GENERATED   \n" +
                         "╰─────────────────╯\n\n" +
                         `📧 Mail: ${data.email}\n` +
                         `🔑 Token: ${data.token}\n` +
                         `⏳ Expires: ${data.expires_at || "N/A"}\n\n` +
                         "📌 Quick Check Command:\n" +
                         `/tempmail inbox ${data.token}`;

        return api.sendMessage(replyMsg, event.threadID, event.messageID);

      } catch (error) {
        api.unsendMessage(waitMsg.messageID);
        return api.sendMessage(`❌ Error: ${error.response?.data?.message || error.message}`, event.threadID, event.messageID);
      }
    }

    if (action === "inbox") {
      if (!token) {
        return api.sendMessage("⚠️ Token missing!\nExample: `/tempmail inbox YOUR_TOKEN`", event.threadID, event.messageID);
      }

      const waitMsg = await api.sendMessage("🔍 Checking inbox, please wait...", event.threadID);

      try {
        const baseUrl = `${await getApiBaseUrl()}/api/tempmail`;
        const res = await axios.get(`${baseUrl}?action=inbox&token=${encodeURIComponent(token)}`);
        const data = res.data;

        api.unsendMessage(waitMsg.messageID);

        if (!data.status) {
          return api.sendMessage(`❌ Error: ${data.message || "Invalid or expired token."}`, event.threadID, event.messageID);
        }

        if (!data.emails || data.emails.length === 0 || data.total_emails === 0) {
          return api.sendMessage(
            "╭──────────────╮\n" +
            "   📭 INBOX EMPTY   \n" +
            "╰──────────────╯\n\n" +
            `✉️ Mail: ${data.email}\n` +
            "ℹ️ No new messages received yet.",
            event.threadID,
            event.messageID
          );
        }

        let inboxMsg = "╭─────────────────╮\n" +
                       "   📥 INBOX MESSAGES   \n" +
                       "╰─────────────────╯\n" +
                       `📌 Target: ${data.email}\n` +
                       `📊 Total: ${data.total_emails} Mail(s)\n` +
                       "═══════════════════\n\n";

        data.emails.forEach((mail) => {
          inboxMsg += `📩 [ Mail #${mail.index} ]\n` +
                      `👤 From: ${mail.from}\n` +
                      `📌 Subject: ${mail.subject}\n` +
                      `🕒 Time: ${mail.received_at}\n` +
                      `───────────────────\n` +
                      `💬 Message:\n${mail.body_text}\n` +
                      "═══════════════════\n\n";
        });

        return api.sendMessage(inboxMsg.trim(), event.threadID, event.messageID);

      } catch (error) {
        api.unsendMessage(waitMsg.messageID);
        return api.sendMessage(`❌ Error: ${error.response?.data?.message || error.message}`, event.threadID, event.messageID);
      }
    }
  }
};
