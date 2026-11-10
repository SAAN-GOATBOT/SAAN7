"use strict";

const fs = require("fs");
const path = require("path");

const CONFIG = {
	storeApi: (process.env.GOATSTORE_API_URL || "https://cmdstore.neokex.xyz").replace(/\/+$/, ""),
	storeKey: process.env.GOATSTORE_INGEST_TOKEN || "",
	pasteApi: process.env.NEOKEX_PASTE_URL || "https://paste.neokex.xyz/api/pastes",
	pasteKey: process.env.NEOKEX_PASTE_KEY || "neokex-paste-6t9",
	pasteTtlDays: 30,
	uploadDelayMs: 1200,
	pageSize: 6,
	timeoutMs: 20000,
	selfNames: ["commandstore", "cmdstore", "goatstore"],
	autoPublish: process.env.GOATSTORE_AUTO_PUBLISH !== "false"
};

let axios;

try {
	axios = require("axios");
} catch {
	axios = null;
}

const isAxios = Boolean(axios);

function request(options, body) {
	if (isAxios) {
		return axios({
			method: options.method,
			url: options.url,
			headers: options.headers,
			data: body,
			timeout: CONFIG.timeoutMs,
			maxRedirects: 3,
			validateStatus: () => true
		});
	}

	return httpRequest(options.url, options, body, 0);
}

function httpRequest(rawUrl, options, body, redirects) {
	return new Promise((resolve, reject) => {
		const url = new URL(rawUrl);
		const transport = url.protocol === "http:" ? require("http") : require("https");

		const req = transport.request(
			{
				method: options.method,
				hostname: url.hostname,
				port: url.port || (url.protocol === "http:" ? 80 : 443),
				path: `${url.pathname}${url.search}`,
				headers: options.headers
			},
			(res) => {
				if (
					res.statusCode >= 300 &&
					res.statusCode < 400 &&
					res.headers.location &&
					redirects < 3
				) {
					res.resume();

					resolve(
						httpRequest(
							new URL(res.headers.location, url).toString(),
							options,
							body,
							redirects + 1
						)
					);

					return;
				}

				let data = "";

				res.setEncoding("utf8");

				res.on("data", (chunk) => {
					data += chunk;
				});

				res.on("end", () => {
					resolve({
						status: res.statusCode,
						data,
						headers: res.headers
					});
				});
			}
		);

		req.on("error", reject);

		req.setTimeout(CONFIG.timeoutMs, () => {
			req.destroy(new Error("request timed out"));
		});

		if (body) req.write(body);

		req.end();
	});
}

function parseBody(response) {
	const data = response.data;

	if (data && typeof data === "object") return data;

	try {
		return JSON.parse(data);
	} catch {
		return {};
	}
}

function sleep(ms) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

function truncate(value, max) {
	const text = String(value === null || value === undefined ? "" : value)
		.replace(/\s+/g, " ")
		.trim();

	if (text.length <= max) return text;

	return `${text.slice(0, max - 1)}…`;
}

function alignColumns(rows) {
	const parts = rows.map((row) => {
		const at = row.indexOf("\t");

		return at === -1
			? [row, null]
			: [row.slice(0, at), row.slice(at + 1)];
	});

	const width = Math.max(0, ...parts.map(([left]) => left.length)) + 1;

	return parts.map(([left, right]) =>
		right === null
			? left
			: `${left}${" ".repeat(Math.max(1, width - left.length))}${right}`
	);
}

