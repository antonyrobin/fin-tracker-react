import { useState, useEffect } from 'react';
import { NavLink, Link, useLocation } from 'react-router-dom';
import { getAllReminders } from '../db/database';
import { useAuth } from '../context/AuthContext';

export default function Layout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [upcomingCount, setUpcomingCount] = useState(0);
  const location = useLocation();
  const { user, logout } = useAuth();

  useEffect(() => {
    setSidebarOpen(false);
  }, [location]);

  useEffect(() => {
    if (user) {
      loadReminderCount();
      const interval = setInterval(loadReminderCount, 60000);
      return () => clearInterval(interval);
    }
  }, [user]);

  async function loadReminderCount() {
    try {
      const reminders = await getAllReminders(user?.id);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const upcoming = reminders.filter(r => {
        const due = new Date(r.dueDate);
        due.setHours(0, 0, 0, 0);
        const diffDays = Math.ceil((due - today) / (1000 * 60 * 60 * 24));
        return diffDays <= 7 && !r.completed;
      });
      setUpcomingCount(upcoming.length);
    } catch (_) {
      /* ignore */
    }
  }

  function handleLogout() {
    if (confirm('Are you sure you want to sign out?')) {
      logout();
    }
  }

  const userInitial = user?.name ? user.name.charAt(0).toUpperCase() : '?';

  return (
    <div className="app-layout">
      <button className="mobile-menu-btn" onClick={() => setSidebarOpen(!sidebarOpen)}>
        {sidebarOpen ? '✕' : '☰'}
      </button>

      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-brand">
          <div className="brand-icon">💰</div>
          <h1>FinTracker</h1>
        </div>

        {/* User Profile Section */}
        <div className="sidebar-user">
          {/*<div className="user-avatar">{userInitial}</div>*/}
          <div className="user-info">
            <h3 className="user-name">{user?.name || 'User'}</h3>
            {/*<div className="user-email">{user?.email || ''}</div>*/}
          </div>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-section-title">Overview</div>
          <NavLink to="/" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} end>
            <span className="nav-icon">📊</span>
            Dashboard
          </NavLink>

          <div className="nav-section-title">Manage</div>
          <NavLink to="/accounts" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            <span className="nav-icon">🏦</span>
            Accounts
          </NavLink>
          <NavLink to="/transactions" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            <span className="nav-icon">💳</span>
            Transactions
          </NavLink>

          <div className="nav-section-title">Tools</div>
          <NavLink to="/reminders" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            <span className="nav-icon">🔔</span>
            Reminders
            {upcomingCount > 0 && <span className="nav-badge">{upcomingCount}</span>}
          </NavLink>
          <NavLink to="/import-export" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            <span className="nav-icon">📁</span>
            Import / Export
          </NavLink>
        </nav>

        {/* Footer with Legal & Logout */}
        <div className="sidebar-footer">
          <div className="sidebar-legal">
            <div className="sidebar-sec-note">
              <span>🛡️</span>
              <span>SEC-Inspired Security</span>
            </div>
            <div className="sidebar-legal-links" style={{ flexWrap: 'wrap' }}>
              <Link to="/terms" className="sidebar-legal-link" id="link-sidebar-terms">Terms</Link>
              <span className="sidebar-legal-dot">·</span>
              <Link to="/privacy" className="sidebar-legal-link" id="link-sidebar-privacy">Privacy</Link>
              <span className="sidebar-legal-dot">·</span>
              <a href="https://github.com/antonyrobin/fin-tracker-react/issues/new" target="_blank" rel="noopener noreferrer" className="sidebar-legal-link" id="link-sidebar-report">Report Bug</a>
            </div>
          </div>
          <button className="nav-link logout-btn" onClick={handleLogout} id="btn-logout">
            <span className="nav-icon">🚪</span>
            Sign Out
          </button>
        </div>
      </aside>

      <main className="main-content">
        {children}
      </main>
    </div>
  );
}
