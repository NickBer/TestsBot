/*eslint no-console: ["error", { allow: ["warn", "error"] }] */

const fs = require("fs");
const Quest = require("./Quest");


class QuestsStore {
    /**
     *
     * @param {string} path Путь для сохранения квестов
     * @param {function} save функция для сохранения, (path,data,callback)
     */
    constructor(path = "./data") {
        this.quests = [];
        fs.readdirSync(path + "/").forEach(file => {
            var data = JSON.parse(fs.readFileSync(path + "/" + file, 'utf8'));
            var quest = Object.assign(new Quest, data);
            this.quests.push(quest);
        });
        this.path = path;
    }

    /**
     * @description добавление нового квеста в список квестов хранилища
     * @param {Quest} quest
     */
    addQuest(quest) {
        if (quest instanceof Quest) {
            this.quests.push(quest);
            fs.writeFileSync(this.path + "/" + quest.name, JSON.stringify(quest));
        } else {
            this.quests.push(new Quest());
        }
    }

    saveQuest(quest) {
        fs.writeFileSync(this.path + "/" + quest.name, JSON.stringify(quest));
    }

    /**
     * @description Находит квест по паролю
     * @param {string} password пароль к квесту
     */
    findQuestFromPass(password) {
        for (var quest in this.quests) {
            if (this.quests[quest].password == password) {
                return this.quests[quest];
            }
        }
        return null;
    }

    findQuestFromName(nam) {
        for (var quest in this.quests) {
            if (this.quests[quest].name == nam) {
                return this.quests[quest];
            }
        }
        return null;
    }

    getQuestIDFromName(nam) {
        for (let i = 0; i < this.quests.length; i++) {
            if (this.quests[i].name == nam) {
                return i;
            }
        }
        return null;
    }
}

module.exports = QuestsStore;