function formatStamp(value) {
	if (!value) return "";

	const date = new Date(value);

	if (Number.isNaN(date.getTime())) return String(value);

	const pad = (n) => String(n).padStart(2, "0");

	return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())} ${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())} UTC`;
}

function boldText(value) {
	const chars = {
		A: "𝗔", B: "𝗕", C: "𝗖", D: "𝗗", E: "𝗘",
		F: "𝗙", G: "𝗚", H: "𝗛", I: "𝗜", J: "𝗝",
		K: "𝗞", L: "𝗟", M: "𝗠", N: "𝗡", O: "𝗢",
		P: "𝗣", Q: "𝗤", R: "𝗥", S: "𝗦", T: "𝗧",
		U: "𝗨", V: "𝗩", W: "𝗪", X: "𝗫", Y: "𝗬",
		Z: "𝗭",
		0: "𝟬", 1: "𝟭", 2: "𝟮", 3: "𝟯", 4: "𝟰",
		5: "𝟱", 6: "𝟲", 7: "𝟳", 8: "𝟴", 9: "𝟵"
	};

	return String(value)
		.toUpperCase()
		.split("")
		.map((char) => chars[char] || char)
		.join("");
}

function formatHeading(title) {
	return `[ ${boldText(title)} ]`;
}

function card(title, body = [], footer) {
	const lines = [`┌─ ${formatHeading(title)}`];

	for (const line of body) {
		lines.push(line ? `│ ${line}` : "│");
	}

	if (footer) {
		lines.push(`└─ ${footer}`);
	} else {
		lines.push("└────────────────⭔");
	}

	return lines.join("\n");
}

function commandCard(item, index) {
	const rank = String(index + 1).padStart(2, "0");

	return card(
		`${rank} · ${truncate(item.name, 30)}`,
		[
			`ID       #${item.id}`,
			`Author   ${truncate(item.author || "Unknown", 24)}`,
			`Version  v${item.latestVersion || "Unknown"}`,
			`Category ${truncate(item.category || "Uncategorized", 20)}`
		]
	);
}

function notice(title, message, footer) {
	return card(title, [String(message)], footer);
}

