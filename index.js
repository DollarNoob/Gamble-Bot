const crypto = require("crypto");
const Discord = require("discord.js");
const Client = new Discord.Client({"intents": [Discord.Intents.FLAGS.GUILDS, Discord.Intents.FLAGS.GUILD_MESSAGES]});
const Minesweeper = require("./game.js");
const games = {};
const sqlite3 = require("sqlite3");
const config = require("./config.json");
const db = new sqlite3.Database("./data.db", sqlite3.OPEN_READWRITE, function(err) {
    if (err) console.log(err);
    else {
        db.exec("CREATE TABLE IF NOT EXISTS users(userId text, itemLevel integer)");
        console.log("DB Connected!");
    }
});

Client.on("ready", async function() {
    console.log("Discord Bot Ready!");

    const lbChannel = await Client.channels.fetch(config.leaderboardChannelId);
    const lbMessage = await lbChannel.send({"embeds": [new Discord.MessageEmbed().setTitle("Initial Embed")]});
    setInterval(async function() {
        db.all("SELECT * FROM users ORDER BY itemLevel DESC LIMIT 5", async function(err, rows) {
            if (err) return;
            const descMessage = [];
            for (var i = 0; i < rows.length; i++) descMessage.push(`${i + 1}. ${await lbChannel.guild.members.fetch(rows[i].userId).then(m => m.user.tag).catch(() => "Unknown User#0000")} - LV ${rows[i].itemLevel}`);
            if (rows && rows.length !== 0) lbMessage.edit({"embeds": [new Discord.MessageEmbed().setTitle("📊 **강화 순위**").setDescription(descMessage.join("\n")).setColor("BLUE")]});
        });
    }, 10000);
});

Client.on("messageCreate", async function(message) {
    if (message.author.id === config.ownerId && message.content.startsWith("$exec ")) {
        db.exec(message.content.substring(6), function(err) {
            if (err) message.reply({"embeds": [new Discord.MessageEmbed().setTitle(`❌ **${err}**`).setColor("RED")]});
            else message.reply({"embeds": [new Discord.MessageEmbed().setTitle(`✅ **Script Executed!**`).setColor("RED")]});
        });
    }
    else if (message.author.id === config.ownerId && message.content === "$msg") {
        message.channel.send({"embeds": [new Discord.MessageEmbed()
            .setTitle("🛠️ **강화**")
            .setDescription("```\n안전 (3x): 4% 💥 | 32% 🛡️ | 64% 🛠️\n보통 (4x): 8% 💥 | 48% 🛡️ | 44% 🛠️\n위험 (5x): 12% 💥 | 72% 🛡️ | 24% 🛠️```")
            .setColor("AQUA")
        ], "components": [new Discord.MessageActionRow().addComponents([
            new Discord.MessageButton().setCustomId("safe").setEmoji("🛡️").setLabel("안전").setStyle("SUCCESS"),
            new Discord.MessageButton().setCustomId("normal").setEmoji("🛠️").setLabel("보통").setStyle("PRIMARY"),
            new Discord.MessageButton().setCustomId("danger").setEmoji("💥").setLabel("위험").setStyle("DANGER"),
            new Discord.MessageButton().setCustomId("info").setEmoji("❗").setLabel("정보").setStyle("SUCCESS")
        ])]});
        await message.delete().catch(() => {});
    }
    else if (message.content === "$cleardms" && message.channel.type === "DM") {
        await message.channel.messages.fetch().then(m => m.forEach(msg => msg.delete().catch(() => {})));
    }
    else if (message.content === "$register") {
        db.get("SELECT * FROM users WHERE userId = ?", message.author.id, function(err, row) {
            if (err) throw err;
            else if (row) {
                message.reply({"embeds": [new Discord.MessageEmbed().setTitle("❌ **이미 가입되어 있습니다!**").setColor("RED")]});
            }
            else db.run("INSERT INTO users(userId, itemLevel) VALUES(?, ?)", [message.author.id, 0], function(err) {
                if (err) throw err;
                else message.reply({"embeds": [new Discord.MessageEmbed().setTitle("✅ **가입되셨습니다!**").setColor("GREEN")]});
            });
        });
    }
});

