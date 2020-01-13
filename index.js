const Telegraf = require("telegraf");
const session = require("telegraf/session");
const Stage = require("telegraf/stage");
const Scene = require("telegraf/scenes/base");
const Markup = require("telegraf/markup");
const fs = require("fs");
const {
    leave
} = Stage;
const QuestsStore = require("./QuestsStore");
const Quest = require("./Quest");
const Task = require("./Task");

const config = require("./config");

var http = require('https');


var QrCodeR = require("qrcode-reader");
var qr = new QrCodeR();
var Jimp = require("jimp");

var admns = {};

var download = function (url, dest, cb) {
    var file = fs.createWriteStream(dest);
    var request = http.get(url, function (response) {
        response.pipe(file);
        file.on("finish", function () {
            file.close(cb); // close() is async, call cb after close completes.
        });
    }).on("error", function (err) { // Handle errors
        fs.unlinkSync(dest); // Delete the file async. (But we don't check the result)
        console.error("err while downloading\n" + err);
    });
};



var storage = new QuestsStore("./quests");

const start = new Scene("start");
start.enter(ctx => {
    ctx.reply("Бот для создания квестов.\nЧтобы создать новый квест напишите /newQuest.\nЧтобы отобразить все квесты напишите /showAllQuests.", Markup.inlineKeyboard([Markup.callbackButton("Показать все квесты", "showAllQuests"),
        Markup.callbackButton("Cоздать новый квесты", "newQuests")
    ]).extra());
});

const newQuestName = new Scene("newQuestName");
newQuestName.enter(ctx => {
    ctx.reply("Введите имя нового квеста");
});
newQuestName.hears(/[^/].+/, ctx => {
    storage.addQuest(new Quest(ctx.match[0], "normal"));
    ctx.reply(`Ок, имя нового квеста - ${ctx.match[0]}\nКвест успешно добавлен.`);
    ctx.scene.enter("start");
});


var editQuest = new Scene("editQuest");
editQuest.enter(ctx => {

    ctx.reply(`Управление квестом ${admns[ctx.chat.id].edit}. Используйте кнопки.`,
        Markup
        .keyboard([ // ? was keyboard
            ["Описание"],
            ["Задания"],
            ["Открыть доступ"],
            ["В начало"]
        ])
        .oneTime(true)
        .resize()
        .extra());

});

editQuest.hears(/Описание/i, ctx => {
    ctx.scene.enter("editQuestCaption");
});
editQuest.hears(/Задания/i, ctx => {

    ctx.scene.enter("editQuestTask");
});

editQuest.hears(/Открыть доступ/i, ctx => {
    ctx.reply("Открыть доступ?", Markup.inlineKeyboard([
        [Markup.callbackButton("Да", "access:Yes")],
        [Markup.callbackButton("Нет", "access:No")]
    ]).extra());

});

editQuest.hears(/В начало/, ctx => {
    ctx.scene.enter("start");
});

editQuest.action("access:Yes", ctx => {
    storage.quests[storage.getQuestIDFromName(admns[ctx.chat.id].edit)].access = true;
    storage.saveQuest(storage.quests[storage.getQuestIDFromName(admns[ctx.chat.id].edit)]);
    ctx.reply("Доступ открыт", Markup.inlineKeyboard([Markup.callbackButton("Перейти к управлению квестом", "edit")]).extra());
});
editQuest.action("access:No", ctx => {
    storage.quests[storage.getQuestIDFromName(admns[ctx.chat.id].edit)].access = false;
    storage.saveQuest(storage.quests[storage.getQuestIDFromName(admns[ctx.chat.id].edit)]);
    ctx.reply("Доступ закрыт", Markup.inlineKeyboard([Markup.callbackButton("Перейти к управлению квестом", "edit")]).extra());
});

var editQuestCaption = new Scene("editQuestCaption");
editQuestCaption.enter(ctx => {
    console.log(admns[ctx.chat.id].edit);
    console.log(storage.findQuestFromName(admns[ctx.chat.id].edit));
    var thisQuest = storage.quests[storage.getQuestIDFromName(admns[ctx.chat.id].edit)].caption;
    if (thisQuest) {
        ctx.reply(`Текущее описание:\n${thisQuest}\nПришлите новое текстовое описание квеста.`, Markup.keyboard(["Отмена"]).oneTime(true).resize().extra());
    } else {
        ctx.reply("Описание не задано.\nПришлите новое текстовое описание квеста.", Markup.keyboard(["Отмена"]).oneTime(true).resize().extra());
    }
});

