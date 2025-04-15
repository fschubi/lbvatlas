import React, { FC, useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  CircularProgress,
  Alert,
  Checkbox,
  FormGroup,
  FormControlLabel,
  Divider
} from '@mui/material';
import axios from 'axios';

// API-Basis-URL
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3500/api';

interface Permission {
  id: string;
  name: string;
  description: string;
  module: string;
  action: string;
  category: string;
}

interface Role {
  id: string;
  name: string;
  description: string;
  is_system: boolean;
  created_at: string;
  updated_at: string;
}

interface Module {
  name: string;
  permissions: Permission[];
}

interface PermissionMatrixProps {
  roleId: string;
  onPermissionsChanged?: () => void;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

// Hilfsfunktion zum Gruppieren der Berechtigungen nach Modulen
const groupPermissionsByModule = (permissions: Permission[]): Module[] => {
  const moduleMap = new Map<string, Permission[]>();

  permissions.forEach(permission => {
    if (!moduleMap.has(permission.module)) {
      moduleMap.set(permission.module, []);
    }
    moduleMap.get(permission.module)?.push(permission);
  });

  return Array.from(moduleMap.entries()).map(([name, permissions]) => ({
    name,
    permissions
  }));
};

const PermissionMatrix: FC<PermissionMatrixProps> = ({ roleId, onPermissionsChanged }) => {
  const [role, setRole] = useState<Role | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Lade Rollen- und Berechtigungsdaten
  const loadRoleAndPermissions = async () => {
    try {
      setLoading(true);
      setError(null);

      // Lade Rollendaten
      const roleResponse = await axios.get<ApiResponse<Role>>(`${API_BASE_URL}/roles/${roleId}`);
      setRole(roleResponse.data.data);

      // Lade alle verfügbaren Berechtigungen
      const permissionsResponse = await axios.get<ApiResponse<Permission[]>>(`${API_BASE_URL}/permissions`);
      const allPermissions = permissionsResponse.data.data;
      setModules(groupPermissionsByModule(allPermissions));

      // Lade zugewiesene Berechtigungen für die Rolle
      const rolePermissionsResponse = await axios.get<ApiResponse<Permission[]>>(
        `${API_BASE_URL}/roles/${roleId}/permissions`
      );
      const assignedPermissionIds = rolePermissionsResponse.data.data.map(p => p.id);
      setSelectedPermissions(assignedPermissionIds);

    } catch (err) {
      console.error('Fehler beim Laden der Berechtigungen:', err);
      setError('Fehler beim Laden der Berechtigungen');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRoleAndPermissions();
  }, [roleId]);

  // Berechtigung umschalten
  const handlePermissionChange = async (permissionId: string) => {
    if (!role) return;

    const isSelected = selectedPermissions.includes(permissionId);
    const newSelectedPermissions = isSelected
      ? selectedPermissions.filter(id => id !== permissionId)
      : [...selectedPermissions, permissionId];

    setSelectedPermissions(newSelectedPermissions);

    try {
      if (isSelected) {
        await axios.delete(`${API_BASE_URL}/roles/${roleId}/permissions/${permissionId}`);
      } else {
        await axios.post(`${API_BASE_URL}/roles/${roleId}/permissions`, {
          permission_id: permissionId
        });
      }

      if (onPermissionsChanged) {
        onPermissionsChanged();
      }
    } catch (err) {
      console.error('Fehler beim Aktualisieren der Berechtigung:', err);
      setError('Fehler beim Aktualisieren der Berechtigung');
      // Zustand zurücksetzen bei Fehler
      setSelectedPermissions(selectedPermissions);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        {error}
      </Alert>
    );
  }

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Berechtigungen für {role?.name}
      </Typography>

      <Paper sx={{ p: 2 }}>
        {modules.map((module, index) => (
          <Box key={module.name}>
            <Typography variant="subtitle1" sx={{ mt: index > 0 ? 2 : 0, mb: 1 }}>
              {module.name}
            </Typography>
            <FormGroup>
              {module.permissions.map(permission => (
                <FormControlLabel
                  key={permission.id}
                  control={
                    <Checkbox
                      checked={selectedPermissions.includes(permission.id)}
                      onChange={() => handlePermissionChange(permission.id)}
                    />
                  }
                  label={permission.description}
                />
              ))}
            </FormGroup>
            {index < modules.length - 1 && <Divider sx={{ my: 2 }} />}
          </Box>
        ))}
      </Paper>
    </Box>
  );
};

export default PermissionMatrix;
