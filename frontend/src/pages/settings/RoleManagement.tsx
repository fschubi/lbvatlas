import React, { useState, useEffect, useContext, useCallback } from 'react';
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
  Info as InfoIcon
} from '@mui/icons-material';
import { styled, useTheme } from '@mui/material/styles';
import axios from 'axios';
import {
  Role as RoleType,
  Permission as PermissionType
} from '../../types/user'; // Importiere die zentralen Typen
import { roleApi, permissionApi } from '../../utils/api';
import handleApiError from '../../utils/errorHandler';
import ConfirmationDialog from '../../components/ConfirmationDialog';
import AtlasTable, { AtlasColumn } from '../../components/AtlasTable';

// API-Basis-URL
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

// Verwende PermissionType für Module
interface Module {
  name: string;
  permissions: PermissionType[];
}

interface SnackbarState {
  open: boolean;
  message: string;
  severity: 'success' | 'error' | 'warning' | 'info';
}

// Typ für die Berechtigungsmatrix (akzeptiert jetzt number | null)
interface ActionPermissions {
  create: number | null;
  read: number | null;
  update: number | null;
  delete: number | null;
}

interface PermissionMatrix {
  [moduleName: string]: ActionPermissions;
}

// Aktualisierte Typ-Definition für API-Antworten
interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
}

// Styled-Komponenten für Matrix
const StyledTableCell = styled(TableCell)(({ theme }) => ({
  textAlign: 'center',
  padding: theme.spacing(1),
  '&.MuiTableCell-head': {
    backgroundColor: theme.palette.primary.dark,
    color: theme.palette.common.white,
    fontWeight: 'bold',
  }
}));

const StyledTableRowHeader = styled(TableRow)(({ theme }) => ({
  backgroundColor: theme.palette.primary.dark,
  '& th': {
    color: theme.palette.common.white,
    fontWeight: 'bold',
  }
}));

const StyledTableRow = styled(TableRow)(({ theme }) => ({
  '&:nth-of-type(odd)': {
    backgroundColor: theme.palette.background.default,
  },
  '&:nth-of-type(even)': {
    backgroundColor: theme.palette.action.hover,
  },
  '&:hover': {
    backgroundColor: theme.palette.action.selected,
  },
  '&:last-child td, &:last-child th': {
    border: 0,
  },
}));