editQuestCaption.hears(/[^/].+/i, ctx => {
    if (ctx.match[0] == "Отмена") {
        ctx.reply("Новое значение не задано", Markup.inlineKeyboard([Markup.callbackButton("Перейти к управлению квестом", "edit")]).extra());
    } else {
        ctx.reply("Ок, новое текстовое описание квеста:\n" + ctx.match[0], Markup.inlineKeyboard([Markup.callbackButton("Перейти к управлению квестом", "edit")]).extra());
        storage.quests[storage.getQuestIDFromName(admns[ctx.chat.id].edit)].caption = ctx.match[0];
        storage.saveQuest(storage.quests[storage.getQuestIDFromName(admns[ctx.chat.id].edit)]);
    }
});

var editQuestTask = new Scene("editQuestTask");
editQuestTask.enter(ctx => {
    var thisQuest = storage.findQuestFromName(admns[ctx.chat.id].edit);
    var t = [];
    for (let i = 0; i < thisQuest.tasks.length; i++) {
        t.push([Markup.callbackButton((i + 1) + ". " + thisQuest.tasks[i].question, `editTask:${i}`)]);
    }
    t.push([Markup.callbackButton("Добавить задание", "addTask")]);
    t.push([Markup.callbackButton("Перейти к управлению квестом", "edit")]);
    ctx.reply("Выберите задание, которое хотите изменить:", Markup.inlineKeyboard(t).extra());
});
editQuestTask.action(/editTask:(\d+)/i, ctx => {
    var n = Number(ctx.match[1]);
    admns[ctx.chat.id].task = n;
    ctx.reply(`Вопрос №${n + 1}\nВыберите что вы хотите изменить`, Markup.inlineKeyboard([
        [Markup.callbackButton("Задание", "question")],
        // [Markup.callbackButton("Изображения", "photos")],
        [Markup.callbackButton("Ответ", "answer")],
        [Markup.callbackButton("Перейти к управлению квестом", "edit")]
    ]).extra());
});
editQuestTask.action(/addTask/i, ctx => {
    var quest = storage.quests[storage.getQuestIDFromName(admns[ctx.chat.id].edit)];
    quest.addTask(new Task());
    admns[ctx.chat.id].task = quest.tasks.length - 1;
    ctx.reply("Ок, новое задание добавлено.");
    ctx.scene.enter("editQuestTaskQuestion")
});
editQuestTask.action(/question/i, ctx => {
    ctx.scene.enter("editQuestTaskQuestion");
});
editQuestTask.action(/photos/i, ctx => {
    ctx.scene.enter("editQuestTaskPhotos");
});
editQuestTask.action(/answer/i, ctx => {
    ctx.scene.enter("editQuestTaskAnswer");
});

var editQuestTaskQuestion = new Scene("editQuestTaskQuestion");
editQuestTaskQuestion.enter(ctx => {
    var thisQuest = storage.findQuestFromName(admns[ctx.chat.id].edit);
    var n = admns[ctx.chat.id].task;
    var thisTask = thisQuest.tasks[n];
    ctx.reply(`Текущее задание:\n${thisTask.question || "[Не задано.]"}\nПришлите новое задание.`, Markup.keyboard(["Отмена"]).oneTime(true).resize().extra());
});
editQuestTaskQuestion.hears(/[^/].+/i, ctx => {
    if (ctx.match[0] == "Отмена") {
        ctx.reply("Новое значение не задано");
        ctx.scene.enter("editQuestTask");
    } else {
        ctx.reply("Ок, новое задание:\n" + ctx.match[0], Markup.inlineKeyboard([Markup.callbackButton("Перейти к управлению заданием", `editTask:${admns[ctx.chat.id].task}`)]).extra());
        storage.quests[storage.getQuestIDFromName(admns[ctx.chat.id].edit)].tasks[admns[ctx.chat.id].task].question = ctx.match[0];
        storage.saveQuest(storage.quests[storage.getQuestIDFromName(admns[ctx.chat.id].edit)]);
        ctx.scene.enter("editQuestTask");
    }
});


