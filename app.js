const express = require("express");
const app = express();
app.use(express.json());

const BOT_TOKEN = process.env.BOT_TOKEN;
const GAS_URL = "https://script.google.com/macros/s/AKfycbwxyu1gCGvrWT5g0fX9X9co74u5cJM5pl9-NiS4koanV8EvsaSXCzI-YbuYVEVB4t0n/exec";
const ADMIN_ID = "8345305737";

const userState = {};

function extractPoints(text) {
  const match = text.match(/目前點數[:：]\s*(\d+)/);
  return match ? parseInt(match[1]) : null;
}

app.post("/webhook", async (req, res) => {
  try {
    const update = req.body;
    const chatId = update?.message?.chat?.id;
    const text = update?.message?.text;

    if (!chatId || !text) return res.sendStatus(200);
    if (chatId.toString() !== ADMIN_ID) return res.sendStatus(200);

    let replyText = "";

    // ===== 查詢 =====
    if (userState[chatId]?.action === "CHECK") {

      const response = await fetch(`${GAS_URL}?action=check&phone=${text}`);
      const result = (await response.text()).trim();

      const points = extractPoints(result);

      if (!points && result.includes("無紀錄")) {
        replyText = "查無此會員";
      } else {
        replyText = result;
      }

      userState[chatId] = null;
    }

    // ===== 累積點數 =====
    else if (userState[chatId]?.action === "ADD_AMOUNT") {

      const phone = userState[chatId].phone;
      const amount = parseInt(text);

      const reward = Math.floor(amount * 0.01);

      await fetch(`${GAS_URL}?action=addPointsBy&phone=${phone}&amount=${reward}&password=az20408`);

      // 再查一次最新點數
      const afterRes = await fetch(`${GAS_URL}?action=check&phone=${phone}`);
      const afterText = await afterRes.text();
      const newPoints = extractPoints(afterText);

      replyText = `消費 ${amount} 元\n回饋 ${reward} 點\n\n目前總點數：${newPoints} 點`;

      userState[chatId] = null;
    }

    // ===== 扣點 =====
    else if (userState[chatId]?.action === "USE_POINTS") {

      const phone = userState[chatId].phone;
      const usePoints = parseInt(text);

      // 先查原本點數
      const beforeRes = await fetch(`${GAS_URL}?action=check&phone=${phone}`);
      const beforeText = await beforeRes.text();
      const beforePoints = extractPoints(beforeText);

      if (beforePoints === null) {
        replyText = "查無此會員";
      } else if (usePoints > beforePoints) {
        replyText = "點數不足";
      } else {

        await fetch(`${GAS_URL}?action=usePoints&phone=${phone}&points=${usePoints}&password=az20408`);

        const remaining = beforePoints - usePoints;

        replyText =
          `原本點數：${beforePoints} 點\n` +
          `扣除：${usePoints} 點\n` +
          `剩餘點數：${remaining} 點`;
      }

      userState[chatId] = null;
    }

    // ===== 發送訊息 =====
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
    console.log(err);
    res.sendStatus(200);
  }
});

app.get("/", (req, res) => {
  res.send("Bot running");
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, "0.0.0.0", () => {
  console.log("🔥 APP STARTED");
});