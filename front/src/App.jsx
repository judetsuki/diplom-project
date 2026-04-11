import React, { useState } from 'react';
import axios from 'axios';

function App() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [token, setToken] = useState(localStorage.getItem('token')); // Проверяем, залогинены ли мы
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');

    try {
      // Отправляем запрос на наш Node.js сервер
      const response = await axios.post('http://localhost:5000/login', {
        username,
        password
      });

      if (response.data.success) {
        const receivedToken = response.data.token;
        localStorage.setItem('token', receivedToken); // Сохраняем в браузере
        setToken(receivedToken); // Обновляем состояние, чтобы скрыть форму
      }
    } catch (err) {
      setError('Неверный логин или пароль');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setToken(null);
  };

  // 1. Если токен есть — показываем "пустую" защищенную страницу
  if (token) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <h1>Добро пожаловать!</h1>
        <p>Вы успешно вошли в систему. Это пустая защищенная страница.</p>
        <button onClick={handleLogout}>Выйти</button>
      </div>
    );
  }

  // 2. Если токена нет — показываем форму входа
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '50px' }}>
      <h2>Вход в систему</h2>
      <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '250px' }}>
        <input 
          type="text" 
          placeholder="Логин (admin)" 
          value={username} 
          onChange={(e) => setUsername(e.target.value)} 
        />
        <input 
          type="password" 
          placeholder="Пароль (password123)" 
          value={password} 
          onChange={(e) => setPassword(e.target.value)} 
        />
        <button type="submit">Войти</button>
      </form>
      {error && <p style={{ color: 'red' }}>{error}</p>}
    </div>
  );
}

export default App;
