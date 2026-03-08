import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Login as LogIn, Cloud, Mail, Lock, Loader } from 'pixelarticons/react';
import { toast } from 'sonner';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      toast.success('Welcome back!');
      navigate('/');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container glass-card animate-fade-in-up">
        <div className="auth-header">
          <div className="auth-logo">
            <Cloud style={{ width: 36, height: 36 }} strokeWidth={1.5} />
          </div>
          <h1>Welcome Back</h1>
          <p>Sign in to Skyvault</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label className="form-label" htmlFor="email">Email</label>
            <div className="input-with-icon">
              <Mail style={{ width: 18, height: 18 }} className="input-icon" />
              <input
                id="email"
                type="email"
                className="form-input"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="password">Password</label>
            <div className="input-with-icon">
              <Lock style={{ width: 18, height: 18 }} className="input-icon" />
              <input
                id="password"
                type="password"
                className="form-input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
          </div>

          <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
            {loading ? <Loader style={{ width: 18, height: 18 }} className="spin" /> : <LogIn style={{ width: 18, height: 18 }} />}
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="auth-footer">
          <p>Don't have an account? <Link to="/register">Create one</Link></p>
        </div>
      </div>

      <style>{`
        .auth-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }

        .auth-container {
          width: 100%;
          max-width: 420px;
          padding: 40px;
        }

        .auth-header {
          text-align: center;
          margin-bottom: 32px;
        }

        .auth-logo {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 64px;
          height: 64px;
          background: var(--accent-gradient);
          border-radius: var(--radius-md);
          margin-bottom: 20px;
          color: white;
          box-shadow: 0 4px 20px rgba(99, 102, 241, 0.4);
        }

        .auth-header h1 {
          font-size: 1.75rem;
          font-weight: 700;
          color: var(--text-primary);
          margin-bottom: 4px;
        }

        .auth-header p {
          color: var(--text-muted);
          font-size: 0.9rem;
        }

        .auth-form {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .input-with-icon {
          position: relative;
        }

        .input-icon {
          position: absolute;
          left: 14px;
          top: 50%;
          transform: translateY(-50%);
          color: var(--text-muted);
          pointer-events: none;
        }

        .input-with-icon .form-input {
          padding-left: 42px;
          width: 100%;
        }

        .btn-full {
          width: 100%;
          padding: 12px;
          font-size: 0.95rem;
          margin-top: 4px;
        }

        .spin {
          animation: spin 1s linear infinite;
        }

        .auth-footer {
          text-align: center;
          margin-top: 24px;
          padding-top: 20px;
          border-top: 1px solid var(--border-subtle);
          color: var(--text-muted);
          font-size: 0.875rem;
        }

        .auth-footer a {
          font-weight: 600;
        }
      `}</style>
    </div>
  );
}
