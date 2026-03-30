import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import {
  Bell,
  CalendarDays,
  ChevronDown,
  LayoutGrid,
  LogOut,
  Search,
  Settings,
  Users,
} from 'lucide-react';
import { Dropdown, Form, InputGroup } from 'react-bootstrap';
import { useAuth } from '../../context/AuthContext';
import { useCalendar } from '../../context/CalendarContext';

const navigationItems = [
  { label: 'Calendar', icon: CalendarDays, to: '/' },
  { label: 'Bookings', icon: LayoutGrid, disabled: true },
  { label: 'Clients', icon: Users, to: '/clients' },
  { label: 'Settings', icon: Settings, disabled: true },
];

export function AppLayout() {
  const { logout, user } = useAuth();
  const { searchQuery, setSearchQuery } = useCalendar();

  const initials = (user?.name || user?.email || 'AD')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');

  return (
    <div className="app-shell">
      <main className="app-main app-main--full">
        <header className="app-header app-header--top">
          <div className="header-brand">
            <div className="brand-lockup">
              <div className="brand-mark">
                <CalendarDays size={22} />
              </div>
              <div>
                <p className="brand-eyebrow">Spa Booking</p>
                <h1>Control Room</h1>
              </div>
            </div>

            <nav className="top-nav">
              {navigationItems.map(({ label, icon: Icon, to, disabled }) =>
                to ? (
                  <NavLink
                    key={label}
                    to={to}
                    className={({ isActive }) =>
                      `top-nav-link ${isActive ? 'is-active' : ''}`.trim()
                    }
                  >
                    <Icon size={16} />
                    <span>{label}</span>
                  </NavLink>
                ) : (
                  <div key={label} className={`top-nav-link ${disabled ? 'is-disabled' : ''}`.trim()}>
                    <Icon size={16} />
                    <span>{label}</span>
                  </div>
                )
              )}
            </nav>
          </div>

          <div className="header-actions">
            <InputGroup className="search-shell">
              <InputGroup.Text>
                <Search size={16} />
              </InputGroup.Text>
              <Form.Control
                type="text"
                placeholder="Search clients or services"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
              />
            </InputGroup>

            <button type="button" className="icon-button" aria-label="Notifications">
              <Bell size={18} />
            </button>

            <Dropdown align="end">
              <Dropdown.Toggle as="div" className="profile-dropdown-toggle">
                <div className="profile-chip">
                  <div className="profile-avatar">{initials || 'AD'}</div>
                  <div>
                    <strong>{user?.name || 'Admin User'}</strong>
                    <span>{user?.email || 'react@hipster-inc.com'}</span>
                  </div>
                  <ChevronDown size={16} className="profile-caret" />
                </div>
              </Dropdown.Toggle>

              <Dropdown.Menu className="profile-menu">
                <Dropdown.Item as="button" className="profile-menu-item" onClick={logout}>
                  <LogOut size={16} />
                  <span>Log out</span>
                </Dropdown.Item>
              </Dropdown.Menu>
            </Dropdown>
          </div>
        </header>

        <section className="app-content app-content--calendar">
          <Outlet />
        </section>
      </main>
    </div>
  );
}
