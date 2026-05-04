import React, { useState, useEffect } from 'react';
import axios from 'axios';

function App() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [error, setError] = useState('');

  const [debts, setDebts] = useState([]);
  const [newDebt, setNewDebt] = useState({ client: '', amount: '', comment: '' });

  useEffect(() => {
    if (token) {
      fetchDebts();
    }
  }, [token]);

  const fetchDebts = async () => {
    try {
      const response = await axios.get('http://localhost:5000/debts');
      setDebts(response.data);
    } catch (err) {
      console.error("Ошибка при загрузке долгов", err);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const response = await axios.post('http://localhost:5000/login', { username, password });
      if (response.data.success) {
        localStorage.setItem('token', response.data.token);
        setToken(response.data.token);
      }
    } catch (err) {
      setError('Неверный логин или пароль');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setDebts([]);
  };

  const addDebt = async (e) => {
    e.preventDefault();
    if (!newDebt.client || !newDebt.amount) return;

    try {
      const response = await axios.post('http://localhost:5000/debts', newDebt);
      setDebts([...debts, response.data]); 
      setNewDebt({ client: '', amount: '', comment: '' }); 
    } catch (err) {
      console.error("Ошибка при добавлении", err);
    }
  };

  const deleteDebt = async (id) => {
    try {
      await axios.delete(`http://localhost:5000/debts/${id}`);
      setDebts(debts.filter(d => d.id !== id)); 
    } catch (err) {
      console.error("Ошибка при удалении", err);
    }
  };

  if (token) {
    return (
      <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto', fontFamily: 'sans-serif' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #eee', marginBottom: '20px' }}>
          <h2>Учет долгов бизнеса 💼</h2>
          <button 
  onClick={handleLogout} 
  style={{ 
    padding: '8px 16px', 
    cursor: 'pointer',
    backgroundColor: '#dc3545', 
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    fontWeight: 'bold',
    transition: 'background-color 0.2s',
  }}
  onMouseOver={(e) => e.target.style.backgroundColor = '#c82333'} 
  onMouseOut={(e) => e.target.style.backgroundColor = '#dc3545'}
>
  Выйти
</button>

        </div>

        <form onSubmit={addDebt} style={{ display: 'flex', gap: '10px', marginBottom: '30px', background: '#f9f9f9', padding: '15px', borderRadius: '8px' }}>
          <input 
            placeholder="Клиент" 
            value={newDebt.client} 
            onChange={e => setNewDebt({...newDebt, client: e.target.value})} 
            required 
          />
          <input 
            type="number" 
            placeholder="Сумма" 
            value={newDebt.amount} 
            onChange={e => setNewDebt({...newDebt, amount: e.target.value})} 
            required 
            style={{ width: '100px' }}
          />
          <input 
            placeholder="Комментарий" 
            value={newDebt.comment} 
            onChange={e => setNewDebt({...newDebt, comment: e.target.value})} 
          />
          <button type="submit" style={{ background: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', padding: '0 20px' }}>Добавить</button>
        </form>

        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ textAlign: 'left', background: '#eee' }}>
              <th style={{ padding: '10px' }}>Клиент</th>
              <th style={{ padding: '10px' }}>Сумма</th>
              <th style={{ padding: '10px' }}>Комментарий</th>
              <th style={{ padding: '10px' }}>Действие</th>
            </tr>
          </thead>
          <tbody>
            {debts.map(debt => (
              <tr key={debt.id} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: '10px' }}>{debt.client}</td>
                <td style={{ padding: '10px', color: 'red', fontWeight: 'bold' }}>{debt.amount.toLocaleString()} ₽</td>
                <td style={{ padding: '10px', color: '#666' }}>{debt.comment}</td>
                <td style={{ padding: '10px' }}>
                  <button onClick={() => deleteDebt(debt.id)} style={{ color: 'red', border: 'none', background: 'none', cursor: 'pointer' }}>Удалить</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div style={{ marginTop: '20px', fontSize: '1.2em', fontWeight: 'bold' }}>
          Общая сумма: {debts.reduce((sum, d) => sum + Number(d.amount), 0).toLocaleString()} ₽
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', justifyContent: 'center', marginTop: '100px', fontFamily: 'sans-serif' }}>
      <div style={{ width: '300px', padding: '20px', border: '1px solid #ddd', borderRadius: '8px', boxShadow: '0 2px 10px rgba(0,0,0,0.1)' }}>
        <h2 style={{ textAlign: 'center' }}>Вход</h2>
        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <input 
            type="text" 
            placeholder="Логин (admin)" 
            value={username} 
            onChange={(e) => setUsername(e.target.value)} 
            required 
          />
          <input 
            type="password" 
            placeholder="Пароль (password123)" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
            required 
          />
          <button type="submit" style={{ padding: '10px', background: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Войти</button>
        </form>
        {error && <p style={{ color: 'red', textAlign: 'center', fontSize: '0.9em' }}>{error}</p>}
      </div>
    </div>
  );
}

export default App;