const PermissionYes = styled('span')(({ theme }) => ({
  fontWeight: 'bold',
  color: theme.palette.success.main,
}));

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
  // Zustände (verwenden jetzt importierte Typen)
  const [roles, setRoles] = useState<RoleType[]>([]);
  const [permissions, setPermissions] = useState<PermissionType[]>([]);
  const [modules, setModules] = useState<Module[]>([]);
  const [selectedRole, setSelectedRole] = useState<RoleType | null>(null);
  const [rolePermissions, setRolePermissions] = useState<number[]>([]);
  const [permissionMatrix, setPermissionMatrix] = useState<PermissionMatrix>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [openDialog, setOpenDialog] = useState<boolean>(false);
  const [dialogType, setDialogType] = useState<'create' | 'edit'>('create');
  const [roleName, setRoleName] = useState<string>('');
  const [roleDescription, setRoleDescription] = useState<string>('');
  const [tabValue, setTabValue] = useState<number>(0);
  const [snackbar, setSnackbar] = useState<SnackbarState>({ open: false, message: '', severity: 'success' });
  const [confirmDialogOpen, setConfirmDeleteDialogOpen] = useState(false);
  const [roleToDelete, setRoleToDelete] = useState<RoleType | null>(null);

  // TODO: Berechtigungsprüfung aktivieren
  // const { userPermissions } = usePermissions();
  // const canCreate = userPermissions.includes('roles.create');
  // const canUpdate = userPermissions.includes('roles.update');
  // const canDelete = userPermissions.includes('roles.delete');
  // const canViewPermissions = userPermissions.includes('permissions.read');
  const canCreate = true; // Placeholder
  const canUpdate = true; // Placeholder
  const canDelete = true; // Placeholder
  const canViewPermissions = true; // Placeholder

  // Berechtigungen laden
  const fetchPermissions = useCallback(async () => {
    try {
      const response = await permissionApi.getAll();
      if (response.success && Array.isArray(response.data)) {
         const permissionsData = response.data as PermissionType[];
         setPermissions(permissionsData);
         const moduleMap = new Map<string, PermissionType[]>();
         permissionsData.forEach((permission) => {
            const moduleName = permission.module || 'Unbekannt';
            if (!moduleMap.has(moduleName)) {
               moduleMap.set(moduleName, []);
            }
            moduleMap.get(moduleName)?.push(permission);
         });
         const moduleArray: Module[] = [];
         moduleMap.forEach((perms, moduleName) => {
           moduleArray.push({ name: moduleName, permissions: perms }); // Kein Cast mehr nötig
         });
         moduleArray.sort((a, b) => a.name.localeCompare(b.name));
         setModules(moduleArray);
      } else {
        throw new Error(response.message || 'Fehler beim Laden der Berechtigungen');
      }
    } catch (error) {
      console.error('Fehler beim Laden der Berechtigungen:', error);
      setSnackbar({
        open: true,
        message: `Fehler beim Laden der Berechtigungen: ${handleApiError(error)}`,
        severity: 'error'
      });
      setPermissions([]);
      setModules([]);
    }
  }, []);

  // Rollen laden
  const fetchRoles = useCallback(async () => {
    setLoading(true);
    try {
      const response = await roleApi.getAll();
      if (response.success && Array.isArray(response.data)) {
        setRoles(response.data);
      } else {
        throw new Error(response.message || 'Fehler beim Laden der Rollen: Ungültige Datenstruktur.');
      }
    } catch (error) {
      console.error('Fehler beim Laden der Rollen:', error);
      setSnackbar({
        open: true,
        message: `Fehler beim Laden der Rollen: ${handleApiError(error)}`,
        severity: 'error'
      });
      setRoles([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Rollenberechtigungen laden
  const fetchRolePermissions = useCallback(async (roleId: number) => {
    try {
      const response = await roleApi.getPermissions(roleId);
      if (response.success && Array.isArray(response.data)) {
        const permissionIds = response.data.map((p: PermissionType) => p.id);
        setRolePermissions(permissionIds);
        createPermissionMatrix(response.data); // Jetzt PermissionType übergeben
      } else {
        throw new Error(response.message || 'Fehler beim Laden der Rollenberechtigungen.');
      }
    } catch (error) {
        console.error(`Fehler beim Laden der Berechtigungen für Rolle ${roleId}:`, error);
         setSnackbar({
            open: true,
            message: `Fehler beim Laden der Rollenberechtigungen: ${handleApiError(error)}`,
            severity: 'error'
        });
        setRolePermissions([]);
        setPermissionMatrix({}); // Matrix auch zurücksetzen
    }
  }, []); // createPermissionMatrix als Abhängigkeit?

   // Berechtigungsmatrix erstellen (nimmt jetzt PermissionType[])
   const createPermissionMatrix = useCallback((currentRolePermissions: PermissionType[]) => {
    const matrix: PermissionMatrix = {};
    permissions.forEach(permission => {
      const moduleName = permission.module || 'Unbekannt';
      const actionName = permission.action || 'unbekannt';
      if (!matrix[moduleName]) {
        matrix[moduleName] = { create: null, read: null, update: null, delete: null };
      }
      // Weisen Sie die ID der Berechtigung der entsprechenden Aktion im Matrixobjekt zu.
      if (['create', 'add'].includes(actionName)) matrix[moduleName].create = permission.id;
      else if (['read', 'view', 'list', 'get'].includes(actionName)) matrix[moduleName].read = permission.id;
      else if (['update', 'edit', 'set'].includes(actionName)) matrix[moduleName].update = permission.id;
      else if (['delete', 'remove'].includes(actionName)) matrix[moduleName].delete = permission.id;
    });
    setPermissionMatrix(matrix);
  }, [permissions]); // Hängt von allen Berechtigungen ab

  // --- UseEffects --- (ans Ende verschoben)
  useEffect(() => {
    fetchPermissions();
    fetchRoles();
  }, [fetchPermissions, fetchRoles]);

  useEffect(() => {
    if (selectedRole) {
        fetchRolePermissions(selectedRole.id);
    } else {
        setRolePermissions([]);
        setPermissionMatrix({}); // Matrix zurücksetzen
    }
  }, [selectedRole, fetchRolePermissions]);

  useEffect(() => {
    // Erstelle die Matrix neu, wenn sich die allgemeinen Berechtigungen ändern
    // oder wenn sich die Berechtigungen der ausgewählten Rolle ändern
    const currentPermissions = permissions.filter(p => rolePermissions.includes(p.id));
    createPermissionMatrix(currentPermissions);
  }, [permissions, rolePermissions, createPermissionMatrix]);

  // --- Handler --- (verwenden jetzt RoleType)
  const handleSelectRole = (role: RoleType) => {
    setSelectedRole(role);
    setTabValue(0);
  };

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleOpenDialog = (type: 'create' | 'edit', role?: RoleType) => {
    setDialogType(type);
    if (type === 'edit' && role) {
      setSelectedRole(role);
      setRoleName(role.name);
      setRoleDescription(role.description || '');
    } else {
      setSelectedRole(null);
      setRoleName('');
      setRoleDescription('');
      setRolePermissions([]);
    }
    setOpenDialog(true);
    setTabValue(0);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
  };

  // Rolle erstellen/aktualisieren (zusammengefasst)
  const handleSaveRole = async () => {
    const roleData = { name: roleName.trim(), description: roleDescription.trim() };
    if (!roleData.name) {
        setSnackbar({ open: true, message: 'Rollenname darf nicht leer sein.', severity: 'warning' });
        return;
    }

    setLoading(true);
    try {
        let response;
        if (dialogType === 'edit' && selectedRole) {
            response = await roleApi.update(selectedRole.id, roleData);
        } else {
            response = await roleApi.create(roleData);
        }

        if (response.success) {
            setSnackbar({ open: true, message: `Rolle "${roleData.name}" ${dialogType === 'edit' ? 'aktualisiert' : 'erstellt'}.`, severity: 'success' });
            handleCloseDialog();
            await fetchRoles();
            // Optional: Neue/aktualisierte Rolle auswählen?
        } else {
            throw new Error(response.message || 'Fehler beim Speichern der Rolle.');
        }
    } catch (error) {
         setSnackbar({ open: true, message: `Fehler: ${handleApiError(error)}`, severity: 'error' });
    } finally {
        setLoading(false);
    }
  };

  const handleDeleteRequest = (role: RoleType) => {
    // if (role.isSystem) { // isSystem kommt aus der DB?
    //     setSnackbar({ open: true, message: 'Systemrollen können nicht gelöscht werden.', severity: 'warning' });
    //     return;
    // }
    setRoleToDelete(role);
    setConfirmDeleteDialogOpen(true);
  };

  const handleCloseConfirmDialog = () => {
    setConfirmDeleteDialogOpen(false);
    setRoleToDelete(null);
  };

  const executeDelete = async () => {
    if (!roleToDelete) return;
    const roleIdToDelete = roleToDelete.id; // ID ist number

    try {
      const response = await roleApi.delete(roleIdToDelete);
      if (response.success) {
        setSnackbar({
          open: true,
          message: response.message || `Rolle "${roleToDelete.name}" erfolgreich gelöscht.`,
          severity: 'success'
        });
        await fetchRoles();
        setSelectedRole(null);
      } else {
        throw new Error(response.message || 'Fehler beim Löschen der Rolle.');
      }
    } catch (error) {
      setSnackbar({
        open: true,
        message: `Fehler beim Löschen der Rolle: ${handleApiError(error)}`,
        severity: 'error'
      });
    } finally {
      handleCloseConfirmDialog();
    }
  };

  const handleTogglePermission = async (permissionId: number | null) => {
        if (!selectedRole || permissionId === null) return;
        const currentPermissionIds = new Set(rolePermissions);
        const wasEnabled = currentPermissionIds.has(permissionId); // Status VOR dem Umschalten prüfen
        let updatedPermissionIds: number[];
        if (wasEnabled) {
            currentPermissionIds.delete(permissionId);
            updatedPermissionIds = Array.from(currentPermissionIds);
        } else {
            currentPermissionIds.add(permissionId);
            updatedPermissionIds = Array.from(currentPermissionIds);
        }
        try {
            const response = await roleApi.updatePermissions(selectedRole.id, updatedPermissionIds);
            if (response.success) {
                setRolePermissions(updatedPermissionIds);
                setSnackbar({
                    open: true,
                    message: `Berechtigung ${wasEnabled ? 'entfernt' : 'hinzugefügt'}.`,
                    severity: 'success'
                });
            } else {
                 throw new Error(response.message || 'Fehler beim Aktualisieren der Berechtigungen.');
            }
        } catch (error) {
            console.error('Fehler beim Umschalten der Berechtigung:', error);
            setSnackbar({
                open: true,
                message: `Fehler: ${handleApiError(error)}`,
                severity: 'error'
            });
        }
    };

  const handleCloseSnackbar = () => {
    setSnackbar((prev) => ({ ...prev, open: false }));
  };

  // --- Spalten --- (verwenden RoleType)
  const roleColumns: AtlasColumn<RoleType>[] = [
    { label: 'Name', dataKey: 'name', width: 250, sortable: true },
    { label: 'Beschreibung', dataKey: 'description', width: 400, sortable: true, render: (value) => value || '-' },
    { label: 'Systemrolle?', dataKey: 'isSystem', width: 120, sortable: true, render: (value) => (value ? <Chip label="Ja" size="small" color="info" /> : <Chip label="Nein" size="small" />) },
    { label: 'Erstellt am', dataKey: 'createdAt', width: 180, sortable: true, render: (value) => value ? new Date(value).toLocaleString('de-DE') : '-' },
    {
      label: 'Aktionen',
      dataKey: 'actions',
      width: 120,
      render: (_, row) => (
        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Tooltip title="Bearbeiten">
            <span>
              <IconButton size="small" onClick={(e) => { e.stopPropagation(); handleOpenDialog('edit', row); }} disabled={!canUpdate || row.isSystem}>
                <EditIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title="Löschen">
            <span>
              <IconButton size="small" onClick={(e) => { e.stopPropagation(); handleDeleteRequest(row); }} disabled={!canDelete || row.isSystem}>
                <DeleteIcon fontSize="small" color="error" />
              </IconButton>
            </span>
          </Tooltip>
        </Box>
      )
    }
  ];

   const findPermissionId = (module: string, action: string): number | null => {
        const moduleActions = permissionMatrix[module];
        return moduleActions ? moduleActions[action as keyof ActionPermissions] : null;
    };


  // --- JSX --- //
  return (
    <Box sx={{ p: 3 }}>
      <Paper elevation={3} sx={{ p: 2, mb: 3, display: 'flex', alignItems: 'center' }}>
        <InfoIcon sx={{ fontSize: 32, mr: 2, color: 'primary.main' }} />
        <Typography variant="h4" component="h1">Benutzerrollen verwalten</Typography>
      </Paper>

       <Box sx={{ mb: 3 }}>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog('create')}
          disabled={!canCreate}
        >
          Neue Rolle erstellen
        </Button>
      </Box>

       <Paper elevation={3} sx={{ mb: 3, overflow: 'hidden' }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <AtlasTable
            columns={roleColumns}
            rows={roles}
            loading={loading}
            onRowClick={handleSelectRole}
            heightPx={400} // Beispielhöhe
            stickyHeader
            initialSortColumn="name"
            initialSortDirection="asc"
            emptyMessage="Keine Rollen verfügbar."
          />
        )}
      </Paper>

      {selectedRole && (
        <Paper elevation={3} sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Details für Rolle: {selectedRole.name}
          </Typography>
           <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
             {selectedRole.description || 'Keine Beschreibung vorhanden.'}
          </Typography>
          <Divider sx={{ mb: 2 }} />

          <Typography variant="h6" gutterBottom>
            Berechtigungen für Rolle: {selectedRole.name}
          </Typography>

          <TableContainer component={Paper} variant="outlined">
            <Table stickyHeader size="small">
              <TableHead>
                <StyledTableRowHeader>
                  <StyledTableCell>Modul</StyledTableCell>
                  <StyledTableCell>Erstellen</StyledTableCell>
                  <StyledTableCell>Lesen</StyledTableCell>
                  <StyledTableCell>Bearbeiten</StyledTableCell>
                  <StyledTableCell>Löschen</StyledTableCell>
                </StyledTableRowHeader>
              </TableHead>
              <TableBody>
                {modules.map((module) => {
                  const modPerms = permissionMatrix[module.name] || { create: null, read: null, update: null, delete: null };
                  return (
                    <StyledTableRow key={module.name}>
                      <TableCell component="th" scope="row">{module.name}</TableCell>
                      <StyledTableCell>
                        {modPerms.create !== null ? (
                          <Checkbox
                            checked={rolePermissions.includes(modPerms.create)}
                            onChange={() => handleTogglePermission(modPerms.create)}
                            disabled={!canUpdate || selectedRole.isSystem}
                            size="small"
                            color="success"
                          />
                        ) : (
                          <Typography variant="caption" color="text.disabled">-</Typography>
                        )}
                      </StyledTableCell>
                       <StyledTableCell>
                        {modPerms.read !== null ? (
                          <Checkbox
                            checked={rolePermissions.includes(modPerms.read)}
                            onChange={() => handleTogglePermission(modPerms.read)}
                            disabled={!canUpdate || selectedRole.isSystem}
                             size="small"
                             color="primary"
                          />
                        ) : (
                          <Typography variant="caption" color="text.disabled">-</Typography>
                        )}
                      </StyledTableCell>
                       <StyledTableCell>
                        {modPerms.update !== null ? (
                          <Checkbox
                            checked={rolePermissions.includes(modPerms.update)}
                            onChange={() => handleTogglePermission(modPerms.update)}
                            disabled={!canUpdate || selectedRole.isSystem}
                             size="small"
                             color="warning"
                          />
                        ) : (
                          <Typography variant="caption" color="text.disabled">-</Typography>
                        )}
                      </StyledTableCell>
                       <StyledTableCell>
                        {modPerms.delete !== null ? (
                          <Checkbox
                            checked={rolePermissions.includes(modPerms.delete)}
                            onChange={() => handleTogglePermission(modPerms.delete)}
                            disabled={!canUpdate || selectedRole.isSystem}
                             size="small"
                             color="error"
                          />
                        ) : (
                          <Typography variant="caption" color="text.disabled">-</Typography>
                        )}
                      </StyledTableCell>
                    </StyledTableRow>
                  );
                })}
                 {modules.length === 0 && !loading && (
                    <TableRow>
                        <TableCell colSpan={5} align="center">Keine Berechtigungen definiert.</TableCell>
                    </TableRow>
                 )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      {/* Dialog zum Erstellen/Bearbeiten */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
         <DialogTitle>{dialogType === 'create' ? 'Neue Rolle erstellen' : `Rolle bearbeiten: ${roleName}`}</DialogTitle>
        <DialogContent dividers>
          <TextField
            autoFocus
            margin="dense"
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
            label="Beschreibung (optional)"
            type="text"
            fullWidth
            variant="outlined"
            multiline
            rows={3}
            value={roleDescription}
            onChange={(e) => setRoleDescription(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} disabled={loading}>Abbrechen</Button>
          <Button onClick={handleSaveRole} variant="contained" color="primary" disabled={loading || !roleName.trim()}>
             {loading ? <CircularProgress size={24} /> : 'Speichern'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Bestätigungsdialog Löschen */}
      <ConfirmationDialog
        open={confirmDialogOpen}
        onClose={handleCloseConfirmDialog}
        onConfirm={executeDelete}
        title="Rolle löschen?"
        message={`Möchten Sie die Rolle "${roleToDelete?.name}" wirklich löschen? Zugehörige Benutzerberechtigungen gehen verloren.`}
        confirmText="Löschen"
      />

      {/* Snackbar */}
       <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }} variant="filled">
          {snackbar.message}
        </Alert>
      </Snackbar>

    </Box>
  );
};

export default RoleManagement;
