module.exports = {
  config: {
    name: "gcinfo",
    aliases: ["groupinfo", "ginfo"],
    version: "0.0.7",
    author: "Saan Exhausted",
    countDown: 3,
    role: 0,
    shortDescription: {
      en: "Show group info with photo & fully admins",
    },
    longDescription: {
      en: "Displays detailed information about the current group including group photo, admins.",
    },
    category: "group",
    guide: {
      en: "Type )gcinfo in a group chat",
    },
  },

  onStart: async function ({ api, event }) {
    try {
      const threadID = event.threadID;
      const threadInfo = await api.getThreadInfo(threadID);

      const groupName = threadInfo.threadName || threadInfo.name || "Unknown Group";
      const participantCount = threadInfo.participantIDs?.length || 0;
      
      const adminIDs = threadInfo.adminIDs?.map(a => a.id) || [];
      let adminNames = [];
      
      if (adminIDs.length > 0) {
        for (let i = 0; i < adminIDs.length; i += 100) {
          const batch = adminIDs.slice(i, i + 100);
          const userInfo = await api.getUserInfo(batch);
          batch.forEach(id => {
            adminNames.push(userInfo[id]?.name || "Unknown User");
          });
        }
      }
      
      let adminsText = "";
      if (adminNames.length > 0) {
        adminNames.forEach((name, i) => {
          adminsText += `│  ${i + 1}. ${name}\n`;
        });
      } else {
        adminsText = "│  None\n";
      }
      
      let groupPhotoStream = null;
      if (threadInfo.imageSrc) {
        try {
          const axios = require("axios");
          const response = await axios({
            url: threadInfo.imageSrc,
            method: "GET",
            responseType: "stream",
            timeout: 10000
          });
          groupPhotoStream = response.data;
        } catch (photoErr) {
          console.error("[PHOTO FETCH ERROR]", photoErr);
        }
      }

      const replyText = `
╭─❖
│ 📌 𝐆𝐑𝐎𝐔𝐏 𝐈𝐍𝐅𝐎
├─•
│ 🏷 𝐍𝐚𝐦𝐞: ${groupName}
│ 🆔 𝐆𝐫𝐨𝐮𝐩 𝐈𝐃: ${threadID}
│ 👥 𝐌𝐞𝐦𝐛𝐞ʀs: ${participantCount}
│ 🛡 𝐀𝐝𝐦𝐢ɴs (${adminNames.length}):
${adminsText}│ 📅 𝐂𝐫𝐞𝐚𝐭𝐞𝐝: ${threadInfo.creationTime ? new Date(threadInfo.creationTime).toLocaleDateString() : "Unknown"}
│ 🔰 𝐄𝐦𝐨𝐣𝐢: ${threadInfo.emoji || "None"}
│ 📁 𝐀𝐩𝐩𝐫𝐨𝐯𝐚𝐥: ${threadInfo.approvalMode ? "✅ On" : "❌ Off"}
╰─❖
      `;

      const messageOptions = { body: replyText };
      if (groupPhotoStream) messageOptions.attachment = groupPhotoStream;

      return api.sendMessage(messageOptions, threadID);

    } catch (err) {
      console.error("[GCINFO CMD ERROR]", err);
      return api.sendMessage(
        `╭─❖
│ ❌ 𝐄ʀʀᴏʀ
├─•
│ Failed to fetch group info
│ Error: ${err.message || "Unknown"}
╰─❖`,
        event.threadID
      );
    }
  },
};
