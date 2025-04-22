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
import { Role as RoleType, Permission as PermissionType } from '../../types/user'; // Konflikt 1: HEAD beibehalten
import { roleApi, permissionApi } from '../../utils/api';
import handleApiError from '../../utils/errorHandler';
import ConfirmationDialog from '../../components/ConfirmationDialog';
import AtlasTable, { AtlasColumn } from '../../components/AtlasTable';
import { useAuth } from '../../context/AuthContext'; // Konflikt 2: HEAD beibehalten

// API-Basis-URL (kann entfernt werden, wenn axiosInstance korrekt konfiguriert ist)
// const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

// Konflikt 3: Lokale Typen entfernt (HEAD beibehalten)

interface Module {
  name: string;
  permissions: PermissionType[];
}

interface SnackbarState {
  open: boolean;
  message: string;
  severity: 'success' | 'error' | 'info' | 'warning';
}

interface ActionPermissions {
  create: string | null; // Behält string bei, da permission.id in Matrix als string gespeichert wird
  read: string | null;
  update: string | null;
  delete: string | null;
}

interface PermissionMatrix {
  [module: string]: ActionPermissions;
}

// Styled-Komponenten ... (unverändert)
const StyledTableCell = styled(TableCell)(({ theme }) => ({
  textAlign: 'center',
  padding: theme.spacing(1.5),
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
}));

const PermissionYes = styled('span')(({ theme }) => ({
  fontWeight: 'bold',
  color: theme.palette.success.main,
}));


