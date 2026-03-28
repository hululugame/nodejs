const express = require('express');
const app = express();

const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send('成功了！你的網站跑起來了 🚀');
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
