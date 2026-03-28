const express = require("express");

const app = express();
app.use(express.json());

const BOT_TOKEN = process.env.BOT_TOKEN;
const GAS_URL = "https://script.google.com/macros/s/AKfycbwxyu1gCGvrWT5g0fX9X9co74u5cJM5pl9-NiS4koanV8EvsaSXCzI-YbuYVEVB4t0n/exec";
const ADMIN_ID = "8345305737";

const userState = {};

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
    
    if (chatId.toString() !== ADMIN_ID) {
  return res.sendStatus(200);
}
    console.log("8345305737:", chatId);

    if (!chatId || !text) {
      return res.sendStatus(200);
    }

    const parts = text.split(" ");
    const command = parts[0].split("@")[0];

    let replyText = "指令錯誤";
    
// ===== 查詢手機號碼 (一定要10碼09開頭) =====
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


// ===== 產生序號 (只能1~4位數) =====
else if (/^\d{1,4}$/.test(text)) {

  const response = await fetch(
    `${GAS_URL}?action=generate&points=${text}&password=az20408`
  );

  replyText = await response.text();
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

    replyText = await response.text();
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
  }
}

// ===== 這裡開始放狀態處理 =====

// 查詢點數
else if (userState[chatId]?.action === "CHECK") {

  if (!/^09\d{8}$/.test(text)) {
    replyText = "手機格式錯誤，請重新輸入";
  } else {
    const response = await fetch(
      `${GAS_URL}?action=check&phone=${text}`
    );
    replyText = await response.text();
    userState[chatId] = null;
  }
}

// 產生序號
else if (userState[chatId]?.action === "GENERATE") {

  if (!/^\d{1,4}$/.test(text)) {
    replyText = "請輸入1~4位數點數";
  } else {
    const response = await fetch(
      `${GAS_URL}?action=generate&points=${text}&password=az20408`
    );
    replyText = await response.text();
    userState[chatId] = null;
  }
}

if (command === "/start") {
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
    // 🔎 查詢點數
    if (command.startsWith("/check") && parts[1]) {
      const phone = parts[1];
      console.log("收到 check 指令:", phone);

      const response = await fetch(
        `${GAS_URL}?action=check&phone=${phone}`
      );
      replyText = await response.text();
    }

    // 🎟 產生序號
    else if (command === "/generate" && parts[1]) {
      const points = parts[1];

      const response = await fetch(
        `${GAS_URL}?action=generate&points=${points}&password=az20408`
      );
      replyText = await response.text();
    }
    
    // 🎟 直接輸入數字當成產生序號
else if (/^\d+$/.test(text)) {
  const points = text;

  const response = await fetch(
    `${GAS_URL}?action=generate&points=${points}&password=az20408`
  );

  replyText = await response.text();
}

    // ➕ 累積點數
    else if (command === "/add" && parts[1] && parts[2]) {
      const phone = parts[1];
      const amount = parts[2];

      const response = await fetch(
        `${GAS_URL}?action=addPointsBy&phone=${phone}&amount=${amount}&password=az20408`
      );
      replyText = await response.text();
    }

    // ➖ 扣點
    else if (command === "/use" && parts[1] && parts[2]) {
      const phone = parts[1];
      const points = parts[2];

      const response = await fetch(
        `${GAS_URL}?action=usePoints&phone=${phone}&points=${points}&password=az20408`
      );
      replyText = await response.text();
    }

    // 回傳訊息給 Telegram
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
    res.sendStatus(200); // 就算錯誤也要回 200，避免 Railway 重啟
  }
});

const PORT = process.env.PORT;

app.listen(PORT, () => {
  console.log("🔥 APP STARTED");
  console.log(`Server running on port ${PORT}`);
});
