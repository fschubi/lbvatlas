import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Grid,
  Checkbox,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControlLabel,
  IconButton,
  Divider,
  Alert,
  Snackbar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  CircularProgress
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
  Security as SecurityIcon,
  Check as CheckIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import axios from 'axios';
import AtlasAppBar from '../components/AtlasAppBar';
import AtlasTable, { AtlasColumn } from '../components/AtlasTable';

// API-Basis-URL
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

// Helper-Funktion für Axios-Anfragen mit Authorization Header
const getAuthConfig = () => {
  const token = localStorage.getItem('token');

  if (!token || token.trim() === '') {
    console.error('Kein Token vorhanden oder Token leer');
    return {};
  }

  return {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  };
};

interface Role {
  id: number;
  name: string;
  description: string;
  created_at: string;
  updated_at: string;
}

interface Permission {
  id: number;
  name: string;
  description: string;
  module: string;
  action: 'view' | 'create' | 'edit' | 'delete' | 'admin';
}

interface RolePermission {
  role_id: number;
  permission_id: number;
}

interface SnackbarState {
  open: boolean;
  message: string;
  severity: 'success' | 'error' | 'info' | 'warning';
}

// Module für die Berechtigungen
const PERMISSION_MODULES = [
  'devices', 'users', 'licenses', 'certificates', 'accessories',
  'locations', 'departments', 'inventory', 'reports', 'system'
];

// Aktionen für die Berechtigungen
const PERMISSION_ACTIONS = [
  { key: 'view', label: 'Ansehen' },
  { key: 'create', label: 'Erstellen' },
  { key: 'edit', label: 'Bearbeiten' },
  { key: 'delete', label: 'Löschen' },
  { key: 'admin', label: 'Admin' }
];

