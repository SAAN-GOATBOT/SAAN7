const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

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

const RATIOS = ["1:1", "9:16"];

module.exports = {
  config: {
    name: "sketch-art",
    aliases: ["sketch", "sketchart"],
    version: "1.5",
    author: "Saan",
    countDown: 5,
    role: 0,
    shortDescription: "AI Sketch Art Generator",
    category: "AI",
    guide: {
      en: "{pn} <prompt> [--ar 1:1 | 9:16]"
    }
  },

  onStart: async function ({ message, args, event, api }) {
    let filePath = null;

    try {
      let ratio = "1:1";
      const ratioIdx = args.findIndex(a => a === "--ar" || a === "-ar" || a === "--ratio" || a === "-r");
      if (ratioIdx !== -1 && args[ratioIdx + 1]) {
        const req = args[ratioIdx + 1];
        if (RATIOS.includes(req)) ratio = req;
        args.splice(ratioIdx, 2);
      }

      const prompt = args.join(" ").trim();

      if (!prompt) {
        return message.reply("❌ Give prompt.\nExample: sketchart a cute cat --ar 1:1");
      }

      api.setMessageReaction("⏳", event.messageID, () => {}, true);

      const base = await getApiBaseUrl();
      const apiUrl = `${base}/api/sketch-art?prompt=${encodeURIComponent(prompt)}&ratio=${encodeURIComponent(ratio)}`;

      const img = await axios({
        url: apiUrl,
        method: "GET",
        responseType: "arraybuffer",
        timeout: 120000,
        validateStatus: () => true,
        headers: { "User-Agent": "Mozilla/5.0" }
      });

      const contentType = img.headers["content-type"] || "";
      if (!contentType.includes("image")) {
        let errMsg = "Failed to generate image.";
        try {
          const json = JSON.parse(Buffer.from(img.data).toString());
          if (json.message) errMsg = json.message;
        } catch {}
        api.setMessageReaction("❌", event.messageID, () => {}, true);
        return message.reply(`⚠️ 𝗦𝗸𝗲𝘁𝗰𝗵 𝗳𝗮𝗶𝗹𝗲𝗱\n${errMsg}`);
      }

      const trashDir = path.join(__dirname, "cache", "trash");
      fs.ensureDirSync(trashDir);
      filePath = path.join(trashDir, `sketch_${Date.now()}.jpg`);
      fs.writeFileSync(filePath, Buffer.from(img.data));

      api.setMessageReaction("✅", event.messageID, () => {}, true);

      const caption = `🎨 𝗦𝗞𝗘𝗧𝗖𝗛 𝗔𝗥𝗧 𝗚𝗘𝗡𝗘𝗥𝗔𝗧𝗘𝗗\n\n📐 𝗥𝗮𝘁𝗶𝗼 : ${ratio}`;

      await message.reply({
        body: caption,
        attachment: fs.createReadStream(filePath)
      });

      setTimeout(() => {
        try {
          if (filePath && fs.existsSync(filePath)) fs.unlinkSync(filePath);
        } catch (e) {}
      }, 3000);

    } catch (err) {
      console.log(err);
      if (filePath && fs.existsSync(filePath)) {
        try { fs.unlinkSync(filePath); } catch (e) {}
      }
      api.setMessageReaction("❌", event.messageID, () => {}, true);
      return message.reply("⚠️ 𝗦𝗼𝗺𝗲𝘁𝗵𝗶𝗻𝗴 𝘄𝗲𝗻𝘁 𝘄𝗿𝗼𝗻𝗴. 𝗣𝗹𝗲𝗮𝘀𝗲 𝘁𝗿𝘆 𝗮𝗴𝗮𝗶𝗻 𝗹𝗮𝘁𝗲𝗿.");
    }
  }
};
