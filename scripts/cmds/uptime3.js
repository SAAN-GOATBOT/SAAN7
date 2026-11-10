const os = require("os");

module.exports = {
  config: {
    name: "uptime3",
    aliases: ["upt3"],
    version: "3.0",
    author: "Saan",
    countDown: 5,
    role: 0,
    description: "Detailed bot uptime and server statistics",
    category: "system",
    guide: "{pn}"
  },

  onStart: async function ({ api, event, message, usersData, threadsData }) {
    const startTime = Date.now();

    const loadingFrames = [
      "╭━━━〔 𝗦𝗬𝗦𝗧𝗘𝗠 𝗦𝗖𝗔𝗡𝗡𝗜𝗡𝗚 〕━━━╮\n┃\n┃ [ ▰▱▱▱▱▱▱▱ ] 𝗦𝗖𝗔𝗡𝗡𝗜𝗡𝗚\n┃\n┃ ◈ Initializing system...\n╰━━━━━━━━━━━━━━━━━━━━━━╯",
      "╭━━━〔 𝗦𝗬𝗦𝗧𝗘𝗠 𝗦𝗖𝗔𝗡𝗡𝗜𝗡𝗚 〕━━━╮\n┃\n┃ [ ▰▰▰▱▱▱▱▱ ] 𝗦𝗖𝗔𝗡𝗡𝗜𝗡𝗚\n┃\n┃ ◈ Reading database...\n╰━━━━━━━━━━━━━━━━━━━━━━╯",
      "╭━━━〔 𝗦𝗬𝗦𝗧𝗘𝗠 𝗦𝗖𝗔𝗡𝗡𝗜𝗡𝗚 〕━━━╮\n┃\n┃ [ ▰▰▰▰▰▰▱▱ ] 𝗦𝗖𝗔𝗡𝗡𝗜𝗡𝗚\n┃\n┃ ◈ Analyzing server specs...\n╰━━━━━━━━━━━━━━━━━━━━━━╯",
      "╭━━━〔 𝗦𝗬𝗦𝗧𝗘𝗠 𝗦𝗖𝗔𝗡𝗡𝗜𝗡𝗚 〕━━━╮\n┃\n┃ [ ▰▰▰▰▰▰▰▰ ] 𝗖𝗢𝗠𝗣𝗟𝗘𝗧𝗘\n┃\n┃ ◈ Generating system report...\n╰━━━━━━━━━━━━━━━━━━━━━━╯"
    ];

    let loading;

    const edit = (text, messageID) =>
      new Promise((resolve, reject) => {
        api.editMessage(text, messageID, (err, result) => {
          if (err) return reject(err);
          resolve(result);
        });
      });

    try {
      loading = await message.reply(loadingFrames[0]);

      for (let i = 1; i < loadingFrames.length; i++) {
        await new Promise(resolve => setTimeout(resolve, 700));
        await edit(loadingFrames[i], loading.messageID);
      }

      const formatUptime = seconds => {
        const d = Math.floor(seconds / 86400);
        const h = Math.floor((seconds % 86400) / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = Math.floor(seconds % 60);
        return `${d}d ${h}h ${m}m ${s}s`;
      };

      const formatBytes = bytes => {
        if (!bytes) return "0 Bytes";
        const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
      };

      const [allUsers, allThreads] = await Promise.all([
        usersData.getAll().catch(() => []),
        threadsData.getAll().catch(() => [])
      ]);

      const botUptime = process.uptime();
      const serverUptime = os.uptime();
      const totalMem = os.totalmem();
      const freeMem = os.freemem();
      const usedMem = totalMem - freeMem;
      const cpus = os.cpus() || [];
      const cpuModel = cpus[0]?.model || "Unknown CPU";
      const cpuCores = cpus.length;
      const loadAvg = os.loadavg();

      const botName =
        global.GoatBot?.config?.nickNameBot ||
        global.config?.nickNameBot ||
        "Enyo Goat Bot";

      const prefix =
        global.GoatBot?.config?.PREFIX ||
        global.config?.PREFIX ||
        "/";

      const totalCommands =
        global.GoatBot?.commands?.size ||
        global.client?.commands?.size ||
        0;

      const now = new Date();

      const currentDate = now.toLocaleDateString("bn-BD", {
        timeZone: "Asia/Dhaka",
        year: "numeric",
        month: "long",
        day: "numeric"
      });

      const currentTime = now.toLocaleTimeString("en-US", {
        timeZone: "Asia/Dhaka",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true
      });

      const ping = Date.now() - startTime;

      const msg =
        `┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓\n` +
        `┃       ✨ 𝗨𝗣𝗧𝗜𝗠𝗘 & 𝗦𝗧𝗔𝗧𝗦 ✨      ┃\n` +
        `┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫\n` +
        `┃ ⏱️ 𝐁𝐨𝐭 𝐔𝐩𝐭𝐢𝐦𝐞  : ${formatUptime(botUptime)}\n` +
        `┃ 🖥️ 𝐒𝐞𝐫𝐯𝐞𝐫 𝐔𝐩𝐭𝐢𝐦𝐞: ${formatUptime(serverUptime)}\n` +
        `┃ 📅 𝐀𝐉𝐊𝐄𝐑 𝐃𝐀𝐓𝐄 : ${currentDate}\n` +
        `┃ ⏰ 𝐁𝐃 𝐓𝐈𝐌𝐄     : ${currentTime}\n` +
        `┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫\n` +
        `┃ 🤖 𝐁𝐨𝐭 𝐍𝐚𝐦𝐞   : ${botName}\n` +
        `┃ 🏓 𝐁𝐨𝐭 𝐏𝐢𝐧𝐠   : ${ping}ms\n` +
        `┃ 💻 𝐎𝐒 𝐀𝐫𝐜𝐡    : ${os.platform()} (${os.arch()})\n` +
        `┃ 📂 𝐏𝐫𝐞𝐟𝐢𝐱     : ${prefix}\n` +
        `┃ 📦 𝐂𝐨𝐦𝐦𝐚𝐧𝐝𝐬  : ${totalCommands} Commands\n` +
        `┃ 👥 𝐓𝐨𝐭𝐚𝐥 𝐔𝐬𝐞𝐫𝐬: ${allUsers.length}\n` +
        `┃ 💬 𝐓𝐨𝐭𝐚𝐥 𝐆𝐫𝐨𝐮𝐩𝐬: ${allThreads.length}\n` +
        `┃ 🧠 𝐂𝐏𝐔 𝐌𝐨𝐝𝐞𝐥  : ${cpuModel}\n` +
        `┃ ⚙️ 𝐂𝐏𝐔 𝐂𝐨𝐫𝐞𝐬  : ${cpuCores} Cores\n` +
        `┃ 📊 𝐋𝐨𝐚𝐝 𝐀𝐯𝐠   : ${loadAvg.map(x => x.toFixed(2)).join(", ")}\n` +
        `┃ 💾 𝐑𝐀𝐌 𝐓𝐨𝐭𝐚𝐥  : ${formatBytes(totalMem)}\n` +
        `┃ ⚡ 𝐑𝐀𝐌 𝐔𝐬𝐞𝐝   : ${formatBytes(usedMem)} (${((usedMem / totalMem) * 100).toFixed(1)}%)\n` +
        `┃ 🔋 𝐑𝐀𝐌 𝐅𝐫𝐞𝐞   : ${formatBytes(freeMem)}\n` +
        `┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫\n` +
        `┃ 👑 𝐀𝐮𝐭𝐡𝐨𝐫 : Saan\n` +
        `┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛`;

      return await edit(msg, loading.messageID);

    } catch (error) {
      const errorText = `❌ 𝗦𝗬𝗦𝗧𝗘𝗠 𝗘𝗥𝗥𝗢𝗥\n\n${error.message}`;

      if (loading?.messageID) {
        return edit(errorText, loading.messageID).catch(() => {});
      }

      return message.reply(errorText);
    }
  }
};