Client.on("interactionCreate", async function(interaction) {
    try {
        if (!interaction.isButton()) return;
        const dbInfo = await dbGet("SELECT * FROM users WHERE userId = ?", [interaction.user.id]);
        if (!dbInfo) await interaction.reply({"embeds": [new Discord.MessageEmbed().setTitle("❌ **가입되어 있지 않습니다!**").setDescription(config.prefix + "register 를 입력해 가입해 주세요!").setColor("RED")], "ephemeral": true});
        else if (interaction.customId === "info") {
            await interaction.reply({"embeds": [new Discord.MessageEmbed().setTitle("✅ **정보**").setDescription(`아이템 1: LV ${dbInfo.itemLevel}`).setColor("GREEN")], "ephemeral": true});
        }
        else if (interaction.customId === "safe") {
            const gameId = crypto.randomUUID();
            const game = new Minesweeper(interaction.user.id, 1);
            game.generateGame();
            games[gameId] = game;
            const gameMessage = await interaction.user.send({"content": `${interaction.user.toString()} ${gameId}`, "embeds": [new Discord.MessageEmbed()
                .setTitle("🛡️ **안전**")
                .setDescription("💥 - 레벨 초기화\n🛡️ - 레벨 보존\n🛠️ - 3레벨 증가")
                .setColor("GREEN")], "components": game.getGameComponents()});
            await interaction.deferUpdate();
            setTimeout(function() {
                gameMessage.delete().catch(() => {});
            }, 180000);
        }
        else if (interaction.customId === "normal") {
            const gameId = crypto.randomUUID();
            const game = new Minesweeper(interaction.user.id, 2);
            game.generateGame();
            games[gameId] = game;
            const gameMessage = await interaction.user.send({"content": `${interaction.user.toString()} ${gameId}`, "embeds": [new Discord.MessageEmbed()
                .setTitle("🛠️ **보통**")
                .setDescription("💥 - 레벨 초기화\n🛡️ - 레벨 보존\n🛠️ - 4레벨 증가")
                .setColor("BLUE")], "components": game.getGameComponents()});
            await interaction.deferUpdate();
            setTimeout(function() {
                gameMessage.delete().catch(() => {});
            }, 180000);
        }
        else if (interaction.customId === "danger") {
            const gameId = crypto.randomUUID();
            const game = new Minesweeper(interaction.user.id, 3);
            game.generateGame();
            games[gameId] = game;
            const gameMessage = await interaction.user.send({"content": `${interaction.user.toString()} ${gameId}`, "embeds": [new Discord.MessageEmbed()
                .setTitle("💥 **위험**")
                .setDescription("💥 - 레벨 초기화\n🛡️ - 레벨 보존\n🛠️ - 5레벨 증가")
                .setColor("RED")], "components": game.getGameComponents()});
            await interaction.deferUpdate();
            setTimeout(function() {
                gameMessage.delete().catch(() => {});
            }, 180000);
        }
        else if (interaction.customId === "finish") {
            const gameId = interaction.message.content.split(" ")[1];
            const game = games[gameId];
            if (interaction.user.id !== game.getUserId()) return interaction.deferUpdate();
            var totalScores = 0;
            for (const item of game.getItems()) {
                if (item.revealed && item.type === 2) totalScores += 1;
            }
            totalScores *= (game.getDifficulty() + 2);
            if (totalScores !== 0) await dbRun("UPDATE users SET itemLevel = itemLevel + ? WHERE userId = ?", [totalScores, interaction.user.id]);
            await interaction.message.edit({"content": interaction.message.content, "embeds": [new Discord.MessageEmbed()
                .setTitle("✅ **게임 종료**")
                .setDescription(`레벨: ${dbInfo.itemLevel + totalScores} (+ ${totalScores})`)
                .setColor("GREEN")], "components": game.getGameComponents(true)});
            await interaction.deferUpdate();
            delete games[gameId];
            setTimeout(() => interaction.message.delete().catch(() => {}), 3000);
        }
        else if (interaction.customId.startsWith("mine")) {
            const gameId = interaction.message.content.split(" ")[1];
            const game = games[gameId];
            if (interaction.user.id !== game.getUserId()) return interaction.deferUpdate();
            const mineType = game.revealMine(Number(interaction.customId.substring(4)));
            if (mineType === 0) {
                await dbRun("UPDATE users SET itemLevel = ? WHERE userId = ?", [0, interaction.user.id]);
                await interaction.message.edit({"content": interaction.message.content, "embeds": [new Discord.MessageEmbed()
                    .setTitle("✅ **게임 종료**")
                    .setDescription(`레벨: 0 (-${dbInfo.itemLevel})`)
                    .setColor("RED")], "components": game.getGameComponents(true)});
                delete games[gameId];
                setTimeout(() => interaction.message.delete().catch(() => {}), 3000);
            }
            else await interaction.message.edit({"content": interaction.message.content, "embeds": interaction.message.embeds, "components": game.getGameComponents()});
            await interaction.deferUpdate();
        }
    }
    catch {}
});

function dbGet(sql, params) {
    return new Promise(function(resolve, reject) {
        db.get(sql, params, function(err, row) {
            if (err) reject(err);
            else resolve(row);
        });
    });
}

function dbRun(sql, params) {
    return new Promise(function(resolve, reject) {
        db.run(sql, params, function(err) {
            if (err) reject(err);
            else resolve();
        });
    });
}

Client.login(config.botToken);
