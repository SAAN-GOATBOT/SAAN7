const axios = require("axios");
const fs = require("fs");
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

const RATIOS = ["1:1", "16:9", "9:16", "21:9", "4:3", "3:2", "2:3", "4:5"];
const STYLES = ["none", "movie", "cartoon", "space", "horror", "cyberpunk", "anime", "oil-painting"];

module.exports = {
  config: {
    name: "sdxl",
    version: "1.0.0",
    aliases: ["sdxl-base"],
    author: "Saan",
    countDown: 8,
    role: 0,
    shortDescription: "Generate AI images with SDXL Base",
    longDescription: "Generate images using SDXL Base with custom ratio and style.",
    category: "AI",
    guide: "{pn} [prompt] --ratio [1:1 | 16:9 | 9:16 | 21:9 | 4:3 | 3:2 | 2:3 | 4:5] --style [none | movie | cartoon | space | horror | cyberpunk | anime | oil-painting]"
  },

  onStart: async function ({ api, event, args }) {
    const { threadID, messageID, senderID } = event;

    let ratio = "1:1";
    let style = "none";

    const ratioIndex = args.findIndex(a => a === "--ratio" || a === "-r");
    if (ratioIndex !== -1 && args[ratioIndex + 1]) {
      const requested = args[ratioIndex + 1];
      if (RATIOS.includes(requested)) ratio = requested;
      args.splice(ratioIndex, 2);
    }

    const styleIndex = args.findIndex(a => a === "--style" || a === "-s");
    if (styleIndex !== -1 && args[styleIndex + 1]) {
      const requested = args[styleIndex + 1].toLowerCase();
      if (STYLES.includes(requested)) style = requested;
      args.splice(styleIndex, 2);
    }

    const prompt = args.join(" ").trim();

    if (!prompt) {
      return api.sendMessage(
        "✨ Please enter a prompt!\n━━━━━━━━━━━━━━━━━━━━\n" +
        "Example: /sdxl a beautiful cyberpunk samurai\n" +
        "Optional: /sdxl a cat --ratio 16:9 --style anime\n\n" +
        `📐 Ratios: ${RATIOS.join(", ")}\n` +
        `🎨 Styles: ${STYLES.join(", ")}`,
        threadID,
        messageID
      );
    }

    api.setMessageReaction("⏳", messageID, () => {}, true);

    const cacheDir = path.join(__dirname, "cache");
    const cachePath = path.join(cacheDir, `sdxl_${senderID}_${Date.now()}.png`);

    try {
      if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });

      const apiUrl = `${await getApiBaseUrl()}/api/sdxl-base?prompt=${encodeURIComponent(prompt)}&ratio=${encodeURIComponent(ratio)}&style=${encodeURIComponent(style)}`;

      const response = await axios({
        method: "get",
        url: apiUrl,
        responseType: "arraybuffer",
        timeout: 60000
      });

      const contentType = response.headers["content-type"];
      if (!contentType || !contentType.includes("image")) {
        throw new Error("Invalid Image Data");
      }

      fs.writeFileSync(cachePath, Buffer.from(response.data, "binary"));

      api.setMessageReaction("✅", messageID, () => {}, true);

      return api.sendMessage({
        body: `✨ 𝗦𝗗𝗫𝗟 𝗕𝗔𝗦𝗘 𝗚𝗘𝗡𝗘𝗥𝗔𝗧𝗘𝗗 ✨\n📐 Ratio: ${ratio}\n🎨 Style: ${style}`,
        attachment: fs.createReadStream(cachePath)
      }, threadID, () => {
        if (fs.existsSync(cachePath)) fs.unlinkSync(cachePath);
      }, messageID);

    } catch (error) {
      console.error(error);
      if (fs.existsSync(cachePath)) fs.unlinkSync(cachePath);
      api.setMessageReaction("❌", messageID, () => {}, true);
      return api.sendMessage(`⚠️ Generation Failed! ${error.message}`, threadID, messageID);
    }
  }
};
