const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

const API_CONFIG_URL = "https://raw.githubusercontent.com/codex-xalman/xalmanx210/refs/heads/main/apis.json";
const API_KEY = "xalman-canvas";
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

const CAPTIONS = [
  "🐍 𝗦𝗵𝗲'𝘀 𝗮 𝗻𝗮𝗴𝗶𝗻, 𝗺𝗲𝘀𝗺𝗲𝗿𝗶𝘇𝗶𝗻𝗴 𝗮𝗻𝗱 𝗱𝗮𝗻𝗴𝗲𝗿𝗼𝘂𝘀 🫦",
  "💫 𝗕𝗲𝘄𝗮𝗿𝗲 𝗼𝗳 𝗵𝗲𝗿 𝘃𝗲𝗻𝗼𝗺, 𝗶𝘁'𝘀 𝗮𝗱𝗱𝗶𝗰𝘁𝗶𝘃𝗲 🐍",
  "🖤 𝗦𝗵𝗲 𝗿𝘂𝗹𝗲𝘀 𝘁𝗵𝗲 𝗱𝗮𝗿𝗸, 𝗮𝗻𝗱 𝘆𝗼𝘂'𝗿𝗲 𝗵𝗲𝗿 𝗽𝗿𝗲𝘆 🐍✨",
  "🔥 𝗛𝗲𝗿 𝗲𝘆𝗲𝘀 𝗰𝗮𝗻 𝗵𝘆𝗽𝗻𝗼𝘁𝗶𝘇𝗲, 𝗵𝗲𝗿 𝗯𝗶𝘁𝗲 𝗶𝘀 𝗹𝗲𝘁𝗵𝗮𝗹 🐍",
  "🌙 𝗧𝗵𝗲 𝗺𝗼𝘀𝘁 𝗯𝗲𝗮𝘂𝘁𝗶𝗳𝘂𝗹 𝘀𝗻𝗮𝗸𝗲 𝗶𝗻 𝘁𝗵𝗲 𝗴𝗮𝗿𝗱𝗲𝗻 🐍"
];

const pick = arr => arr[Math.floor(Math.random() * arr.length)];

async function fetchWithRetry(url, retries = 3, delay = 3000) {
  let lastErr;
  for (let i = 0; i < retries; i++) {
    try {
      const res = await axios.get(url, {
        responseType: "arraybuffer",
        timeout: 90000,
        validateStatus: () => true,
        headers: { "User-Agent": "Mozilla/5.0" }
      });
      const ct = res.headers["content-type"] || "";
      if (ct.includes("image")) return res;
      lastErr = new Error("Server returned non-image response");
    } catch (e) {
      lastErr = e;
    }
    if (i < retries - 1) await new Promise(r => setTimeout(r, delay));
  }
  throw lastErr || new Error("Request failed");
}

module.exports = {
  config: {
    name: "myex",
    aliases: ["ex", "nagin"],
    version: "1.0.1",
    author: "Saan",
    countDown: 5,
    role: 0,
    shortDescription: "Snake/Nagin canvas using target UID pfp",
    longDescription: "Generates an image with the target's pfp on a snake/nagin",
    category: "FUN & SOCIAL",
    guide: { en: "{pn} @user | reply | {pn} <uid>" }
  },

  onStart: async function ({ api, event, args }) {
    const { threadID, messageID, mentions, messageReply, senderID } = event;

    let targetId = null;

    const mIDs = Object.keys(mentions || {}).filter(id => id !== senderID);
    if (mIDs.length > 0) targetId = mIDs[0];
    else if (messageReply && messageReply.senderID) targetId = messageReply.senderID;
    else {
      const uidArg = args.find(a => /^\d{6,}$/.test(a));
      if (uidArg) targetId = uidArg;
    }

    if (!targetId) {
      return api.sendMessage(
        "⚠️ Please mention, reply to, or provide the UID of the target user.\n" +
        "Example: myex @user  |  reply with myex  |  myex 61596383823942",
        threadID, messageID
      );
    }

    let outPath = null;

    try {
      api.setMessageReaction("⏳", messageID, () => {}, true);

      const base = await getApiBaseUrl();
      const url = `${base}/api/myex?tergetuid=${encodeURIComponent(targetId)}`;

      const response = await fetchWithRetry(url, 3, 3000);

      const cacheDir = path.join(__dirname, "cache");
      await fs.ensureDir(cacheDir);
      outPath = path.join(cacheDir, `myex_${Date.now()}.png`);
      await fs.writeFile(outPath, Buffer.from(response.data));

      api.setMessageReaction("🐍", messageID, () => {}, true);

      return api.sendMessage({
        body: pick(CAPTIONS),
        attachment: fs.createReadStream(outPath)
      }, threadID, async () => {
        if (outPath && fs.existsSync(outPath)) await fs.unlink(outPath);
      }, messageID);

    } catch (err) {
      console.error(err);
      if (outPath && fs.existsSync(outPath)) await fs.unlink(outPath);
      api.setMessageReaction("❌", messageID, () => {}, true);
      return api.sendMessage(
        "❌ 𝗦𝗲𝗿𝘃𝗲𝗿 𝗯𝘂𝘀𝘆 𝗼𝗿 𝗿𝗲𝗻𝗱𝗲𝗿 𝗶𝘀 𝘄𝗮𝗸𝗶𝗻𝗴 𝘂𝗽 💤\n" +
        "⏳ Please try again in 20-30 seconds.",
        threadID, messageID
      );
    }
  }
};
