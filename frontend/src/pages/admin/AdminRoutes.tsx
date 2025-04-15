import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';

// Admin Pages
import UserManagement from './UserManagement';
import RoleManagement from './RoleManagement';
import SystemSettings from './SystemSettings';
import AuditLogs from './AuditLogs';
import BackupRestore from './BackupRestore';

const AdminRoutes: React.FC = () => {
  const location = useLocation();

  // Wenn die Route von /settings/system kommt, direkt zu SystemSettings weiterleiten
  if (location.pathname === '/settings/system') {
    return <SystemSettings />;
  }

  return (
    <Routes>
      {/* Wenn /admin aufgerufen wird, Umleitung zu /admin/users */}
      <Route path="/" element={<Navigate to="users" replace />} />

      {/* Admin-Unterseiten */}
      <Route path="users" element={<UserManagement />} />
      <Route path="roles" element={<RoleManagement />} />
      <Route path="settings" element={<SystemSettings />} />
      <Route path="audit-logs" element={<AuditLogs />} />
      <Route path="backup-restore" element={<BackupRestore />} />

      {/* Fallback für nicht gefundene Admin-Unterseiten */}
      <Route path="*" element={<Navigate to="users" replace />} />
    </Routes>
  );
};

export default AdminRoutes;
