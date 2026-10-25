const axios = require("axios");

const REPO_OWNER = "Saan-Irl";
const REPO_NAME = "Enyo";
const REPO_LINK = `https://github.com/${REPO_OWNER}/${REPO_NAME}`;
const REPO_API = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}`;

module.exports = {
  config: {
    name: "fork",
    version: "5.0",
    author: "𝐒𝐢𝐚𝐦 𝐀𝐡𝐦𝐞𝐝 𝐒𝐚𝐚𝐧",
    countDown: 5,
    role: 0,
    shortDescription: "Premium GitHub Repository",
    category: "utility",
    guide: {
      en: "{p}fork"
    }
  },

  langs: {
    en: {
      current:
`╭━━━〔 𝐒𝐀𝐀𝐍 𝐄𝐗𝐇𝐀𝐔𝐒𝐓𝐄𝐃 〕━━━╮
┃
┃  ✦ 𝐆𝐈𝐓𝐇𝐔𝐁 𝐑𝐄𝐏𝐎𝐒𝐈𝐓𝐎𝐑𝐘
┃
┃  ❖ 𝐑𝐄𝐏𝐎  : 𝐄𝐧𝐲𝐨
┃  ⭐ 𝐒𝐓𝐀𝐑𝐒 : %2
┃  🍴 𝐅𝐎𝐑𝐊𝐒 : %3
┃
┃  ⌁ 𝐑𝐄𝐏𝐎 𝐋𝐈𝐍𝐊
┃  %1
┃
┣━━━━━━━━━━━━━━━━━━━━━━
┃  ♛ 𝐃𝐄𝐕𝐄𝐋𝐎𝐏𝐄𝐑
┃
┃  𝐒𝐢𝐚𝐦 𝐀𝐡𝐦𝐞𝐝 𝐒𝐚𝐚𝐧
┃  𝐒𝐀𝐀𝐍 𝐄𝐗𝐇𝐀𝐔𝐒𝐓𝐄𝐃
┃
╰━━━━━━━━━━━━━━━━━━━━━━╯`
    }
  },

  onStart: async function ({ message, getLang }) {
    const { stars, forks } = await getRepoStats();

    return message.reply(
      getLang("current", REPO_LINK, stars, forks)
    );
  },

  onChat: async function ({ message, getLang, event }) {
    if (
      event.body &&
      event.body.trim().toLowerCase() === "fork"
    ) {
      const { stars, forks } = await getRepoStats();

      return message.reply(
        getLang("current", REPO_LINK, stars, forks)
      );
    }
  }
};

async function getRepoStats() {
  try {
    const { data } = await axios.get(REPO_API, {
      timeout: 10000,
      headers: {
        Accept: "application/vnd.github+json"
      }
    });

    return {
      stars: data.stargazers_count ?? "N/A",
      forks: data.forks_count ?? "N/A"
    };
  } catch (error) {
    return {
      stars: "N/A",
      forks: "N/A"
    };
  }
}