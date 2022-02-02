const Discord = require("discord.js");

class Minesweeper {
    constructor(userId, gameDifficulty) {
        this.gameDifficulty = gameDifficulty;
        this.userId = userId;
        this.gameItems = [];

        this.generateGame();
    }

    getUserId() {
        return this.userId;
    }

    getDifficulty() {
        return this.gameDifficulty;
    }

    getItems() {
        return this.gameItems;
    }

    generateGame() {
        for (var i = 0; i < 24; i++) {
            this.gameItems.push({
                "type": this.generateMine(),
                "revealed": false
            });
        }
    }

    generateMine() {
        const randomInt = Math.floor(Math.random() * 100);
        if (randomInt < 4 * this.gameDifficulty) return 0;
        else if (randomInt > 83 - (20 * this.gameDifficulty)) return 2;
        else return 1;
    }

    getGameComponents(hasDied = false) {
        const actionRows = [];
        var mineIndex = 0;
        for (var i = 0; i < 5; i++) {
            const components = [];
            for (var j = 0; j < 5; j++) {
                const mine = this.gameItems[mineIndex];
                if (mine.revealed) {
                    switch(mine.type) {
                        case 0:
                            components.push(new Discord.MessageButton().setCustomId("mine" + String(mineIndex)).setEmoji("💥").setStyle("DANGER").setDisabled(true));
                            break;
                        case 1:
                            components.push(new Discord.MessageButton().setCustomId("mine" + String(mineIndex)).setEmoji("🛡️").setStyle("PRIMARY").setDisabled(true));
                            break;
                        case 2:
                            components.push(new Discord.MessageButton().setCustomId("mine" + String(mineIndex)).setEmoji("🛠️").setStyle("SUCCESS").setDisabled(true));
                            break;
                    }
                }
                else components.push(new Discord.MessageButton().setCustomId("mine" + String(mineIndex)).setEmoji("❓").setStyle("SECONDARY").setDisabled(hasDied));
                mineIndex++;
                if (mineIndex > 23) break;
            }
            actionRows.push(new Discord.MessageActionRow().addComponents(components));
        }
        actionRows[4].addComponents([new Discord.MessageButton().setCustomId("finish").setEmoji("🏁").setStyle("SUCCESS").setDisabled(hasDied)]);
        return actionRows;
    }

    revealMine(mineIndex) {
        this.gameItems[mineIndex].revealed = true;
        return this.gameItems[mineIndex].type;
    }
}

module.exports = Minesweeper;