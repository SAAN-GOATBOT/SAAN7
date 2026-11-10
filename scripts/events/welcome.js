const { getTime } = global.utils;
const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");
const { createCanvas, loadImage } = require('canvas');

if (!global.temp.welcomeEvent)
    global.temp.welcomeEvent = {};

function drawHexagon(ctx, x, y, radius, color, fill = false, lineWidth = 3) {
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
        const angle = (i * Math.PI) / 3 - Math.PI / 6;
        const px = x + radius * Math.cos(angle);
        const py = y + radius * Math.sin(angle);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
    }
    ctx.closePath();
    if (fill) {
        ctx.fillStyle = color;
        ctx.fill();
    } else {
        ctx.strokeStyle = color;
        ctx.lineWidth = lineWidth;
        ctx.stroke();
    }
}

function drawPegasus(ctx, x, y, size, color) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(size / 100, size / 100);
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 20;
    
    ctx.beginPath();
    ctx.moveTo(-10, 20);
    ctx.lineTo(-20, -10);
    ctx.lineTo(-5, -25);
    ctx.lineTo(5, -15);
    ctx.lineTo(15, -30);
    ctx.lineTo(25, -20);
    ctx.lineTo(15, -5);
    ctx.lineTo(20, 20);
    ctx.lineTo(5, 25);
    ctx.moveTo(-10, -5);
    ctx.quadraticCurveTo(-40, -30, -50, 0);
    ctx.quadraticCurveTo(-30, -10, -15, 5);
    ctx.moveTo(-5, -10);
    ctx.quadraticCurveTo(-30, -45, -45, -15);
    ctx.quadraticCurveTo(-20, -20, -5, 0);
    ctx.fill();
    
    ctx.shadowBlur = 0;
    ctx.restore();
}

function drawProfileImage(ctx, imageUrl, x, y, size, borderColor, glowColor, shape) {
    return new Promise(async (resolve) => {
        try {
            const response = await axios.get(imageUrl, { responseType: "arraybuffer", headers: { "User-Agent": "Mozilla/5.0" } });
            const img = await loadImage(Buffer.from(response.data));
            const radius = size / 2;

            ctx.save();
            ctx.shadowColor = glowColor || borderColor;
            ctx.shadowBlur = 40;

            if (shape === 'hexagon') {
                drawHexagon(ctx, x, y, radius + 15, borderColor, true);
                ctx.shadowBlur = 0;
                
                ctx.save();
                ctx.beginPath();
                for (let i = 0; i < 6; i++) {
                    const angle = (i * Math.PI) / 3 - Math.PI / 6;
                    const px = x + radius * Math.cos(angle);
                    const py = y + radius * Math.sin(angle);
                    if (i === 0) ctx.moveTo(px, py);
                    else ctx.lineTo(px, py);
                }
                ctx.closePath();
                ctx.clip();
                ctx.drawImage(img, x - radius, y - radius, size, size);
                ctx.restore();
                
                drawHexagon(ctx, x, y, radius, "#ffffff", false, 4);
            } else {
                ctx.beginPath();
                ctx.arc(x, y, radius + 10, 0, Math.PI * 2);
                ctx.fillStyle = borderColor;
                ctx.fill();
                ctx.shadowBlur = 0;

                ctx.beginPath();
                ctx.arc(x, y, radius, 0, Math.PI * 2);
                ctx.clip();
                ctx.drawImage(img, x - radius, y - radius, size, size);
                ctx.restore();
            }
            resolve();
        } catch (error) {
            ctx.beginPath();
            if (shape === 'hexagon') drawHexagon(ctx, x, y, size/2, borderColor, true);
            else { ctx.arc(x, y, size/2, 0, Math.PI*2); ctx.fillStyle = borderColor; ctx.fill(); }
            resolve();
        }
    });
}

