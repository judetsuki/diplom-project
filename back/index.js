const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const jwt = require('jsonwebtoken'); 

const app = express();
const SECRET_KEY = 'your_super_secret_key'; 

app.use(cors({
    origin: '*', 
    methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

let db;


(async () => {
  db = await open({
    filename: './database.db',
    driver: sqlite3.Database
  });

  await db.exec(`
    CREATE TABLE IF NOT EXISTS debts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client TEXT,
      amount REAL,
      comment TEXT
    )
  `);
  console.log('База данных готова');
})();



app.get('/debts', async (req, res) => {
  try {
    const debts = await db.all('SELECT * FROM debts');
    res.json(debts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/debts', async (req, res) => {
  try {
    const { client, amount, comment } = req.body;
    const result = await db.run(
      'INSERT INTO debts (client, amount, comment) VALUES (?, ?, ?)',
      [client, amount, comment]
    );
    res.json({ id: result.lastID, client, amount, comment });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/debts/:id', async (req, res) => {
  try {
    await db.run('DELETE FROM debts WHERE id = ?', req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/login', (req, res) => {
  const { username, password } = req.body;
  console.log('Попытка входа:', username, password);

  if (username === 'admin' && password === 'password123') {

    const token = jwt.sign({ username }, SECRET_KEY, { expiresIn: '1h' });
    return res.json({ success: true, token });
  } else {
    return res.status(401).json({ success: false, message: 'Неверный логин или пароль' });
  }
});

app.listen(5000, () => console.log('Сервер запущен на http://localhost:5000'));
