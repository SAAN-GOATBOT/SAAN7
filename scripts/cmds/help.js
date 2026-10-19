const { getPrefix } = global.utils;
const { commands, aliases } = global.GoatBot;

const FOOTER = "〲 𝐒𝐀𝐀𝐍 𝐄𝐗𝐇𝐀𝐔𝐒𝐓𝐄𝐃 〲";

function getDescription(c, lang) {
	let d = c.shortDescription || c.description || c.longDescription;
	if (!d) return "No Description";
	if (typeof d === "string") return d;
	return d[lang] || d.en || Object.values(d)[0] || "No Description";
}

function getGuide(c, lang, prefix) {
	let g = c.guide;
	if (!g) return "";
	if (typeof g === "object")
		g = g[lang] || g.en || g.body ||
			Object.values(g).find(x => typeof x === "string") || "";
	if (typeof g !== "string") return "";
	return g.replace(/\{pn\}/g, prefix + c.name).replace(/\{p\}/g, prefix);
}

module.exports = {
	config: {
		name: "help",
		version: "3.6",
		author: "𝐒𝐈𝐀𝐌 𝐀𝐇𝐌𝐄𝐃 𝐒𝐀𝐀𝐍",
		countDown: 5,
		role: 0,
		shortDescription: { en: "View command usage" },
		longDescription: { en: "View command usage" },
		category: "SYSTEM",
		guide: { en: "{pn} [page | command name]" },
		priority: 1
	},

	langs: {
		en: {
			help:
				"⚡ AVAILABLE COMMANDS ⚡\n" +
				"━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n" +
				"%1\n" +
				"━━━━━━━━━━━━━━━━━━━━━━━━━━\n" +
				"📄 Page: %2/3\n" +
				"📊 Total: %3 commands\n" +
				"🔑 Prefix: [ %4 ]\n" +
				"✨ %5",

			notFound: "⚠️ Command \"%1\" not found!",

			info:
				"📌 COMMAND INFORMATION\n" +
				"━━━━━━━━━━━━━━━━━━━━━━━━━━\n" +
				"🏷️ Name: %1\n" +
				"📝 Description: %2\n" +
				"🖇️ Aliases: %3\n" +
				"🧬 Version: %4\n" +
				"🛡️ Permission: %5\n" +
				"⏳ Cooldown: %6s\n" +
				"👤 Author: %7\n" +
				"━━━━━━━━━━━━━━━━━━━━━━━━━━\n" +
				"📖 USAGE\n" +
				"%8\n" +
				"━━━━━━━━━━━━━━━━━━━━━━━━━━",

			page: "❌ Page %1 is out of range! Use page 1, 2 or 3."
		}
	},

	onStart: async function ({ message, args, event, threadsData, getLang, role }) {
		const lang =
			await threadsData.get(event.threadID, "data.lang") ||
			global.GoatBot.config.language;

		const prefix = getPrefix(event.threadID);
		const input = (args[0] || "").toLowerCase();

		const cmd =
			commands.get(input) ||
			commands.get(aliases.get(input));

		if (!cmd && (!args[0] || !isNaN(args[0]))) {
			const list = [];

			for (const [name, value] of commands) {
				if (!value?.config || value.config.role > role) continue;

				list.push({
					name,
					cat: (value.config.category || "OTHERS").toUpperCase(),
					priority: value.priority || value.config.priority || 0
				});
			}

			list.sort((a, b) =>
				a.cat.localeCompare(b.cat) ||
				b.priority - a.priority ||
				a.name.localeCompare(b.name)
			);

			const total = list.length;
			const TOTAL_PAGES = 3;
			const base = Math.floor(total / TOTAL_PAGES);
			const rem = total % TOTAL_PAGES;

			const sizes = [
				base + (rem > 0 ? 1 : 0),
				base + (rem > 1 ? 1 : 0),
				base
			];

			const page = parseInt(args[0]) || 1;

			if (page < 1 || page > TOTAL_PAGES)
				return message.reply(getLang("page", page));

			let start = 0;
			for (let i = 0; i < page - 1; i++)
				start += sizes[i];

			const pageItems = list.slice(
				start,
				start + sizes[page - 1]
			);

			const size = Math.ceil(pageItems.length / 3);

			const sections = [
				pageItems.slice(0, size),
				pageItems.slice(size, size * 2),
				pageItems.slice(size * 2)
			];

			function buildSection(items) {
				if (!items.length) return "";

				const cats = {};

				for (const item of items) {
					if (!cats[item.cat]) cats[item.cat] = [];
					cats[item.cat].push(item.name);
				}

				let out = "";

				for (const cat of Object.keys(cats)) {
					out +=
						`┌──『 📃 ${cat} (${cats[cat].length}) 』\n` +
						`└➤ ${cats[cat].join(", ")}\n\n`;
				}

				return out.trim();
			}

			const content = sections
				.map(buildSection)
				.filter(Boolean)
				.join("\n\n");

			return message.reply(
				getLang(
					"help",
					content,
					page,
					total,
					prefix,
					FOOTER
				)
			);
		}

		if (!cmd)
			return message.reply(getLang("notFound", args[0]));

		const c = cmd.config;

		const permission =
			c.role == 0
				? "All Users"
				: c.role == 1
				? "Admins"
				: "Bot Owner";

		const usage = getGuide(c, lang, prefix)
			.split("\n")
			.map(line => `   ${line}`)
			.join("\n");

		return message.reply(
			getLang(
				"info",
				c.name.toUpperCase(),
				getDescription(c, lang),
				c.aliases?.join(", ") || "None",
				c.version || "1.0.0",
				permission,
				c.countDown || 1,
				c.author || "Unknown",
				usage
			)
		);
	}
};
