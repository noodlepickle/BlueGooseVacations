import React from 'react';
import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import ProformaBuilder from './pages/ProformaBuilder';
import MarketConfig from './pages/MarketConfig';
import GoalsEditor from './pages/GoalsEditor';
import RunHistory from './pages/RunHistory';
import Settings from './pages/Settings';

function NavItem({ to, children }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `px-4 py-2 rounded text-sm font-medium transition-colors ${
          isActive ? 'bg-blue-600 text-white' : 'text-gray-300 hover:text-white hover:bg-gray-700'
        }`
      }
    >
      {children}
    </NavLink>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-900">
        <nav className="bg-gray-800 border-b border-gray-700 px-6 py-3 flex items-center gap-2">
          <span className="text-blue-400 font-bold text-lg mr-4">Blue Goose</span>
          <NavItem to="/">Dashboard</NavItem>
          <NavItem to="/proforma">Pro Forma</NavItem>
          <NavItem to="/markets">Markets</NavItem>
          <NavItem to="/goals">Goals</NavItem>
          <NavItem to="/runs">Run History</NavItem>
          <NavItem to="/settings">Settings</NavItem>
        </nav>
        <main className="p-6">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/proforma" element={<ProformaBuilder />} />
            <Route path="/proforma/:id" element={<ProformaBuilder />} />
            <Route path="/markets" element={<MarketConfig />} />
            <Route path="/goals" element={<GoalsEditor />} />
            <Route path="/runs" element={<RunHistory />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
