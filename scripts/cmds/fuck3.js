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

async function getUserName(api, userID) {
  try {
    const info = await api.getUserInfo(userID);
    return info[userID]?.name || "User";
  } catch {
    return "User";
  }
}

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
    name: "fuck3",
    aliases: ["fk3"],
    version: "2.0",
    author: "Saan",
    countDown: 5,
    role: 3,
    shortDescription: "Fuck3 canvas - explicit couple image",
    longDescription: "Sender on id1, target (mention/reply/UID) on id2",
    category: "NSFW",
    guide: { en: "{pn} @user | reply | {pn} <uid>" }
  },

  onStart: async function ({ api, event, args }) {
    const { threadID, messageID, mentions, messageReply, senderID } = event;

    let id1 = senderID;
    let id2 = null;

    const mIDs = Object.keys(mentions || {}).filter(id => id !== senderID);
    if (mIDs.length > 0) id2 = mIDs[0];
    else if (messageReply && messageReply.senderID) id2 = messageReply.senderID;
    else {
      const uidArg = args.find(a => /^\d{6,}$/.test(a));
      if (uidArg) id2 = uidArg;
    }

    if (!id2) {
      return api.sendMessage(
        "⚠️ Please mention, reply to, or provide the UID of the other user.\n" +
        "Example: fuck3 @user  |  reply with fuck3  |  fuck3 61596383823942",
        threadID, messageID
      );
    }

    let outPath = null;

    try {
      api.setMessageReaction("⏳", messageID, () => {}, true);

      const [base, senderName, targetName] = await Promise.all([
        getApiBaseUrl(),
        getUserName(api, id1),
        getUserName(api, id2)
      ]);

      const url = `${base}/api/fuck3?id1=${encodeURIComponent(id1)}&id2=${encodeURIComponent(id2)}`;

      const response = await fetchWithRetry(url, 3, 3000);

      const cacheDir = path.join(__dirname, "cache");
      await fs.ensureDir(cacheDir);
      outPath = path.join(cacheDir, `fuck3_${Date.now()}.png`);
      await fs.writeFile(outPath, Buffer.from(response.data));

      api.setMessageReaction("🥵", messageID, () => {}, true);

      const body = `💆‍♂️ ${senderName} 𝗴𝗮𝘃𝗲 ${targetName} 𝗮 𝙬𝙞𝙡𝙙 𝙗𝙤𝙙𝙮 𝙢𝙖𝙨𝙨𝙖𝙜𝙚 𝙪𝙣𝙩𝙞𝙡 𝙩𝙝𝙚𝙮 𝙜𝙤𝙩 𝙚𝙭𝙝𝙖𝙪𝙨𝙩𝙚𝙙 🫦🔥`;

      return api.sendMessage({
        body,
        attachment: fs.createReadStream(outPath)
      }, threadID, async () => {
        if (outPath && fs.existsSync(outPath)) await fs.unlink(outPath);
      }, messageID);

    } catch (err) {
      console.error(err);
      if (outPath && fs.existsSync(outPath)) await fs.unlink(outPath);
      api.setMessageReaction("❌", messageID, () => {}, true);
      return api.sendMessage(
        "❌ 𝗦𝗲𝗿𝘃𝗲𝗿 𝗯𝘂𝘀𝘆 𝗼𝗿 𝗿𝗲𝗻𝗱𝗲𝗿 𝗶𝘀 𝙬𝙖𝙠𝙞𝙣𝙜 𝘂𝙥 💤\n" +
        "⏳ Please try again in 20-30 seconds.",
        threadID, messageID
      );
    }
  }
};
        
