const axios = require("axios");

module.exports = {
  config: {
    name: "fork",
    version: "1.0",
    author: "Siam Ahmed Saan",
    countDown: 3,
    role: 0,
    category: "utility",
    shortDescription: "GitHub Fork Info",
    longDescription: "Fetch repository fork details",
    guide: {
      en: "{pn}"
    }
  },

  onStart: async function ({ message }) {
    try {
      const repo = "SAAN-GOATBOT/SAAN7";
      const res = await axios.get(`https://api.github.com/repos/${repo}`);
      const data = res.data;

      const msg = `╭──〔 𝐆𝐈𝐓𝐇𝐔𝐁 𝐅𝐎𝐑𝐊 〕──╮\n│\n│ 📦 Repo: ${data.name}\n│ 👑 Owner: ${data.owner.login}\n│ 🍴 Forks: ${data.forks_count}\n│ ⭐ Stars: ${data.stargazers_count}\n│ 👀 Watchers: ${data.watchers_count}\n│\n│ 🔗 Link:\n│ ${data.html_url}\n│\n╰─────────────────────`;

      return message.reply(msg);

    } catch (err) {
      console.error("Fork Error:", err);
      return message.reply("❌ Failed to fetch repository info.");
    }
  }
};
