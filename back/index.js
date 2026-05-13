const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const jwt = require('jsonwebtoken'); 

const app = express();
const SECRET_KEY = process.env.SECRET_KEY || 'your_secret_key';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://user:password@localhost:5432/debt_db'
});

app.use(cors());
app.use(express.json());

// Инициализация базы данных с полной очисткой старой структуры
const initDb = async () => {
  let connected = false;
  while (!connected) {
    try {
      await pool.query('SELECT 1'); // Проверка физического подключения к Postgres
      
      console.log('Сброс старой структуры таблицы (очистка)...');
      // Удаляем старую таблицу, если она была, чтобы избежать конфликтов типов данных
      await pool.query('DROP TABLE IF EXISTS debts');
      // Удаляем старый ENUM тип, если он существовал в БД
      await pool.query('DROP TYPE IF EXISTS debt_status');

      console.log('Создание новой структуры базы данных...');
      
      // 1. Создаем правильный тип перечисления для статусов долгов
      await pool.query(`CREATE TYPE debt_status AS ENUM ('active', 'paid', 'overdue')`);

      // 2. Создаем чистую таблицу с нуля с точными типами данных
      await pool.query(`
        CREATE TABLE debts (
          id SERIAL PRIMARY KEY,
          client TEXT NOT NULL,
          amount NUMERIC(12, 2) NOT NULL, -- Точный финансовый тип данных вместо неточного REAL
          comment TEXT,
          status debt_status DEFAULT 'active'::debt_status,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      console.log('База данных Postgres успешно создана с нуля и готова к работе');
      connected = true;
    } catch (err) {
      console.log('База данных еще не запущена, ожидание 2 секунды...', err.message);
      await new Promise(resolve => setTimeout(resolve, 2000)); 
    }
  }
};
initDb();

// Middleware для валидации JWT токена (защита эндпоинтов от внешних неавторизованных запросов)
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Извлекаем токен из формата "Bearer <TOKEN>"

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

// --- API МАРШРУТЫ ---

// 1. Авторизация (Вход)
app.post('/login', (req, res) => {
    const { username, password } = req.body;
    if (username === 'admin' && password === 'password123') {
      const token = jwt.sign({ username }, SECRET_KEY, { expiresIn: '24h' });
      return res.json({ success: true, token });
    }
    return res.status(401).json({ success: false, message: 'Неверный логин или пароль' });
});

// 2. Получение всех записей о долгах (Только для авторизованных пользователей)
app.get('/debts', authenticateToken, async (req, res) => {
  try {
    // Сортируем от новых к старым (по ID), чтобы список не менял порядок при редактировании строк
    const result = await pool.query('SELECT * FROM debts ORDER BY id DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Создание новой записи о долге
app.post('/debts', authenticateToken, async (req, res) => {
  try {
    const { client, amount, comment, status } = req.body;
    const result = await pool.query(
      'INSERT INTO debts (client, amount, comment, status) VALUES ($1, $2, $3, $4) RETURNING *',
      [client, amount, comment, status || 'active']
    );
    res.json(result.rows[0]); // Возвращаем добавленный объект долга фронтенду
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Редактирование записи о долге (Изменение любых полей, включая статус)
app.put('/debts/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { client, amount, comment, status } = req.body;

    const result = await pool.query(
      'UPDATE debts SET client = $1, amount = $2, comment = $3, status = $4 WHERE id = $5 RETURNING *',
      [client, amount, comment, status, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Запись с таким ID не найдена' });
    }

    res.json(result.rows[0]); // Возвращаем обновленный объект на фронтенд
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 5. Удаление записи о долге
app.delete('/debts/:id', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM debts WHERE id = $1 RETURNING *', [req.params.id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Запись для удаления не найдена' });
    }
    
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(5000, () => console.log('Бэкенд-сервер успешно запущен внутри Docker на порту 5000'));
