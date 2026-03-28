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
    if (chatId.toString() !== ADMIN_ID) return res.sendStatus(200);

    let replyText = "指令錯誤";

    // ===== /start =====
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

    // ===== 按鈕 =====
    if (text === "🔍 查詢點數") {
      userState[chatId] = { action: "CHECK" };
      replyText = "請輸入會員手機或帳號";
    }

    else if (text === "🎟 產生序號") {
      userState[chatId] = { action: "GENERATE" };
      replyText = "請輸入要產生的點數";
    }

    else if (text === "➕ 累積點數") {
      userState[chatId] = { action: "ADD_PHONE" };
      replyText = "請輸入會員手機";
    }

    else if (text === "➖ 扣點") {
      userState[chatId] = { action: "USE_PHONE" };
      replyText = "請輸入會員手機";
    }

    // ===== 查詢 =====
    else if (userState[chatId]?.action === "CHECK") {

      const response = await fetch(`${GAS_URL}?action=check&phone=${text}`);
      replyText = await response.text();

      userState[chatId] = null;
    }

    // ===== 產生序號（修正重複問題）=====
    else if (userState[chatId]?.action === "GENERATE") {

      if (!/^\d+$/.test(text)) {
        replyText = "請輸入數字";
      } else {

        const response = await fetch(
          `${GAS_URL}?action=generate&points=${text}&password=az20408`
        );

        const result = await response.text();

        replyText =
          `可複製序號👇\n\n` +
          `${result}`;
      }

      userState[chatId] = null;
    }

    // ===== 累積點數 =====
    else if (userState[chatId]?.action === "ADD_PHONE") {

      userState[chatId] = {
        action: "ADD_AMOUNT",
        phone: text
      };

      replyText = "請輸入消費金額";
    }

    else if (userState[chatId]?.action === "ADD_AMOUNT") {

      if (!/^\d+$/.test(text)) {
        replyText = "請輸入正確金額";
      } else {

        const phone = userState[chatId].phone;
        const amount = parseInt(text);

        const response = await fetch(
          `${GAS_URL}?action=addPointsByAmount&phone=${phone}&amount=${amount}&password=az20408`
        );

        replyText = await response.text();
      }

      userState[chatId] = null;
    }

    // ===== 扣點（完全修正）=====
    else if (userState[chatId]?.action === "USE_PHONE") {

      userState[chatId] = {
        action: "USE_POINTS",
        phone: text
      };

      const checkRes = await fetch(`${GAS_URL}?action=check&phone=${text}`);
      replyText = await checkRes.text();
    }

    else if (userState[chatId]?.action === "USE_POINTS") {

      if (!/^\d+$/.test(text)) {
        replyText = "請輸入正確點數";
      } else {

        const phone = userState[chatId].phone;
        const usePoints = parseInt(text);

        const response = await fetch(
          `${GAS_URL}?action=redeemPoints&phone=${phone}&usePoints=${usePoints}&password=az20408`
        );

        replyText = await response.text();
      }

      userState[chatId] = null;
    }

    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: replyText
      }),
    });

    res.sendStatus(200);

  } catch (err) {
    console.log("❌ webhook error:", err);
    res.sendStatus(200);
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("🔥 APP STARTED");
});