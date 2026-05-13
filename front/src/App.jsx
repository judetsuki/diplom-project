import React, { useState, useEffect } from 'react';
import axios from 'axios';

const STATUS_LABELS = {
  all: 'Все',
  active: 'Активен',
  paid: 'Погашен',
  overdue: 'Просрочен'
};

const STATUS_COLORS = {
  active: '#ffffff',
  paid: '#e2f0d9',   
  overdue: '#fce4d6' 
};

function App() {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [currentUser, setCurrentUser] = useState(localStorage.getItem('username') || '');
  
  const [debts, setDebts] = useState([]);
  const [newDebt, setNewDebt] = useState({ client: '', amount: '', comment: '', status: 'active' });
  
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); 

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const [editingId, setEditingId] = useState(null);
  const [editFormData, setEditFormData] = useState({ client: '', amount: '', comment: '', status: 'active' });

  const [isRegistering, setIsRegistering] = useState(false);
  const [regSuccess, setRegSuccess] = useState('');

  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      fetchDebts();
    } else {
      delete axios.defaults.headers.common['Authorization'];
    }
  }, [token]);

  const fetchDebts = async () => {
    try {
      const response = await axios.get('/api/debts');
      setDebts(response.data);
    } catch (err) {
      if (err.response?.status === 401 || err.response?.status === 403) handleLogout();
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const response = await axios.post('/api/login', { username, password });
      if (response.data.success) {
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('username', response.data.username);
        setToken(response.data.token);
        setCurrentUser(response.data.username);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Неверный логин или пароль');
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    setRegSuccess('');
    try {
      const response = await axios.post('/api/register', { username, password });
      if (response.data.success) {
        setRegSuccess('Регистрация успешна! Теперь вы можете войти.');
        setIsRegistering(false);
        setPassword('');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Ошибка при регистрации');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('username'); 
    setToken(null);
    setCurrentUser('');
    setDebts([]);
  };

  const toggleMode = (toRegister) => {
    setError('');
    setRegSuccess('');
    setPassword('');
    setIsRegistering(toRegister);
  };

  const addDebt = async (e) => {
    e.preventDefault();
    if (!newDebt.client || !newDebt.amount) return;
    try {
      const response = await axios.post('/api/debts', { ...newDebt, amount: Number(newDebt.amount) });
      setDebts([response.data, ...debts]); 
      setNewDebt({ client: '', amount: '', comment: '', status: 'active' }); 
    } catch (err) {
      console.error("Ошибка при добавлении", err);
    }
  };

  const deleteDebt = async (id) => {
    if (!window.confirm("Вы уверены?")) return;
    try {
      await axios.delete(`/api/debts/${id}`);
      setDebts(debts.filter(d => d.id !== id)); 
    } catch (err) {
      console.error("Ошибка при удалении", err);
    }
  };

  const handleEditClick = (debt) => {
    setEditingId(debt.id);
    setEditFormData({ client: debt.client, amount: debt.amount, comment: debt.comment, status: debt.status });
  };

  const handleEditFormSubmit = async (e, id) => {
    e.preventDefault();
    try {
      const response = await axios.put(`/api/debts/${id}`, { ...editFormData, amount: Number(editFormData.amount) });
      setDebts(debts.map(d => d.id === id ? response.data : d));
      setEditingId(null);
    } catch (err) {
      console.error("Ошибка при обновлении", err);
    }
  };

  const filteredDebts = debts.filter(debt => {
    const matchesStatus = statusFilter === 'all' || debt.status === statusFilter;
    const matchesSearch = 
      debt.client.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (debt.comment && debt.comment.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesStatus && matchesSearch;
  });

  if (token) {
    return (
      <div style={{ padding: '20px', maxWidth: '900px', margin: '0 auto', fontFamily: 'sans-serif' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #eee', marginBottom: '20px' }}>
          <h2>Учет долгов бизнеса 💼</h2>
          {/* Блок приветствия пользователя */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <span style={{ fontSize: '1em', color: '#555' }}>
              Пользователь: <strong style={{ color: '#007bff' }}>{currentUser}</strong>
            </span>
            <button onClick={handleLogout} style={{ padding: '8px 16px', cursor: 'pointer', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', fontWeight: 'bold' }}>Выйти</button>
          </div>
        </div>

        {/* Форма добавления */}
        <form onSubmit={addDebt} style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '20px', background: '#f9f9f9', padding: '15px', borderRadius: '8px' }}>
          <input placeholder="Клиент" value={newDebt.client} onChange={e => setNewDebt({...newDebt, client: e.target.value})} required />
          <input type="number" placeholder="Сумма" value={newDebt.amount} onChange={e => setNewDebt({...newDebt, amount: e.target.value})} required style={{ width: '100px' }} />
          <input placeholder="Комментарий" value={newDebt.comment} onChange={e => setNewDebt({...newDebt, comment: e.target.value})} />
          <select value={newDebt.status} onChange={e => setNewDebt({...newDebt, status: e.target.value})} style={{ padding: '5px' }}>
            <option value="active">Активен</option>
            <option value="paid">Погашен</option>
            <option value="overdue">Просрочен</option>
          </select>
          <button type="submit" style={{ background: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', padding: '0 20px' }}>Добавить</button>
        </form>

        {/* Блок поиска */}
        <div style={{ display: 'flex', gap: '15px', marginBottom: '25px', background: '#f1f3f5', padding: '15px', borderRadius: '8px', alignItems: 'center' }}>
          <div style={{ flex: 1 }}>
            <input 
              type="text" 
              placeholder="Поиск по клиенту или комментарию..." 
              value={searchTerm} 
              onChange={e => setSearchTerm(e.target.value)} 
              style={{ width: '100%', padding: '8px', boxSizing: 'border-box', borderRadius: '4px', border: '1px solid #ccc' }}
            />
          </div>
          <div style={{ display: 'flex', gap: '5px' }}>
            {Object.keys(STATUS_LABELS).map(statusKey => (
              <button
                key={statusKey}
                onClick={() => setStatusFilter(statusKey)}
                style={{
                  padding: '8px 12px',
                  cursor: 'pointer',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  backgroundColor: statusFilter === statusKey ? '#007bff' : '#fff',
                  color: statusFilter === statusKey ? '#fff' : '#333',
                  fontWeight: statusFilter === statusKey ? 'bold' : 'normal'
                }}
              >
                {STATUS_LABELS[statusKey]}
              </button>
            ))}
          </div>
        </div>

        {/* Таблица */}
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ textAlign: 'left', background: '#eee' }}>
              <th style={{ padding: '10px' }}>Клиент</th>
              <th style={{ padding: '10px' }}>Сумма</th>
              <th style={{ padding: '10px' }}>Статус</th>
              <th style={{ padding: '10px' }}>Комментарий</th>
              <th style={{ padding: '10px' }}>Действия</th>
            </tr>
          </thead>
          <tbody>
            {filteredDebts.map(debt => (
              <tr key={debt.id} style={{ borderBottom: '1px solid #eee', backgroundColor: STATUS_COLORS[debt.status] }}>
                {editingId === debt.id ? (
                  <>
                    <td style={{ padding: '10px' }}><input type="text" required value={editFormData.client} onChange={e => setEditFormData({...editFormData, client: e.target.value})} /></td>
                    <td style={{ padding: '10px' }}><input type="number" required style={{ width: '90px' }} value={editFormData.amount} onChange={e => setEditFormData({...editFormData, amount: e.target.value})} /></td>
                    <td style={{ padding: '10px' }}>
                      <select value={editFormData.status} onChange={e => setEditFormData({...editFormData, status: e.target.value})}>
                        <option value="active">Активен</option>
                        <option value="paid">Погашен</option>
                        <option value="overdue">Просрочен</option>
                      </select>
                    </td>
                    <td style={{ padding: '10px' }}><input type="text" value={editFormData.comment} onChange={e => setEditFormData({...editFormData, comment: e.target.value})} /></td>
                    <td style={{ padding: '10px' }}>
                      <button onClick={(e) => handleEditFormSubmit(e, debt.id)} style={{ color: 'green', border: 'none', background: 'none', cursor: 'pointer', fontWeight: 'bold', marginRight: '10px' }}>Сохранить</button>
                      <button onClick={() => setEditingId(null)} style={{ color: 'gray', border: 'none', background: 'none', cursor: 'pointer' }}>Отмена</button>
                    </td>
                  </>
                ) : (
                  <>
                    <td style={{ padding: '10px' }}>{debt.client}</td>
                    <td style={{ padding: '10px', color: debt.status === 'paid' ? 'green' : 'red', fontWeight: 'bold' }}>{Number(debt.amount).toLocaleString()} ₽</td>
                    <td style={{ padding: '10px', fontStyle: 'italic' }}>{STATUS_LABELS[debt.status]}</td>
                    <td style={{ padding: '10px', color: '#666' }}>{debt.comment}</td>
                    <td style={{ padding: '10px' }}>
                      <button onClick={() => handleEditClick(debt)} style={{ color: '#007bff', border: 'none', background: 'none', cursor: 'pointer', marginRight: '10px' }}>Редактировать</button>
                      <button onClick={() => deleteDebt(debt.id)} style={{ color: 'red', border: 'none', background: 'none', cursor: 'pointer' }}>Удалить</button>
                    </td>
                  </>
                )}
              </tr>
            ))}
            {filteredDebts.length === 0 && (
              <tr>
                <td colSpan="5" style={{ padding: '20px', textAlign: 'center', color: '#999' }}>Записи не найдены</td>
              </tr>
            )}
          </tbody>
        </table>

        <div style={{ marginTop: '20px', fontSize: '1.2em', fontWeight: 'bold', display: 'flex', justifyContent: 'space-between', background: '#f9f9f9', padding: '15px', borderRadius: '8px' }}>
          <div>Показано записей: {filteredDebts.length}</div>
          <div>Сумма видимых активных долгов: {filteredDebts.filter(d => d.status !== 'paid').reduce((sum, d) => sum + Number(d.amount), 0).toLocaleString()} ₽</div>
        </div>
      </div>
    );
  }

  // ФОРМА РЕГИСТРАЦИИ
  if (isRegistering) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: '100px', fontFamily: 'sans-serif' }}>
        <div style={{ width: '300px', padding: '20px', border: '1px solid #ddd', borderRadius: '8px', boxShadow: '0 2px 10px rgba(0,0,0,0.1)' }}>
          <h2 style={{ textAlign: 'center', marginBottom: '20px' }}>Регистрация</h2>
          <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <input type="text" placeholder="Придумайте логин" value={username} onChange={(e) => setUsername(e.target.value)} required />
            <input type="password" placeholder="Придумайте пароль" value={password} onChange={(e) => setPassword(e.target.value)} required />
            <button type="submit" style={{ padding: '10px', background: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Зарегистрироваться</button>
          </form>
          {error && <p style={{ color: 'red', textAlign: 'center', fontSize: '0.9em', marginTop: '10px' }}>{error}</p>}
          <p style={{ textAlign: 'center', fontSize: '0.9em', marginTop: '20px' }}>
            Уже есть аккаунт? <span onClick={() => toggleMode(false)} style={{ color: '#007bff', cursor: 'pointer', textDecoration: 'underline' }}>Войти</span>
          </p>
        </div>
      </div>
    );
  }

  // ФОРМА ВХОДА
  return (
    <div style={{ display: 'flex', justifyContent: 'center', marginTop: '100px', fontFamily: 'sans-serif' }}>
      <div style={{ width: '300px', padding: '20px', border: '1px solid #ddd', borderRadius: '8px', boxShadow: '0 2px 10px rgba(0,0,0,0.1)' }}>
        <h2 style={{ textAlign: 'center', marginBottom: '20px' }}>Вход</h2>
        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <input type="text" placeholder="Логин" value={username} onChange={(e) => setUsername(e.target.value)} required />
          <input type="password" placeholder="Пароль" value={password} onChange={(e) => setPassword(e.target.value)} required />
          <button type="submit" style={{ padding: '10px', background: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Войти</button>
        </form>
        {error && <p style={{ color: 'red', textAlign: 'center', fontSize: '0.9em', marginTop: '10px' }}>{error}</p>}
        {regSuccess && <p style={{ color: 'green', textAlign: 'center', fontSize: '0.9em', marginTop: '10px' }}>{regSuccess}</p>}
        <p style={{ textAlign: 'center', fontSize: '0.9em', marginTop: '20px' }}>
          Нет аккаунта? <span onClick={() => toggleMode(true)} style={{ color: '#007bff', cursor: 'pointer', textDecoration: 'underline' }}>Создать аккаунт</span>
        </p>
      </div>
    </div>
  );
}

export default App;
