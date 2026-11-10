const moment = require("moment-timezone");

module.exports = {
  config: {
    name: "owner",
    aliases: ["admininfo", "info", "ownerinfo"],
    version: "3.0",
    author: "Saan",
    countDown: 5,
    role: 0,
    shortDescription: { en: "Show owner information" },
    category: "owner",
    guide: { en: "{pn}" }
  },

  onStart: async function ({ api, event, message }) {

    const ownerName = "Siam Ahmed Saan";
    const ownerAge = "23";
    const fbName = "Siam Ahmed Saan";
    const messenger = "https://www.facebook.com/siam.ahmed.491801";
    
    const telegram = "@saansupremacy";
    const address = "Dhaka, Gulshan, Road 133";



    const brandName = "Saan Exhausted";
    const instagram = "https://www.instagram.com/siam_exists/";
    const tiktok = "https://www.tiktok.com/@saan.16";
    const youtube = "https://www.youtube.com/@saan-exists";
    const videoLink = "https://files.catbox.moe/vd43nx.mp4";
    const timeBD = moment().tz("Asia/Dhaka");
    
    const infoMsg = 
`『 𝗢𝗪𝗡𝗘𝗥 𝗜𝗡𝗙𝗢𝗥𝗠𝗔𝗧𝗜𝗢𝗡 』
━━━━━━━━━━━━━━━━━━━━━

👤 𝗔𝗕𝗢𝗨𝗧 𝗠𝗘:
● Name: ${ownerName}
● Brand: ${brandName}
● Age: ${ownerAge}
● Address: ${address}

📞 𝗖𝗢𝗡𝗧𝗔𝗖𝗧 𝗗𝗘𝗧𝗔𝗜𝗟𝗦:
● Facebook: ${fbName}
● Fb Link: ${messenger}
● Telegram: ${telegram}
● Instagram: ${instagram}
● TikTok: ${tiktok}
● YouTube: ${youtube}

⏰ 𝗗𝗔𝗧𝗘 & 𝗧𝗜𝗠𝗘 (𝗕𝗗):
● ${timeBD.format("DD MMMM, YYYY")}
● ${timeBD.format("hh:mm:ss A")}
━━━━━━━━━━━━━━━━━━━━━`;

    try {
      return message.reply({
        body: infoMsg,
        attachment: await global.utils.getStreamFromURL(videoLink)
      });
    } catch (e) {
      return message.reply(infoMsg);
    }
  },

  onChat: async function ({ event, message }) {
    if (event.body?.toLowerCase() === "info") {
      return this.onStart({ message, event });
    }
  }
};
