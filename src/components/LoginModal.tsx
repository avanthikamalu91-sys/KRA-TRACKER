// src/components/LoginModal.tsx – Executive Login & User Authentication Modal
import React, { useState } from 'react';

export interface UserProfile {
  name: string;
  role: string;
  email: string;
  isLoggedIn: boolean;
}

export const PRESET_ACCOUNTS = [
  {
    role: 'Admin',
    name: 'System Administrator',
    email: 'admin@techanalysis.com',
    password: 'admin@2026',
    badge: 'badge-blue',
  },
  {
    role: 'Technologist',
    name: 'Garment Technologist',
    email: 'tech@techanalysis.com',
    password: 'tech@2026',
    badge: 'badge-silver',
  },
];

interface Props {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
  onLogin: (user: UserProfile) => void;
  onLogout: () => void;
}

export default function LoginModal({ isOpen, onClose, currentUser, onLogin, onLogout }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('Admin');
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleFillAccount = (account: typeof PRESET_ACCOUNTS[0]) => {
    setEmail(account.email);
    setPassword(account.password);
    setRole(account.role);
    setName(account.name);
    setError('');
  };

  const handleDirectLogin = (account: typeof PRESET_ACCOUNTS[0]) => {
    onLogin({
      name: account.name,
      role: account.role,
      email: account.email,
      isLoggedIn: true,
    });
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }
    if (!password.trim()) {
      setError('Please enter your password.');
      return;
    }

    // Auto-match known accounts or allow custom credentials
    const matched = PRESET_ACCOUNTS.find(
      a => a.email.toLowerCase() === email.trim().toLowerCase()
    );

    const userName = name.trim() || (matched ? matched.name : email.split('@')[0]);
    const userRole = role || (matched ? matched.role : 'Technologist');

    onLogin({
      name: userName,
      role: userRole,
      email: email.trim(),
      isLoggedIn: true,
    });
    onClose();
  };

  return (
    <div className="login-modal-overlay" onClick={onClose}>
      <div className="login-modal-card" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="login-modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <img
              src="/logo.jpg"
              alt="KRA Tracker Logo"
              className="sidebar-logo-img"
              style={{ width: 38, height: 38 }}
            />
            <div>
              <h3 className="login-modal-title">
                {currentUser.isLoggedIn ? 'Account Profile' : 'Sign In to Tech Analysis'}
              </h3>
              <p className="login-modal-sub">
                {currentUser.isLoggedIn ? 'Active session & role credentials' : 'Enter credentials to access technical dashboards'}
              </p>
            </div>
          </div>
          <button className="login-modal-close" onClick={onClose} title="Close">
            ✕
          </button>
        </div>

        {/* If already logged in */}
        {currentUser.isLoggedIn ? (
          <div className="login-modal-body">
            <div className="user-profile-summary-box">
              <div className="topbar-avatar" style={{ width: 50, height: 50, fontSize: '1.15rem' }}>
                {currentUser.name.slice(0, 2).toUpperCase()}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--text-heading)' }}>
                  {currentUser.name}
                </div>
                <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                  {currentUser.email}
                </div>
                <div style={{ marginTop: 5 }}>
                  <span className="badge badge-blue">{currentUser.role}</span>
                </div>
              </div>
            </div>

            {/* Switch to preset accounts */}
            <div style={{ marginTop: 8 }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
                Switch Account
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {PRESET_ACCOUNTS.map(acc => (
                  <div
                    key={acc.role}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 14px',
                      background: 'var(--bg-card2)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-md)',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                    onClick={() => handleDirectLogin(acc)}
                  >
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-heading)' }}>
                        {acc.name} ({acc.role})
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {acc.email} · Password: <code style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{acc.password}</code>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="btn btn-outline btn-xs"
                      onClick={(e) => { e.stopPropagation(); handleDirectLogin(acc); }}
                    >
                      Login
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
              <button
                type="button"
                className="btn btn-outline"
                style={{ flex: 1, color: 'var(--red-text)', borderColor: 'var(--red-border)' }}
                onClick={() => {
                  onLogout();
                  setEmail('');
                  setPassword('');
                }}
              >
                Sign Out
              </button>
              <button
                type="button"
                className="btn btn-primary"
                style={{ flex: 1 }}
                onClick={onClose}
              >
                Close
              </button>
            </div>
          </div>
        ) : (
          /* Sign In Form */
          <form className="login-modal-body" onSubmit={handleSubmit}>
            {/* Predefined credentials card */}
            <div style={{
              background: '#f8fafc',
              border: '1.5px solid var(--border)',
              borderRadius: 'var(--radius-lg)',
              padding: '12px 14px',
            }}>
              <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--brand-600)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                Available Credentials (Click to Auto-Fill)
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {PRESET_ACCOUNTS.map(acc => (
                  <div
                    key={acc.role}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 12px',
                      background: '#ffffff',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-md)',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                    onClick={() => handleFillAccount(acc)}
                    title="Click to fill in email and password"
                  >
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.82rem', color: 'var(--text-heading)' }}>
                        {acc.role}: <span style={{ color: 'var(--brand-600)', fontFamily: 'var(--font-mono)' }}>{acc.email}</span>
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>
                        Password: <code style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--text-heading)' }}>{acc.password}</code>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="btn btn-outline btn-xs"
                      onClick={(e) => { e.stopPropagation(); handleFillAccount(acc); }}
                    >
                      Fill
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {error && (
              <div className="error-banner" style={{ padding: '8px 12px', fontSize: '0.8rem', margin: 0 }}>
                {error}
              </div>
            )}

            <div className="login-input-group">
              <label className="login-label">Email Address</label>
              <input
                type="email"
                className="login-input"
                placeholder="e.g. admin@techanalysis.com"
                value={email}
                onChange={e => { setEmail(e.target.value); setError(''); }}
                required
              />
            </div>

            <div className="login-input-group">
              <label className="login-label">Password</label>
              <input
                type="password"
                className="login-input"
                placeholder="e.g. admin@2026"
                value={password}
                onChange={e => { setPassword(e.target.value); setError(''); }}
                required
              />
            </div>

            <div className="login-input-group">
              <label className="login-label">Role</label>
              <select
                className="login-input"
                value={role}
                onChange={e => setRole(e.target.value)}
              >
                <option value="Admin">Admin</option>
                <option value="Technologist">Technologist</option>
                <option value="Quality Lead">Quality Lead</option>
                <option value="Viewer">Viewer</option>
              </select>
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: 4 }}>
              Sign In
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
