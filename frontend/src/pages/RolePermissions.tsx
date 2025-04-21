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
import AtlasAppBar from '../components/AtlasAppBar';
import AtlasTable, { AtlasColumn } from '../components/AtlasTable';
import { roleApi, permissionApi, ApiResponse } from '../utils/api';
import handleApiError from '../utils/errorHandler';
import { useAuth } from '../context/AuthContext';

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

interface Role {
  id: number;
  name: string;
  description?: string;
  created_at?: string;
  updated_at?: string;
  is_system?: boolean;
}

interface Permission {
  id: number;
  name: string;
  description?: string;
  module?: string;
  action?: string;
}

interface SnackbarState {
  open: boolean;
  message: string;
  severity: 'success' | 'error' | 'info' | 'warning';
}

// Definiere Berechtigungskonstanten
const ROLES_READ = 'roles.read';
const ROLES_CREATE = 'roles.create';
const ROLES_UPDATE = 'roles.update';
const ROLES_DELETE = 'roles.delete';
const ROLES_ASSIGN_PERMISSIONS = 'roles.assign_permissions';

const RolePermissions: React.FC = () => {
  const theme = useTheme();
  const [loading, setLoading] = useState<boolean>(true);
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [assignedPermissionIds, setAssignedPermissionIds] = useState<Set<number>>(new Set());

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

  // Hole Benutzerberechtigungen
  const { user, isLoading: isAuthLoading } = useAuth();
  const userPermissions = user?.permissions || new Set<string>();

  // Erstelle Berechtigungs-Flags
  const canReadRoles = userPermissions.has(ROLES_READ);
  const canCreateRoles = userPermissions.has(ROLES_CREATE);
  const canUpdateRoles = userPermissions.has(ROLES_UPDATE);
  const canDeleteRoles = userPermissions.has(ROLES_DELETE);
  const canAssignPermissions = userPermissions.has(ROLES_ASSIGN_PERMISSIONS);

  // Spalten für die Rollen-Tabelle
  const roleColumns: AtlasColumn<Role>[] = [
    { label: 'ID', dataKey: 'id', numeric: true, width: 70 },
    { label: 'Name', dataKey: 'name', width: 150 },
    { label: 'Beschreibung', dataKey: 'description', width: 300, render: (value) => value || '-' }
  ];

  // Rollen laden
  const fetchRoles = React.useCallback(async () => {
    if (!canReadRoles) {
        setSnackbar({ open: true, message: 'Keine Berechtigung zum Lesen von Rollen.', severity: 'warning' });
        setLoading(false);
        return;
    }
    console.log('[RolePermissions] Setting loading to true in fetchRoles');
    setLoading(true);
    try {
      console.log('[RolePermissions] Lade Rollen...');
      const response = await roleApi.getAll();
      if (response.success && Array.isArray(response.data)) {
        setRoles(response.data);
        console.log('[RolePermissions] Rollen geladen:', response.data);
        // Automatisch die erste Rolle auswählen, wenn noch keine ausgewählt ist
        if (response.data.length > 0 && !selectedRole) {
          // Nur setzen, wenn aktuell keine Rolle ausgewählt ist
          const firstRole = response.data[0];
          setSelectedRole(firstRole);
          console.log('[RolePermissions] Erste Rolle automatisch ausgewählt:', firstRole);
        }
      } else {
        setSnackbar({ open: true, message: response.message || 'Fehler beim Laden der Rollen.', severity: 'error' });
        setRoles([]);
      }
    } catch (error) {
      console.error('Fehler beim Laden der Rollen:', error);
      setSnackbar({ open: true, message: handleApiError(error), severity: 'error' });
      setRoles([]);
    } finally {
      console.log('[RolePermissions] Setting loading to false in fetchRoles finally block');
      setLoading(false);
    }
  }, [canReadRoles, selectedRole]); // Abhängigkeiten hinzugefügt

  // Berechtigungen laden
  const fetchPermissions = React.useCallback(async () => {
    // Keine Berechtigungsprüfung hier nötig, da es nur einmal aufgerufen wird und canReadRoles oben geprüft wird?
    // if (!canReadRoles) return;
    console.log('[RolePermissions] Setting loading to true in fetchPermissions');
    setLoading(true);
    try {
      console.log('[RolePermissions] Lade Berechtigungen...');
      const response = await permissionApi.getAll();
      if (response.success && Array.isArray(response.data)) {
        setPermissions(response.data);
        console.log('[RolePermissions] Berechtigungen geladen:', response.data);
      } else {
        setSnackbar({ open: true, message: response.message || 'Fehler beim Laden der Berechtigungen.', severity: 'error' });
        setPermissions([]);
      }
    } catch (error) {
      console.error('Fehler beim Laden der Berechtigungen:', error);
      setSnackbar({ open: true, message: handleApiError(error), severity: 'error' });
      setPermissions([]);
    } finally {
      console.log('[RolePermissions] Setting loading to false in fetchPermissions finally block');
      setLoading(false);
    }
  }, []); // Keine Abhängigkeiten, da nur einmal geladen

  // Rollen-Berechtigungen laden
  const fetchRolePermissions = React.useCallback(async (roleId: number) => {
    // if (!canReadRoles) return; // Wird schon in fetchRoles geprüft?
    console.log('[RolePermissions] Setting loading to true in fetchRolePermissions');
    setLoading(true);
    setAssignedPermissionIds(new Set()); // Reset beim Laden
    try {
      console.log(`[RolePermissions] Lade Berechtigungen für Rolle ${roleId}...`);
      const response = await roleApi.getPermissions(roleId);
      if (response.success && Array.isArray(response.data)) {
        const permissionIds = response.data.map((perm: Permission) => perm.id);
        setAssignedPermissionIds(new Set(permissionIds));
        console.log(`[RolePermissions] Berechtigungen für Rolle ${roleId} geladen (IDs):`, permissionIds);
      } else {
        setSnackbar({ open: true, message: response.message || 'Fehler beim Laden der Rollenberechtigungen.', severity: 'error' });
      }
    } catch (error) {
      console.error('Fehler beim Laden der Rollenberechtigungen:', error);
      setSnackbar({ open: true, message: handleApiError(error), severity: 'error' });
    } finally {
      console.log('[RolePermissions] Setting loading to false in fetchRolePermissions finally block');
      setLoading(false);
    }
  }, []); // Keine Abhängigkeiten? Hängt von roleId ab, die als Parameter kommt.

  // Neue Rolle erstellen
  const createRole = React.useCallback(async () => {
    if (!canCreateRoles) {
        setSnackbar({ open: true, message: 'Keine Berechtigung zum Erstellen von Rollen.', severity: 'error' });
        return;
    }
    console.log('[RolePermissions] Setting loading to true in createRole');
    setLoading(true);
    try {
      console.log('[RolePermissions] Erstelle Rolle:', { name: roleName, description: roleDescription });
      const response = await roleApi.create({ name: roleName, description: roleDescription });

      if (response.success && response.data) {
        const newRole = response.data;
        setRoles(prevRoles => [...prevRoles, newRole]);
        setSelectedRole(newRole); // Direkt die neue Rolle auswählen
        setSnackbar({ open: true, message: 'Rolle erfolgreich erstellt', severity: 'success' });
        setDialogOpen(false);
        clearRoleForm();
        // fetchRoles(); // Neu laden statt nur hinzufügen?
      } else {
        setSnackbar({ open: true, message: response.message || 'Fehler beim Erstellen der Rolle.', severity: 'error' });
      }
    } catch (error) {
      console.error('Fehler beim Erstellen der Rolle:', error);
      setSnackbar({ open: true, message: handleApiError(error), severity: 'error' });
    } finally {
      console.log('[RolePermissions] Setting loading to false in createRole finally block');
      setLoading(false);
    }
  }, [canCreateRoles, roleName, roleDescription]); // Abhängigkeiten hinzugefügt

  // Rolle aktualisieren
  const updateRole = React.useCallback(async () => {
    if (!selectedRole || !canUpdateRoles) {
        setSnackbar({ open: true, message: 'Keine Berechtigung zum Aktualisieren von Rollen.', severity: 'error' });
        return;
    }
    console.log('[RolePermissions] Setting loading to true in updateRole');
    setLoading(true);
    try {
      console.log(`[RolePermissions] Aktualisiere Rolle ${selectedRole.id}:`, { name: roleName, description: roleDescription });
      const response = await roleApi.update(selectedRole.id, { name: roleName, description: roleDescription });

      if (response.success && response.data) {
        const updatedRole = response.data;
        setRoles(prevRoles => prevRoles.map(role => role.id === selectedRole.id ? updatedRole : role));
        setSelectedRole(updatedRole); // Aktualisierte Rolle auswählen
        setSnackbar({ open: true, message: 'Rolle erfolgreich aktualisiert', severity: 'success' });
        setDialogOpen(false);
        clearRoleForm();
        // fetchRoles(); // Oder neu laden?
      } else {
        setSnackbar({ open: true, message: response.message || 'Fehler beim Aktualisieren der Rolle.', severity: 'error' });
      }
    } catch (error) {
      console.error('Fehler beim Aktualisieren der Rolle:', error);
      setSnackbar({ open: true, message: handleApiError(error), severity: 'error' });
    } finally {
      console.log('[RolePermissions] Setting loading to false in updateRole finally block');
      setLoading(false);
    }
  }, [selectedRole, canUpdateRoles, roleName, roleDescription]); // Abhängigkeiten hinzugefügt

  // Rolle löschen
  const deleteRole = React.useCallback(async (roleId: number) => {
    if (!canDeleteRoles) {
        setSnackbar({ open: true, message: 'Keine Berechtigung zum Löschen von Rollen.', severity: 'error' });
        return;
    }
    const roleToDelete = roles.find(r => r.id === roleId);
    if (!roleToDelete) return;

    // TODO: Confirmation Dialog hinzufügen!
    const confirmDelete = window.confirm(`Möchten Sie die Rolle "${roleToDelete.name}" wirklich löschen?`);
    if (!confirmDelete) return;

    console.log('[RolePermissions] Setting loading to true in deleteRole');
    setLoading(true);
    try {
      console.log(`[RolePermissions] Lösche Rolle ${roleId}...`);
      const response = await roleApi.delete(roleId);

      if (response.success) {
        setRoles(prevRoles => prevRoles.filter(role => role.id !== roleId));

        if (selectedRole && selectedRole.id === roleId) {
          const remainingRoles = roles.filter(role => role.id !== roleId);
          // Wähle die erste verbleibende Rolle oder null
          const nextSelectedRole = remainingRoles.length > 0 ? remainingRoles[0] : null;
          setSelectedRole(nextSelectedRole);
          console.log('[RolePermissions] Nächste Rolle nach Löschen ausgewählt:', nextSelectedRole);
        }

        setSnackbar({ open: true, message: response.message || 'Rolle erfolgreich gelöscht', severity: 'success' });
      } else {
        setSnackbar({ open: true, message: response.message || 'Fehler beim Löschen der Rolle.', severity: 'error' });
      }
    } catch (error) {
      console.error('Fehler beim Löschen der Rolle:', error);
      setSnackbar({ open: true, message: handleApiError(error), severity: 'error' });
    } finally {
      console.log('[RolePermissions] Setting loading to false in deleteRole finally block');
      setLoading(false);
    }
  }, [canDeleteRoles, roles, selectedRole]); // Abhängigkeiten hinzugefügt

  // Berechtigung zu Rolle hinzufügen/entfernen
  const togglePermission = React.useCallback(async (permissionId: number) => {
    if (!selectedRole || !canAssignPermissions) {
        setSnackbar({ open: true, message: 'Keine Berechtigung zum Zuweisen von Berechtigungen.', severity: 'warning' });
        return;
    }
    const roleId = selectedRole.id;

    console.log('[RolePermissions] Setting loading to true in togglePermission');
    setLoading(true);

    // Optimistisches Update: Ändere den State sofort
    const oldPermissionIds = new Set(assignedPermissionIds);
    let newPermissionIdsSet = new Set(oldPermissionIds);
    if (newPermissionIdsSet.has(permissionId)) {
      newPermissionIdsSet.delete(permissionId);
    } else {
      newPermissionIdsSet.add(permissionId);
    }
    setAssignedPermissionIds(newPermissionIdsSet);

    try {
      const newPermissionIdsArray = Array.from(newPermissionIdsSet);
      console.log(`[RolePermissions] Aktualisiere Berechtigungen für Rolle ${roleId} mit IDs:`, newPermissionIdsArray);
      const response = await roleApi.updatePermissions(roleId, newPermissionIdsArray);

      if (response.success) {
        setSnackbar({
          open: true,
          message: 'Berechtigungen erfolgreich aktualisiert',
          severity: 'success'
        });
        // State ist bereits aktuell
      } else {
         // Bei Fehler: Rollback zum alten State
         setAssignedPermissionIds(oldPermissionIds);
         setSnackbar({
           open: true,
           message: response.message || 'Fehler beim Aktualisieren der Berechtigungen. Änderung rückgängig gemacht.',
           severity: 'error'
         });
      }
    } catch (error) {
      // Bei schwerem Fehler: Rollback zum alten State
      setAssignedPermissionIds(oldPermissionIds);
      console.error('Fehler beim Aktualisieren der Berechtigung:', error);
      setSnackbar({
        open: true,
        message: `${handleApiError(error)} Änderung rückgängig gemacht.`,
        severity: 'error'
      });
    } finally {
      console.log('[RolePermissions] Setting loading to false in togglePermission finally block');
      setLoading(false);
    }
  }, [selectedRole, canAssignPermissions, assignedPermissionIds]); // Abhängigkeit assignedPermissionIds hinzugefügt

  // Formular für Rolle leeren
  const clearRoleForm = () => {
    setRoleName('');
    setRoleDescription('');
  };

  // Dialog zum Erstellen einer neuen Rolle öffnen
  const openCreateDialog = () => {
    if (!canCreateRoles) return;
    setDialogMode('create');
    clearRoleForm();
    setDialogOpen(true);
  };

  // Dialog zum Bearbeiten einer Rolle öffnen
  const openEditDialog = (role: Role) => {
    if (!canUpdateRoles) return;
    setDialogMode('edit');
    setSelectedRole(role);
    setRoleName(role.name);
    setRoleDescription(role.description || '');
    setDialogOpen(true);
  };

  // Beim ersten Laden Daten abrufen
  useEffect(() => {
    console.log('[RolePermissions] Initial useEffect running...');
    fetchRoles();
    fetchPermissions();
  }, [fetchRoles, fetchPermissions]); // Korrekte Abhängigkeiten für useCallback

  // Wenn sich die ausgewählte Rolle ändert, Berechtigungen laden
  useEffect(() => {
    if (selectedRole) {
      console.log(`[RolePermissions] Selected role changed: ${selectedRole.id}, fetching permissions...`);
      fetchRolePermissions(selectedRole.id);
    } else {
      // Keine Rolle ausgewählt, Berechtigungsliste leeren
      setAssignedPermissionIds(new Set());
      console.log('[RolePermissions] No role selected, clearing assigned permissions.');
    }
  }, [selectedRole, fetchRolePermissions]); // Korrekte Abhängigkeiten für useCallback

  // Prüfen, ob eine Berechtigung der Rolle zugewiesen ist
  const hasPermission = (permissionId: number) => {
    return assignedPermissionIds.has(permissionId);
  };

  // Berechtigung für ein bestimmtes Modul und eine Aktion finden
  const findPermission = (module: string, action: string) => {
    return permissions.find(p => p.module === module && p.action === action);
  };

  // Snackbar schließen
  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  console.log("[RolePermissions] Rendering component. Loading state:", loading, "Auth loading:", isAuthLoading);

  // Initialer Lade-Check für Authentifizierung
  if (isAuthLoading) {
    console.log("[RolePermissions] Auth is loading, showing spinner.");
    return <Box sx={{ p:3, textAlign: 'center' }}><CircularProgress /></Box>;
  }

  // Haupt-Berechtigungsprüfung für die Seite
  if (!canReadRoles) {
    console.warn("[RolePermissions] User lacks ROLES_READ permission.");
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
        <AtlasAppBar onMenuClick={() => {}} />
        <Box sx={{ p: 3 }}>
          <Alert severity="error">Keine Berechtigung zum Anzeigen der Rollenverwaltung.</Alert>
        </Box>
      </Box>
    );
  }

  // Normales Rendering
  console.log("[RolePermissions] Proceeding with normal render.");
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
                  disabled={!canCreateRoles || loading} // Beachte: `loading` kann hier beide Ladevorgänge meinen
                >
                  Neue Rolle
                </Button>
              </Box>

              <AtlasTable
                columns={roleColumns}
                rows={roles}
                loading={loading} // Zeigt Ladeanzeige in der Tabelle
                heightPx={400}
                emptyMessage="Keine Rollen gefunden"
                onRowClick={(role) => {
                  console.log('[RolePermissions] Role row clicked:', role);
                  setSelectedRole(role);
                }}
                onEdit={canUpdateRoles ? (role) => openEditDialog(role) : undefined}
                onDelete={canDeleteRoles ? (role) => deleteRole(role.id) : undefined}
                // Style für ausgewählte Zeile?
                rowSx={(role) => (
                  selectedRole?.id === role.id ? { backgroundColor: theme.palette.action.selected } : {}
                )}
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

              {loading && !selectedRole ? (
                <Alert severity="info">
                    Lade Rollen und Berechtigungen...
                </Alert>
              ): loading && selectedRole ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                  <CircularProgress />
                </Box>
              ) : !selectedRole ? (
                <Alert severity="info">
                  Bitte wählen Sie eine Rolle aus der Liste links aus, um deren Berechtigungen zu verwalten.
                </Alert>
              ) : (
                <TableContainer>
                  <Table size="small" stickyHeader>
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
                        <TableRow key={module} hover>
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
                                    // ACHTUNG: Checkbox wird deaktiviert, wenn *irgendwas* lädt!
                                    disabled={!canAssignPermissions || loading}
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
            disabled={loading} // Deaktivieren während des Ladens?
          />

          <TextField
            fullWidth
            label="Beschreibung"
            value={roleDescription}
            onChange={(e) => setRoleDescription(e.target.value)}
            margin="normal"
            multiline
            rows={3}
            disabled={loading} // Deaktivieren während des Ladens?
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)} disabled={loading}>
            Abbrechen
          </Button>
          <Button
            onClick={dialogMode === 'create' ? createRole : updateRole}
            variant="contained"
            disabled={!roleName || loading || (dialogMode === 'create' && !canCreateRoles) || (dialogMode === 'edit' && !canUpdateRoles)}
            startIcon={loading ? <CircularProgress size={20} color="inherit" /> : (dialogMode === 'create' ? <AddIcon /> : <SaveIcon />) }
          >
            {/* {loading ? <CircularProgress size={20} /> : (dialogMode === 'create' ? 'Erstellen' : 'Speichern')} */}
            {dialogMode === 'create' ? 'Erstellen' : 'Speichern'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }} // Position
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
          variant="filled" // Füllung für bessere Sichtbarkeit
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default RolePermissions;
