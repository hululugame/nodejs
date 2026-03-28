const express = require("express");


const app = express();
app.use(express.json());

const BOT_TOKEN = process.env.BOT_TOKEN;
const GAS_URL = "https://script.google.com/macros/s/AKfycbwxyu1gCGvrWT5g0fX9X9co74u5cJM5pl9-NiS4koanV8EvsaSXCzI-YbuYVEVB4t0n/exec";
const ADMIN_ID = "8345305737";

const userState = {};

app.get("/", (req, res) => {
  res.send("Bot is running");
});

app.post("/webhook", async (req, res) => {
  try {
    const update = req.body;
    const chatId = update?.message?.chat?.id;
    const text = update?.message?.text;

    if (!chatId || !text) return res.sendStatus(200);

    if (chatId.toString() !== ADMIN_ID) {
      return res.sendStatus(200);
    }

    let replyText = "指令錯誤";

    // ====== START 鍵盤 ======
    if (text === "/start") {
      await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: "請選擇功能",
          reply_markup: {
            keyboard: [
              ["🔍 查詢點數"],
              ["🎟 產生序號"],
              ["➕ 累積點數"],
              ["➖ 扣點"]
            ],
            resize_keyboard: true
          }
        })
      });
      return res.sendStatus(200);
    }

    // ====== 按鈕設定狀態 ======

    if (text === "🔍 查詢點數") {
      userState[chatId] = { action: "CHECK" };
      replyText = "請輸入手機號碼";
    }

    else if (text === "🎟 產生序號") {
      userState[chatId] = { action: "GENERATE" };
      replyText = "請輸入點數";
    }

    else if (text === "➕ 累積點數") {
      userState[chatId] = { action: "ADD_PHONE" };
      replyText = "請輸入客人手機號碼";
    }

    else if (text === "➖ 扣點") {
      userState[chatId] = { action: "USE_PHONE" };
      replyText = "請輸入客人手機號碼";
    }

    // ====== 查詢點數 ======
    else if (userState[chatId]?.action === "CHECK" && /^09\d{8}$/.test(text)) {

      const response = await fetch(
        `${GAS_URL}?action=check&phone=${text}`
      );

      replyText = await response.text();
      userState[chatId] = null;
    }

    // ====== 產生序號 ======
    else if (userState[chatId]?.action === "GENERATE" && /^\d+$/.test(text)) {

      const response = await fetch(
        `${GAS_URL}?action=generate&points=${text}&password=az20408`
      );

      replyText = await response.text();
      userState[chatId] = null;
    }

    // ====== 累積點數 ======
    else if (userState[chatId]?.action === "ADD_PHONE" && /^09\d{8}$/.test(text)) {
      userState[chatId] = {
        action: "ADD_AMOUNT",
        phone: text
      };
      replyText = "請輸入消費金額";
    }

    else if (userState[chatId]?.action === "ADD_AMOUNT" && /^\d+$/.test(text)) {

      const phone = userState[chatId].phone;
      const amount = parseInt(text);
      const points = Math.floor(amount * 0.01);

      const response = await fetch(
        `${GAS_URL}?action=addPointsBy&phone=${phone}&amount=${points}&password=az20408`
      );

      replyText = `回饋 ${points} 點\n` + await response.text();
      userState[chatId] = null;
    }

    // ====== 扣點 ======
    else if (userState[chatId]?.action === "USE_PHONE" && /^09\d{8}$/.test(text)) {
      userState[chatId] = {
        action: "USE_AMOUNT",
        phone: text
      };
      replyText = "請輸入要扣幾點";
    }

    else if (userState[chatId]?.action === "USE_AMOUNT" && /^\d+$/.test(text)) {

      const phone = userState[chatId].phone;

      const response = await fetch(
        `${GAS_URL}?action=usePoints&phone=${phone}&points=${text}&password=az20408`
      );

      replyText = await response.text();
      userState[chatId] = null;
    }

    // ====== 回傳訊息 ======
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: replyText,
      }),
    });

    res.sendStatus(200);

  } catch (err) {
    console.log("❌ webhook error:", err);
    res.sendStatus(200);
  }
});

const PORT = process.env.PORT;

app.listen(PORT, () => {
  console.log("🔥 APP STARTED");
});