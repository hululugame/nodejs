const express = require("express");

console.log("🔥 APP STARTED");

const app = express();

app.use(express.json());

const BOT_TOKEN = process.env.BOT_TOKEN;
const GAS_URL = "https://script.google.com/macros/s/AKfycbwxyu1gCGvrWT5g0fX9X9co74u5cJM5pl9-NiS4koanV8EvsaSXCzI-YbuYVEVB4t0n/exec";

if (!BOT_TOKEN) {
  console.log("❌ Missing BOT_TOKEN");
}

app.get("/", (req, res) => {
  res.send("OK");
});

app.post("/webhook", async (req, res) => {
  try {
    const update = req.body;
    res.sendStatus(200);

    const chatId = update?.message?.chat?.id;
    const text = update?.message?.text;

    if (!chatId || !text) return;

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

    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: replyText,
      }),
    });
  } catch (err) {
    console.log("❌ error:", err);
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Server running");
});