import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Divider,
  Tabs,
  Tab,
  FormControlLabel,
  Checkbox,
  Grid,
  Snackbar,
  Alert,
  IconButton,
  Tooltip,
  ListItem,
  ListItemText,
  List,
  Chip
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  SecurityRounded as SecurityIcon,
  Check as CheckIcon,
  Clear as ClearIcon
} from '@mui/icons-material';
import MainLayout from '../../layout/MainLayout';
import AtlasTable, { AtlasColumn } from '../../components/AtlasTable';
import axios from 'axios';

// API-Basis-URL
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

// Typen
interface Role {
  id: number;
  name: string;
  description: string;
  is_system: boolean;
  created_at: string;
  updated_at: string;
}

interface Permission {
  id: number;
  name: string;
  description: string;
  module: string;
  action: string;
}

interface Module {
  name: string;
  permissions: Permission[];
}

interface SnackbarState {
  open: boolean;
  message: string;
  severity: 'success' | 'error' | 'info' | 'warning';
}

// API Response Typen
interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

// Helper für Authorization Header
const getAuthConfig = () => {
  const token = localStorage.getItem('token');
  return {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  };
};

const RoleManagement: React.FC = () => {
  // Zustände
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [modules, setModules] = useState<Module[]>([]);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [rolePermissions, setRolePermissions] = useState<number[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [openDialog, setOpenDialog] = useState<boolean>(false);
  const [dialogType, setDialogType] = useState<'create' | 'edit'>('create');
  const [roleName, setRoleName] = useState<string>('');
  const [roleDescription, setRoleDescription] = useState<string>('');
  const [tabValue, setTabValue] = useState<number>(0);
  const [snackbar, setSnackbar] = useState<SnackbarState>({
    open: false,
    message: '',
    severity: 'success'
  });

  // Spalten für die Rollen-Tabelle
  const roleColumns: AtlasColumn<Role>[] = [
    { label: 'ID', dataKey: 'id', numeric: true, width: 70 },
    { label: 'Name', dataKey: 'name', width: 150 },
    { label: 'Beschreibung', dataKey: 'description', width: 250 },
    {
      label: 'Systemrolle',
      dataKey: 'is_system',
      width: 120,
      render: (value: boolean) => (
        <Chip
          icon={value ? <CheckIcon /> : <ClearIcon />}
          label={value ? 'Ja' : 'Nein'}
          color={value ? 'primary' : 'default'}
          size="small"
        />
      )
    },
    { label: 'Erstellt am', dataKey: 'created_at', width: 180 },
    { label: 'Aktualisiert am', dataKey: 'updated_at', width: 180 },
    {
      label: 'Aktionen',
      dataKey: 'actions',
      width: 150,
      render: (_, role: Role) => (
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title="Berechtigungen bearbeiten">
            <IconButton
              size="small"
              color="primary"
              onClick={() => handleSelectRole(role)}
            >
              <SecurityIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Rolle bearbeiten">
            <IconButton
              size="small"
              color="secondary"
              onClick={() => handleOpenDialog('edit', role)}
              disabled={role.is_system}
            >
              <EditIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Rolle löschen">
            <IconButton
              size="small"
              color="error"
              onClick={() => handleDeleteRole(role.id)}
              disabled={role.is_system}
            >
              <DeleteIcon />
            </IconButton>
          </Tooltip>
        </Box>
      )
    }
  ];

  // Daten laden
  useEffect(() => {
    fetchRoles();
    fetchPermissions();
  }, []);

  // Rollen laden
  const fetchRoles = async () => {
    try {
      setLoading(true);
      const response = await axios.get<ApiResponse<Role[]>>(`${API_BASE_URL}/roles`, getAuthConfig());
      setRoles(response.data.data);
    } catch (error) {
      console.error('Fehler beim Laden der Rollen:', error);
      setSnackbar({
        open: true,
        message: 'Fehler beim Laden der Rollen',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  // Berechtigungen laden
  const fetchPermissions = async () => {
    try {
      const response = await axios.get<ApiResponse<Permission[]>>(`${API_BASE_URL}/permissions`, getAuthConfig());
      setPermissions(response.data.data);

      // Berechtigungen nach Modulen gruppieren
      const moduleMap = new Map<string, Permission[]>();
      response.data.data.forEach((permission: Permission) => {
        if (!moduleMap.has(permission.module)) {
          moduleMap.set(permission.module, []);
        }
        moduleMap.get(permission.module)?.push(permission);
      });

      const moduleArray: Module[] = [];
      moduleMap.forEach((perms, moduleName) => {
        moduleArray.push({
          name: moduleName,
          permissions: perms
        });
      });

      setModules(moduleArray);
    } catch (error) {
      console.error('Fehler beim Laden der Berechtigungen:', error);
    }
  };

  // Rollenberechtigungen laden
  const fetchRolePermissions = async (roleId: number) => {
    try {
      const response = await axios.get<ApiResponse<Permission[]>>(
        `${API_BASE_URL}/roles/${roleId}/permissions`,
        getAuthConfig()
      );
      const permissionIds = response.data.data.map((perm: Permission) => perm.id);
      setRolePermissions(permissionIds);
    } catch (error) {
      console.error(`Fehler beim Laden der Berechtigungen für Rolle ${roleId}:`, error);
    }
  };

  // Rolle auswählen
  const handleSelectRole = (role: Role) => {
    setSelectedRole(role);
    fetchRolePermissions(role.id);
    setTabValue(1);
  };

  // Tab wechseln
  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  // Dialog öffnen
  const handleOpenDialog = (type: 'create' | 'edit', role?: Role) => {
    setDialogType(type);
    if (type === 'edit' && role) {
      setRoleName(role.name);
      setRoleDescription(role.description || '');
    } else {
      setRoleName('');
      setRoleDescription('');
    }
    setOpenDialog(true);
  };

  // Dialog schließen
  const handleCloseDialog = () => {
    setOpenDialog(false);
  };

  // Rolle erstellen
  const handleCreateRole = async () => {
    try {
      const response = await axios.post<ApiResponse<Role>>(
        `${API_BASE_URL}/roles`,
        {
          name: roleName,
          description: roleDescription
        },
        getAuthConfig()
      );

      setRoles([...roles, response.data.data]);
      handleCloseDialog();
      setSnackbar({
        open: true,
        message: 'Rolle erfolgreich erstellt',
        severity: 'success'
      });
    } catch (error) {
      console.error('Fehler beim Erstellen der Rolle:', error);
      setSnackbar({
        open: true,
        message: 'Fehler beim Erstellen der Rolle',
        severity: 'error'
      });
    }
  };

  // Rolle aktualisieren
  const handleUpdateRole = async () => {
    if (!selectedRole) return;

    try {
      const response = await axios.put<ApiResponse<Role>>(
        `${API_BASE_URL}/roles/${selectedRole.id}`,
        {
          name: roleName,
          description: roleDescription
        },
        getAuthConfig()
      );

      setRoles(roles.map(role =>
        role.id === selectedRole.id ? response.data.data : role
      ));
      handleCloseDialog();
      setSnackbar({
        open: true,
        message: 'Rolle erfolgreich aktualisiert',
        severity: 'success'
      });
    } catch (error) {
      console.error('Fehler beim Aktualisieren der Rolle:', error);
      setSnackbar({
        open: true,
        message: 'Fehler beim Aktualisieren der Rolle',
        severity: 'error'
      });
    }
  };

  // Rolle löschen
  const handleDeleteRole = async (roleId: number) => {
    if (!window.confirm('Möchten Sie diese Rolle wirklich löschen?')) {
      return;
    }

    try {
      await axios.delete(`${API_BASE_URL}/roles/${roleId}`, getAuthConfig());
      setRoles(roles.filter(role => role.id !== roleId));
      if (selectedRole?.id === roleId) {
        setSelectedRole(null);
        setTabValue(0);
      }
      setSnackbar({
        open: true,
        message: 'Rolle erfolgreich gelöscht',
        severity: 'success'
      });
    } catch (error) {
      console.error('Fehler beim Löschen der Rolle:', error);
      setSnackbar({
        open: true,
        message: 'Fehler beim Löschen der Rolle',
        severity: 'error'
      });
    }
  };

  // Berechtigung umschalten
  const handleTogglePermission = async (permissionId: number) => {
    if (!selectedRole) return;

    const isPermissionAssigned = rolePermissions.includes(permissionId);

    try {
      if (isPermissionAssigned) {
        // Berechtigung entfernen
        await axios.delete(
          `${API_BASE_URL}/roles/${selectedRole.id}/permissions/${permissionId}`,
          getAuthConfig()
        );
        setRolePermissions(rolePermissions.filter(id => id !== permissionId));
      } else {
        // Berechtigung hinzufügen
        await axios.post(
          `${API_BASE_URL}/roles/${selectedRole.id}/permissions`,
          { permission_id: permissionId },
          getAuthConfig()
        );
        setRolePermissions([...rolePermissions, permissionId]);
      }
    } catch (error) {
      console.error('Fehler beim Aktualisieren der Berechtigung:', error);
      setSnackbar({
        open: true,
        message: 'Fehler beim Aktualisieren der Berechtigung',
        severity: 'error'
      });
    }
  };

  // Modul-Berechtigungen umschalten
  const handleToggleModulePermissions = (modulePermissions: Permission[]) => {
    if (!selectedRole) return;

    const modulePermissionIds = modulePermissions.map(p => p.id);
    const allAssigned = modulePermissionIds.every(id => rolePermissions.includes(id));

    // Alle Modul-Berechtigungen umschalten
    modulePermissionIds.forEach(permissionId => {
      if (allAssigned && rolePermissions.includes(permissionId)) {
        handleTogglePermission(permissionId);
      } else if (!allAssigned && !rolePermissions.includes(permissionId)) {
        handleTogglePermission(permissionId);
      }
    });
  };

  // Snackbar schließen
  const handleCloseSnackbar = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  // Dialog-Aktion
  const handleDialogAction = () => {
    if (dialogType === 'create') {
      handleCreateRole();
    } else {
      handleUpdateRole();
    }
  };

  return (
    <MainLayout>
      <Box sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4">Rollenverwaltung</Typography>
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog('create')}
          >
            Neue Rolle
          </Button>
        </Box>

        <Paper sx={{ mb: 3 }}>
          <Tabs
            value={tabValue}
            onChange={handleTabChange}
            sx={{ borderBottom: 1, borderColor: 'divider' }}
          >
            <Tab label="Rollen" id="tab-0" />
            <Tab
              label="Berechtigungen"
              id="tab-1"
              disabled={!selectedRole}
            />
          </Tabs>

          {/* Rollenliste anzeigen */}
          {tabValue === 0 && (
            <Box sx={{ p: 2 }}>
              <AtlasTable
                columns={roleColumns}
                rows={roles}
              />
            </Box>
          )}

          {/* Berechtigungen anzeigen */}
          {tabValue === 1 && selectedRole && (
            <Box sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>
                Berechtigungen für Rolle: {selectedRole.name}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Wählen Sie die Berechtigungen aus, die dieser Rolle zugewiesen werden sollen.
              </Typography>

              {modules.map((module) => (
                <Paper key={module.name} sx={{ mb: 2, p: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Typography variant="subtitle1">{module.name}</Typography>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={module.permissions.every(p => rolePermissions.includes(p.id))}
                          indeterminate={
                            module.permissions.some(p => rolePermissions.includes(p.id)) &&
                            !module.permissions.every(p => rolePermissions.includes(p.id))
                          }
                          onChange={() => handleToggleModulePermissions(module.permissions)}
                        />
                      }
                      label="Alle"
                    />
                  </Box>
                  <Divider sx={{ mb: 2 }} />
                  <Grid container spacing={2}>
                    {module.permissions.map((permission) => (
                      <Grid item xs={12} sm={6} md={4} key={permission.id}>
                        <FormControlLabel
                          control={
                            <Checkbox
                              checked={rolePermissions.includes(permission.id)}
                              onChange={() => handleTogglePermission(permission.id)}
                            />
                          }
                          label={
                            <Box>
                              <Typography variant="body2">{permission.action}</Typography>
                              <Typography variant="caption" color="text.secondary">
                                {permission.description}
                              </Typography>
                            </Box>
                          }
                        />
                      </Grid>
                    ))}
                  </Grid>
                </Paper>
              ))}
            </Box>
          )}
        </Paper>
      </Box>

      {/* Dialog für Rolle erstellen/bearbeiten */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {dialogType === 'create' ? 'Neue Rolle erstellen' : 'Rolle bearbeiten'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <TextField
              autoFocus
              margin="dense"
              id="name"
              label="Rollenname"
              type="text"
              fullWidth
              variant="outlined"
              value={roleName}
              onChange={(e) => setRoleName(e.target.value)}
              required
              sx={{ mb: 2 }}
            />
            <TextField
              margin="dense"
              id="description"
              label="Beschreibung"
              type="text"
              fullWidth
              variant="outlined"
              value={roleDescription}
              onChange={(e) => setRoleDescription(e.target.value)}
              multiline
              rows={3}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Abbrechen</Button>
          <Button
            onClick={handleDialogAction}
            variant="contained"
            color="primary"
            disabled={!roleName.trim()}
          >
            {dialogType === 'create' ? 'Erstellen' : 'Speichern'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Benachrichtigungen */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={5000}
        onClose={handleCloseSnackbar}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </MainLayout>
  );
};

export default RoleManagement;
