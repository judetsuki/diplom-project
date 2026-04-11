const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = 5000;
const SECRET_KEY = 'your_super_secret_key'; // В реальности хранится в .env

app.use(cors());
app.use(express.json()); // Для чтения JSON в теле запроса

// Имитация базы данных пользователей
const users = [
  { username: 'admin', password: 'password123' }
];

// Маршрут для входа
app.post('/login', (req, res) => {
  const { username, password } = req.body;

  // Ищем пользователя
  const user = users.find(u => u.username === username && u.password === password);

  if (user) {
    // Если всё ок, создаем токен на 1 час
    const token = jwt.sign({ username: user.username }, SECRET_KEY, { expiresIn: '1h' });
    return res.json({ success: true, token });
  } else {
    // Если данные неверны
    return res.status(401).json({ success: false, message: 'Неверный логин или пароль' });
  }
});

app.listen(PORT, () => {
  console.log(`Сервер запущен на http://localhost:${PORT}`);
});
