import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { UserPlus, Cloud, Mail, Lock, User, Loader } from 'pixelarticons/react';
import { toast } from 'sonner';
import '../styles/pages/RegisterPage.css';

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await register(email, password, displayName || undefined);
      toast.success('Account created successfully!');
      navigate('/');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card glass-card animate-fade-in-up">
        <div className="auth-header">
          <div className="auth-logo">
            <Cloud style={{ width: 36, height: 36 }} strokeWidth={1.5} />
          </div>
          <h1>Create Account</h1>
          <p>Set up Skyvault</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label className="form-label" htmlFor="displayName">Display Name</label>
            <div className="input-with-icon">
              <User style={{ width: 18, height: 18 }} className="input-icon" />
              <input
                id="displayName"
                type="text"
                className="form-input"
                placeholder="John Doe"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                autoFocus
              />
            </div>
          </div>

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
                placeholder="Min. 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
          </div>

          <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
            {loading ? <Loader style={{ width: 18, height: 18 }} className="spin" /> : <UserPlus style={{ width: 18, height: 18 }} />}
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <div className="auth-footer">
          <p>Already have an account? <Link to="/login">Sign in</Link></p>
        </div>
      </div>
    </div>
  );
}
