const axios = require("axios");
const fs = require("fs");
const path = require("path");
const { createReadStream } = require("fs");

const API_CONFIG_URL = "https://raw.githubusercontent.com/negative-xalman/xalmanx210/refs/heads/main/apis.json";
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
    name: "sing",
    version: "3.6",
    author: "Saan",
    countDown: 5,
    role: 0,
    shortDescription: "Search or download MP3",
    longDescription: "Search songs and download MP3 from YouTube",
    category: "MEDIA",
    guide: "{p}sing <song name or YouTube link>"
  },

  onStart: async function ({ api, event, args }) {
    const { threadID, messageID, senderID, messageReply } = event;

    let BASE_URL;

    try {
      BASE_URL = `${await getApiBaseUrl()}/api`;
    } catch (err) {
      console.error("API configuration error:", err.message);
      return api.sendMessage(
        "⚠️ Music API configuration failed. Please try again later.",
        threadID,
        messageID
      );
    }

    const query = args.join(" ").trim();

    if (messageReply?.body) {
      const match = messageReply.body.match(/(https?:\/\/[^\s]+)/);

      if (match?.[0]?.includes("youtu")) {
        return downloadAudio(
          api,
          threadID,
          messageID,
          match[0],
          BASE_URL
        );
      }
    }

    if (query && query.includes("youtu")) {
      return downloadAudio(
        api,
        threadID,
        messageID,
        query,
        BASE_URL
      );
    }

    if (!query) {
      return api.sendMessage(
        "╭━━━『 🎵 𝐒𝐀𝐀𝐍 𝐌𝐔𝐒𝐈𝐂 』━━━╮\n" +
        "┃\n" +
        "┃ 🔎 Enter a song name or YouTube link.\n" +
        "┃\n" +
        "╰━━━━━━━━━━━━━━━━━━╯\n" +
        "➤ Example: /sing Arijit Singh songs",
        threadID,
        messageID
      );
    }

    try {
      const { data } = await axios.get(
        `${BASE_URL}/ytsearch?q=${encodeURIComponent(query)}`,
        { timeout: 30000 }
      );

      const results = data.results?.slice(0, 5);

      if (!results || results.length === 0) {
        return api.sendMessage(
          "❌ No songs found. Try another search.",
          threadID,
          messageID
        );
      }

      let msg =
        "╭━━━『 🎵 𝐌𝐔𝐒𝐈𝐂 𝐒𝐄𝐀𝐑𝐂𝐇 』━━━╮\n\n";

      const attachments = [];
      const tempFiles = [];

      for (let i = 0; i < results.length; i++) {
        const video = results[i];

        msg +=
          `╭─『 ${i + 1} 』\n` +
          `┃ 🎶 ${video.title || "Unknown"}\n` +
          `┃ 👤 ${video.channel || "Unknown"}\n` +
          `┃ ⏱️ ${video.duration || "N/A"}\n` +
          `╰──────────────\n\n`;

        if (video.thumbnail) {
          try {
            const thumbResponse = await axios({
              url: video.thumbnail,
              method: "GET",
              responseType: "arraybuffer",
              timeout: 15000
            });

            const tempThumbPath = path.join(
              __dirname,
              `temp_thumb_${Date.now()}_${i}.jpg`
            );

            fs.writeFileSync(tempThumbPath, thumbResponse.data);
            tempFiles.push(tempThumbPath);
            attachments.push(createReadStream(tempThumbPath));
          } catch (err) {
            console.error(
              `Failed to download thumbnail ${i}:`,
              err.message
            );
          }
        }
      }

      msg +=
        "━━━━━━━━━━━━━━━━━━\n" +
        "📥 Reply with 1–5 to download\n" +
        "👤 𝐒𝐀𝐀𝐍 𝐄𝐗𝐇𝐀𝐔𝐒𝐓𝐄𝐃";

      const messageData = { body: msg };

      if (attachments.length > 0) {
        messageData.attachment = attachments;
      }

      return api.sendMessage(
        messageData,
        threadID,
        (err, info) => {
          tempFiles.forEach(file => {
            try {
              if (fs.existsSync(file)) fs.unlinkSync(file);
            } catch {}
          });

          if (err || !info) {
            console.error("Failed to send search results:", err);
            return;
          }

          global.GoatBot.onReply.set(info.messageID, {
            commandName: this.config.name,
            messageID: info.messageID,
            author: senderID,
            results,
            baseUrl: BASE_URL
          });
        },
        messageID
      );

    } catch (err) {
      console.error("Music search error:", err.message);

      return api.sendMessage(
        "⚠️ Song search failed. Please try again later.",
        threadID,
        messageID
      );
    }
  },

  onReply: async function ({ api, event, Reply }) {
    const { threadID, messageID, body, senderID } = event;

    if (senderID !== Reply.author) return;

    const choice = String(body || "").trim();

    if (!/^[1-5]$/.test(choice)) {
      return api.sendMessage(
        "❌ Invalid choice. Reply with a number from 1 to 5.",
        threadID,
        messageID
      );
    }

    const index = Number(choice) - 1;

    if (index >= Reply.results.length) {
      return api.sendMessage(
        "❌ This song is not available in the search results.",
        threadID,
        messageID
      );
    }

    const selected = Reply.results[index];

    try {
      await api.unsendMessage(Reply.messageID);
    } catch {}

    return downloadAudio(
      api,
      threadID,
      messageID,
      selected.url,
      Reply.baseUrl,
      selected.duration
    );
  }
};

