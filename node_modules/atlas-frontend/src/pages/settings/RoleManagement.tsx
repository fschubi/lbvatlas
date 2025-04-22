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
<<<<<<< HEAD
import { Role as RoleType, Permission as PermissionType } from '../../types/user'; // Korrekte Typen importieren
import { roleApi, permissionApi } from '../../utils/api';
=======
import { Role as RoleType } from '../../types/user'; // Assuming types exist
import { roleApi, permissionApi } from '../../utils/api'; // Assuming API utility
>>>>>>> parent of beb137d8 (rollen und gruppen Verwaltung live)
import handleApiError from '../../utils/errorHandler';
import ConfirmationDialog from '../../components/ConfirmationDialog'; // Import the dialog
import AtlasTable, { AtlasColumn } from '../../components/AtlasTable';
import { useAuth } from '../../context/AuthContext';

// API-Basis-URL (kann entfernt werden, wenn axiosInstance korrekt konfiguriert ist)
// const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

// Typen (verwende importierte Typen)
// interface Role { ... } // Entfernt
// interface Permission { ... } // Entfernt

<<<<<<< HEAD
=======
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

>>>>>>> parent of beb137d8 (rollen und gruppen Verwaltung live)
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

// Typ für API-Antwort (kann in api.ts zentralisiert werden)
// interface ApiResponse<T = any> { ... }

// Styled-Komponenten für Matrix
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
<<<<<<< HEAD
  const [roles, setRoles] = useState<RoleType[]>([]); // Verwende RoleType
  const [permissions, setPermissions] = useState<PermissionType[]>([]); // Verwende PermissionType
  const [modules, setModules] = useState<Module[]>([]); // Verwendet PermissionType intern
  const [selectedRole, setSelectedRole] = useState<RoleType | null>(null); // Verwende RoleType
  const [rolePermissions, setRolePermissions] = useState<number[]>([]); // Annahme: Backend gibt IDs als number[] zurück?
=======
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [modules, setModules] = useState<Module[]>([]);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [rolePermissions, setRolePermissions] = useState<string[]>([]);
>>>>>>> parent of beb137d8 (rollen und gruppen Verwaltung live)
  const [permissionMatrix, setPermissionMatrix] = useState<PermissionMatrix>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [openDialog, setOpenDialog] = useState<boolean>(false);
  const [dialogType, setDialogType] = useState<'create' | 'edit'>('create');
  const [roleName, setRoleName] = useState<string>('');
  const [roleDescription, setRoleDescription] = useState<string>('');
  const [tabValue, setTabValue] = useState<number>(0);
<<<<<<< HEAD
  const [snackbar, setSnackbar] = useState<SnackbarState>({ open: false, message: '', severity: 'success' });
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [roleToDelete, setRoleToDelete] = useState<RoleType | null>(null); // Verwende RoleType
=======
  const [snackbar, setSnackbar] = useState<SnackbarState>({
    open: false,
    message: '',
    severity: 'success'
  });
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [roleToDelete, setRoleToDelete] = useState<Role | null>(null);
>>>>>>> parent of beb137d8 (rollen und gruppen Verwaltung live)

  const { user, isLoading: isAuthLoading } = useAuth();
  // --- Berechtigungen prüfen ---
  // TODO: Ersetze Set<string> durch tatsächliche Berechtigungsprüfung
  const userPermissions = new Set(user?.permissions || []); // Annahme: user.permissions ist string[]
  const canCreate = true; // userPermissions.has('settings.roles.create');
  const canUpdate = true; // userPermissions.has('settings.roles.update');
  const canDelete = true; // userPermissions.has('settings.roles.delete');
  const canViewPermissions = true; // userPermissions.has('settings.permissions.read');
  const canAssignPermissions = true; // userPermissions.has('settings.roles.assign_permissions');