// Hauptkomponente
const RoleManagement: React.FC = () => {
  // Zustände
  const [roles, setRoles] = useState<RoleType[]>([]); // Konflikt 4: HEAD beibehalten (RoleType)
  const [permissions, setPermissions] = useState<PermissionType[]>([]); // Konflikt 4: HEAD beibehalten (PermissionType)
  const [modules, setModules] = useState<Module[]>([]);
  const [selectedRole, setSelectedRole] = useState<RoleType | null>(null); // Konflikt 4: HEAD beibehalten (RoleType)
  const [rolePermissions, setRolePermissions] = useState<number[]>([]); // Konflikt 4: HEAD beibehalten (number[])
  const [permissionMatrix, setPermissionMatrix] = useState<PermissionMatrix>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [openDialog, setOpenDialog] = useState<boolean>(false);
  const [dialogType, setDialogType] = useState<'create' | 'edit'>('create');
  const [roleName, setRoleName] = useState<string>('');
  const [roleDescription, setRoleDescription] = useState<string>('');
  const [tabValue, setTabValue] = useState<number>(0);
  const [snackbar, setSnackbar] = useState<SnackbarState>({ open: false, message: '', severity: 'success' });
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [roleToDelete, setRoleToDelete] = useState<RoleType | null>(null); // Konflikt 5: HEAD beibehalten (RoleType)

  const { user, isLoading: isAuthLoading } = useAuth(); // Konflikt 6: HEAD beibehalten
  // --- Berechtigungen prüfen ---
  // TODO: Ersetze Set<string> durch tatsächliche Berechtigungsprüfung
  const userPermissions = new Set(user?.permissions || []); // Annahme: user.permissions ist string[]
  const canCreate = true; // userPermissions.has('settings.roles.create');
  const canUpdate = true; // userPermissions.has('settings.roles.update');
  const canDelete = true; // userPermissions.has('settings.roles.delete');
  const canViewPermissions = true; // userPermissions.has('settings.permissions.read');
  const canAssignPermissions = true; // userPermissions.has('settings.roles.assign_permissions');

  // --- Datenladefunktionen --- (useCallback für stabile Referenzen)

  const fetchRoles = useCallback(async () => { // Konflikt 7: Logik aus HEAD beibehalten
    try {
      setLoading(true);
      const response = await roleApi.getAll();
      if (response.success && Array.isArray(response.data)) {
        setRoles(response.data);
      } else {
        throw new Error(response.message || 'Fehler beim Laden der Rollen.');
      }
    } catch (error) {
      const errorMessage = handleApiError(error);
      setSnackbar({ open: true, message: `Fehler beim Laden der Rollen: ${errorMessage}`, severity: 'error' });
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchPermissions = useCallback(async () => {
    if (!canViewPermissions) return;
    try {
      const response = await permissionApi.getAll();
      if (response.success && Array.isArray(response.data)) {
        setPermissions(response.data);
        // Module ableiten
        const moduleMap = new Map<string, PermissionType[]>();
        response.data.forEach((permission) => {
          const moduleName = permission.module || 'Unbekannt';
          if (!moduleMap.has(moduleName)) {
            moduleMap.set(moduleName, []);
          }
          moduleMap.get(moduleName)?.push(permission);
        });
        setModules(Array.from(moduleMap.entries()).map(([name, perms]) => ({ name, permissions: perms })));
      } else {
        throw new Error(response.message || 'Fehler beim Laden der Berechtigungen.');
      }
    } catch (error) {
      const errorMessage = handleApiError(error);
      setSnackbar({ open: true, message: `Fehler beim Laden der Berechtigungen: ${errorMessage}`, severity: 'error' });
    }
  }, [canViewPermissions]);

  const fetchRolePermissions = useCallback(async (roleId: number) => {
    if (!selectedRole) return;
    try {
      setLoading(true);
      const response = await roleApi.getPermissions(roleId);
      if (response.success && Array.isArray(response.data)) {
        const permissionIds = response.data.map((p: PermissionType) => p.id);
        setRolePermissions(permissionIds);
      } else {
        throw new Error(response.message || 'Fehler beim Laden der Rollenberechtigungen.');
      }
    } catch (error) {
      const errorMessage = handleApiError(error);
      setSnackbar({ open: true, message: `Fehler beim Laden der Rollenberechtigungen: ${errorMessage}`, severity: 'error' });
      setRolePermissions([]);
    } finally {
      setLoading(false);
    }
  }, [selectedRole]);

  useEffect(() => {
    if (!isAuthLoading) {
      fetchRoles();
      fetchPermissions();
    }
  }, [isAuthLoading, fetchRoles, fetchPermissions]);

  // Neue useEffect-Hook zum Wiederherstellen der zuletzt ausgewählten Rolle
  useEffect(() => {
    if (roles.length > 0 && !selectedRole) {
      // Versuche, die zuletzt ausgewählte Rollen-ID aus localStorage zu lesen
      const lastSelectedRoleId = localStorage.getItem('lastSelectedRoleId');
      if (lastSelectedRoleId) {
        const roleId = parseInt(lastSelectedRoleId, 10);
        const foundRole = roles.find(role => role.id === roleId);
        if (foundRole) {
          setSelectedRole(foundRole);
        }
      }
    }
  }, [roles, selectedRole]);

  useEffect(() => {
    if (selectedRole) {
      // Speichere die ausgewählte Rollen-ID im localStorage
      localStorage.setItem('lastSelectedRoleId', String(selectedRole.id));
      fetchRolePermissions(selectedRole.id);
    } else {
      setRolePermissions([]);
    }
  }, [selectedRole, fetchRolePermissions]);

  const calculatePermissionMatrix = (allPermissions: PermissionType[], activePermissionIds: number[]): PermissionMatrix => {
    const matrix: PermissionMatrix = {};
    allPermissions.forEach(permission => {
      const moduleName = permission.module || 'Unbekannt';
      const actionName = permission.action || 'unbekannt';
      if (!matrix[moduleName]) {
        matrix[moduleName] = { create: null, read: null, update: null, delete: null };
      }
      const permIdStr = String(permission.id);
      const isActive = activePermissionIds.includes(permission.id);

      if (['create', 'add', 'new'].includes(actionName.toLowerCase())) matrix[moduleName].create = isActive ? permIdStr : null;
      else if (['read', 'view', 'list', 'get', 'select'].includes(actionName.toLowerCase())) matrix[moduleName].read = isActive ? permIdStr : null;
      else if (['update', 'edit', 'set', 'modify', 'change'].includes(actionName.toLowerCase())) matrix[moduleName].update = isActive ? permIdStr : null;
      else if (['delete', 'remove', 'destroy'].includes(actionName.toLowerCase())) matrix[moduleName].delete = isActive ? permIdStr : null;
    });
    return matrix;
  };

  useEffect(() => {
    const newMatrix = calculatePermissionMatrix(permissions, rolePermissions);
    setPermissionMatrix(newMatrix);
  }, [permissions, rolePermissions]);


  // --- Handler ---

  const handleSelectRole = (role: RoleType) => {
    setSelectedRole(role);
    setTabValue(0);
  };

  const handleOpenCreateDialog = () => {
    if (!canCreate) return;
    setDialogType('create');
    setRoleName('');
    setRoleDescription('');
    setRolePermissions([]); // Keine Berechtigungen für neue Rolle vorausgewählt
    setOpenDialog(true);
  };

  const handleOpenEditDialog = (role: RoleType) => {
    if (!canUpdate || !role) return;
    setDialogType('edit');
    setSelectedRole(role); // Wichtig, um die ID für den Speichervorgang zu haben
    setRoleName(role.name);
    setRoleDescription(role.description || '');
    // Bestehende Berechtigungen laden (im useEffect oben bereits erledigt)
    // fetchRolePermissions(role.id); // Wird durch useEffect oben gehandelt
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    // Dialogfelder zurücksetzen und Auswahl aufheben
    setRoleName('');
    setRoleDescription('');
    setSelectedRole(null); // Wichtig, damit der Dialog beim nächsten Öffnen sauber ist
    setRolePermissions([]); // Auch Berechtigungen zurücksetzen
  };

  const handleSaveRole = async () => {
    let isDialogSave = openDialog;

    // Name-Prüfung nur relevant, wenn aus Dialog gespeichert wird
    if (isDialogSave && !roleName.trim()) {
        setSnackbar({ open: true, message: 'Rollenname darf nicht leer sein.', severity: 'warning' });
        return;
    }

    // Stelle sicher, dass eine Rolle ausgewählt ist, wenn nicht aus dem Dialog gespeichert wird
    if (!isDialogSave && !selectedRole) {
      console.error('[handleSaveRole] Speichern ohne ausgewählte Rolle aufgerufen.');
      setSnackbar({ open: true, message: 'Keine Rolle zum Speichern ausgewählt.', severity: 'error' });
      return;
    }

    // TODO: Berechtigungsprüfung verfeinern, falls nötig
    if (!canUpdate && !isDialogSave) { // Einfache Prüfung für das Speichern von Permissions
         setSnackbar({ open: true, message: 'Fehlende Berechtigung zum Aktualisieren der Rolle.', severity: 'error' });
         return;
    }
    if (!canAssignPermissions) {
        // Verhindere das Senden von permissionIds, wenn keine Zuweisungsberechtigung besteht
        console.warn('[handleSaveRole] Keine Berechtigung zum Zuweisen von Permissions.')
        // return; // Optional: Hier abbrechen?
    }


    // Daten zusammenstellen
    const validPermissionIds = rolePermissions.filter(id => typeof id === 'number' && !isNaN(id));
    let roleData: any = {};

    if (isDialogSave) {
      // Daten aus dem Dialog (Name, Beschreibung und Permissions)
      roleData = {
        name: roleName.trim(),
        description: roleDescription.trim() || null,
        // KORREKTER KEY: permissionIds
        permissionIds: canAssignPermissions ? validPermissionIds : undefined,
      };
    } else if (selectedRole) {
      // Daten nur für Berechtigungs-Update (nur permissionIds)
      roleData = {
        // KORREKTER KEY: permissionIds
        permissionIds: validPermissionIds,
      };
       // Optional: Wenn Name/Beschreibung hier *nicht* geändert werden sollen,
       // dann dürfen sie *nicht* im roleData-Objekt sein.
    }

    // DEBUG: Logge die Daten, die gesendet werden
    console.log('[handleSaveRole] Sende folgende Daten an API:', JSON.stringify(roleData));

    setLoading(true);

    try {
        let response;
        // Erstellen immer aus dem Dialog
        if (isDialogSave && dialogType === 'create') {
            if (!canCreate) {
                 setSnackbar({ open: true, message: 'Fehlende Berechtigung zum Erstellen.', severity: 'error' });
                 setLoading(false);
                 return;
            }
            response = await roleApi.create(roleData);
            if (response.success && response.data) {
                setRoles((prevRoles) => [...prevRoles, response.data]);
                setSelectedRole(response.data);
                setSnackbar({ open: true, message: 'Rolle erfolgreich erstellt.', severity: 'success' });
            } else {
                throw new Error(response.message || 'Fehler beim Erstellen der Rolle.');
            }
        } else if (selectedRole?.id) {
             if (!canUpdate) {
                 setSnackbar({ open: true, message: 'Fehlende Berechtigung zum Aktualisieren.', severity: 'error' });
                 setLoading(false);
                 return;
             }
            // Aktualisieren (entweder aus Dialog oder nur Permissions)
            response = await roleApi.update(selectedRole.id, roleData);
            if (response.success && response.data) {
                const message = isDialogSave ? 'Rolle erfolgreich gespeichert.' : 'Berechtigungen erfolgreich gespeichert.';
                setSnackbar({ open: true, message, severity: 'success' });

                const updatedRoleDataFromApi = response.data;
                setRoles((prevRoles) =>
                    prevRoles.map((role) => (role.id === selectedRole.id ? updatedRoleDataFromApi : role))
                );
                setSelectedRole(updatedRoleDataFromApi);
                // Berechtigungen neu laden, um sicherzustellen, dass der State synchron ist
                fetchRolePermissions(selectedRole.id);
            } else {
                throw new Error(response.message || 'Fehler beim Speichern der Rolle.');
            }
        } else {
            // Fall sollte nicht eintreten
             throw new Error('Ungültiger Zustand zum Speichern.');
        }

        if (isDialogSave) {
            handleCloseDialog();
        }

    } catch (error) {
      const errorMessage = handleApiError(error);
      setSnackbar({ open: true, message: `Fehler: ${errorMessage}`, severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDeleteDialog = (role: RoleType) => {
    if (!canDelete || role.is_system) {
        setSnackbar({ open: true, message: 'Systemrollen können nicht gelöscht werden oder Sie haben keine Berechtigung.', severity: 'warning' });
        return;
    };
    setRoleToDelete(role);
    setConfirmDialogOpen(true);
  };

  const handleCloseDeleteDialog = () => {
    setConfirmDialogOpen(false);
    setRoleToDelete(null);
  };

  const handleDeleteRole = async () => {
    if (!roleToDelete || !canDelete || roleToDelete.is_system) {
        handleCloseDeleteDialog();
        setSnackbar({ open: true, message: 'Löschen nicht möglich (Systemrolle, keine Berechtigung oder keine Rolle ausgewählt).', severity: 'error' });
        return;
    }

    setLoading(true); // Ladeindikator starten
    try {
      const response = await roleApi.delete(roleToDelete.id);
      if (response.success) {
        setSnackbar({ open: true, message: 'Rolle erfolgreich gelöscht.', severity: 'success' });
        fetchRoles(); // Rollenliste neu laden
        setSelectedRole(null); // Auswahl aufheben
        setRolePermissions([]); // Berechtigungen leeren
      } else {
        throw new Error(response.message || 'Fehler beim Löschen der Rolle.');
      }
    } catch (error) {
      const errorMessage = handleApiError(error);
      setSnackbar({ open: true, message: `Fehler beim Löschen: ${errorMessage}`, severity: 'error' });
    } finally {
       handleCloseDeleteDialog();
       setLoading(false); // Ladeindikator stoppen
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

 const handlePermissionChange = (permissionId: number, checked: boolean) => {
    if (!canAssignPermissions) {
        setSnackbar({ open: true, message: 'Keine Berechtigung zum Ändern von Berechtigungen.', severity: 'warning' });
        return;
    }

    setRolePermissions(prevPermissions => {
      const newPermissions = checked
        ? [...prevPermissions, permissionId]
        : prevPermissions.filter(id => id !== permissionId);

      // DEBUG: Logge den neuen Berechtigungs-State
      console.log('[handlePermissionChange] Neuer rolePermissions State:', JSON.stringify(newPermissions));
      return newPermissions;
    });
  };

  // Hilfsfunktion, um die Permission-ID für Modul/Aktion zu finden
  const getPermissionForAction = (moduleName: string, actionType: 'create' | 'read' | 'update' | 'delete'): PermissionType | undefined => {
    // Finde die entsprechende ActionPermissions aus der Matrix
    const actionKey = permissionMatrix[moduleName]?.[actionType];
    if (!actionKey) return undefined; // Keine Berechtigung für diese Aktion/Modul in der Matrix gefunden
    // Finde die volle Permission anhand der ID (actionKey ist die permissionId als string)
    return permissions.find(p => String(p.id) === actionKey);
  };

  // --- Spaltendefinition für AtlasTable ---
  const roleColumns: AtlasColumn<RoleType>[] = [
    { dataKey: 'id', label: 'ID', width: 50, numeric: true },
    { dataKey: 'name', label: 'Name', width: 150 },
    { dataKey: 'description', label: 'Beschreibung', width: 300 },
    {
        dataKey: 'is_system',
        label: 'Systemrolle',
        width: 100,
        render: (role) => {
           console.log('[RoleManagement] Rendering role for is_system column:', role);
           return (role && role.is_system ? <Chip label="Ja" color="secondary" size="small" /> : <Chip label="Nein" size="small" />);
        },
    },
    {
        dataKey: 'actions',
        label: 'Aktionen',
        width: 120,
        render: (role) => (
            <Box sx={{ display: 'flex', gap: 0.5 }}>
                 <Tooltip title="Bearbeiten">
                    <span>
                        <IconButton
                            size="small"
                            onClick={(e) => { e.stopPropagation(); handleOpenEditDialog(role); }}
                            disabled={!canUpdate}
                        >
                            <EditIcon fontSize="small" />
                        </IconButton>
                    </span>
                </Tooltip>
                <Tooltip title="Löschen">
                     <span>
                        <IconButton
                            size="small"
                            onClick={(e) => { e.stopPropagation(); handleOpenDeleteDialog(role); }}
                            disabled={!canDelete || role.is_system} // Systemrollen nicht löschbar
                        >
                            <DeleteIcon fontSize="small" />
                        </IconButton>
                    </span>
                </Tooltip>
            </Box>
        ),
    },
];


  // --- JSX Rendering ---
  if (isAuthLoading) {
    return <CircularProgress />; // Zeige Ladeindikator, während Auth-Status geprüft wird
  }

  console.log('[RoleManagement] Roles passed to AtlasTable:', roles);

  return (
    <Box sx={{ p: 3 }}>
      {/* Obere Sektion: Rollenliste - Breite entfernt, mb hinzugefügt */}
      <Paper elevation={3} sx={{ display: 'flex', flexDirection: 'column', mb: 3 }}>
        <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: 1, borderColor: 'divider' }}>
          <Typography variant="h6">Rollen</Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleOpenCreateDialog}
            disabled={!canCreate}
            size="small"
          >
            Neue Rolle
          </Button>
        </Box>
        <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
           <AtlasTable<RoleType>
                columns={roleColumns}
                rows={roles}
                loading={loading}
                onRowClick={handleSelectRole}
                // selectedRowId={selectedRole?.id} // Auskommentiert wegen Linter-Fehler - ggf. anpassen
                // getRowId={(row: RoleType) => row.id} // Ebenfalls auskommentiert
                // Höhe muss hier oder im Container gesetzt werden, nicht 400px fix
                // z.B. über sx={{ height: '100%' }} oder im umgebenden Box-Element
                // tableHeight="calc(100% - 60px)" // Beispiel: Höhe relativ zum Container
            />
        </Box>
      </Paper>

      {/* Untere Sektion: Details & Berechtigungen - Breite entfernt */}
      <Paper elevation={3} sx={{ display: 'flex', flexDirection: 'column' }}>
        {selectedRole ? (
          <>
            <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
              <Typography variant="h6">{selectedRole.name}</Typography>
              <Typography variant="body2" color="text.secondary">{selectedRole.description || 'Keine Beschreibung'}</Typography>
              {selectedRole.is_system && <Chip label="Systemrolle" color="secondary" size="small" sx={{ mt: 1 }} />}
            </Box>
            <Tabs value={tabValue} onChange={handleTabChange} sx={{ borderBottom: 1, borderColor: 'divider' }}>
              <Tab label="Berechtigungen (Matrix)" />
              <Tab label="Berechtigungen (Liste)" disabled={!canViewPermissions}/>
              {/* Weitere Tabs ggf. hier einfügen (z.B. Benutzer dieser Rolle) */}
            </Tabs>

            {/* Tab Panel 0: Berechtigungsmatrix */}
            <Box sx={{ flexGrow: 1, overflow: 'auto', p: 2, display: tabValue === 0 ? 'block' : 'none' }}>
               {loading ? <CircularProgress /> : (
                 <TableContainer component={Paper} sx={{ maxHeight: 'calc(100vh - 350px)' }}> {/* Höhe angepasst */}
                    <Table stickyHeader size="small">
                        <TableHead>
                             <StyledTableRowHeader>
                                <StyledTableCell sx={{ textAlign: 'left', minWidth: 150 }}>Modul</StyledTableCell>
                                <StyledTableCell>Erstellen</StyledTableCell>
                                <StyledTableCell>Lesen</StyledTableCell>
                                <StyledTableCell>Aktualisieren</StyledTableCell>
                                <StyledTableCell>Löschen</StyledTableCell>
                             </StyledTableRowHeader>
                        </TableHead>
                        <TableBody>
                            {/* Iteriere über Module, sortiert nach Namen */}
                            {modules.sort((a, b) => a.name.localeCompare(b.name)).map((module) => {
                                // Finde die spezifischen Berechtigungen für create, read, update, delete innerhalb des Moduls
                                const findPerm = (actionPredicate: (action: string) => boolean): PermissionType | undefined =>
                                    module.permissions.find(p => actionPredicate(p.action.toLowerCase()));

                                const createPerm = findPerm(action => ['create', 'add', 'new'].includes(action));
                                const readPerm = findPerm(action => ['read', 'view', 'list', 'get', 'select'].includes(action));
                                const updatePerm = findPerm(action => ['update', 'edit', 'set', 'modify', 'change'].includes(action));
                                const deletePerm = findPerm(action => ['delete', 'remove', 'destroy'].includes(action));

                                return (
                                    <StyledTableRow key={module.name}>
                                        <TableCell sx={{ textAlign: 'left', fontWeight: 'bold' }}>{module.name}</TableCell>
                                        {/* Erstellen */}
                                        <StyledTableCell>
                                            {createPerm ? (
                                                <Checkbox
                                                    checked={rolePermissions.includes(createPerm.id)}
                                                    onChange={(e) => handlePermissionChange(createPerm.id, e.target.checked)}
                                                    disabled={!canAssignPermissions}
                                                    size="small"
                                                    title={`Berechtigung: ${createPerm.name}`}
                                                />
                                            ) : (
                                                '-' // Keine Berechtigung für diese Aktion im Modul definiert
                                            )}
                                        </StyledTableCell>
                                        {/* Lesen */}
                                        <StyledTableCell>
                                            {readPerm ? (
                                                <Checkbox
                                                    checked={rolePermissions.includes(readPerm.id)}
                                                    onChange={(e) => handlePermissionChange(readPerm.id, e.target.checked)}
                                                    disabled={!canAssignPermissions}
                                                    size="small"
                                                    title={`Berechtigung: ${readPerm.name}`}
                                                />
                                            ) : (
                                                '-'
                                            )}
                                        </StyledTableCell>
                                        {/* Aktualisieren */}
                                        <StyledTableCell>
                                            {updatePerm ? (
                                                <Checkbox
                                                    checked={rolePermissions.includes(updatePerm.id)}
                                                    onChange={(e) => handlePermissionChange(updatePerm.id, e.target.checked)}
                                                    disabled={!canAssignPermissions}
                                                    size="small"
                                                    title={`Berechtigung: ${updatePerm.name}`}
                                                />
                                            ) : (
                                                '-'
                                            )}
                                        </StyledTableCell>
                                        {/* Löschen */}
                                        <StyledTableCell>
                                            {deletePerm ? (
                                                <Checkbox
                                                    checked={rolePermissions.includes(deletePerm.id)}
                                                    onChange={(e) => handlePermissionChange(deletePerm.id, e.target.checked)}
                                                    disabled={!canAssignPermissions}
                                                    size="small"
                                                    title={`Berechtigung: ${deletePerm.name}`}
                                                />
                                            ) : (
                                                '-'
                                            )}
                                        </StyledTableCell>
                                    </StyledTableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </TableContainer>
               )}
            </Box>


            {/* Tab Panel 1: Berechtigungsliste */}
            <Box sx={{ flexGrow: 1, overflow: 'auto', p: 2, display: tabValue === 1 ? 'block' : 'none' }}>
              {loading ? <CircularProgress /> : (
                <Grid container spacing={2}>
                  {modules.map((module) => (
                    <Grid item xs={12} sm={6} md={4} key={module.name}>
                      <Typography variant="subtitle1" gutterBottom>{module.name}</Typography>
                      <Divider sx={{ mb: 1 }} />
                      {module.permissions.map((permission) => (
                        <FormControlLabel
                          key={permission.id}
                          control={
                            <Checkbox
                              checked={rolePermissions.includes(permission.id)}
                              onChange={(e) => handlePermissionChange(permission.id, e.target.checked)}
                              size="small"
                              disabled={!canAssignPermissions}
                            />
                          }
                          label={`${permission.action} (${permission.name})`}
                          sx={{ display: 'block', mb: 0.5 }}
                        />
                      ))}
                    </Grid>
                  ))}
                </Grid>
              )}
            </Box>
             {/* Button zum Speichern der Berechtigungen, für beide Tabs (Matrix und Liste) anzeigen, wenn eine Rolle ausgewählt ist */}
             {selectedRole && canAssignPermissions && (
                 <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider', textAlign: 'right' }}>
                     <Button
                         variant="contained"
                         onClick={handleSaveRole} // Speichert die Rolle mit den aktuell ausgewählten Berechtigungen
                         disabled={loading}
                     >
                         Änderungen an Rolle speichern
                     </Button>
                  </Box>
              )}

          </>
        ) : (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', flexDirection: 'column', color: 'text.secondary' }}>
            <InfoIcon sx={{ fontSize: 40, mb: 1 }} />
            <Typography>Wählen Sie eine Rolle aus der Liste aus, um Details und Berechtigungen anzuzeigen.</Typography>
          </Box>
        )}
      </Paper>

      {/* Dialog zum Erstellen/Bearbeiten */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>{dialogType === 'create' ? 'Neue Rolle erstellen' : 'Rolle bearbeiten'}</DialogTitle>
        <DialogContent>
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
                disabled={loading}
            />
            <TextField
                margin="dense"
                label="Beschreibung"
                type="text"
                fullWidth
                variant="outlined"
                multiline
                rows={3}
                value={roleDescription}
                onChange={(e) => setRoleDescription(e.target.value)}
                disabled={loading}
            />
             {/* Berechtigungsliste im Dialog anzeigen */}
             {canViewPermissions && (
                 <>
                    <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>Berechtigungen</Typography>
                    <Divider sx={{ mb: 2 }}/>
                     <Box sx={{ maxHeight: '40vh', overflowY: 'auto', p: 1, border: 1, borderColor: 'divider', borderRadius: 1 }}>
                        {loading ? <CircularProgress /> : (
                            <Grid container spacing={1}>
                            {modules.map((module) => (
                                <Grid item xs={12} sm={6} md={4} key={`${module.name}-dialog`}>
                                <Typography variant="subtitle2" gutterBottom sx={{fontWeight: 'bold'}}>{module.name}</Typography>
                                <Divider sx={{ mb: 1 }} />
                                {module.permissions.map((permission) => (
                                    <FormControlLabel
                                    key={`${permission.id}-dialog`}
                                    control={
                                        <Checkbox
                                        checked={rolePermissions.includes(permission.id)}
                                        onChange={(e) => handlePermissionChange(permission.id, e.target.checked)}
                                        size="small"
                                        disabled={loading || !canAssignPermissions} // Deaktivieren während Laden oder wenn keine Berechtigung
                                        />
                                    }
                                    label={`${permission.action} (${permission.name})`}
                                    sx={{ display: 'block', fontSize: '0.875rem' }} // Kleinere Schriftgröße für Kompaktheit
                                    />
                                ))}
                                </Grid>
                            ))}
                            </Grid>
                        )}
                    </Box>
                 </>
             )}

        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} disabled={loading}>Abbrechen</Button>
          <Button onClick={handleSaveRole} variant="contained" disabled={loading || !roleName}>
            {loading ? <CircularProgress size={24} /> : 'Speichern'}
          </Button>
        </DialogActions>
      </Dialog>

       {/* Bestätigungsdialog zum Löschen */}
        <ConfirmationDialog
            open={confirmDialogOpen}
            onClose={handleCloseDeleteDialog}
            onConfirm={handleDeleteRole}
            title="Rolle löschen bestätigen"
            message={`Sind Sie sicher, dass Sie die Rolle "${roleToDelete?.name || ''}" löschen möchten? Diese Aktion kann nicht rückgängig gemacht werden.`}
            confirmText="Löschen"
            cancelText="Abbrechen"
        />

      {/* Snackbar für Benachrichtigungen */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default RoleManagement;
