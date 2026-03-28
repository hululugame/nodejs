const express = require("express");
const app = express();
app.use(express.json());

const BOT_TOKEN = process.env.BOT_TOKEN;
const GAS_URL = "https://script.google.com/macros/s/AKfycbwxyu1gCGvrWT5g0fX9X9co74u5cJM5pl9-NiS4koanV8EvsaSXCzI-YbuYVEVB4t0n/exec";
const ADMIN_ID = "8345305737";

const userState = {};

function extractPoints(text) {
  const match = text.match(/目前點數[:：]?\s*(\d+)/);
  return match ? parseInt(match[1]) : null;
}

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
      const result = (await response.text()).trim();

      if (result.includes("目前點數：0") && result.includes("無紀錄")) {
        replyText = "查無此會員";
      } else {
        replyText = result;
      }

      userState[chatId] = null;
    }

    // ===== 產生序號 =====
    else if (userState[chatId]?.action === "GENERATE") {

      if (!/^\d+$/.test(text)) {
        replyText = "請輸入數字";
      } else {
        const response = await fetch(
          `${GAS_URL}?action=generate&points=${text}&password=az20408`
        );
        const code = await response.text();
        replyText = `序號：${code}\n\n\`${code}\``;
      }

      userState[chatId] = null;
    }

    // ===== 累積點數 =====
    else if (userState[chatId]?.action === "ADD_PHONE") {

      userState[chatId] = { action: "ADD_AMOUNT", phone: text };
      replyText = "請輸入消費金額";
    }

    else if (userState[chatId]?.action === "ADD_AMOUNT") {

      if (!/^\d+$/.test(text)) {
        replyText = "請輸入正確金額";
      } else {

        const phone = userState[chatId].phone;
        const amount = parseInt(text);
        const reward = Math.floor(amount * 0.01);

        // 先查原本點數
        const beforeRes = await fetch(`${GAS_URL}?action=check&phone=${phone}`);
        const beforeText = await beforeRes.text();
        const beforePoints = extractPoints(beforeText) || 0;

        // 加點
        await fetch(
          `${GAS_URL}?action=addPointsBy&phone=${phone}&amount=${reward}&password=az20408`
        );

        // 再查最新
        const afterRes = await fetch(`${GAS_URL}?action=check&phone=${phone}`);
        const afterText = await afterRes.text();
        const newPoints = extractPoints(afterText);

        replyText =
          `原本點數：${beforePoints} 點\n` +
          `消費 ${amount} 元\n` +
          `回饋 ${reward} 點\n\n` +
          `目前總點數：${newPoints} 點`;
      }

      userState[chatId] = null;
    }

    // ===== 扣點 =====
    else if (userState[chatId]?.action === "USE_PHONE") {

      userState[chatId] = { action: "USE_POINTS", phone: text };
      replyText = "請輸入要扣的點數";
    }

    else if (userState[chatId]?.action === "USE_POINTS") {

      if (!/^\d+$/.test(text)) {
        replyText = "請輸入正確點數";
      } else {

        const phone = userState[chatId].phone;
        const usePoints = parseInt(text);

        // 先查原本點數
        const beforeRes = await fetch(`${GAS_URL}?action=check&phone=${phone}`);
        const beforeText = await beforeRes.text();
        const beforePoints = extractPoints(beforeText);

        if (beforePoints === null) {
          replyText = "查無此會員";
        }
        else if (usePoints > beforePoints) {
          replyText = "點數不足";
        }
        else {

          await fetch(
            `${GAS_URL}?action=usePoints&phone=${phone}&points=${usePoints}&password=az20408`
          );

          // 再查最新點數
          const afterRes = await fetch(`${GAS_URL}?action=check&phone=${phone}`);
          const afterText = await afterRes.text();
          const newPoints = extractPoints(afterText);

          replyText =
            `原本點數：${beforePoints} 點\n` +
            `扣除：${usePoints} 點\n` +
            `剩餘點數：${newPoints} 點`;
        }
      }

      userState[chatId] = null;
    }

    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: replyText,
        parse_mode: "Markdown"
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