<<<<<<< HEAD
  // --- Datenladefunktionen --- (useCallback für stabile Referenzen)

  const fetchRoles = useCallback(async () => {
    try {
      setLoading(true);
      const response = await roleApi.getAll(); // Verwende roleApi
      if (response.success && Array.isArray(response.data)) {
        setRoles(response.data);
      } else {
        throw new Error(response.message || 'Fehler beim Laden der Rollen.');
=======
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
>>>>>>> parent of beb137d8 (rollen und gruppen Verwaltung live)
      }

      setRoles(response.data.data || []);
    } catch (error) {
      console.error('Fehler beim Laden der Rollen:', error);
<<<<<<< HEAD
      setSnackbar({ open: true, message: `Fehler beim Laden der Rollen: ${handleApiError(error)}`, severity: 'error' });
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchPermissions = useCallback(async () => {
    if (!canViewPermissions) return; // Frühzeitiger Ausstieg, wenn keine Berechtigung
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
      console.error('Fehler beim Laden der Berechtigungen:', error);
      setSnackbar({ open: true, message: `Fehler beim Laden der Berechtigungen: ${handleApiError(error)}`, severity: 'error' });
    }
  }, [canViewPermissions]);

  const fetchRolePermissions = useCallback(async (roleId: number) => {
    if (!selectedRole) return;
    try {
      setLoading(true);
      const response = await roleApi.getPermissions(roleId);
      if (response.success && Array.isArray(response.data)) {
        const permissionIds = response.data.map((p: PermissionType) => p.id);
        setRolePermissions(permissionIds); // Setze die IDs (number[])
      } else {
        throw new Error(response.message || 'Fehler beim Laden der Rollenberechtigungen.');
      }
    } catch (error) {
      console.error(`Fehler beim Laden der Berechtigungen für Rolle ${roleId}:`, error);
      setSnackbar({ open: true, message: `Fehler beim Laden der Rollenberechtigungen: ${handleApiError(error)}`, severity: 'error' });
      setRolePermissions([]);
    } finally {
      setLoading(false);
    }
  }, [selectedRole]); // Abhängigkeit von selectedRole

  // --- useEffect Hooks ---

  useEffect(() => {
    if (!isAuthLoading) {
      fetchRoles();
      fetchPermissions();
    }
  }, [isAuthLoading, fetchRoles, fetchPermissions]);

  useEffect(() => {
    if (selectedRole) {
      fetchRolePermissions(selectedRole.id);
    } else {
      setRolePermissions([]); // Zurücksetzen, wenn keine Rolle ausgewählt ist
    }
  }, [selectedRole, fetchRolePermissions]);

  // Berechnungsfunktion für die Matrix (kein useCallback nötig, wenn nur hier verwendet)
  const calculatePermissionMatrix = (allPermissions: PermissionType[], activePermissionIds: number[]): PermissionMatrix => {
    const matrix: PermissionMatrix = {};
    allPermissions.forEach(permission => {
      const moduleName = permission.module || 'Unbekannt';
      const actionName = permission.action || 'unbekannt';
      if (!matrix[moduleName]) {
        matrix[moduleName] = { create: null, read: null, update: null, delete: null };
      }
      const permIdStr = String(permission.id); // ID ist string?
      const isActive = activePermissionIds.includes(permission.id);

      if (['create', 'add'].includes(actionName)) matrix[moduleName].create = isActive ? permIdStr : null;
      else if (['read', 'view', 'list', 'get'].includes(actionName)) matrix[moduleName].read = isActive ? permIdStr : null;
      else if (['update', 'edit', 'set'].includes(actionName)) matrix[moduleName].update = isActive ? permIdStr : null;
      else if (['delete', 'remove'].includes(actionName)) matrix[moduleName].delete = isActive ? permIdStr : null;
    });
    return matrix;
  };

  useEffect(() => {
    // Erstelle die Matrix neu, wenn sich allgemeine Berechtigungen oder Rollenberechtigungen ändern
    const newMatrix = calculatePermissionMatrix(permissions, rolePermissions);
    setPermissionMatrix(newMatrix);
  }, [permissions, rolePermissions]);


  // --- Handler ---

  const handleSelectRole = (role: RoleType) => {
    setSelectedRole(role);
    setTabValue(0); // Zum ersten Tab wechseln
=======
      setSnackbar({
        open: true,
        message: 'Fehler beim Laden der Rollen: Verbindungsproblem',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
>>>>>>> parent of beb137d8 (rollen und gruppen Verwaltung live)
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
<<<<<<< HEAD
      setSelectedRole(role); // Setze selectedRole für Bearbeiten
=======
>>>>>>> parent of beb137d8 (rollen und gruppen Verwaltung live)
      setRoleName(role.name);
      setRoleDescription(role.description || '');
      setSelectedRole(role);
    } else {
<<<<<<< HEAD
      setSelectedRole(null); // Kein selectedRole für Erstellen
=======
>>>>>>> parent of beb137d8 (rollen und gruppen Verwaltung live)
      setRoleName('');
      setRoleDescription('');
    }
    setOpenDialog(true);
  };

  // Dialog schließen
  const handleCloseDialog = () => {
    setOpenDialog(false);
    // Felder zurücksetzen
    setRoleName('');
    setRoleDescription('');
    setSelectedRole(null); // Auch selectedRole zurücksetzen
  };

<<<<<<< HEAD
  const handleDialogAction = async () => {
    if (dialogType === 'create') {
      if (!canCreate) return; // Berechtigungsprüfung
      try {
        const response = await roleApi.create({ name: roleName, description: roleDescription });
        if (response.success) {
          setSnackbar({ open: true, message: 'Rolle erfolgreich erstellt', severity: 'success' });
          fetchRoles(); // Liste neu laden
          handleCloseDialog();
        } else {
          throw new Error(response.message || 'Fehler beim Erstellen der Rolle.');
        }
      } catch (error) {
        console.error('Fehler beim Erstellen der Rolle:', error);
        setSnackbar({ open: true, message: `Fehler beim Erstellen: ${handleApiError(error)}`, severity: 'error' });
      }
    } else if (dialogType === 'edit' && selectedRole) {
      if (!canUpdate) return; // Berechtigungsprüfung
      try {
        const response = await roleApi.update(selectedRole.id, { name: roleName, description: roleDescription });
        if (response.success) {
          setSnackbar({ open: true, message: 'Rolle erfolgreich aktualisiert', severity: 'success' });
          fetchRoles(); // Liste neu laden
          handleCloseDialog();
        } else {
          throw new Error(response.message || 'Fehler beim Aktualisieren der Rolle.');
        }
      } catch (error) {
        console.error('Fehler beim Aktualisieren der Rolle:', error);
        setSnackbar({ open: true, message: `Fehler beim Aktualisieren: ${handleApiError(error)}`, severity: 'error' });
      }
    }
  };

  const handleDeleteRequest = (role: RoleType) => {
    if (!canDelete || role.is_system) return; // Systemrollen nicht löschen
    setRoleToDelete(role);
    setConfirmDialogOpen(true);
  };

  const handleCloseConfirmDialog = () => {
    setConfirmDialogOpen(false);
    setRoleToDelete(null);
=======
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
  const handleDeleteRequest = (role: Role) => {
    if (role.name.toLowerCase() === 'admin' || role.name.toLowerCase() === 'superadmin') {
       setSnackbar({ open: true, message: 'Die Admin/Superadmin-Rolle kann nicht gelöscht werden.', severity: 'warning' });
       return;
    }
    setRoleToDelete(role);
    setConfirmDialogOpen(true);
>>>>>>> parent of beb137d8 (rollen und gruppen Verwaltung live)
  };

  // Step 2: Actual delete logic
  const executeDelete = async () => {
<<<<<<< HEAD
    if (!roleToDelete || !canDelete) return;
    try {
      const response = await roleApi.delete(roleToDelete.id);
      if (response.success) {
        setSnackbar({ open: true, message: 'Rolle erfolgreich gelöscht', severity: 'success' });
        fetchRoles(); // Liste neu laden
        if (selectedRole?.id === roleToDelete.id) {
            setSelectedRole(null); // Auswahl aufheben, wenn die ausgewählte Rolle gelöscht wurde
        }
      } else {
        throw new Error(response.message || 'Fehler beim Löschen der Rolle.');
=======
    if (!roleToDelete) return;

    setConfirmDialogOpen(false); // Close dialog first
    const roleIdToDelete = roleToDelete.id;
    const roleName = roleToDelete.name; // Store name

    try {
      setLoading(true);
      // Assuming rolesApi.delete exists and takes an ID
      await roleApi.delete(roleIdToDelete);

      const updatedRoles = roles.filter(role => role.id !== roleIdToDelete);
      setRoles(updatedRoles);

      // If the deleted role was selected, select the first remaining role or null
      if (selectedRole?.id === roleIdToDelete) {
        setSelectedRole(updatedRoles.length > 0 ? updatedRoles[0] : null);
        // Optionally reset tab value if applicable
        // setTabValue(0);
>>>>>>> parent of beb137d8 (rollen und gruppen Verwaltung live)
      }

      setSnackbar({
        open: true,
        message: `Rolle "${roleName}" erfolgreich gelöscht.`,
        severity: 'success'
      });

    } catch (error) {
      console.error('Fehler beim Löschen der Rolle:', error);
<<<<<<< HEAD
      setSnackbar({ open: true, message: `Fehler beim Löschen: ${handleApiError(error)}`, severity: 'error' });
=======
      setSnackbar({
        open: true,
        message: `Fehler beim Löschen der Rolle: ${handleApiError(error)}`,
        severity: 'error'
      });
>>>>>>> parent of beb137d8 (rollen und gruppen Verwaltung live)
    } finally {
      setLoading(false);
      setRoleToDelete(null); // Clear the role to delete
    }
  };

<<<<<<< HEAD
  const handleTogglePermission = async (permissionId: number | null) => {
    if (!selectedRole || !canAssignPermissions || permissionId === null) return;

    const currentPermissionIds = new Set(rolePermissions);
    let updatedPermissionIds: number[];

    if (currentPermissionIds.has(permissionId)) {
      // Berechtigung entfernen
      updatedPermissionIds = rolePermissions.filter(id => id !== permissionId);
    } else {
      // Berechtigung hinzufügen
      updatedPermissionIds = [...rolePermissions, permissionId];
    }

    try {
      setLoading(true); // Ladeanzeige für das Speichern
      const response = await roleApi.updatePermissions(selectedRole.id, updatedPermissionIds);
      if (response.success) {
        setSnackbar({ open: true, message: 'Berechtigungen erfolgreich aktualisiert', severity: 'success' });
        setRolePermissions(updatedPermissionIds); // Lokalen Zustand aktualisieren
      } else {
        throw new Error(response.message || 'Fehler beim Aktualisieren der Berechtigungen.');
      }
    } catch (error) {
      console.error('Fehler beim Aktualisieren der Berechtigungen:', error);
      setSnackbar({ open: true, message: `Fehler beim Speichern der Berechtigungen: ${handleApiError(error)}`, severity: 'error' });
      // Zustand nicht ändern bei Fehler
    } finally {
        setLoading(false);
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  // --- Spaltendefinition für AtlasTable ---
  const columns: AtlasColumn<RoleType>[] = [
    { dataKey: 'name', label: 'Name', width: 150 },
    { dataKey: 'description', label: 'Beschreibung', width: 300 },
    {
      dataKey: 'is_system',
      label: 'Systemrolle',
      width: 100,
      render: (value) => (value ? <Chip label="Ja" color="secondary" size="small" /> : <Chip label="Nein" size="small" />),
    },
    { dataKey: 'userCount', label: 'Benutzer', numeric: true, width: 80 },
    {
        dataKey: 'actions',
        label: 'Aktionen',
        width: 120,
        render: (_, row) => (
            <Box sx={{ display: 'flex', gap: 0.5 }}>
                 <Tooltip title="Bearbeiten">
                    <IconButton
                        size="small"
                        onClick={() => handleOpenDialog('edit', row)}
                        disabled={!canUpdate || row.is_system}
                    >
                        <EditIcon fontSize="small" />
                    </IconButton>
                </Tooltip>
                 <Tooltip title="Löschen">
                    <span> {/* Span für Tooltip bei disabled Button */}
                      <IconButton
                          size="small"
                          onClick={() => handleDeleteRequest(row)}
                          disabled={!canDelete || row.is_system}
                          color="error"
                      >
                          <DeleteIcon fontSize="small" />
                      </IconButton>
                    </span>
                 </Tooltip>
            </Box>
        ),
    },
  ];

  // Ladezustand
  if (loading && roles.length === 0) { // Zeige nur initialen Ladezustand
    return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 'calc(100vh - 128px)' }}><CircularProgress /></Box>;
  }

  // --- Render ---
=======
  // Step 3: Close confirmation dialog without deleting
   const handleCloseConfirmDialog = () => {
      setConfirmDialogOpen(false);
      setRoleToDelete(null);
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

  const RoleRow = ({ role }: { role: Role }) => {
    const isSystemRole = role.is_system;
    const theme = useTheme();

    return (
      <TableRow
        hover
        key={role.id}
        selected={selectedRole?.id === role.id}
        onClick={() => handleSelectRole(role)}
        sx={{
          cursor: 'pointer',
          bgcolor: isSystemRole ? theme.palette.action.focus : 'inherit',
          '&:hover': {
            bgcolor: theme.palette.action.hover,
          }
        }}
      >
        <TableCell>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            {role.name}
            {isSystemRole && (
              <Tooltip title="Systemrolle">
                <InfoIcon fontSize="small" color="info" sx={{ ml: 1, fontSize: '0.9rem' }} />
              </Tooltip>
            )}
          </Box>
        </TableCell>
        <TableCell>{role.description || '—'}</TableCell>
        <TableCell align="right">
          <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                handleOpenDialog('edit', role);
              }}
              disabled={isSystemRole}
            >
              <EditIcon fontSize="small" />
            </IconButton>
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteRequest(role);
              }}
              disabled={isSystemRole}
            >
              <DeleteIcon fontSize="small" color={role.name.toLowerCase() === 'admin' || role.name.toLowerCase() === 'superadmin' ? 'disabled' : 'error'} />
            </IconButton>
          </Box>
        </TableCell>
      </TableRow>
    );
  };

  if (loading && roles.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 'calc(100vh - 64px)' }}>
        <CircularProgress />
      </Box>
    );
  }