async function downloadAudio(
  api,
  threadID,
  messageID,
  url,
  baseUrl,
  duration = "N/A"
) {
  let waitMsg;
  let tempFilePath = null;

  try {
    waitMsg = await api.sendMessage(
      "⏳ 𝐏𝐑𝐎𝐂𝐄𝐒𝐒𝐈𝐍𝐆 𝐀𝐔𝐃𝐈𝐎...\n🎵 Please wait while your song is downloading.",
      threadID
    );

    const { data } = await axios.get(
      `${baseUrl}/ytmp3?url=${encodeURIComponent(url)}`,
      { timeout: 60000 }
    );

    if (!data.success || !data.url) {
      try {
        if (waitMsg?.messageID) {
          await api.unsendMessage(waitMsg.messageID);
        }
      } catch {}

      return api.sendMessage(
        "❌ Failed to download audio. Please try another song.",
        threadID,
        messageID
      );
    }

    const response = await axios({
      url: data.url,
      method: "GET",
      responseType: "arraybuffer",
      timeout: 120000,
      maxContentLength: 50 * 1024 * 1024
    });

    tempFilePath = path.join(
      __dirname,
      `temp_saan_${Date.now()}.mp3`
    );

    fs.writeFileSync(tempFilePath, response.data);

    try {
      if (waitMsg?.messageID) {
        await api.unsendMessage(waitMsg.messageID);
      }
    } catch {}

    const songTitle = data.title || "Unknown";
    const songDuration = duration || data.duration || "N/A";

    return api.sendMessage(
      {
        body:
          "╭━━━『 🎵 𝐌𝐏𝟑 𝐃𝐎𝐖𝐍𝐋𝐎𝐀𝐃𝐄𝐃 』━━━╮\n" +
          "┃\n" +
          `┃ 🎶 Song: ${songTitle}\n` +
          "┃ 👤 Saan Exhausted\n" +
          `┃ ⏱️ Duration: ${songDuration}\n` +
          "┃\n" +
          "╰━━━━━━━━━━━━━━━━━━╯",
        attachment: createReadStream(tempFilePath)
      },
      threadID,
      err => {
        if (tempFilePath && fs.existsSync(tempFilePath)) {
          try {
            fs.unlinkSync(tempFilePath);
          } catch {}
        }

        if (err) {
          console.error("Error sending audio:", err);

          return api.sendMessage(
            "⚠️ Failed to send the audio file. Please try again.",
            threadID,
            messageID
          );
        }
      },
      messageID
    );

  } catch (err) {
    console.error("Audio download error:", err.message);

    if (tempFilePath && fs.existsSync(tempFilePath)) {
      try {
        fs.unlinkSync(tempFilePath);
      } catch {}
    }

    if (waitMsg?.messageID) {
      try {
        await api.unsendMessage(waitMsg.messageID);
      } catch {}
    }

    return api.sendMessage(
      "⚠️ Failed to process audio. The file may be too large or the API may be unavailable.",
      threadID,
      messageID
    );
  }
}