async function createWelcomeCard(gcImg, userImg, adderImg, userName, userNumber, threadName, adderName) {
    const width = 1600;
    const height = 900;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    const bgGradient = ctx.createRadialGradient(width/2, height/2, 100, width/2, height/2, 1000);
    bgGradient.addColorStop(0, "#14141a");
    bgGradient.addColorStop(1, "#050508");
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = "rgba(0, 255, 255, 0.04)";
    ctx.lineWidth = 1;
    for (let i = 0; i < width; i += 50) {
        ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, height); ctx.stroke();
    }
    for (let j = 0; j < height; j += 50) {
        ctx.beginPath(); ctx.moveTo(0, j); ctx.lineTo(width, j); ctx.stroke();
    }

    ctx.strokeStyle = "rgba(255, 102, 0, 0.05)";
    ctx.lineWidth = 2;
    for (let i = -height; i < width; i += 100) {
        ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i + height, height); ctx.stroke();
    }

    ctx.fillStyle = "rgba(0, 255, 255, 0.03)";
    for (let i = 0; i < 15; i++) {
        const x = Math.random() * width;
        const y = Math.random() * height;
        const size = 100 + Math.random() * 300;
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
    }

    ctx.strokeStyle = "#2a2a35";
    ctx.lineWidth = 8;
    ctx.strokeRect(40, 40, width - 80, height - 80);
    
    ctx.strokeStyle = "#111116";
    ctx.lineWidth = 15;
    ctx.strokeRect(25, 25, width - 50, height - 50);

    const drawCorner = (cx, cy, dx, dy) => {
        ctx.strokeStyle = "#00e5ff";
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(cx, cy + dy * 60); ctx.lineTo(cx, cy); ctx.lineTo(cx + dx * 60, cy);
        ctx.stroke();
        
        ctx.strokeStyle = "#ff6600";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(cx + dx * 10, cy + dy * 70); ctx.lineTo(cx + dx * 10, cy + dy * 10); ctx.lineTo(cx + dx * 70, cy + dy * 10);
        ctx.stroke();
    };
    drawCorner(60, 60, 1, 1);
    drawCorner(width - 60, 60, -1, 1);
    drawCorner(60, height - 60, 1, -1);
    drawCorner(width - 60, height - 60, -1, -1);

    ctx.fillStyle = "#15151a";
    ctx.beginPath();
    ctx.roundRect(width/2 - 450, 50, 900, 80, 10);
    ctx.fill();
    ctx.strokeStyle = "#3a3a45";
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = 'bold 45px "Segoe UI", Arial, sans-serif';
    
    let displayGroupName = threadName.length > 15 ? threadName.substring(0, 15) + "..." : threadName;
    
    ctx.shadowColor = "#00e5ff";
    ctx.shadowBlur = 20;
    ctx.fillStyle = "#00e5ff";
    ctx.fillText("WELCOME TO", width/2 - 150, 90);
    
    ctx.shadowColor = "#ff6600";
    ctx.fillStyle = "#ff8800";
    ctx.fillText(displayGroupName.toUpperCase(), width/2 + 200, 90);
    ctx.shadowBlur = 0;

    const leftBoxX = 100;
    const leftBoxY = 200;

    ctx.textAlign = "left";
    ctx.font = 'bold 30px "Segoe UI", Arial, sans-serif';
    ctx.fillStyle = "#cccccc";
    ctx.fillText("GROUP", leftBoxX + 40, leftBoxY + 40);

    await drawProfileImage(ctx, gcImg, leftBoxX + 180, leftBoxY + 230, 240, "#1a1a22", "#00e5ff", 'hexagon');
    drawHexagon(ctx, leftBoxX + 180, leftBoxY + 230, 150, "#00e5ff", false, 6);
    
    ctx.textAlign = "center";
    ctx.font = 'bold 24px "Segoe UI", Arial, sans-serif';
    ctx.fillStyle = "#00e5ff";
    ctx.shadowColor = "#00e5ff";
    ctx.shadowBlur = 10;
    ctx.fillText(displayGroupName.toUpperCase(), leftBoxX + 180, leftBoxY + 360);
    ctx.shadowBlur = 0;

    const drawInfoBox = (x, y, w, h, title, value, isOffline = false) => {
        ctx.fillStyle = "#111116";
        ctx.beginPath();
        ctx.roundRect(x, y, w, h, 10);
        ctx.fill();
        ctx.strokeStyle = "#2a2a35";
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.textAlign = "left";
        ctx.font = 'bold 20px "Segoe UI", Arial, sans-serif';
        ctx.fillStyle = "#888888";
        ctx.fillText(title, x + 25, y + 35);

        ctx.font = 'bold 32px "Segoe UI", Arial, sans-serif';
        ctx.fillStyle = "#ffffff";
        ctx.fillText(value, x + 25, y + 80);

        if (isOffline) {
            ctx.font = '16px "Segoe UI", Arial, sans-serif';
            ctx.fillStyle = "#ff3333";
            ctx.fillText("● OFFLINE", x + w - 100, y + 35);
        }
    };

    drawInfoBox(leftBoxX + 360, leftBoxY + 100, 500, 120, "THREAD NAME", `[ ${threadName} ]`);
    drawInfoBox(leftBoxX + 360, leftBoxY + 250, 500, 130, "ADDED BY", adderName, true);

    const rightX = width - 350;
    const rightY = 200;

    await drawProfileImage(ctx, userImg, rightX, rightY + 130, 240, "#00e5ff", "rgba(0, 229, 255, 0.5)", 'hexagon');

    ctx.textAlign = "center";
    ctx.font = 'bold 42px "Segoe UI", Arial, sans-serif';
    ctx.fillStyle = "#ffffff";
    ctx.shadowColor = "#00e5ff";
    ctx.shadowBlur = 15;
    ctx.fillText(userName, rightX, rightY + 320);
    ctx.shadowBlur = 0;

    ctx.font = 'bold 40px "Segoe UI", Arial, sans-serif';
    ctx.fillStyle = "#e0e0e0";
    ctx.fillText("◇ ◇ ◇ ◇ ◇", rightX, rightY + 380);

    ctx.font = 'bold 32px "Segoe UI", Arial, sans-serif';
    ctx.fillStyle = "#ff8800";
    ctx.fillText(`[ ${userNumber}th Member ]`, rightX, rightY + 450);

    ctx.textAlign = "center";
    ctx.font = 'bold 20px "Segoe UI", Arial, sans-serif';
    ctx.fillStyle = "#666666";
    ctx.fillText("Created By Saan", width / 2, height - 80);

    ctx.textAlign = "right";
    ctx.font = '16px "Segoe UI", Arial, sans-serif';
    ctx.fillStyle = "#666666";
    ctx.fillText("Embrace the Nightmare ☾", width - 60, height - 60);

    return canvas.toBuffer();
}

