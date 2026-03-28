const express = require("express");
const app = express();
app.use(express.json());

const BOT_TOKEN = process.env.BOT_TOKEN;
const GAS_URL = "https://script.google.com/macros/s/AKfycbwxyu1gCGvrWT5g0fX9X9co74u5cJM5pl9-NiS4koanV8EvsaSXCzI-YbuYVEVB4t0n/exec";
const ADMIN_ID = "8345305737";

const userState = {};

// 首頁測試
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

    // ===== 按鈕操作 =====
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

    // ===== 查詢會員 =====
    else if (userState[chatId]?.action === "CHECK") {

      const response = await fetch(`${GAS_URL}?action=check&phone=${text}`);
      const result = (await response.text()).trim();

      if (
        result.includes("目前點數：0") &&
        result.includes("無紀錄")
      ) {
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

        // 直接交給 GAS 計算 1%
        const response = await fetch(
          `${GAS_URL}?action=addPointsByAmount&phone=${phone}&amount=${amount}&password=az20408`
        );

        replyText = await response.text();
      }

      userState[chatId] = null;
    }

    // ===== 扣點 =====
else if (userState[chatId]?.action === "USE_PHONE") {

  const phone = text;

  // 先查目前點數
  const checkRes = await fetch(`${GAS_URL}?action=check&phone=${phone}`);
  const checkText = await checkRes.text();
  const currentPoints = extractPoints(checkText);

  if (currentPoints === null) {
    replyText = "查無此會員";
    userState[chatId] = null;
  } else {

    userState[chatId] = {
      action: "USE_POINTS",
      phone: phone,
      beforePoints: currentPoints
    };

    replyText =
      `目前點數：${currentPoints} 點\n` +
      `請輸入要扣除的點數`;
  }
}

else if (userState[chatId]?.action === "USE_POINTS") {

  if (!/^\d+$/.test(text)) {
    replyText = "請輸入正確點數";
  } else {

    const phone = userState[chatId].phone;
    const beforePoints = userState[chatId].beforePoints;
    const usePoints = parseInt(text);

    if (usePoints > beforePoints) {
      replyText = "點數不足";
    } else {

      // ✅ 正確參數名稱改這裡
      await fetch(
        `${GAS_URL}?action=redeemPoints&phone=${phone}&points=${usePoints}&password=az20408`
      );

      // 再查一次最新點數
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

    // ===== 回傳訊息 =====
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