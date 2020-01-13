/*eslint no-console: ["error", { allow: ["warn", "error"] }] */
var taskType = {
        /**
         * @description Несколько заданых вариантов
         */
        variants: "Несколько заданых вариантов",
        /**
         * @description Ручной ввод и проверка на соответствие
         */
        match: "Ручной ввод и проверка на соответствие",
        /**
         * @description На сопоставление или на порядок
         */
        matching: "На сопоставление или на порядок"
    };

class Task {


    /**
     * @description Одно задание в квесте
     * @param {string} question - текст задания
     * @param {string[]} photos - ссыока на фотографию
     * @param {taskType} type - "variants"|"match"|"matching"
     * @param {string[]|object} answer - список|.list (string[]) и .right (int)| object{one:"two"}
     */
    constructor(question = "Не задано", photos = '', type = taskType.variants, answer = ["Первый", "Второй"]) {
        this.question = question;
        this.photos = photos;
        this.type = taskType[type];
        this.answers = answer;
        this.rightAnswer = 0;
    }

}


module.exports=Task;