>>>>>>> parent of beb137d8 (rollen und gruppen Verwaltung live)

  return (
    <Box sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
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

      {/* Rollen-Tabelle */}
      <TableContainer component={Paper} variant="outlined" sx={{ mb: 3 }}>
        <Table sx={{ minWidth: 650 }} aria-label="Benutzerrollen">
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Beschreibung</TableCell>
              <TableCell align="right">Aktionen</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {roles.map((role) => (
<<<<<<< HEAD
              <TableRow
                hover
                key={role.id}
                selected={selectedRole?.id === role.id}
                onClick={() => handleSelectRole(role)}
                sx={{
                  cursor: 'pointer',
                  bgcolor: role.is_system ? useTheme().palette.action.focus : 'inherit',
                  '&:hover': {
                    bgcolor: useTheme().palette.action.hover,
                  }
                }}
              >
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    {role.name}
                    {role.is_system && (
                      <Tooltip title="Systemrolle">
                        <InfoIcon fontSize="small" color="info" sx={{ ml: 1, fontSize: '0.9rem' }} />
                      </Tooltip>
                    )}
                  </Box>
                </TableCell>
                <TableCell>{role.description || '—'}</TableCell>
                <TableCell align="right">
                  <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenDialog('edit', role);
                      }}
                      disabled={role.is_system}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteRequest(role);
                      }}
                      disabled={role.is_system}
                    >
                      <DeleteIcon fontSize="small" color={role.name.toLowerCase() === 'admin' || role.name.toLowerCase() === 'superadmin' ? 'disabled' : 'error'} />
                    </IconButton>
                  </Box>
                </TableCell>
              </TableRow>
