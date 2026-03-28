const express = require('express');
const app = express();

app.use(express.json());

app.post('/', (req, res) => {
  console.log(req.body);
  res.send('ok');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log('running on port ' + PORT);
});