var editQuestTaskPhotos = new Scene("editQuestTaskPhotos");
editQuestTaskPhotos.enter(ctx => {
    ctx.reply("Пришлите новое фото.", Markup.keyboard(["Отмена"]).oneTime(true).resize().extra());
    try {
        var photo = storage.quests[storage.getQuestIDFromName(admns[ctx.chat.id].edit)].tasks[admns[ctx.chat.id].task].photos;
        if (photo) {
            ctx.replyWithPhoto("Текущее фото", {
                url: photo
            });
        }
    } catch (err) {
        console.log(err);
    }
});
editQuestTaskPhotos.on("photo", ctx => {
    var file_id = ctx.message.photo.pop().file_id;
    ctx.replyWithPhoto(file_id);
    console.error(file_id);
    presenterBot.telegram.getFile(file_id)
        .then(file => presenterBot.telegram.getFileLink(file))
        .then(url => {            
            storage.quests[storage.getQuestIDFromName(admns[ctx.chat.id].edit)].tasks[admns[ctx.chat.id].task].photos = url;
            storage.saveQuest(storage.quests[storage.getQuestIDFromName(admns[ctx.chat.id].edit)]);
            ctx.reply("Новое изображение установлено.", Markup.inlineKeyboard([Markup.callbackButton("Перейти к управлению заданием", `editTask:${admns[ctx.chat.id].task}`)]).extra());
            ctx.scene.enter("editQuestTask");
        }).catch(reason => {
            console.error(reason);

            ctx.reply("Произошла ошибка установки изображения.", Markup.inlineKeyboard([Markup.callbackButton("Перейти к управлению заданием", `editTask:${admns[ctx.chat.id].task}`)]).extra());
            ctx.scene.enter("editQuestTask");
        });

});


editQuestTaskPhotos.hears("Отмена", ctx => {
    ctx.reply("Новое значение не задано", Markup.inlineKeyboard([Markup.callbackButton("Перейти к управлению заданием", `editTask:${admns[ctx.chat.id].task}`)]).extra());
    ctx.scene.enter("editQuestTask");
});

var editQuestTaskAnswer = new Scene("editQuestTaskAnswer");
editQuestTaskAnswer.enter(ctx => {
    ctx.reply("Пришлите варианты ответа через точку с запятой (;).",
        Markup.keyboard(["Отмена"]).oneTime(true).resize().extra());
});
editQuestTaskAnswer.hears(/[^/].+/i, ctx => {
    storage.quests[storage.getQuestIDFromName(admns[ctx.chat.id].edit)].tasks[admns[ctx.chat.id].task].answers = ctx.match[0].split(";");
    storage.saveQuest(storage.quests[storage.getQuestIDFromName(admns[ctx.chat.id].edit)]);
    var t = [];
    for (let i = 0; i < ctx.match[0].split(";").length; i++) {
        t.push([Markup.callbackButton(ctx.match[0].split(";")[i], i)]);
    }
    ctx.reply("Выберите правильный ответ:", Markup.inlineKeyboard(t).extra());
});
editQuestTaskAnswer.action(/\d/i, ctx => {
    ctx.reply("Ок, правильный ответ #" + (Number(ctx.match[0]) + 1) + `\n${storage.quests[storage.getQuestIDFromName(admns[ctx.chat.id].edit)].tasks[admns[ctx.chat.id].task].answers[Number(ctx.match[0])]}`, Markup.inlineKeyboard([Markup.callbackButton("Перейти к управлению заданием", `editTask:${admns[ctx.chat.id].task}`)]).extra());
    storage.quests[storage.getQuestIDFromName(admns[ctx.chat.id].edit)].tasks[admns[ctx.chat.id].task].rightAnswer = Number(ctx.match[0]);
    storage.saveQuest(storage.quests[storage.getQuestIDFromName(admns[ctx.chat.id].edit)]);
    ctx.scene.enter("editQuestTask");
});
editQuestTaskAnswer.hears("Отмена", ctx => {
    ctx.reply("Новое значение не задано", Markup.inlineKeyboard([Markup.callbackButton("Перейти к управлению заданием", `editTask:${admns[ctx.chat.id].task}`)]).extra());
    ctx.scene.enter("editQuestTask");
});


