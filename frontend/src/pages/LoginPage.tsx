import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

export default function LoginPage() {
  const { login } = useAuth();
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('123456');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(username, password);
    } catch (err: any) {
      setError(err.message || '登录失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.logoArea}>
          <div style={styles.logoIcon}>🦅</div>
          <h1 style={styles.title}>SalesClaw</h1>
          <p style={styles.subtitle}>智能销售决策引擎</p>
        </div>

        <form onSubmit={handleSubmit}>
          {error && <div style={styles.error}>{error}</div>}

          <div style={styles.formGroup}>
            <label style={styles.label}>用户名</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              style={styles.input}
              placeholder="请输入用户名"
              required
              autoComplete="username"
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>密码</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={styles.input}
              placeholder="请输入密码"
              required
              autoComplete="current-password"
            />
          </div>

          <button type="submit" style={styles.loginButton} disabled={loading}>
            {loading ? '登录中...' : '登录'}
          </button>
        </form>

        <div style={styles.footer}>
          <p style={styles.hint}>默认账号：admin / 123456</p>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
    padding: '20px',
  },
  card: {
    width: '100%',
    maxWidth: '420px',
    background: 'rgba(255, 255, 255, 0.05)',
    backdropFilter: 'blur(20px)',
    borderRadius: '16px',
    padding: '40px',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
  },
  logoArea: {
    textAlign: 'center',
    marginBottom: '32px',
  },
  logoIcon: {
    fontSize: '48px',
    marginBottom: '16px',
  },
  title: {
    margin: '0 0 8px 0',
    fontSize: '28px',
    fontWeight: 700,
    color: '#fff',
    letterSpacing: '-0.5px',
  },
  subtitle: {
    margin: 0,
    fontSize: '14px',
    color: 'rgba(255, 255, 255, 0.5)',
  },
  formGroup: {
    marginBottom: '20px',
  },
  label: {
    display: 'block',
    marginBottom: '8px',
    fontSize: '14px',
    fontWeight: 500,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  input: {
    width: '100%',
    padding: '12px 16px',
    fontSize: '14px',
    borderRadius: '8px',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    background: 'rgba(255, 255, 255, 0.05)',
    color: '#fff',
    outline: 'none',
    transition: 'border-color 0.2s',
    boxSizing: 'border-box' as const,
  },
  loginButton: {
    width: '100%',
    padding: '14px',
    fontSize: '16px',
    fontWeight: 600,
    borderRadius: '8px',
    border: 'none',
    background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
    color: '#fff',
    cursor: 'pointer',
    marginTop: '8px',
    transition: 'transform 0.1s, opacity 0.2s',
  },
  error: {
    padding: '12px',
    marginBottom: '20px',
    borderRadius: '8px',
    background: 'rgba(239, 68, 68, 0.15)',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    color: '#f87171',
    fontSize: '14px',
    textAlign: 'center' as const,
  },
  footer: {
    marginTop: '24px',
    textAlign: 'center' as const,
  },
  hint: {
    fontSize: '12px',
    color: 'rgba(255, 255, 255, 0.4)',
  },
};