module.exports = {
    config: {
        name: "welcome",
        version: "5.0",
        author: "Saan",
        category: "events"
    },

    langs: {
        en: {
            session1: "morning",
            session2: "noon",
            session3: "afternoon",
            session4: "evening",
            welcomeMessage: "╔═════════════════╗\n       📥 ɪɴᴠɪᴛᴀᴛɪᴏɴ ᴀᴄᴄᴇᴘᴛᴇᴅ\n╚═════════════════╝\n━━━━━━━━━━━━━━━━━━\n✨ ᴘʀᴇꜰɪx: [ %1 ]\n📖 ᴛʏᴘᴇ [ %1ʜᴇʟᴘ ] ᴛᴏ ꜱᴇᴇ ᴍʏ ᴍᴇɴᴜ\n\n『 ᴛʜᴀɴᴋ ʏᴏᴜ ꜰᴏʀ ᴀᴅᴅɪɴɢ ᴍᴇ! 』",
            multiple1: "ɴᴇᴡ ꜱᴏᴜʟ",
            multiple2: "ɴᴇᴡ ꜱᴏᴜʟꜱ",
            defaultWelcomeMessage: "『 ᴡᴇʟᴄᴏᴍᴇ ᴛᴏ ᴛʜᴇ ɴɪɢʜᴛᴍᴀʀᴇ 』\n━━━━━━━━━━━━━━━━━━\n👋 ʜᴇʟʟᴏ, {userNameTag}!\n🏘️ ᴡᴇʟᴄᴏᴍᴇ ᴛᴏ: {boxName}\n🕒 ʜᴀᴠᴇ ᴀ ɢᴏᴏᴅ {session}\n\n[ 📝 ɴᴏᴛᴇ: ᴘʟᴇᴀꜱᴇ ʀᴇᴀᴅ ᴛʜᴇ ɢʀᴏᴜᴘ ʀᴜʟᴇꜱ ᴄᴀʀᴇꜰᴜʟʟʏ ]"
        }
    },

    onStart: async ({ threadsData, message, event, api, getLang, usersData }) => {
        if (event.logMessageType !== "log:subscribe") return;

        const hours = getTime("HH");
        const { threadID } = event;
        const { nickNameBot } = global.GoatBot.config;
        const prefix = global.utils.getPrefix(threadID);
        const dataAddedParticipants = event.logMessageData.addedParticipants;

        if (dataAddedParticipants.some((item) => item.userFbId == api.getCurrentUserID())) {
            if (nickNameBot)
                api.changeNickname(nickNameBot, threadID, api.getCurrentUserID());
            return message.send(getLang("welcomeMessage", prefix));
        }

        if (!global.temp.welcomeEvent[threadID])
            global.temp.welcomeEvent[threadID] = {
                joinTimeout: null,
                dataAddedParticipants: []
            };

        global.temp.welcomeEvent[threadID].dataAddedParticipants.push(...dataAddedParticipants);
        clearTimeout(global.temp.welcomeEvent[threadID].joinTimeout);

        global.temp.welcomeEvent[threadID].joinTimeout = setTimeout(async function () {
            const threadData = await threadsData.get(threadID);
            if (threadData.settings.sendWelcomeMessage == false)
                return;

            const addedParticipants = global.temp.welcomeEvent[threadID].dataAddedParticipants;
            const dataBanned = threadData.data.banned_ban || [];
            const threadName = threadData.threadName || "this group";
            const userName = [], mentions = [];
            let multiple = addedParticipants.length > 1;

            for (const user of addedParticipants) {
                if (dataBanned.some((item) => item.id == user.userFbId))
                    continue;
                userName.push(user.fullName);
                mentions.push({ tag: user.fullName, id: user.userFbId });
            }

            if (userName.length == 0) return;

            let { welcomeMessage = getLang("defaultWelcomeMessage") } = threadData.data;

            welcomeMessage = welcomeMessage
                .replace(/\{userNameTag\}|\{userName\}/g, userName.join(", "))
                .replace(/\{boxName\}|\{threadName\}/g, threadName)
                .replace(/\{multiple\}/g, multiple ? getLang("multiple2") : getLang("multiple1"))
                .replace(/\{session\}/g, hours <= 10 ? getLang("session1") : hours <= 12 ? getLang("session2") : hours <= 18 ? getLang("session3") : getLang("session4"));

            try {
                const firstUser = addedParticipants[0];
                const adderID = event.author;
                
                let userAvatar = await usersData.getAvatarUrl(firstUser.userFbId);
                let adderAvatar = await usersData.getAvatarUrl(adderID);
                let groupImage = threadData.imageSrc || `https://graph.facebook.com/${threadID}/picture?width=720&height=720`;
                let adderName = await usersData.getName(adderID) || "Unknown";
                let memberCount = threadData.members?.length || 1;

                const imageBuffer = await createWelcomeCard(
                    groupImage,
                    userAvatar,
                    adderAvatar,
                    firstUser.fullName,
                    memberCount,
                    threadName,
                    adderName
                );

                const tempDir = path.join(__dirname, '..', 'cache');
                await fs.ensureDir(tempDir);
                const tempPath = path.join(tempDir, `welcome_${Date.now()}.png`);
                fs.writeFileSync(tempPath, imageBuffer);

                await message.send({
                    body: welcomeMessage,
                    attachment: fs.createReadStream(tempPath),
                    mentions: mentions
                });

                setTimeout(() => {
                    if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
                }, 10000);

            } catch (error) {
                console.error("[WELCOME] Card creation error:", error);
                await message.send({
                    body: welcomeMessage,
                    mentions: mentions
                });
            }

            delete global.temp.welcomeEvent[threadID];
        }, 400);
    }
};
