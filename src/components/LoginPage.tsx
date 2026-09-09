// src/components/LoginPage.tsx – KRA Tracker Split-Screen Login Page
import React, { useState } from 'react';

export interface UserProfile {
  name: string;
  role: string;
  email: string;
  isLoggedIn: boolean;
}

export const PRESET_ACCOUNTS = {
  ADMIN: {
    role: 'Admin',
    name: 'System Administrator',
    email: 'admin@kratracker.com',
    password: 'admin@2026',
  },
  TECHNOLOGIST: {
    role: 'Technologist',
    name: 'Garment Technologist',
    email: 'tech@kratracker.com',
    password: 'tech@2026',
  },
};

type RoleKey = 'ADMIN' | 'TECHNOLOGIST';

interface Props {
  onLogin: (user: UserProfile) => void;
  currentUser?: UserProfile;
  onCancel?: () => void;
}

export default function LoginPage({ onLogin, onCancel }: Props) {
  const [activeRole, setActiveRole] = useState<RoleKey>('ADMIN');
  const [email, setEmail] = useState(PRESET_ACCOUNTS.ADMIN.email);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleRoleSelect = (roleKey: RoleKey) => {
    setActiveRole(roleKey);
    setEmail(PRESET_ACCOUNTS[roleKey].email);
    setPassword('');
    setErrorMsg('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const current = PRESET_ACCOUNTS[activeRole];

    if (!password.trim()) {
      setErrorMsg('Please enter your password to sign in.');
      return;
    }

    if (password.trim() !== current.password) {
      setErrorMsg(`Incorrect password for ${current.role}. Please check your credentials.`);
      return;
    }

    setErrorMsg('');
    onLogin({
      name: current.name,
      role: current.role,
      email: email.trim() || current.email,
      isLoggedIn: true,
    });
  };

  return (
    <div className="kra-auth-container">
      {onCancel && (
        <button
          type="button"
          className="kra-back-btn"
          onClick={onCancel}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Back to App
        </button>
      )}

      {/* ── Left Side: White Floating Card with Custom KRA Tracker Logo ── */}
      <div className="kra-left-side">
        <div className="kra-brand-card">
          {/* Custom KRA Tracker Logo */}
          <div className="kra-logo-wrap">
            <img
              src="/logo.jpg"
              alt="KRA Tracker Logo"
              className="kra-logo-img"
            />
          </div>

          <h1 className="kra-brand-title">KRA Tracker</h1>
        </div>
      </div>

      {/* ── Right Side: Dark Slate Navy Container ── */}
      <div className="kra-right-side">
        <div className="kra-form-box">
          <h2 className="kra-welcome-heading">Welcome to KRA Tracker</h2>

          {/* Role Toggle Selector (Only ADMIN and TECHNOLOGIST) */}
          <div className="kra-role-row">
            {/* ADMIN */}
            <div
              className={`kra-role-item ${activeRole === 'ADMIN' ? 'active' : ''}`}
              onClick={() => handleRoleSelect('ADMIN')}
            >
              <div className="kra-role-icon-box">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </div>
              <span className="kra-role-name">ADMIN</span>
            </div>

            {/* TECHNOLOGIST */}
            <div
              className={`kra-role-item ${activeRole === 'TECHNOLOGIST' ? 'active' : ''}`}
              onClick={() => handleRoleSelect('TECHNOLOGIST')}
            >
              <div className="kra-role-icon-box">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
              </div>
              <span className="kra-role-name">TECHNOLOGIST</span>
            </div>
          </div>

          {/* Form Inputs */}
          <form onSubmit={handleSubmit} className="kra-inputs-form">
            {errorMsg && (
              <div className="kra-error-alert">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="kra-input-wrap">
              <input
                type="email"
                className="kra-input"
                placeholder="Email Address"
                value={email}
                onChange={e => {
                  setEmail(e.target.value);
                  setErrorMsg('');
                }}
                required
              />
            </div>

            <div className="kra-input-wrap">
              <input
                type={showPassword ? 'text' : 'password'}
                className="kra-input"
                placeholder="Password"
                value={password}
                onChange={e => {
                  setPassword(e.target.value);
                  setErrorMsg('');
                }}
                required
                autoFocus
              />
              <button
                type="button"
                className="kra-eye-btn"
                onClick={() => setShowPassword(!showPassword)}
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              </button>
            </div>

            <button type="submit" className="kra-submit-btn">
              SIGN IN
            </button>

            {/* Quick Credentials Info Box */}
            <div className="kra-cred-hint">
              <div style={{ fontWeight: 700, color: '#e2e8f0', marginBottom: 2 }}>
                Login Credentials:
              </div>
              <div>
                <strong>ADMIN:</strong> admin@kratracker.com / <strong>admin@2026</strong>
              </div>
              <div>
                <strong>TECHNOLOGIST:</strong> tech@kratracker.com / <strong>tech@2026</strong>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