const adminStage = new Stage();
adminStage.command("cancel", leave());
adminStage.register(start);
adminStage.register(newQuestName);
adminStage.register(editQuest);
adminStage.register(editQuestCaption);
adminStage.register(editQuestTask);
adminStage.register(editQuestTaskQuestion);
adminStage.register(editQuestTaskPhotos);
adminStage.register(editQuestTask);
adminStage.register(editQuestTaskAnswer);


// Бот админ квеста

const adminBot = new Telegraf(config.adminBotToken);
adminBot.use(Telegraf.log());
adminBot.use(session());
adminBot.use(adminStage.middleware());


adminBot.start(ctx => {
    ctx.scene.enter("start");
});


adminBot.command("start", ctx => {
    ctx.scene.enter("start");
});

adminBot.command("newQuest", ctx => {
    ctx.scene.enter("newQuestName");
});

adminBot.action(/newQuest/, ctx => {
    ctx.scene.enter("newQuestName");
});

adminBot.action(/showAllQuests/i, ctx => {
    ctx.answerCbQuery();
    var t = "";
    var y = [];
    fs.readdirSync(storage.path + "/").forEach(file => {
        t += file + "\n";
        y.push(["Edit: " + file.toString()]);
    });


    ctx.reply("Список всех квестов:\n" + t, Markup
        .keyboard(y)
        .oneTime()
        .resize()
        .extra());
});

adminBot.command("showAllQuests", ctx => {
    var t = "";
    var y = [];
    fs.readdirSync(storage.path + "/").forEach(file => {
        t += file + "\n";
        y.push(["Edit: " + file.toString()]);
    });


    ctx.reply("Список всех квестов:\n" + t, Markup
        .keyboard(y)
        .oneTime()
        .resize()
        .extra());
});

adminBot.hears(/Edit: (.+)/, ctx => {
    admns[ctx.chat.id] = {
        "edit": ctx.match[1]
    };
    ctx.scene.enter("editQuest");
});

adminBot.action(/edit/, ctx => {
    ctx.scene.enter("editQuest");
});

var cont;

adminBot.on("photo", ctx => {
    ctx.reply("Фото получено, обработка...");
    cont = ctx;
    var fileId = ctx.message.photo[ctx.message.photo.length - 1].file_id;
    const d = () => {
        var buffer = fs.readFileSync("./qr.qr");
        Jimp.read(buffer, function (err, image) {
            if (err) {
                console.error(err);
            }
            qr.callback = function (err, value) {
                if (err) {
                    console.log(err);
                    cont.reply("Qr-код не обнаружен");
                } else {
                    cont.reply("Qr-код обнаружен, значение - " + value.result);

                }
            };
            qr.decode(image.bitmap);
        });
    };
    adminBot.telegram.getFileLink(fileId)
        .then(url => {
            download(url, "./qr.qr", d);
        });
});


adminBot.startPolling();



function nextTask(ctx) {
    var quest = storage.quests[storage.getQuestIDFromName(usrs[ctx.chat.id].quest)];
    if (usrs[ctx.chat.id].task != quest.tasks.length) {
        usrs[ctx.chat.id].attempt = 1;
        var task = quest.tasks[usrs[ctx.chat.id].task];
        usrs[ctx.chat.id].task++;
        if (!(task.photos == "")) {
            try {
                ctx.replyWithPhoto({
                    url: task.photos
                });
            } catch (e) {
                log(e);
            }
        }
        if (task.answers.length == 1) {
            ctx.reply(task.question);
        } else {
            var t;
            var rAns = task.answers[task.rightAnswer];
            ctx.reply(task.question, Markup.inlineKeyboard(
                task.answers.map(ans => {
                    if (ans == rAns) {
                        t = 1;
                    } else {
                        t = 0;
                    }
                    return Markup.callbackButton(ans, `answer:${t}`);
                })
            ).extra());
        }
    } else {
        var answers = `Вы выполнили все задания!\nВаш счет - ${usrs[ctx.chat.id].score} из возможных ${quest.tasks.length} очков.\n`;
        answers += "Правильные ответы:\n" +
            quest.tasks.map(task => {
                return task.question + ": " + task.answers[task.rightAnswer];
            }).reduce((previousValue, currentValue) => {
                return previousValue + "\n" + currentValue;
            });
        ctx.reply(answers);
        ctx.scene.leave();
    }
}

