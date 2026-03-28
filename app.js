const express = require("express");

const app = express();
app.use(express.json());

const BOT_TOKEN = process.env.BOT_TOKEN;
const GAS_URL = "https://script.google.com/macros/s/AKfycbwxyu1gCGvrWT5g0fX9X9co74u5cJM5pl9-NiS4koanV8EvsaSXCzI-YbuYVEVB4t0n/exec";
const ADMIN_ID = "8345305737";

if (!BOT_TOKEN) {
  console.log("❌ Missing BOT_TOKEN");
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

    // 限制只有你能操作
    if (chatId.toString() !== ADMIN_ID) {
      return res.sendStatus(200);
    }

    let replyText = "指令錯誤";

// ===== 按鈕處理 =====
if (text === "🔍 查詢點數") {
  userState[chatId] = { action: "CHECK" };
  replyText = "請輸入會員手機或帳號";
}

else if (text === "🎟 產生序號") {
  userState[chatId] = { action: "GENERATE" };
  replyText = "請輸入點數數字";
}

else if (text === "➕ 累積點數") {
  replyText = "請輸入 /add 手機號碼 消費金額";
}

else if (text === "➖ 扣點") {
  replyText = "請輸入 /use 手機號碼 點數";
}

    // ===== /start =====
    if (text === "/start") {
      await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: "請直接輸入：\n\n手機號碼 → 查詢點數\n1~4位數字 → 產生序號\n/add 手機 金額 → 累積點數\n/use 手機 點數 → 扣點"
        })
      });
      return res.sendStatus(200);
    }

    // ===== 查詢手機 =====
    if (/^09\d{8}$/.test(text)) {

      const response = await fetch(
        `${GAS_URL}?action=check&phone=${text}`
      );

      const result = await response.text();

      if (!result || result.includes("查無")) {
        replyText = "查無此手機資料";
      } else {
        replyText = result;
      }
    }

    // ===== 產生序號 (只接受1~4位數) =====
// ===== 查詢模式 =====
else if (userState[chatId]?.action === "CHECK") {

// ===== 查詢模式 =====
else if (userState[chatId]?.action === "CHECK") {

  const response = await fetch(
    `${GAS_URL}?action=check&phone=${text}`
  );

  const result = (await response.text()).trim();

  if (!result || result.length < 3) {
    replyText = "查無此會員";
  } else if (
    result.includes("查無") ||
    result.includes("not found") ||
    result.includes("error")
  ) {
    replyText = "查無此會員";
  } else {
    replyText = result;
  }

  userState[chatId] = null;
}


// ===== 產生序號模式 =====
else if (userState[chatId]?.action === "GENERATE") {

  if (!/^\d+$/.test(text)) {
    replyText = "請輸入數字";
  } else {

    const response = await fetch(
      `${GAS_URL}?action=generate&points=${text}&password=az20408`
    );

    replyText = await response.text();
  }

  userState[chatId] = null;
}

    // ===== 累積點數 =====
    else if (text.startsWith("/add ")) {

      const parts = text.split(" ");
      if (parts.length === 3) {

        const phone = parts[1];
        const amount = parseInt(parts[2]);
        const points = Math.floor(amount * 0.01);

        const response = await fetch(
          `${GAS_URL}?action=addPointsBy&phone=${phone}&amount=${points}&password=az20408`
        );

        replyText = `回饋 ${points} 點\n` + await response.text();
      } else {
        replyText = "格式錯誤，請使用 /add 手機號碼 消費金額";
      }
    }

    // ===== 扣點 =====
    else if (text.startsWith("/use ")) {

      const parts = text.split(" ");
      if (parts.length === 3) {

        const phone = parts[1];
        const points = parts[2];

        const response = await fetch(
          `${GAS_URL}?action=usePoints&phone=${phone}&points=${points}&password=az20408`
        );

        replyText = await response.text();
      } else {
        replyText = "格式錯誤，請使用 /use 手機號碼 點數";
      }
    }

    // ===== 回傳訊息 =====
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