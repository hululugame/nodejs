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

function extractPoints(text) {
  const match = text.match(/目前點數[:：]\s*(\d+)/);
  return match ? parseInt(match[1]) : 0;
}

app.post("/webhook", async (req, res) => {
  try {
    const update = req.body;
    const chatId = update?.message?.chat?.id;
    const text = update?.message?.text;

    if (!chatId || !text) return res.sendStatus(200);
    if (chatId.toString() !== ADMIN_ID) return res.sendStatus(200);

    let replyText = "指令錯誤";
    let parseMode = undefined;

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

    // ===== 查詢點數 =====
    if (text === "🔍 查詢點數") {
      userState[chatId] = { action: "CHECK" };
      replyText = "請輸入會員手機或帳號";
    }

    else if (userState[chatId]?.action === "CHECK") {
      const response = await fetch(`${GAS_URL}?action=check&phone=${text}`);
      const result = await response.text();

      if (result.includes("目前點數：0") && result.includes("無紀錄")) {
        replyText = "查無此會員";
      } else {
        replyText = result;
      }

      userState[chatId] = null;
    }

    // ===== 扣點開始 =====
    else if (text === "➖ 扣點") {
      userState[chatId] = { action: "USE_PHONE" };
      replyText = "請輸入會員手機";
    }

    else if (userState[chatId]?.action === "USE_PHONE") {

      const phone = text;

      const checkRes = await fetch(`${GAS_URL}?action=check&phone=${phone}`);
      const checkText = await checkRes.text();
      const currentPoints = extractPoints(checkText);

      userState[chatId] = {
        action: "USE_POINTS",
        phone: phone
      };

      replyText =
        `目前點數：${currentPoints} 點\n\n` +
        `請輸入要扣的點數`;
    }

    else if (userState[chatId]?.action === "USE_POINTS") {

      if (!/^\d+$/.test(text)) {
        replyText = "請輸入正確點數";
      } else {

        const phone = userState[chatId].phone;
        const usePoints = parseInt(text);

        // 🔥 真的扣點（寫入試算表）
        await fetch(
          `${GAS_URL}?action=redeemPoints&phone=${phone}&usePoints=${usePoints}&password=az20408`
        );

        // 🔥 再重新抓最新點數（確保同步）
        const afterRes = await fetch(`${GAS_URL}?action=check&phone=${phone}`);
        const afterText = await afterRes.text();
        const newPoints = extractPoints(afterText);

        replyText =
          `扣除：${usePoints} 點\n` +
          `剩餘點數：${newPoints} 點`;
      }

      userState[chatId] = null;
    }

    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: replyText,
        parse_mode: parseMode
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