=======
              <RoleRow key={role.id} role={role} />
>>>>>>> parent of beb137d8 (rollen und gruppen Verwaltung live)
            ))}
            {roles.length === 0 && !loading && (
              <TableRow>
                <TableCell colSpan={3} align="center">
                  Keine Rollen verfügbar
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Berechtigungsmatrix */}
      {selectedRole && (
        <Box sx={{ mt: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">
              Berechtigungsmatrix für {selectedRole.name}
            </Typography>
            {loading && <CircularProgress size={24} />}
          </Box>

          <Alert severity="info" sx={{ mb: 2 }}>
            Klicken Sie auf eine Berechtigung, um sie zu aktivieren oder zu deaktivieren.
          </Alert>

          <TableContainer component={Paper} variant="outlined" sx={{ bgcolor: 'background.paper', mb: 1 }}>
            <Table sx={{ minWidth: 650 }} aria-label="Berechtigungsmatrix">
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
                {Object.entries(permissionMatrix).map(([moduleName, actions]) => (
                  <StyledTableRow key={moduleName} hover>
                    <TableCell>
                      {moduleName.charAt(0).toUpperCase() + moduleName.slice(1)}
                    </TableCell>
                    <StyledTableCell
                      onClick={() => handleTogglePermission(actions.create)}
                      sx={{ cursor: actions.create ? 'pointer' : 'default' }}
                    >
                      {actions.create !== null ? (
<<<<<<< HEAD
                        rolePermissions.includes(Number(actions.create)) ? (
=======
                        rolePermissions.includes(actions.create) ? (
>>>>>>> parent of beb137d8 (rollen und gruppen Verwaltung live)
                          <PermissionYes>Ja</PermissionYes>
                        ) : (
                          "—"
                        )
                      ) : (
                        "—"
                      )}
                    </StyledTableCell>
                    <StyledTableCell
                      onClick={() => handleTogglePermission(actions.read)}
                      sx={{ cursor: actions.read ? 'pointer' : 'default' }}
                    >
                      {actions.read !== null ? (
<<<<<<< HEAD
                        rolePermissions.includes(Number(actions.read)) ? (
=======
                        rolePermissions.includes(actions.read) ? (
>>>>>>> parent of beb137d8 (rollen und gruppen Verwaltung live)
                          <PermissionYes>Ja</PermissionYes>
                        ) : (
                          "—"
                        )
                      ) : (
                        "—"
                      )}
                    </StyledTableCell>
                    <StyledTableCell
                      onClick={() => handleTogglePermission(actions.update)}
                      sx={{ cursor: actions.update ? 'pointer' : 'default' }}
                    >
                      {actions.update !== null ? (
<<<<<<< HEAD
                        rolePermissions.includes(Number(actions.update)) ? (
=======
                        rolePermissions.includes(actions.update) ? (
>>>>>>> parent of beb137d8 (rollen und gruppen Verwaltung live)
                          <PermissionYes>Ja</PermissionYes>
                        ) : (
                          "—"
                        )
                      ) : (
                        "—"
                      )}
                    </StyledTableCell>
                    <StyledTableCell
                      onClick={() => handleTogglePermission(actions.delete)}
                      sx={{ cursor: actions.delete ? 'pointer' : 'default' }}
                    >
                      {actions.delete !== null ? (
<<<<<<< HEAD
                        rolePermissions.includes(Number(actions.delete)) ? (
=======
                        rolePermissions.includes(actions.delete) ? (
>>>>>>> parent of beb137d8 (rollen und gruppen Verwaltung live)
                          <PermissionYes>Ja</PermissionYes>
                        ) : (
                          "—"
                        )
                      ) : (
                        "—"
                      )}
                    </StyledTableCell>
                  </StyledTableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 2, mt: 2, p: 2, bgcolor: 'background.paper', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
            <InfoIcon fontSize="small" color="info" sx={{ mr: 1, mt: 0.5 }} />
            <Box>
              <Typography variant="subtitle2" color="text.primary" gutterBottom>
                Hinweise zur Berechtigungsmatrix:
              </Typography>
              <Typography variant="body2" color="text.secondary">
                • <strong>Ja</strong> - Die Berechtigung ist aktiviert<br />
                • <strong>—</strong> - Die Berechtigung ist deaktiviert oder nicht verfügbar<br />
                • Klicken Sie auf eine Zelle, um den Status der Berechtigung zu ändern<br />
                • Berechtigungen werden sofort gespeichert und wirken sich auf alle Benutzer mit dieser Rolle aus
              </Typography>
            </Box>
          </Box>
        </Box>
      )}

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
        <DialogActions sx={{ p: 2, gap: 1 }}>
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

      {/* Confirmation Dialog for Delete */}
      <ConfirmationDialog
        open={confirmDialogOpen}
        onClose={handleCloseConfirmDialog}
        onConfirm={executeDelete}
        title="Rolle löschen?"
        message={`Möchten Sie die Rolle "${roleToDelete?.name}" wirklich endgültig löschen? Zugeordnete Benutzer verlieren die Berechtigungen dieser Rolle.`}
        confirmText="Löschen"
      />

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
