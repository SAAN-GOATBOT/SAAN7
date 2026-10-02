const { getPrefix } = global.utils;
const { commands, aliases } = global.GoatBot;

const brand = "〲 𝐒𝐀𝐀𝐍 𝐄𝐗𝐇𝐀𝐔𝐒𝐓𝐄𝐃 〲";

function desc(c, lang) {
    const d = c.shortDescription || c.description || c.longDescription;
    if (!d) return "No description";
    if (typeof d === "string") return d;
    return d[lang] || d.en || Object.values(d)[0] || "No description";
}

function guide(c, lang, p) {
    let g = c.guide;
    if (!g) return "";
    if (typeof g === "object")
        g = g[lang] || g.en || g.body || Object.values(g).find(x => typeof x === "string") || "";
    if (typeof g !== "string") return "";
    return g.replace(/\{pn\}/g, p + c.name).replace(/\{p\}/g, p);
}

module.exports = {
    config: {
        name: "help",
        version: "3.0",
        author: "𝐒𝐈𝐀𝐌 𝐀𝐇𝐌𝐄𝐃 𝐒𝐀𝐀𝐍",
        countDown: 5,
        role: 0,
        shortDescription: { en: "Browse commands" },
        category: "SYSTEM",
        guide: { en: "{pn} [page | command]" },
        priority: 1
    },

    langs: {
        en: {
            list: `╭━━━〔 𝐒𝐀𝐀𝐍 𝐄𝐗𝐇𝐀𝐔𝐒𝐓𝐄𝐃 〕━━━╮
│ ⚡ 𝗖𝗢𝗠𝗠𝗔𝗡𝗗 𝗖𝗘𝗡𝗧𝗘𝗥
│ 📖 Page %1/%2
│
%3
│
├──────────────
│ 📊 Total: %4
│ 🔑 Prefix: %5
│
│ ◀ %5help <page> ▶
│ 🔎 %5help <command>
╰━━━━━━━━━━━━━━━━╯
%6`,

            notFound: `╭━━〔 ⚠️ 𝗡𝗢𝗧 𝗙𝗢𝗨𝗡𝗗 〕━━╮
│ Command "%1" not found.
╰━━━━━━━━━━━━━━━━╯`,

            badPage: `╭━━〔 ⚠️ 𝗜𝗡𝗩𝗔𝗟𝗜𝗗 〕━━╮
│ Page %1 doesn't exist.
│ Available: 1-%2
╰━━━━━━━━━━━━━━━━╯`,

            info: `╭━━〔 ⚡ 𝗖𝗢𝗠𝗠𝗔𝗡𝗗 〕━━╮
│ 🏷️ %1
│ 📝 %2
│ 🖇️ %3
│ 🧬 v%4
│ 🛡️ %5
│ ⏳ %6s
│ 👤 %7
│
│ 📖 𝗨𝗦𝗔𝗚𝗘
%8
╰━━━━━━━━━━━━━━━━╯`
        }
    },

    onStart: async function ({
        message,
        args,
        event,
        threadsData,
        getLang,
        role
    }) {
        const lang =
            await threadsData.get(event.threadID, "data.lang") ||
            global.GoatBot.config.language;

        const prefix = getPrefix(event.threadID);
        const input = (args[0] || "").toLowerCase();

        const command =
            commands.get(input) ||
            commands.get(aliases.get(input));

        // Command information
        if (command) {
            const c = command.config;
            const permission =
                c.role === 0 ? "All Users" :
                c.role === 1 ? "Admins" : "Bot Owner";

            const usage = guide(c, lang, prefix);

            return message.reply(getLang(
                "info",
                c.name.toUpperCase(),
                desc(c, lang),
                c.aliases?.join(", ") || "None",
                c.version || "1.0.0",
                permission,
                c.countDown || 1,
                c.author || "Unknown",
                usage
                    ? usage.split("\n").map(x => `│ ${x}`).join("\n")
                    : "│ No usage information"
            ));
        }

        // Build accessible command list
        const list = [];

        for (const [name, value] of commands) {
            if (!value?.config || value.config.role > role) continue;

            list.push({
                name,
                category: (value.config.category || "OTHERS").toUpperCase(),
                priority: value.priority || value.config.priority || 0
            });
        }

        list.sort((a, b) =>
            b.priority - a.priority ||
            a.name.localeCompare(b.name)
        );

        // 33 commands × 10 pages = up to 330 commands
        const perPage = 33;
        const totalPages = Math.min(10, Math.max(1, Math.ceil(list.length / perPage)));

        const page =
            /^\d+$/.test(args[0] || "")
                ? parseInt(args[0])
                : 1;

        if (page < 1 || page > totalPages)
            return message.reply(
                getLang("badPage", page, totalPages)
            );

        const icons = {
            AI: "🧠",
            ADMIN: "🛡️",
            SYSTEM: "⚙️",
            UTILITY: "🧰",
            UTILITIES: "🧰",
            FUN: "🎮",
            GAME: "🎮",
            GAMES: "🎲",
            ECONOMY: "💰",
            MUSIC: "🎵",
            MEDIA: "🎬",
            IMAGE: "🖼️",
            IMAGES: "🖼️",
            OWNER: "👑",
            GROUP: "👥",
            GROUPS: "👥",
            SEARCH: "🔎",
            SOCIAL: "🌐",
            TOOLS: "🔧"
        };

        const start = (page - 1) * perPage;

        const output = list
            .slice(start, start + perPage)
            .map((x, i) =>
                `│ ${String(start + i + 1).padStart(3, "0")} ${icons[x.category] || "✦"} ${x.name}`
            )
            .join("\n");

        let nav = "";

        if (page > 1)
            nav += `│ ◀ ${prefix}help ${page - 1}`;

        if (page > 1 && page < totalPages)
            nav += "   ";

        if (page < totalPages)
            nav += `▶ ${prefix}help ${page + 1}`;

        if (!nav)
            nav = `│ ✦ ${prefix}help <command>`;

        return message.reply(
            getLang(
                "list",
                page,
                totalPages,
                output,
                list.length,
                prefix,
                `${nav}\n│ ${brand}`
            )
        );
    }
};
