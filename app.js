const express = require("express");

const app = express();
app.use(express.json());

const BOT_TOKEN = process.env.BOT_TOKEN;
const GAS_URL = "https://script.google.com/macros/s/AKfycbwxyu1gCGvrWT5g0fX9X9co74u5cJM5pl9-NiS4koanV8EvsaSXCzI-YbuYVEVB4t0n/exec";

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

    if (!chatId || !text) {
      return res.sendStatus(200);
    }

    const parts = text.split(" ");
    const command = parts[0].split("@")[0];

    let replyText = "指令錯誤";

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