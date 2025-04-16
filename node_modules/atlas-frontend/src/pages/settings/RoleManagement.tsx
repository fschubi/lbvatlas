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
  TableContainer,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Chip,
  CircularProgress
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Check as CheckIcon,
  Clear as ClearIcon
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';
import axios from 'axios';

// API-Basis-URL
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

// Typen
interface Role {
  id: string;
  name: string;
  description: string;
  is_system: boolean;
  created_at: string;
  updated_at: string;
  permissions: string[];
  userCount: number;
}

interface Permission {
  id: string;
  name: string;
  description: string;
  module: string;
  action: string;
  category: string;
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

interface ActionPermissions {
  create: string | null;
  read: string | null;
  update: string | null;
  delete: string | null;
}

interface PermissionMatrix {
  [module: string]: ActionPermissions;
}

// Aktualisierte Typ-Definition für API-Antworten
interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
}

// Helper für Authorization Header
const getAuthConfig = () => {
  const token = localStorage.getItem('token');
  if (!token) {
    console.warn('Kein Auth-Token gefunden');
    return {};
  }
  return {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  };
};

// Hauptkomponente
const RoleManagement: React.FC = () => {
  // Zustände
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [modules, setModules] = useState<Module[]>([]);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [rolePermissions, setRolePermissions] = useState<string[]>([]);
  const [permissionMatrix, setPermissionMatrix] = useState<PermissionMatrix>({});
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

      if (!response.data.success) {
        throw new Error('Keine gültige Antwort vom Server');
      }

      setRoles(response.data.data || []);
    } catch (error) {
      console.error('Fehler beim Laden der Rollen:', error);
      setSnackbar({
        open: true,
        message: 'Fehler beim Laden der Rollen: Verbindungsproblem',
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

      if (!response.data.success) {
        throw new Error('Keine gültige Antwort vom Server');
      }

      const permissionsData = response.data.data || [];
      setPermissions(permissionsData);

      // Berechtigungen nach Modulen gruppieren
      const moduleMap = new Map<string, Permission[]>();
      permissionsData.forEach((permission: Permission) => {
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
      setSnackbar({
        open: true,
        message: 'Fehler beim Laden der Berechtigungen: Verbindungsproblem',
        severity: 'error'
      });
    }
  };

  // Rollenberechtigungen laden
  const fetchRolePermissions = async (roleId: string) => {
    try {
      setLoading(true);
      const response = await axios.get<ApiResponse<Permission[]>>(
        `${API_BASE_URL}/roles/${roleId}/permissions`,
        getAuthConfig()
      );

      if (!response.data.success) {
        throw new Error('Ungültige Antwort vom Server');
      }

      const permissionIds = (response.data.data || []).map((perm: Permission) => perm.id);
      setRolePermissions(permissionIds);

      // Berechtigungsmatrix erstellen
      createPermissionMatrix(response.data.data || []);
    } catch (error) {
      console.error(`Fehler beim Laden der Berechtigungen für Rolle ${roleId}:`, error);
      setSnackbar({
        open: true,
        message: `Fehler beim Laden der Berechtigungen für Rolle: Verbindungsproblem`,
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  // Berechtigungsmatrix erstellen
  const createPermissionMatrix = (rolePermissions: Permission[]) => {
    // Erstelle Matrix für jedes Modul mit Erstellen, Lesen, Bearbeiten, Löschen
    const matrix: PermissionMatrix = {};

    // Alle Module initialisieren
    modules.forEach(module => {
      matrix[module.name] = {
        create: null,
        read: null,
        update: null,
        delete: null
      };
    });

    // Zugewiesene Berechtigungen setzen
    rolePermissions.forEach(permission => {
      const module = permission.module;
      const action = permission.action;

      if (!matrix[module]) {
        matrix[module] = {
          create: null,
          read: null,
          update: null,
          delete: null
        };
      }

      // Aktion zuordnen
      if (action === 'create' || action === 'add') {
        matrix[module].create = permission.id;
      } else if (action === 'read' || action === 'view' || action === 'list') {
        matrix[module].read = permission.id;
      } else if (action === 'update' || action === 'edit') {
        matrix[module].update = permission.id;
      } else if (action === 'delete' || action === 'remove') {
        matrix[module].delete = permission.id;
      }
    });

    setPermissionMatrix(matrix);
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
      setSelectedRole(role);
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
      setLoading(true);
      const response = await axios.post<ApiResponse<Role>>(
        `${API_BASE_URL}/roles`,
        {
          name: roleName,
          description: roleDescription
        },
        getAuthConfig()
      );

      if (!response.data.success) {
        throw new Error('Ungültige Antwort vom Server');
      }

      setRoles([...roles, response.data.data as Role]);
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
        message: 'Fehler beim Erstellen der Rolle: Verbindungsproblem',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  // Rolle aktualisieren
  const handleUpdateRole = async () => {
    if (!selectedRole) return;

    try {
      setLoading(true);
      const response = await axios.put<ApiResponse<Role>>(
        `${API_BASE_URL}/roles/${selectedRole.id}`,
        {
          name: roleName,
          description: roleDescription
        },
        getAuthConfig()
      );

      if (!response.data.success) {
        throw new Error('Ungültige Antwort vom Server');
      }

      setRoles(roles.map(role =>
        role.id === selectedRole.id ? (response.data.data as Role) : role
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
        message: 'Fehler beim Aktualisieren der Rolle: Verbindungsproblem',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  // Rolle löschen
  const handleDeleteRole = async (roleId: string) => {
    if (!window.confirm('Möchten Sie diese Rolle wirklich löschen?')) {
      return;
    }

    try {
      setLoading(true);
      const response = await axios.delete<ApiResponse<null>>(
        `${API_BASE_URL}/roles/${roleId}`,
        getAuthConfig()
      );

      if (!response.data.success) {
        throw new Error('Ungültige Antwort vom Server');
      }

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
        message: 'Fehler beim Löschen der Rolle: Verbindungsproblem',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  // Berechtigung umschalten
  const handleTogglePermission = async (permissionId: string | null) => {
    if (!selectedRole || !permissionId) return;

    const isPermissionAssigned = rolePermissions.includes(permissionId);
    setLoading(true);

    try {
      if (isPermissionAssigned) {
        // Berechtigung entfernen
        const response = await axios.delete<ApiResponse<null>>(
          `${API_BASE_URL}/roles/${selectedRole.id}/permissions/${permissionId}`,
          getAuthConfig()
        );

        if (!response.data.success) {
          throw new Error('Ungültige Antwort vom Server');
        }

        setRolePermissions(rolePermissions.filter(id => id !== permissionId));
      } else {
        // Berechtigung hinzufügen
        const response = await axios.post<ApiResponse<null>>(
          `${API_BASE_URL}/roles/${selectedRole.id}/permissions`,
          { permission_id: permissionId },
          getAuthConfig()
        );

        if (!response.data.success) {
          throw new Error('Ungültige Antwort vom Server');
        }

        setRolePermissions([...rolePermissions, permissionId]);
      }

      // Berechtigungen neu laden
      fetchRolePermissions(selectedRole.id);
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

  // Finde eine Berechtigung in den verfügbaren Berechtigungen
  const findPermission = (module: string, action: string): string | null => {
    const moduleObj = modules.find(m => m.name === module);
    if (!moduleObj) return null;

    const permission = moduleObj.permissions.find(p => p.action === action);
    return permission ? permission.id : null;
  };

  if (loading && roles.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 'calc(100vh - 64px)' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Benutzerrollen</Typography>
            <Button
              variant="contained"
              color="primary"
              startIcon={<AddIcon />}
          onClick={() => handleOpenDialog('create')}
            >
              Neue Rolle erstellen
            </Button>
          </Box>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={tabValue} onChange={handleTabChange} aria-label="Rollenverwaltungs-Tabs">
          <Tab label="Rollen" id="tab-0" aria-controls="tabpanel-0" />
          {selectedRole && (
            <Tab label={`Berechtigungen: ${selectedRole.name}`} id="tab-1" aria-controls="tabpanel-1" />
          )}
        </Tabs>
      </Box>

      {/* Tab-Inhalt für Rollenübersicht */}
      <Box role="tabpanel" hidden={tabValue !== 0} id="tabpanel-0" aria-labelledby="tab-0">
        {tabValue === 0 && (
          <TableContainer component={Paper} variant="outlined">
            <Table sx={{ minWidth: 650 }} aria-label="Benutzerrollen">
                <TableHead>
                  <TableRow>
                    <TableCell>Name</TableCell>
                    <TableCell>Beschreibung</TableCell>
                  <TableCell>Systemrolle</TableCell>
                  <TableCell>Berechtigungen</TableCell>
                  <TableCell>Aktionen</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {roles.map((role) => (
                  <TableRow key={role.id} hover>
                    <TableCell>
                      <Chip
                        label={role.name}
                        size="small"
                      sx={{
                          bgcolor: role.name === 'admin' ? 'primary.main' :
                                  role.name === 'manager' ? 'secondary.main' :
                                  role.name === 'support' ? 'info.main' : 'default'
                        }}
                      />
                      </TableCell>
                      <TableCell>{role.description}</TableCell>
                    <TableCell>
                      {role.is_system ? (
                        <CheckIcon color="success" fontSize="small" />
                      ) : (
                        <ClearIcon color="error" fontSize="small" />
                      )}
                    </TableCell>
                    <TableCell>{role.permissions?.length || 0}</TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <IconButton
                          size="small"
                          color="primary"
                          onClick={() => handleSelectRole(role)}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                        {!role.is_system && (
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleDeleteRole(role.id)}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        )}
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
                {roles.length === 0 && !loading && (
                  <TableRow>
                    <TableCell colSpan={5} align="center">
                      Keine Rollen verfügbar
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Box>

      {/* Tab-Inhalt für Berechtigungsverwaltung */}
      <Box role="tabpanel" hidden={tabValue !== 1} id="tabpanel-1" aria-labelledby="tab-1">
        {tabValue === 1 && selectedRole && (
          <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">
                Berechtigungsmatrix für {selectedRole.name}
              </Typography>
              {loading && <CircularProgress size={24} />}
                        </Box>

            <Alert severity="info" sx={{ mb: 2 }}>
              Die Berechtigungen werden über die Datenbank verwaltet und beeinflussen die Zugriffsebenen im System.
            </Alert>

            <TableContainer component={Paper} variant="outlined">
              <Table sx={{ minWidth: 650 }} aria-label="Berechtigungsmatrix">
                <TableHead>
                  <TableRow>
                    <TableCell>Modul</TableCell>
                    <TableCell align="center">Erstellen</TableCell>
                    <TableCell align="center">Lesen</TableCell>
                    <TableCell align="center">Bearbeiten</TableCell>
                    <TableCell align="center">Löschen</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {Object.entries(permissionMatrix).map(([moduleName, actions]) => (
                    <TableRow key={moduleName} hover>
                      <TableCell>
                        {moduleName.charAt(0).toUpperCase() + moduleName.slice(1)}
                      </TableCell>
                      <TableCell align="center">
                        {actions.create !== null ? (
                          <Checkbox
                            checked={rolePermissions.includes(actions.create)}
                            onChange={() => handleTogglePermission(actions.create)}
                            color="primary"
                          />
                        ) : (
                          <Typography variant="body2" color="text.secondary">—</Typography>
                        )}
                      </TableCell>
                      <TableCell align="center">
                        {actions.read !== null ? (
                          <Checkbox
                            checked={rolePermissions.includes(actions.read)}
                            onChange={() => handleTogglePermission(actions.read)}
                            color="primary"
                          />
                        ) : (
                          <Typography variant="body2" color="text.secondary">—</Typography>
                        )}
                      </TableCell>
                      <TableCell align="center">
                        {actions.update !== null ? (
                          <Checkbox
                            checked={rolePermissions.includes(actions.update)}
                            onChange={() => handleTogglePermission(actions.update)}
                            color="primary"
                          />
                        ) : (
                          <Typography variant="body2" color="text.secondary">—</Typography>
                        )}
                      </TableCell>
                      <TableCell align="center">
                        {actions.delete !== null ? (
                          <Checkbox
                            checked={rolePermissions.includes(actions.delete)}
                            onChange={() => handleTogglePermission(actions.delete)}
                            color="primary"
                          />
                        ) : (
                          <Typography variant="body2" color="text.secondary">—</Typography>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}
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
            disabled={!roleName.trim() || loading}
          >
            {loading ? <CircularProgress size={24} /> : (dialogType === 'create' ? 'Erstellen' : 'Speichern')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Benachrichtigungen */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={5000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
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

export default RoleManagement;
