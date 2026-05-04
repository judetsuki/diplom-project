const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const jwt = require('jsonwebtoken'); 

const app = express()
const SECRET_KEY = process.env.SECRET_KEY || 'your_secret_key'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://user:password@localhost:5432/debt_db'
});


app.use(cors());
app.use(express.json());

const initDb = async () => {
  let connected = false;
  while (!connected) {
    try {
      await pool.query('SELECT 1');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS debts (
        id SERIAL PRIMARY KEY,
        client TEXT,
        amount REAL,
        comment TEXT
      )
    `);
      console.log('База данных Postgres готова');
      connected = true;
    } catch (err) {
      console.log('База еще не готова, ждем 2 секунды...');
      await new Promise(resolve => setTimeout(resolve, 2000)); 
    }
  }
};
initDb();

app.get('/debts', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM debts');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/debts', async (req, res) => {
  try {
    const { client, amount, comment } = req.body;
    const result = await pool.query(
      'INSERT INTO debts (client, amount, comment) VALUES ($1, $2, $3) RETURNING *',
      [client, amount, comment]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/debts/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM debts WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/login', (req, res) => {
    const { username, password } = req.body;
    if (username === 'admin' && password === 'password123') {
      const token = jwt.sign({ username }, SECRET_KEY, { expiresIn: '1h' });
      return res.json({ success: true, token });
    }
    return res.status(401).json({ success: false, message: 'Неверный логин или пароль' });
});

app.listen(5000, () => console.log('Сервер запущен на порту 5000'));