import React, { lazy } from 'react';
import { Route, Routes } from 'react-router-dom';

// Hauptseiten importieren
import Dashboard from './pages/Dashboard';
import Devices from './pages/Devices';
import Licenses from './pages/Licenses';
import Certificates from './pages/Certificates';
import Accessories from './pages/Accessories';
import DocumentManager from './pages/DocumentManager';
import Inventory from './pages/Inventory';
import Tickets from './pages/Tickets';
import Todos from './pages/Todos';
import Reports from './pages/Reports';
import Users from './pages/Users';
import Settings from './pages/Settings';
import UserProfile from './pages/UserProfile';

// Admin- und Settings-Routen importieren
import AdminRoutes from './pages/admin/AdminRoutes';
import SettingsRoutes from './pages/settings/SettingsRoutes';

// Bestehende Lazy-Loading-Imports beibehalten
// ...

// Fallback für fehlende Komponenten
const NotFound = () => <div>Seite nicht gefunden</div>;

const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* Hauptrouten */}
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/devices" element={<Devices />} />
      <Route path="/licenses" element={<Licenses />} />
      <Route path="/certificates" element={<Certificates />} />
      <Route path="/accessories" element={<Accessories />} />
      <Route path="/documents" element={<DocumentManager />} />
      <Route path="/inventory" element={<Inventory />} />
      <Route path="/tickets" element={<Tickets />} />
      <Route path="/todos" element={<Todos />} />
      <Route path="/reports" element={<Reports />} />
      <Route path="/users" element={<Users />} />
      <Route path="/settings" element={<Settings />} />
      <Route path="/profile" element={<UserProfile />} />

      {/* Standardweiterleitung zur Dashboard-Seite */}
      <Route path="/" element={<Dashboard />} />

      {/* Admin-Routen als verschachtelte Struktur */}
      <Route path="/admin/*" element={<AdminRoutes />} />

      {/* Settings-Routen als verschachtelte Struktur */}
      <Route path="/settings/*" element={<SettingsRoutes />} />

      {/* Fallback-Route */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

export default AppRoutes;
