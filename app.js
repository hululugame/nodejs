const express = require("express");

const app = express();

// 一定要有：不然收不到 Telegram 的 JSON body
app.use(express.json());

const BOT_TOKEN = process.env.BOT_TOKEN; // 你要在 Railway Variables 設
if (!BOT_TOKEN) {
  console.log("❌ Missing BOT_TOKEN in environment variables");
}

// 測試首頁（用瀏覽器開這個網址應該要看到 OK）
app.get("/", (req, res) => {
  res.status(200).send("OK");
});

// Telegram webhook：Telegram 只會用 POST 打這裡
app.post("/webhook", async (req, res) => {
  try {
    const update = req.body;
    console.log("✅ update:", JSON.stringify(update));

    // 先立刻回 200，不然 Telegram 會重送
    res.sendStatus(200);

    // 只處理文字訊息
    const chatId = update?.message?.chat?.id;
    const text = update?.message?.text;

    if (!chatId || !text) return;

    const replyText = `收到：${text}`;

    // 呼叫 Telegram sendMessage
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text: replyText }),
    });

    console.log("✅ replied to chat:", chatId);
  } catch (err) {
    console.log("❌ webhook error:", err);
    // 這裡不要卡住
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});