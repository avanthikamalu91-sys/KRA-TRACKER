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
  const [password, setPassword] = useState(PRESET_ACCOUNTS.ADMIN.password);
  const [showPassword, setShowPassword] = useState(false);

  const handleRoleSelect = (roleKey: RoleKey) => {
    setActiveRole(roleKey);
    setEmail(PRESET_ACCOUNTS[roleKey].email);
    setPassword(PRESET_ACCOUNTS[roleKey].password);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const current = PRESET_ACCOUNTS[activeRole];
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
          {/* Custom 3D Isometric Geometric KRA Emblem */}
          <div className="kra-logo-wrap">
            <svg width="190" height="190" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="kraGradTop" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#38bdf8" />
                  <stop offset="100%" stopColor="#0284c7" />
                </linearGradient>
                <linearGradient id="kraGradLeft" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#0f4c81" />
                  <stop offset="100%" stopColor="#06192d" />
                </linearGradient>
                <linearGradient id="kraGradRight" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#2563eb" />
                  <stop offset="100%" stopColor="#1d4ed8" />
                </linearGradient>
                <linearGradient id="kraGradAccent" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#06b6d4" />
                  <stop offset="100%" stopColor="#0284c7" />
                </linearGradient>
              </defs>

              {/* Central 3D Geometric Isometric Emblem */}
              {/* TOP CUBE / DIAMOND */}
              <g transform="translate(0, -10)">
                <polygon points="100,20 140,42 100,66 60,42" fill="url(#kraGradTop)" />
                <polygon points="60,42 100,66 100,110 60,86" fill="url(#kraGradLeft)" />
                <polygon points="100,66 140,42 140,86 100,110" fill="url(#kraGradRight)" />
              </g>

              {/* BOTTOM LEFT CUBE */}
              <g transform="translate(-40, 56)">
                <polygon points="100,20 140,42 100,66 60,42" fill="#1e293b" />
                <polygon points="60,42 100,66 100,110 60,86" fill="#0f172a" />
                <polygon points="100,66 140,42 140,86 100,110" fill="#334155" />
              </g>

              {/* BOTTOM RIGHT CUBE */}
              <g transform="translate(40, 56)">
                <polygon points="100,20 140,42 100,66 60,42" fill="url(#kraGradAccent)" />
                <polygon points="60,42 100,66 100,110 60,86" fill="#0369a1" />
                <polygon points="100,66 140,42 140,86 100,110" fill="#0284c7" />
              </g>

              {/* Overlay K/Pulse Tech Marks */}
              <circle cx="100" cy="98" r="5" fill="#38bdf8" />
            </svg>
          </div>

          <h1 className="kra-brand-title">KRA Tracker</h1>
          <p className="kra-brand-tagline">Key Result Areas & Sample Performance</p>
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
            <div className="kra-input-wrap">
              <input
                type="email"
                className="kra-input"
                placeholder="Email Address"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="kra-input-wrap">
              <input
                type={showPassword ? 'text' : 'password'}
                className="kra-input"
                placeholder="Password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
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
          </form>

          {/* Bottom Footer Text */}
          <div className="kra-footer-text">
            KRA TRACKER · TECHNICAL & QUALITY SERVICES
          </div>
        </div>
      </div>
    </div>
  );
}