const startQuest = new Scene("startQuest");
startQuest.enter(ctx => {
    var quest = storage.quests[storage.getQuestIDFromName(usrs[ctx.chat.id].quest)];
    if (!quest.caption) {
        ctx.reply(`Квест "${quest.name}"\nУ квеста нет описания.`, Markup.inlineKeyboard([
            Markup.callbackButton("Начать выполнение заданий", "startTasks")
        ]).extra());
    } else {
        ctx.reply(`Квест "${quest.name}"\nОписание:\n${quest.caption}`, Markup.inlineKeyboard([
            Markup.callbackButton("Начать выполнение заданий", "startTasks")
        ]).extra());
    }
});
startQuest.action("startTasks", ctx => {
    ctx.scene.enter("startTasks");
});

const startTasks = new Scene("startTasks");
startTasks.enter(ctx => {
    usrs[ctx.chat.id].task = 0;
    nextTask(ctx);
});



startTasks.hears(/^.+/i, ctx => {
    var quest = storage.quests[storage.getQuestIDFromName(usrs[ctx.chat.id].quest)];
    var task = quest.tasks[usrs[ctx.chat.id].task - 1];
    if (ctx.match[0].toLowerCase() == task.answers[task.rightAnswer].toLowerCase()) { // comparing ignore case
        usrs[ctx.chat.id].score++;
        nextTask(ctx);
    } else if (usrs[ctx.chat.id].attempt < 2) {
        usrs[ctx.chat.id].attempt++;
        ctx.reply("Не верно, попробуйте ещё раз");
    } else {
        nextTask(ctx);
    }
});

startTasks.action(/answer:(.+)/i, ctx => {
    var quest = storage.quests[storage.getQuestIDFromName(usrs[ctx.chat.id].quest)];
    if (ctx.match[1] == "1") {
        usrs[ctx.chat.id].score++;
    }
    nextTask(ctx);
});


// Бот-ведущий квеста
var usrs = {};

const presenterStage = new Stage();
presenterStage.command("cancel", leave());
presenterStage.register(startQuest);
presenterStage.register(startTasks);


const presenterBot = new Telegraf(config.presenterBotToken);
presenterBot.use(Telegraf.log());
presenterBot.use(session());
presenterBot.use(presenterStage.middleware());

presenterBot.start(ctx => {
    ctx.reply("use /showQuestsList");
});

presenterBot.command("showQuestsList", ctx => {
    var t = "";
    var y = [];
    storage.quests
        .filter(quest => quest.access)
        .forEach(quest => {
            y.push(["Choose: " + quest.name]);
        });

    ctx.reply("Список всех квестов:\n" + t, Markup
        .keyboard(y)
        .oneTime()
        .resize()
        .extra());
});

presenterBot.hears(/Choose: (.+)/i, ctx => {
    if (storage.quests[storage.getQuestIDFromName(ctx.match[1])].access) {
        ctx.reply("Квест открыт для участия, принять участие?", Markup.inlineKeyboard([
            Markup.callbackButton("Да", `startQuest:${ctx.match[1]}`),
            Markup.callbackButton("Нет", "showQuestsList")
        ]).extra());
    }

});
presenterBot.action(/startQuest:(.+)/, ctx => {
    usrs[ctx.chat.id] = {
        "quest": ctx.match[1],
        "score": 0,
        "task": 0,
        "attempt": 0
    };
    ctx.scene.enter("startQuest");
});

presenterBot.on("photo", ctx => {
    ctx.reply("Фото получено, обработка...");
    cont = ctx;
    var fileName = `./photos/qr${ctx.chat.id}.qr`;
    var fileId = ctx.message.photo[ctx.message.photo.length - 1].file_id;
    const d = () => {
        var buffer = fs.readFileSync(fileName);
        Jimp.read(buffer, function (err, image) {
            if (err) {
                console.error(err);
            }
            qr.callback = function (err, value) {
                if (err) {
                    console.log(err);
                    cont.reply("Qr-код не обнаружен");
                } else {
                    cont.reply("Qr-код обнаружен, значение - " + value.result);
                }
            };
            qr.decode(image.bitmap);
        });
    };
    presenterBot.telegram.getFileLink(fileId)
        .then(url => {
            download(url, fileName, d);
        });
});


presenterBot.startPolling();