const RolePermissions: React.FC = () => {
  const theme = useTheme();
  const [loading, setLoading] = useState<boolean>(true);
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [rolePermissions, setRolePermissions] = useState<RolePermission[]>([]);

  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [dialogOpen, setDialogOpen] = useState<boolean>(false);
  const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create');

  const [roleName, setRoleName] = useState<string>('');
  const [roleDescription, setRoleDescription] = useState<string>('');

  const [snackbar, setSnackbar] = useState<SnackbarState>({
    open: false,
    message: '',
    severity: 'success'
  });

  // Spalten für die Rollen-Tabelle
  const roleColumns: AtlasColumn<Role>[] = [
    { label: 'ID', dataKey: 'id', numeric: true, width: 70 },
    { label: 'Name', dataKey: 'name', width: 150 },
    { label: 'Beschreibung', dataKey: 'description', width: 300 }
  ];

  // Rollen laden
  const fetchRoles = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/roles`, getAuthConfig());

      if (response.data && response.data.success) {
        setRoles(response.data.data);

        // Automatisch die erste Rolle auswählen, wenn noch keine ausgewählt ist
        if (response.data.data.length > 0 && !selectedRole) {
          setSelectedRole(response.data.data[0]);
        }
      }
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
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/permissions`, getAuthConfig());

      if (response.data && response.data.success) {
        setPermissions(response.data.data);
      }
    } catch (error) {
      console.error('Fehler beim Laden der Berechtigungen:', error);
      setSnackbar({
        open: true,
        message: 'Fehler beim Laden der Berechtigungen',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  // Rollen-Berechtigungen laden
  const fetchRolePermissions = async (roleId: number) => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/roles/${roleId}/permissions`, getAuthConfig());

      if (response.data && response.data.success) {
        setRolePermissions(response.data.data);
      }
    } catch (error) {
      console.error('Fehler beim Laden der Rollenberechtigungen:', error);
      setSnackbar({
        open: true,
        message: 'Fehler beim Laden der Rollenberechtigungen',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  // Neue Rolle erstellen
  const createRole = async () => {
    try {
      setLoading(true);
      const response = await axios.post(
        `${API_BASE_URL}/roles`,
        {
          name: roleName,
          description: roleDescription
        },
        getAuthConfig()
      );

      if (response.data && response.data.success) {
        setRoles([...roles, response.data.data]);
        setSelectedRole(response.data.data);

        setSnackbar({
          open: true,
          message: 'Rolle erfolgreich erstellt',
          severity: 'success'
        });

        setDialogOpen(false);
        clearRoleForm();
      }
    } catch (error) {
      console.error('Fehler beim Erstellen der Rolle:', error);
      setSnackbar({
        open: true,
        message: 'Fehler beim Erstellen der Rolle',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  // Rolle aktualisieren
  const updateRole = async () => {
    if (!selectedRole) return;

    try {
      setLoading(true);
      const response = await axios.put(
        `${API_BASE_URL}/roles/${selectedRole.id}`,
        {
          name: roleName,
          description: roleDescription
        },
        getAuthConfig()
      );

      if (response.data && response.data.success) {
        setRoles(roles.map(role =>
          role.id === selectedRole.id ? response.data.data : role
        ));
        setSelectedRole(response.data.data);

        setSnackbar({
          open: true,
          message: 'Rolle erfolgreich aktualisiert',
          severity: 'success'
        });

        setDialogOpen(false);
        clearRoleForm();
      }
    } catch (error) {
      console.error('Fehler beim Aktualisieren der Rolle:', error);
      setSnackbar({
        open: true,
        message: 'Fehler beim Aktualisieren der Rolle',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  // Rolle löschen
  const deleteRole = async (roleId: number) => {
    try {
      setLoading(true);
      const response = await axios.delete(`${API_BASE_URL}/roles/${roleId}`, getAuthConfig());

      if (response.data && response.data.success) {
        setRoles(roles.filter(role => role.id !== roleId));

        // Wenn die gelöschte Rolle ausgewählt war, die erste verfügbare auswählen
        if (selectedRole && selectedRole.id === roleId) {
          const remainingRoles = roles.filter(role => role.id !== roleId);
          setSelectedRole(remainingRoles.length > 0 ? remainingRoles[0] : null);
        }

        setSnackbar({
          open: true,
          message: 'Rolle erfolgreich gelöscht',
          severity: 'success'
        });
      }
    } catch (error) {
      console.error('Fehler beim Löschen der Rolle:', error);
      setSnackbar({
        open: true,
        message: 'Fehler beim Löschen der Rolle',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  // Berechtigung zu Rolle hinzufügen/entfernen
  const togglePermission = async (permissionId: number) => {
    if (!selectedRole) return;

    try {
      setLoading(true);

      // Prüfen, ob die Berechtigung bereits zugewiesen ist
      const hasPermission = rolePermissions.some(
        rp => rp.role_id === selectedRole.id && rp.permission_id === permissionId
      );

      if (hasPermission) {
        // Berechtigung entfernen
        const response = await axios.delete(
          `${API_BASE_URL}/roles/${selectedRole.id}/permissions/${permissionId}`,
          getAuthConfig()
        );

        if (response.data && response.data.success) {
          setRolePermissions(rolePermissions.filter(
            rp => !(rp.role_id === selectedRole.id && rp.permission_id === permissionId)
          ));

          setSnackbar({
            open: true,
            message: 'Berechtigung erfolgreich entfernt',
            severity: 'success'
          });
        }
      } else {
        // Berechtigung hinzufügen
        const response = await axios.post(
          `${API_BASE_URL}/roles/${selectedRole.id}/permissions`,
          {
            permission_id: permissionId
          },
          getAuthConfig()
        );

        if (response.data && response.data.success) {
          setRolePermissions([
            ...rolePermissions,
            { role_id: selectedRole.id, permission_id: permissionId }
          ]);

          setSnackbar({
            open: true,
            message: 'Berechtigung erfolgreich hinzugefügt',
            severity: 'success'
          });
        }
      }
    } catch (error) {
      console.error('Fehler beim Aktualisieren der Berechtigung:', error);
      setSnackbar({
        open: true,
        message: 'Fehler beim Aktualisieren der Berechtigung',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  // Formular für Rolle leeren
  const clearRoleForm = () => {
    setRoleName('');
    setRoleDescription('');
  };

  // Dialog zum Erstellen einer neuen Rolle öffnen
  const openCreateDialog = () => {
    setDialogMode('create');
    clearRoleForm();
    setDialogOpen(true);
  };

  // Dialog zum Bearbeiten einer Rolle öffnen
  const openEditDialog = (role: Role) => {
    setDialogMode('edit');
    setRoleName(role.name);
    setRoleDescription(role.description);
    setDialogOpen(true);
  };

  // Beim ersten Laden Daten abrufen
  useEffect(() => {
    fetchRoles();
    fetchPermissions();
  }, []);

  // Wenn sich die ausgewählte Rolle ändert, Berechtigungen laden
  useEffect(() => {
    if (selectedRole) {
      fetchRolePermissions(selectedRole.id);
    }
  }, [selectedRole]);

  // Prüfen, ob eine Berechtigung der Rolle zugewiesen ist
  const hasPermission = (permissionId: number) => {
    return rolePermissions.some(
      rp => rp.role_id === selectedRole?.id && rp.permission_id === permissionId
    );
  };

  // Berechtigung für ein bestimmtes Modul und eine Aktion finden
  const findPermission = (module: string, action: string) => {
    return permissions.find(p => p.module === module && p.action === action);
  };

  // Snackbar schließen
  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <AtlasAppBar onMenuClick={() => {}} />

      <Box sx={{ flexGrow: 1, p: 3, overflow: 'auto' }}>
        <Typography variant="h4" gutterBottom>
          Rollen & Berechtigungen
        </Typography>

        <Grid container spacing={3}>
          {/* Rollen-Bereich */}
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 2, mb: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">
                  Rollen
                </Typography>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={openCreateDialog}
                >
                  Neue Rolle
                </Button>
              </Box>

              <AtlasTable
                columns={roleColumns}
                rows={roles}
                loading={loading}
                heightPx={400}
                emptyMessage="Keine Rollen gefunden"
                onRowClick={(role) => setSelectedRole(role)}
                onEdit={(role) => openEditDialog(role)}
                onDelete={(role) => deleteRole(role.id)}
                highlightedRowId={selectedRole?.id}
              />
            </Paper>
          </Grid>

          {/* Berechtigungs-Bereich */}
          <Grid item xs={12} md={8}>
            <Paper sx={{ p: 2 }}>
              <Box sx={{ mb: 2 }}>
                <Typography variant="h6">
                  Berechtigungen für Rolle: {selectedRole?.name || 'Keine Rolle ausgewählt'}
                </Typography>
                {selectedRole && (
                  <Typography variant="body2" color="textSecondary">
                    {selectedRole.description}
                  </Typography>
                )}
              </Box>

              {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                  <CircularProgress />
                </Box>
              ) : !selectedRole ? (
                <Alert severity="info">
                  Bitte wählen Sie eine Rolle aus, um deren Berechtigungen zu verwalten.
                </Alert>
              ) : (
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Modul</TableCell>
                        {PERMISSION_ACTIONS.map(action => (
                          <TableCell key={action.key} align="center">
                            {action.label}
                          </TableCell>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {PERMISSION_MODULES.map(module => (
                        <TableRow key={module}>
                          <TableCell>
                            <Typography variant="body2">
                              {module.charAt(0).toUpperCase() + module.slice(1)}
                            </Typography>
                          </TableCell>

                          {PERMISSION_ACTIONS.map(action => {
                            const permission = findPermission(module, action.key);
                            return (
                              <TableCell key={`${module}-${action.key}`} align="center">
                                {permission ? (
                                  <Checkbox
                                    checked={hasPermission(permission.id)}
                                    onChange={() => togglePermission(permission.id)}
                                    color="primary"
                                    size="small"
                                  />
                                ) : (
                                  <Tooltip title="Berechtigung nicht verfügbar">
                                    <span>-</span>
                                  </Tooltip>
                                )}
                              </TableCell>
                            );
                          })}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Paper>
          </Grid>
        </Grid>
      </Box>

      {/* Dialog für Rolle erstellen/bearbeiten */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {dialogMode === 'create' ? 'Neue Rolle erstellen' : 'Rolle bearbeiten'}
        </DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Name"
            value={roleName}
            onChange={(e) => setRoleName(e.target.value)}
            margin="normal"
            required
          />

          <TextField
            fullWidth
            label="Beschreibung"
            value={roleDescription}
            onChange={(e) => setRoleDescription(e.target.value)}
            margin="normal"
            multiline
            rows={3}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>
            Abbrechen
          </Button>
          <Button
            onClick={dialogMode === 'create' ? createRole : updateRole}
            variant="contained"
            disabled={!roleName}
          >
            {dialogMode === 'create' ? 'Erstellen' : 'Speichern'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
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
    </Box>
  );
};

export default RolePermissions;
