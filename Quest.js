/*eslint no-console: ["error", { allow: ["warn", "error"] }] */

const Task = require("./Task");

var orderType = {
    normal: "По-порядку добавления",
    random: "Случайное расположение"
};

class Quest {
    /**
     *
     * @param {string} name имя квеста
     * @param {orderType} order порядок отображения вопросов
     * @param {string} password пароль для доступа к квесту
     */
    constructor(name = "No name", order = "normal", password = null) {
        this.order = orderType[order];
        this.name = name;
        this.tasks = [];
        this.password = password;
        this.access = false;
        this.caption = "";
    }

    /**
     * @description добавление новой задачи в список задач квеста
     * @param {Task} task
     */
    addTask(task) {
        if (task instanceof Task) {
            this.tasks.push(task);
        } else {
            this.tasks.push(new Task());
        }
    }
}


module.exports=Quest;