function parseConfig(source) {
	const readString = (key) => {
		const re = new RegExp(`${key}\\s*:\\s*(['"\`])((?:(?!\\1).)*)\\1`, "s");
		const m = source.match(re);

		return m ? m[2] : undefined;
	};

	const readNumber = (key) => {
		const m = source.match(new RegExp(`${key}\\s*:\\s*(-?\\d+)`));

		return m ? Number(m[1]) : undefined;
	};

	const aliases = [];
	const aliasMatch = source.match(/aliases\s*:\s*\[([^\]]*)\]/s);

	if (aliasMatch) {
		for (const m of aliasMatch[1].matchAll(/['"`]([^'"`]+)['"`]/g)) {
			aliases.push(m[1]);
		}
	}

	return {
		name: readString("name"),
		author: readString("author") || "unknown",
		version: readString("version") || "1.0.0",
		category: readString("category") || "uncategorized",
		aliases,
		role: readNumber("role"),
		countDown: readNumber("countDown")
	};
}

function detectRepo() {
	if (process.env.GOATSTORE_REPO) {
		return process.env.GOATSTORE_REPO;
	}

	try {
		const gitConfig = fs.readFileSync(
			path.join(process.cwd(), ".git", "config"),
			"utf8"
		);

		const m = gitConfig.match(/url\s*=\s*(.+)/);

		if (m) {
			const url = m[1].trim();
			const ssh = url.match(/git@[^:]+:([^/]+\/[^/]+?)(?:\.git)?$/);

			if (ssh) return ssh[1];

			const https = url.match(/github\.com[/:]([^/]+\/[^/]+?)(?:\.git)?$/);

			if (https) return https[1];
		}
	} catch {
	}

	try {
		const pkg = JSON.parse(
			fs.readFileSync(path.join(process.cwd(), "package.json"), "utf8")
		);

		const repository =
			typeof pkg.repository === "string"
				? pkg.repository
				: pkg.repository?.url;

		if (repository) {
			const m = repository.match(/([^/]+\/[^/]+?)(?:\.git)?$/);

			if (m) return m[1];
		}
	} catch {
	}

	return "unknown/unknown";
}

async function uploadToPaste(source) {
	const headers = {
		"Content-Type": "text/plain; charset=utf-8"
	};

	if (CONFIG.pasteKey) {
		headers.Authorization = `Bearer ${CONFIG.pasteKey}`;
	}

	const response = await request(
		{
			method: "POST",
			url: `${CONFIG.pasteApi}?duration=${CONFIG.pasteTtlDays}d&ttl=${CONFIG.pasteTtlDays * 86400}`,
			headers
		},
		source
	);

	if (response.status < 200 || response.status >= 300) {
		const body = parseBody(response);

		throw new Error(
			body?.error?.message || `paste host responded ${response.status}`
		);
	}

	const body = parseBody(response);

	return {
		id: body.id,
		rawUrl: body.rawUrl || body.shortRawUrl || body.url
	};
}

async function submitToStore(payload) {
	const headers = {
		"Content-Type": "application/json"
	};

	if (CONFIG.storeKey) {
		headers.Authorization = `Bearer ${CONFIG.storeKey}`;
	}

	const response = await request(
		{
			method: "POST",
			url: `${CONFIG.storeApi}/api/commands/bulk`,
			headers
		},
		JSON.stringify(payload)
	);

	const body = parseBody(response);

	if (response.status < 200 || response.status >= 300) {
		throw new Error(
			body?.error?.message || `store responded ${response.status}`
		);
	}

	return body;
}

async function storeGet(endpoint, query) {
	const url = new URL(`${CONFIG.storeApi}${endpoint}`);

	for (const [key, value] of Object.entries(query || {})) {
		if (value === undefined || value === null || value === "") continue;

		url.searchParams.set(key, String(value));
	}

	const headers = {
		Accept: "application/json"
	};

	if (CONFIG.storeKey) {
		headers.Authorization = `Bearer ${CONFIG.storeKey}`;
	}

	const response = await request({
		method: "GET",
		url: url.toString(),
		headers
	});

	const body = parseBody(response);

	if (response.status < 200 || response.status >= 300) {
		const error = new Error(
			body?.error?.message || `store responded ${response.status}`
		);

		error.status = response.status;

		throw error;
	}

	return body;
}

function listCommandFiles(filter) {
	const dir = __dirname;

	const files = fs
		.readdirSync(dir)
		.filter((f) => f.endsWith(".js"))
		.filter((f) => !CONFIG.selfNames.includes(f.replace(/\.js$/, "").toLowerCase()));

	if (!filter) return files;

	const wanted = filter.toLowerCase().replace(/\.js$/, "");

	return files.filter(
		(f) => f.replace(/\.js$/, "").toLowerCase() === wanted
	);
}

function log(message) {
	try {
		console.log(`[commandstore] ${message}`);
	} catch {
	}
}

async function publish(files) {
	const repo = detectRepo();
	const commands = [];
	const skipped = [];

	for (const filename of files) {
		let source;

		try {
			source = fs.readFileSync(path.join(__dirname, filename), "utf8");
		} catch (err) {
			skipped.push(`${filename}: ${err.message}`);
			continue;
		}

		if (!source.includes("module.exports")) {
			skipped.push(`${filename}: not a GoatBot command`);
			continue;
		}

		const parsed = parseConfig(source);

		if (!parsed.name) {
			skipped.push(`${filename}: no command name`);
			continue;
		}

		try {
			const paste = await uploadToPaste(source);

			commands.push({
				filename,
				path: `scripts/cmds/${filename}`,
				source,
				rawUrl: paste.rawUrl,
				name: parsed.name,
				author: parsed.author,
				version: parsed.version,
				category: parsed.category
			});
		} catch (err) {
			skipped.push(`${filename}: paste failed (${err.message})`);
		}

		await sleep(CONFIG.uploadDelayMs);
	}

	if (commands.length === 0) {
		log(`nothing to publish (${skipped.length} skipped)`);

		return {
			status: "empty",
			repo,
			submitted: 0,
			skipped
		};
	}

	let result;

	try {
		result = await submitToStore({
			repo,
			commands,
			client: "goatbot-commandstore"
		});
	} catch (err) {
		log(`store upload failed: ${err.message}`);

		return {
			status: "error",
			repo,
			error: err.message,
			skipped
		};
	}

	const summary = result?.data?.summary || {};

	log(
		`published ${summary.total ?? commands.length} from ${repo} ` +
		`(created=${summary.created ?? 0} updated=${summary.updated ?? 0} ` +
		`duplicate=${summary.duplicate ?? 0} outdated=${summary.outdated ?? 0} ` +
		`rejected=${summary.error ?? 0} skipped=${skipped.length})`
	);

	return {
		status: "ok",
		repo,
		summary,
		skipped
	};
}

function commandsDir() {
	const dir = path.join(process.cwd(), "scripts", "cmds");

	if (fs.existsSync(dir)) return dir;

	return __dirname;
}

function existingFileFor(name, aliases) {
	const dir = commandsDir();
	const candidates = new Set([`${name}.js`]);

	for (const alias of aliases || []) {
		candidates.add(`${alias}.js`);
	}

	for (const candidate of candidates) {
		if (fs.existsSync(path.join(dir, candidate))) {
			return candidate;
		}
	}

	return null;
}

const LANGS = {
	en: {
		title: "ＣＯＭＭＡＮＤ ＳＴＯＲＥ",

		usageFind: "{pn} <name> [page] - Search commands",
		usageAuthor: "{pn} -a <author> [page] - Commands by author",
		usageId: "{pn} id <id> - View command details",
		usageRandom: "{pn} random - Discover a random command",
		usageStats: "{pn} stats - Store statistics",
		usagePublish: "{pn} publish [file] - Publish project commands",

		hintReply: "Reply NEXT / PREV to navigate · ID to view · INSTALL ID to install",

		searching: "Searching the command store...",
		searchingAuthor: "Searching commands by %1...",

		listTitle: "COMMAND DISCOVERY",
		listTitleAuthor: "COMMANDS BY %1",
		listEmpty: "No commands matched your search.",
		listFooter: "PAGE %1 / %2",
		listHint: "Reply NEXT / PREV · ID · INSTALL ID",

		detailTitle: "COMMAND DETAILS",
		labelId: "ID",
		labelName: "Name",
		labelAuthor: "Author",
		labelVersion: "Version",
		labelCategory: "Category",
		labelSource: "Source",
		labelPath: "Path",
		labelAliases: "Aliases",
		labelRaw: "Raw URL",
		detailHint: "Reply INSTALL %1 to install this command.",

		statsTitle: "STORE STATISTICS",
		statCommands: "Commands",
		statVersions: "Versions",
		statAuthors: "Authors",
		statCategories: "Categories",
		statRepositories: "Repositories",
		statCrawled: "Crawled",
		statRetention: "Retention",
		statSchedule: "Schedule",
		statLastRun: "Last run",
		statUpdated: "Updated",

		overwriteTitle: "OVERWRITE CONFIRMATION",
		overwriteBody: "%1 already exists on your bot.",
		overwriteHint: "React to this message to confirm overwriting the existing file.",

		installedTitle: "INSTALLATION COMPLETE",
		installedName: "Name",
		installedVersion: "Version",
		installedAuthor: "Author",
		installedFile: "File",
		installedTrigger: "Triggers",

		publishedTitle: "PUBLISHING COMPLETE",
		publishedRepo: "Repository",
		publishedTotal: "Total",
		publishedCreated: "Created",
		publishedUpdated: "Updated",
		publishedDuplicate: "Duplicate",
		publishedSkipped: "Skipped",

		infoNoFile: "No matching command file was found to publish.",

		errUsageId: "Usage: id <id>",
		errUsageAuthor: "Usage: -a <author> [page]",
		errUsageInstall: "Usage: INSTALL <id>",
		errNoPage: "There is no active search page to navigate.",
		errMorePages: "There are no more pages in this direction.",
		errStore: "Could not connect to the command store: %1",
		errSearch: "Search failed: %1",
		errLoad: "Could not load command #%1: %2",
		errRandom: "Could not load a random command: %1",
		errSource: "Could not fetch the command source: %1",
		errLoader: "GoatBot loadScripts is unavailable on this host.",
		errInstall: "Installation failed: %1",
		errPublish: "Publishing failed: %1",
		errPublishEmpty: "No valid commands were found to publish.",
		errReply: "Reply with an ID, INSTALL <id>, NEXT or PREV."
	}
};

function langOf(getLang) {
	if (typeof getLang === "function") return getLang;

	return (key, ...args) => {
		let text = LANGS.en[key] || "";

		text = text.replace(/\{pn\}/g, "commandstore");

		for (let i = args.length - 1; i >= 0; i--) {
			text = text.replace(
				new RegExp(`%${i + 1}`, "g"),
				String(args[i])
			);
		}

		return text;
	};
}

async function sendStyled({ message }, text) {
	try {
		return await message.reply(text);
	} catch (err) {
		log(`reply failed: ${err.message}`);
		return null;
	}
}

async function editStyled({ api, message }, messageID, text) {
	if (messageID && typeof api?.editMessage === "function") {
		try {
			await api.editMessage(text, messageID);

			return { messageID };
		} catch (err) {
			log(`edit failed: ${err.message}`);
		}
	}

	return sendStyled({ api, message }, text);
}

function shortUsage(getLang) {
	const L = langOf(getLang);

	return card(
		L("title"),
		[
			formatHeading("AVAILABLE COMMANDS"),
			"",
			`01. ${L("usageFind")}`,
			`02. ${L("usageAuthor")}`,
			`03. ${L("usageId")}`,
			`04. ${L("usageRandom")}`,
			`05. ${L("usageStats")}`,
			`06. ${L("usagePublish")}`
		],
		L("hintReply")
	);
}

function listPageText(title, data, getLang) {
	const L = langOf(getLang);
	const pagination = data.pagination || {};
	const items = Array.isArray(data.items) ? data.items : [];

	const page = pagination.page || 1;
	const pages = pagination.pages || 1;
	const total = pagination.total ?? items.length;

	const lines = [
		`┌─ ${formatHeading(title)}`,
		`│ ${total} results found`,
		"│"
	];

	if (!items.length) {
		lines.push(`│ ${L("listEmpty")}`);
	} else {
		items.forEach((item, index) => {
			const rendered = commandCard(item, index).split("\n");

			lines.push(...rendered);

			if (index !== items.length - 1) {
				lines.push("│");
			}
		});
	}

	lines.push("│", `│ ${L("listFooter", page, pages)}`);
	lines.push(`└─⭔ ${L("listHint")}`);

	return lines.join("\n");
}

function rawUrlFor(command) {
	return (
		command.rawUrl ||
		command.raw?.shortUrl ||
		command.raw?.url ||
		`${CONFIG.storeApi}/api/commands/id/${command.id}/rawurl`
	);
}

async function resolveRawUrl(command) {
	const stored = command.raw?.shortUrl || command.raw?.url;

	if (stored) return stored;

	try {
		const body = await storeGet(
			`/api/commands/id/${command.id}/rawurl`
		);

		return body.data?.rawUrl || null;
	} catch {
		return null;
	}
}

function detailText(command, getLang) {
	const L = langOf(getLang);

	const rows = [
		`${L("labelId")}\t#${command.id}`,
		`${L("labelName")}\t${command.name}`,
		`${L("labelAuthor")}\t${command.author || "Unknown"}`,
		`${L("labelVersion")}\tv${command.latestVersion || "Unknown"}`,
		`${L("labelCategory")}\t${command.category || "Uncategorized"}`,
		`${L("labelSource")}\t${command.sourceRepo || "Unknown"}`
	];

	if (command.sourcePath) {
		rows.push(`${L("labelPath")}\t${command.sourcePath}`);
	}

	if (command.aliases?.length) {
		rows.push(
			`${L("labelAliases")}\t${command.aliases.join(", ")}`
		);
	}

	rows.push(`${L("labelRaw")}\t${rawUrlFor(command)}`);

	return card(
		L("detailTitle"),
		alignColumns(rows),
		L("detailHint", command.id)
	);
}

function statsText(stats, getLang) {
	const L = langOf(getLang);
	const lastRun = stats.lastRun || {};

	const rows = [
		`${L("statCommands")}\t${stats.commands ?? 0}`,
		`${L("statVersions")}\t${stats.versions ?? 0}`,
		`${L("statAuthors")}\t${stats.authors ?? 0}`,
		`${L("statCategories")}\t${stats.categories ?? 0}`,
		`${L("statRepositories")}\t${stats.repositories ?? 0}`,
		`${L("statCrawled")}\t${stats.repositoriesCrawled ?? 0}`,
		`${L("statRetention")}\t${stats.retentionDays ?? CONFIG.pasteTtlDays} days`,
		`${L("statSchedule")}\t${stats.schedule?.cron || "0 0 * * *"} (${stats.schedule?.timezone || "UTC"})`
	];

	if (lastRun.finishedAt || lastRun.status) {
		const stamp = formatStamp(lastRun.finishedAt);

		rows.push(
			`${L("statLastRun")}\t${[
				lastRun.status || "Unknown",
				stamp
			].filter(Boolean).join(" · ")}`
		);
	}

	if (stats.lastUpdatedAt) {
		rows.push(
			`${L("statUpdated")}\t${formatStamp(stats.lastUpdatedAt)}`
		);
	}

	return card(
		L("statsTitle"),
		alignColumns(rows)
	);
}

function numberOrNull(value) {
	const n = Number.parseInt(value, 10);

	return Number.isFinite(n) ? n : null;
}

function messageIdOf(info) {
	if (!info) return null;

	if (typeof info === "string") return info;

	return info.messageID || null;
}

function registerReply(info, event, data) {
	const messageID = messageIdOf(info);

	if (!messageID || !global?.GoatBot?.onReply) return;

	global.GoatBot.onReply.set(messageID, {
		commandName: "commandstore",
		messageID,
		author: event.senderID,
		data
	});
}

async function showUsage(ctx) {
	await sendStyled(ctx, shortUsage(ctx.getLang));
}

async function showStats(ctx) {
	const L = langOf(ctx.getLang);

	try {
		const body = await storeGet("/api/stats");

		await sendStyled(
			ctx,
			statsText(body.data || body, ctx.getLang)
		);
	} catch (err) {
		await sendStyled(
			ctx,
			notice("STORE ERROR", L("errStore", err.message))
		);
	}
}

async function search(ctx, options) {
	const { event, args } = ctx;
	const L = langOf(ctx.getLang);
	const opts = options || {};

	const term =
		opts.term !== undefined
			? opts.term
			: args[0];

	const author = opts.author;

	const page = Math.max(
		1,
		numberOrNull(
			opts.page !== undefined
				? opts.page
				: args[1]
		) || 1
	);

	const offset = (page - 1) * CONFIG.pageSize;

	const searching = author
		? L("searchingAuthor", author)
		: L("searching");

	const pending = await sendStyled(
		ctx,
		card("COMMAND DISCOVERY", [searching])
	);

	const pendingID = messageIdOf(pending);

	try {
		const query = {
			limit: CONFIG.pageSize,
			offset
		};

		if (author) {
			query.author = author;
		} else {
			query.name = term;
		}

		const body = await storeGet("/api/commands", query);
		const data = Array.isArray(body.data) ? body.data : [];
		const pagination = body.pagination || {};

		const title = author
			? L("listTitleAuthor", author)
			: L("listTitle");

		const text = listPageText(
			title,
			{ items: data, pagination },
			ctx.getLang
		);

		const info = await editStyled(
			ctx,
			pendingID,
			text
		);

		registerReply(info, event, {
			kind: author ? "author" : "search",
			term: author || term,
			author: author || null,
			page: pagination.page || page,
			pages: pagination.pages || 1
		});

		return messageIdOf(info);
	} catch (err) {
		await editStyled(
			ctx,
			pendingID,
			notice("SEARCH ERROR", L("errSearch", err.message))
		);

		return null;
	}
}

async function showById(ctx, id) {
	const { event } = ctx;
	const L = langOf(ctx.getLang);

	try {
		const body = await storeGet(`/api/commands/id/${id}`);
		const command = body.data;

		command.rawUrl = await resolveRawUrl(command);

		const info = await sendStyled(
			ctx,
			detailText(command, ctx.getLang)
		);

		registerReply(info, event, {
			kind: "detail",
			commandId: command.id
		});

		return messageIdOf(info);
	} catch (err) {
		await sendStyled(
			ctx,
			notice(
				"COMMAND ERROR",
				L("errLoad", id, err.message)
			)
		);

		return null;
	}
}

async function showRandom(ctx) {
	const { event } = ctx;
	const L = langOf(ctx.getLang);

	try {
		const body = await storeGet("/api/commands/random");
		const command = body.data;

		command.rawUrl = await resolveRawUrl(command);

		const info = await sendStyled(
			ctx,
			detailText(command, ctx.getLang)
		);

		registerReply(info, event, {
			kind: "detail",
			commandId: command.id
		});

		return messageIdOf(info);
	} catch (err) {
		await sendStyled(
			ctx,
			notice(
				"DISCOVERY ERROR",
				L("errRandom", err.message)
			)
		);

		return null;
	}
}

async function fetchCommandSource(id) {
	const url = `${CONFIG.storeApi}/api/commands/id/${id}/raw?redirect=0`;

	const response = await request({
		method: "GET",
		url,
		headers: {
			Accept: "text/plain"
		}
	});

	if (response.status < 200 || response.status >= 300) {
		throw new Error(`store responded ${response.status}`);
	}

	return typeof response.data === "string"
		? response.data
		: String(response.data);
}

function loadScripts() {
	return global?.utils?.loadScripts || null;
}

async function installCommand(ctx, id, override) {
	const { api, event } = ctx;
	const L = langOf(ctx.getLang);

	let command;

	try {
		const body = await storeGet(`/api/commands/id/${id}`);

		command = body.data;
	} catch (err) {
		await sendStyled(
			ctx,
			notice(
				"INSTALLATION ERROR",
				L("errLoad", id, err.message)
			)
		);

		return;
	}

	const loader = loadScripts();

	if (!loader) {
		await sendStyled(
			ctx,
			notice("INSTALLATION ERROR", L("errLoader"))
		);

		return;
	}

	const fileName = `${command.name}.js`;

	const target = existingFileFor(
		command.name,
		command.aliases
	);

	if (target && !override) {
		const info = await sendStyled(
			ctx,
			card(
				L("overwriteTitle"),
				[
					L("overwriteBody", target),
					"",
					L("overwriteHint")
				]
			)
		);

		const messageID = messageIdOf(info);

		if (messageID && global?.GoatBot?.onReaction) {
			global.GoatBot.onReaction.set(messageID, {
				commandName: "commandstore",
				messageID,
				author: event.senderID,
				data: {
					action: "install",
					id,
					override: true
				}
			});
		}

		return;
	}

	let source;

	try {
		source = await fetchCommandSource(id);
	} catch (err) {
		await sendStyled(
			ctx,
			notice(
				"SOURCE ERROR",
				L("errSource", err.message)
			)
		);

		return;
	}

	try {
		const { configCommands } = global?.GoatBot || {};

		const info = loader(
			"cmds",
			fileName,
			global?.utils?.log,
			configCommands,
			api,
			event.threadModel,
			event.userModel,
			event.dashBoardModel,
			event.globalModel,
			event.threadsData,
			event.usersData,
			event.dashBoardData,
			event.globalData,
			event.getLang,
			source
		);

		if (info && info.status === "success") {
			const names = [
				command.name,
				...(command.aliases || [])
			].join(", ");

			await sendStyled(
				ctx,
				card(
					L("installedTitle"),
					alignColumns([
						`${L("installedName")}\t${command.name}`,
						`${L("installedVersion")}\tv${command.latestVersion}`,
						`${L("installedAuthor")}\t${command.author}`,
						`${L("installedFile")}\tscripts/cmds/${fileName}`,
						`${L("installedTrigger")}\t${names}`
					]),
					"Command is ready to use."
				)
			);

			log(
				`installed ${command.name} v${command.latestVersion}`
			);
		} else {
			const error = info?.error;

			await sendStyled(
				ctx,
				notice(
					"INSTALLATION ERROR",
					L(
						"errInstall",
						error
							? `${error.name}: ${error.message}`
							: "unknown error"
					)
				)
			);
		}
	} catch (err) {
		await sendStyled(
			ctx,
			notice(
				"INSTALLATION ERROR",
				L("errInstall", err.message)
			)
		);
	}
}

async function handleReply(ctx) {
	const { args, Reply } = ctx;
	const L = langOf(ctx.getLang);
	const data = Reply?.data || {};

	const first = (args[0] || "").toLowerCase();

	if (first === "install") {
		const id = numberOrNull(args[1]);

		if (id === null) {
			await sendStyled(
				ctx,
				notice("COMMAND ERROR", L("errUsageInstall"))
			);

			return;
		}

		await installCommand(ctx, id, false);

		return;
	}

	if (first === "next" || first === "prev") {
		const session = data;

		if (
			!session ||
			(session.kind !== "search" && session.kind !== "author")
		) {
			await sendStyled(
				ctx,
				notice("NAVIGATION ERROR", L("errNoPage"))
			);

			return;
		}

		const delta = first === "next" ? 1 : -1;
		const target = session.page + delta;

		if (target < 1 || target > session.pages) {
			await sendStyled(
				ctx,
				notice("NAVIGATION ERROR", L("errMorePages"))
			);

			return;
		}

		await search(
			ctx,
			session.author
				? {
					author: session.author,
					page: target
				}
				: {
					term: session.term,
					page: target
				}
		);

		return;
	}

	const id = numberOrNull(first);

	if (id !== null) {
		await showById(ctx, id);
		return;
	}

	await sendStyled(
		ctx,
		notice("REPLY HELP", L("errReply"))
	);
}

async function handleReaction(ctx) {
	const { event, Reaction } = ctx;
	const data = Reaction?.data || {};

	if (
		String(event.userID || event.senderID) !==
		String(Reaction?.author)
	) {
		return;
	}

	if (data.action !== "install") return;

	await installCommand(ctx, data.id, true);
}

async function handlePublish(ctx) {
	const L = langOf(ctx.getLang);
	const filter = ctx.args[0] || null;

	let files;

	try {
		files = listCommandFiles(filter);
	} catch (err) {
		await sendStyled(
			ctx,
			notice("PUBLISHING ERROR", L("errPublish", err.message))
		);

		return;
	}

	if (files.length === 0) {
		await sendStyled(
			ctx,
			notice("PUBLISHING", L("infoNoFile"))
		);

		return;
	}

	const result = await publish(files);

	if (result.status === "ok") {
		const summary = result.summary || {};

		const body = alignColumns([
			`${L("publishedRepo")}\t${result.repo}`,
			`${L("publishedTotal")}\t${summary.total ?? files.length}`,
			`${L("publishedCreated")}\t${summary.created ?? 0}`,
			`${L("publishedUpdated")}\t${summary.updated ?? 0}`,
			`${L("publishedDuplicate")}\t${summary.duplicate ?? 0}`,
			`${L("publishedSkipped")}\t${result.skipped.length}`
		]);

		if (result.skipped.length) {
			body.push(
				"",
				formatHeading("SKIPPED FILES"),
				...result.skipped
					.slice(0, 5)
					.map((item) => `- ${truncate(item, 100)}`)
			);
		}

		await sendStyled(
			ctx,
			card(L("publishedTitle"), body)
		);

		return;
	}

	if (result.status === "empty") {
		await sendStyled(
			ctx,
			card(
				"PUBLISHING RESULTS",
				[
					L("errPublishEmpty"),
					"",
					`${result.skipped.length} files skipped.`
				]
			)
		);

		return;
	}

	await sendStyled(
		ctx,
		notice(
			"PUBLISHING ERROR",
			L("errPublish", result.error || result.status)
		)
	);
}

let autoPublished = false;

async function autoPublish() {
	if (autoPublished || CONFIG.autoPublish === false) return;

	autoPublished = true;

	try {
		const files = listCommandFiles(null);

		if (files.length) {
			await publish(files);
		}
	} catch (err) {
		log(`auto publish failed: ${err.message}`);
	}
}

module.exports = {
	config: {
		name: "commandstore",
		aliases: ["cmdstore", "goatstore", "cs", "gs"],
		author: "Neoaz 🐊",
		version: "2.5.0",
		category: "owner",
		role: 0,
		countDown: 5,
		description: {
			en: "Browse, install and publish GoatBot commands from the command store"
		},
		guide: {
			en:
				"{pn} - show usage\n" +
				"{pn} <name> [page] - search commands by name\n" +
				"{pn} -a <author> [page] - list commands by an author\n" +
				"{pn} id <id> - show one command\n" +
				"{pn} random - show a random command\n" +
				"{pn} stats - show store statistics\n" +
				"{pn} publish [file] - publish this project's commands"
		}
	},

	langs: LANGS,

	onLoad: async function () {
		await autoPublish();
	},

	onStart: async function ({
		api,
		event,
		message,
		args,
		getLang
	}) {
		const ctx = {
			api,
			event,
			message,
			args,
			getLang
		};

		const first = (args[0] || "").toLowerCase();

		if (!first) {
			return showUsage(ctx);
		}

		if (first === "stats") {
			return showStats(ctx);
		}

		if (first === "random") {
			return showRandom(ctx);
		}

		if (first === "id") {
			const id = numberOrNull(args[1]);

			if (id === null) {
				return sendStyled(
					ctx,
					notice(
						"COMMAND ERROR",
						langOf(getLang)("errUsageId")
					)
				);
			}

			return showById(ctx, id);
		}

		if (
			first === "publish" ||
			first === "all" ||
			first === "push"
		) {
			return handlePublish({
				...ctx,
				args: args.slice(1)
			});
		}

		if (
			first === "-a" ||
			first === "--author" ||
			first === "author"
		) {
			const author = args
				.slice(1)
				.filter((a) => !/^\d+$/.test(a))
				.join(" ")
				.trim();

			if (!author) {
				return sendStyled(
					ctx,
					notice(
						"COMMAND ERROR",
						langOf(getLang)("errUsageAuthor")
					)
				);
			}

			const page = numberOrNull(args[args.length - 1]);

			return search(ctx, {
				author,
				page: page !== null && args.length > 2 ? page : 1
			});
		}

		const page = numberOrNull(args[1]);

		return search(ctx, {
			term: args[0],
			page: page !== null ? page : 1
		});
	},

	onReply: async function ({
		api,
		event,
		message,
		args,
		Reply,
		getLang
	}) {
		await handleReply({
			api,
			event,
			message,
			args,
			Reply,
			getLang
		});
	},

	onReaction: async function ({
		api,
		event,
		message,
		Reaction,
		getLang
	}) {
		await handleReaction({
			api,
			event,
			message,
			Reaction,
			getLang
		});
	}
};
