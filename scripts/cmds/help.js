const axios = require("axios");
const { getPrefix } = global.utils;
const { commands, aliases } = global.GoatBot;

const mediaUrls = [
  "https://i.imgur.com/U052kne.gif"
];

module.exports = {
  config: {
    name: "help",
    aliases: ["h"],
    version: "1.25",
    author: "Ayanokōji fixed by Toshiro 𝗦𝗮𝗮𝗻 𝗘𝘅𝗵𝗮𝘂𝘀𝘁𝗲𝗱",
    countDown: 5,
    role: 0,
    shortDescription: {
      en: "Explore command usage 📖"
    },
    longDescription: {
      en: "View detailed command usage, list commands by page, or filter by category ✨"
    },
    category: "info",
    guide: {
      en: "{pn} [page]\n{pn} [command]\n{pn} -c <category>"
    },
    priority: 1
  },

  onStart: async function ({ message, args, event }) {
    try {
      const { threadID } = event;
      const prefix = getPrefix(threadID) || "!";

      const getAttachment = async () => {
        try {
          const randomUrl =
            mediaUrls[Math.floor(Math.random() * mediaUrls.length)];

          const response = await axios({
            method: "GET",
            url: randomUrl,
            responseType: "stream",
            timeout: 30000,
            maxRedirects: 5,
            headers: {
              "User-Agent":
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/138.0.0.0 Safari/537.36",
              Accept: "*/*",
              Referer: "https://imgur.com/"
            }
          });

          console.log("Media Status:", response.status);
          console.log("Content-Type:", response.headers["content-type"]);

          return response.data;
        } catch (err) {
          console.error("Attachment Error:");
          console.error("Status:", err.response?.status);
          console.error("Message:", err.message);
          return null;
        }
      };
      // PAGE VIEW
      if (args.length === 0 || !isNaN(args[0])) {
        const categories = {};
        const commandList = [];

        for (const [name, value] of commands) {
          const category = (value.config.category || "uncategorized").toLowerCase();

          if (!categories[category])
            categories[category] = [];

          categories[category].push(name);
          commandList.push(name);
        }

        const totalCommands = commandList.length;

        Object.keys(categories).forEach(cat => {
          categories[cat].sort((a, b) => a.localeCompare(b));
        });

        const sortedCategories = Object.keys(categories).sort();

        const page = parseInt(args[0]) || 1;
        const itemsPerPage = 10;
        const totalPages = Math.ceil(sortedCategories.length / itemsPerPage);

        if (page < 1 || page > totalPages) {
          return message.reply(
            `🚫 Invalid page!\nPlease choose between 1 and ${totalPages}.`
          );
        }

        const start = (page - 1) * itemsPerPage;
        const end = start + itemsPerPage;
        const pagedCategories = sortedCategories.slice(start, end);

        let msg = `✨ [ Guide For Beginners - Page ${page} ] ✨\n\n`;

        for (const category of pagedCategories) {
          const cmds = categories[category];
          msg += `╒══════[ ${category.toUpperCase()} ]\n`;
          msg += `╞》 ${cmds.join(" ♡ ")}\n`;
          msg += `╘══════════════════╛\n`;
        }

        msg += `\n╭‣『 ALYA BOT 』\n`;
        msg += `╰‣ Total Commands: ${totalCommands}\n`;
        msg += `╭‣ Page ${page}/${totalPages}\n`;
        msg += `╰‣ Prefix: ${prefix}\n`;
        msg += `╭‣ Admin: 𝗦𝗶𝗮𝗺 𝗔𝗵𝗺𝗲𝗱 𝗦𝗮𝗮𝗻\n`;
        msg += `╰‣ Type ${prefix}help <command> for details`;

        return message.reply({
          body: msg,
          attachment: await getAttachment()
        });
      }

      // CATEGORY FILTER
      if (args[0].toLowerCase() === "-c") {
        if (!args[1])
          return message.reply("🚫 Please specify a category!");

        const categoryName = args[1].toLowerCase();

        const filteredCommands = Array.from(commands.values()).filter(
          cmd => (cmd.config.category || "").toLowerCase() === categoryName
        );

        if (!filteredCommands.length) {
          return message.reply(
            `🚫 No commands found in "${categoryName}" category.`
          );
        }

        const cmdNames = filteredCommands
          .map(cmd => cmd.config.name)
          .sort((a, b) => a.localeCompare(b));

        let msg = `✨ [ ${categoryName.toUpperCase()} Commands ] ✨\n\n`;
        msg += `╒══════[ ${categoryName.toUpperCase()} ]\n`;
        msg += `╞》 ${cmdNames.join(" ♡ ")}\n`;
        msg += `╘══════════════════╛\n\n`;
        msg += `╭‣ Total: ${cmdNames.length}\n`;
        msg += `╰‣ Prefix: ${prefix}`;

        return message.reply({
          body: msg,
          attachment: await getAttachment()
        });
      }
      // INDIVIDUAL COMMAND
      const commandName = args[0].toLowerCase();
      const command =
        commands.get(commandName) ||
        commands.get(aliases.get(commandName));

      if (!command) {
        return message.reply(`❌ Command "${commandName}" not found.`);
      }

      const configCommand = command.config;

      const guide =
        configCommand.guide?.en ||
        "No guide available.";

      const usage = guide
        .replace(/{pn}/g, prefix)
        .replace(/{n}/g, configCommand.name);

      let msg = `✨ [ ${configCommand.name.toUpperCase()} ] ✨\n\n`;

      msg += `╭─── 📜 INFORMATION ───╮\n`;
      msg += `│ 🏷 Name: ${configCommand.name}\n`;
      msg += `│ 📝 Description: ${configCommand.longDescription?.en || "No description"}\n`;
      msg += `│ 📂 Category: ${configCommand.category || "None"}\n`;
      msg += `│ 🌐 Aliases: ${configCommand.aliases?.join(", ") || "None"}\n`;
      msg += `│ 👤 Author: ${configCommand.author || "Unknown"}\n`;
      msg += `│ ⚙ Version: ${configCommand.version || "1.0"}\n`;
      msg += `│ ⏳ Cooldown: ${configCommand.countDown || 1}s\n`;
      msg += `│ 🔐 Permission: ${configCommand.role || 0}\n`;
      msg += `╰────────────────────╯\n\n`;

      msg += `📖 Usage:\n${usage}\n\n`;

      msg += `╭‣ Total Commands: ${commands.size}\n`;
      msg += `╰‣ Prefix: ${prefix}`;

      return message.reply({
        body: msg,
        attachment: await getAttachment()
      });

    } catch (err) {
      console.error(err);

      return message.reply(
        `❌ Error: ${err.message}`
      );
    }
  }
};
