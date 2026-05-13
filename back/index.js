const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const jwt = require('jsonwebtoken'); 
const bcrypt = require('bcrypt');

const app = express();
const SECRET_KEY = process.env.SECRET_KEY || 'your_secret_key';
const SALT_ROUNDS = 10;

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
      
      console.log('Безопасная проверка и инициализация структуры базы данных...');

      await pool.query(`
        DO $$
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'debt_status') THEN
            CREATE TYPE debt_status AS ENUM ('active', 'paid', 'overdue');
          END IF;
        END $$;
      `);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          username VARCHAR(50) UNIQUE NOT NULL,
          password TEXT NOT NULL
        )
      `);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS debts (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          client TEXT NOT NULL,
          amount NUMERIC(12, 2) NOT NULL,
          comment TEXT,
          status debt_status DEFAULT 'active'::debt_status,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      const adminCheck = await pool.query("SELECT * FROM users WHERE username = 'admin'");
      if (adminCheck.rows.length === 0) {
        const hashedAdminPassword = await bcrypt.hash('password123', SALT_ROUNDS);
        await pool.query(
          'INSERT INTO users (username, password) VALUES ($1, $2)',
          ['admin', hashedAdminPassword]
        );
        console.log('Создан дефолтный аккаунт: admin / password123');
      }

      console.log('База данных Postgres готова. Данные защищены от стирания.');
      connected = true;
    } catch (err) {
      console.log('Повторная попытка подключения к Postgres через 2 секунды...', err.message);
      await new Promise(resolve => setTimeout(resolve, 2000)); 
    }
  }
};
initDb();

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; 

  if (!token) {
    return res.status(401).json({ error: 'Токен авторизации отсутствует.' });
  }

  jwt.verify(token, SECRET_KEY, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Токен недействителен или устарел.' });
    }
    req.user = user; 
    next();
  });
};


// Регистрация
app.post('/register', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Логин и пароль обязательны' });
    }

    const userCheck = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    if (userCheck.rows.length > 0) {
      return res.status(400).json({ error: 'Пользователь с таким логином уже существует' });
    }

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    await pool.query('INSERT INTO users (username, password) VALUES ($1, $2)', [username, hashedPassword]);

    res.status(201).json({ success: true, message: 'Пользователь успешно создан' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Вход
app.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    if (result.rows.length === 0) {
      return res.status(401).json({ success: false, message: 'Неверный логин или пароль' });
    }

    const user = result.rows[0];
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (isPasswordValid) {
      const token = jwt.sign(
        { id: user.id, username: user.username }, 
        SECRET_KEY, 
        { expiresIn: '24h' }
      );
      // Возвращаем имя пользователя на фронтенд для приветствия
      return res.json({ success: true, token, username: user.username });
    }

    return res.status(401).json({ success: false, message: 'Неверный логин или пароль' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Получение долгов 
app.get('/debts', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM debts WHERE user_id = $1 ORDER BY id DESC', [req.user.id]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Создание записи о долге 
app.post('/debts', authenticateToken, async (req, res) => {
  try {
    const { client, amount, comment, status } = req.body;
    const result = await pool.query(
      'INSERT INTO debts (user_id, client, amount, comment, status) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [req.user.id, client, amount, comment, status || 'active']
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Редактирование записи о долге 
app.put('/debts/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { client, amount, comment, status } = req.body;

    const result = await pool.query(
      'UPDATE debts SET client = $1, amount = $2, comment = $3, status = $4 WHERE id = $5 AND user_id = $6 RETURNING *',
      [client, amount, comment, status, id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Запись не найдена или у вас нет прав на её редактирование' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/debts/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM debts WHERE id = $1 AND user_id = $2 RETURNING *', [id, req.user.id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Запись не найдена или у вас нет прав на её удаление' });
    }
    
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(5000, () => console.log('бэк запущен'));
