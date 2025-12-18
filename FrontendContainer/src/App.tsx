import React from 'react';
import { Link, NavLink, Route, Routes } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Devices from './pages/Devices';
import DeviceDetail from './pages/DeviceDetail';
import Jobs from './pages/Jobs';
import MIBBrowser from './pages/MIBBrowser';
import TR181Browser from './pages/TR181Browser';
import Settings from './pages/Settings';
import Audit from './pages/Audit';
import { TenantSwitcher } from './components/TenantSwitcher';
import './styles.css';

// Simple layout and navigation; replace with real design later
export default function App(): JSX.Element {
  return (
    <div className="app">
      <header className="app__header">
        <Link to="/" className="brand">Device Remote Management</Link>
        <nav className="nav">
          <NavLink to="/dashboard">Dashboard</NavLink>
          <NavLink to="/devices">Devices</NavLink>
          <NavLink to="/jobs">Jobs</NavLink>
          <NavLink to="/mib-browser">MIB</NavLink>
          <NavLink to="/tr181-browser">TR-181</NavLink>
          <NavLink to="/audit">Audit</NavLink>
          <NavLink to="/settings">Settings</NavLink>
        </nav>
        <div className="header__right">
          <TenantSwitcher />
        </div>
      </header>
      <main className="app__main">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/login" element={<Login />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/devices" element={<Devices />} />
          <Route path="/devices/:id" element={<DeviceDetail />} />
          <Route path="/jobs" element={<Jobs />} />
          <Route path="/mib-browser" element={<MIBBrowser />} />
          <Route path="/tr181-browser" element={<TR181Browser />} />
          <Route path="/audit" element={<Audit />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<div>Not found</div>} />
        </Routes>
      </main>
      <footer className="app__footer">
        <small>© {new Date().getFullYear()} Device Remote Management</small>
      </footer>
    </div>
  );
}
