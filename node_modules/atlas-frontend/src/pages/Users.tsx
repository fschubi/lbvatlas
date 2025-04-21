import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  Tooltip,
  Paper,
  Tabs,
  Tab,
  Divider,
  Alert,
  Snackbar,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Chip,
  Avatar,
  Switch,
  FormControlLabel,
  SelectChangeEvent,
  Checkbox,
  ListItemText,
  CircularProgress,
  Menu,
  ListItemButton,
  ListItemIcon,
  Autocomplete
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Person as PersonIcon,
  Group as GroupIcon,
  Search as SearchIcon,
  Email as EmailIcon,
  Lock as LockIcon,
  Security as SecurityIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  LocationCity as LocationCityIcon,
  MeetingRoom as MeetingRoomIcon,
  PersonRemove as PersonRemoveIcon,
  Phone as PhoneIcon,
  MoreVert as MoreVertIcon,
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import AtlasTable, { AtlasColumn } from '../components/AtlasTable';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import handleApiError from '../utils/errorHandler';
import { usersApi, userGroupApi, roleApi, locationApi, roomApi, departmentApi, ApiResponse } from '../utils/api';
import { User, UserGroup, Role } from '../types/user';
import { Location, Room } from '../types/settings';
import ConfirmationDialog from '../components/ConfirmationDialog';

// Berechtigungskonstanten definieren
const USERS_READ = 'users.read';
const USERS_CREATE = 'users.create';
const USERS_UPDATE = 'users.update';
const USERS_DELETE = 'users.delete';
const USERGROUPS_READ = 'usergroups.read';
const USERGROUPS_MANAGE_MEMBERS = 'usergroups.manage_members';

interface SnackbarState {
  open: boolean;
  message: string;
  severity: 'success' | 'error' | 'info' | 'warning';
}

interface ContextMenuState {
  mouseX: number;
  mouseY: number;
  userId: number;
}

const Users: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [openDialog, setOpenDialog] = useState<boolean>(false);
  const [dialogType, setDialogType] = useState<'create' | 'edit'>('create');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [username, setUsername] = useState<string>('');
  const [firstName, setFirstName] = useState<string>('');
  const [lastName, setLastName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [role, setRole] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [isActive, setIsActive] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [tabValue, setTabValue] = useState<number>(0);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userGroups, setUserGroups] = useState<UserGroup[]>([]);
  const [availableGroups, setAvailableGroups] = useState<UserGroup[]>([]);
  const [selectedGroups, setSelectedGroups] = useState<number[]>([]);
  const [snackbar, setSnackbar] = useState<SnackbarState>({
    open: false,
    message: '',
    severity: 'success'
  });
  const [roles, setRoles] = useState<Role[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [departmentId, setDepartmentId] = useState<number | ''>('');
  const [locations, setLocations] = useState<Location[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [selectedLocationId, setSelectedLocationId] = useState<number | ''>('');
  const [selectedRoomId, setSelectedRoomId] = useState<number | ''>('');
  const [phone, setPhone] = useState<string>('');
  const [confirmDeleteDialogOpen, setConfirmDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [confirmRemoveUserDialogOpen, setConfirmRemoveUserDialogOpen] = useState(false);
  const [userToRemoveFromGroup, setUserToRemoveFromGroup] = useState<User | null>(null);
  const [groupToRemoveFrom, setGroupToRemoveFrom] = useState<UserGroup | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);

  const { user, isLoading: isAuthLoading } = useAuth();

  const userPermissions = user?.permissions || new Set<string>();
  const canRead = userPermissions.has(USERS_READ);
  const canCreate = userPermissions.has(USERS_CREATE);
  const canUpdate = userPermissions.has(USERS_UPDATE);
  const canDelete = userPermissions.has(USERS_DELETE);
  const canReadGroups = userPermissions.has(USERGROUPS_READ);
  const canManageMembers = userPermissions.has(USERGROUPS_MANAGE_MEMBERS);

  const columns: AtlasColumn<User>[] = [
    { label: 'ID', dataKey: 'id', numeric: true, width: 80 },
    { label: 'Benutzername', dataKey: 'username', width: 120 },
    { label: 'Vorname', dataKey: 'first_name', width: 150, render: (value) => value || '-' },
    { label: 'Nachname', dataKey: 'last_name', width: 150, render: (value) => value || '-' },
    { label: 'E-Mail', dataKey: 'email', width: 200 },
    { label: 'Abteilung', dataKey: 'department_name', width: 150, render: (value) => value || '-' },
    { label: 'Standort', dataKey: 'location_name', width: 150, render: (value) => value || '-' },
    { label: 'Rolle', dataKey: 'role', width: 120 },
    {
      label: 'Status',
      dataKey: 'active',
      width: 100,
      render: (value: boolean | undefined) => (
        <Chip
          label={value ? 'Aktiv' : 'Inaktiv'}
          color={value ? 'success' : 'error'}
          size="small"
          sx={{ ml: 1 }}
        />
      )
    },
    {
      label: 'Aktionen',
      dataKey: 'actions',
      width: 80,
      render: (_value: any, row: User) => (
        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
           <Tooltip title="Aktionen">
             <IconButton
               size="small"
               onClick={(e) => handleContextMenuOpen(e, row.id)}
             >
               <MoreVertIcon fontSize="small" />
             </IconButton>
           </Tooltip>
         </Box>
      )
    }
  ];

  const groupColumns: AtlasColumn<UserGroup>[] = [
    { label: 'Name', dataKey: 'name', width: 200 },
    { label: 'Beschreibung', dataKey: 'description', width: 300 },
    { label: 'Hinzugefügt am', dataKey: 'addedAt', width: 180, render: (value) => value ? new Date(value).toLocaleString('de-DE') : '-' },
    {
      label: 'Aktion',
      dataKey: 'action',
      width: 100,
      render: (_, group) => (
        <Tooltip title="Aus Gruppe entfernen">
          <span>
            <IconButton
              size="small"
              onClick={(e) => {e.stopPropagation(); handleRemoveUserFromGroupRequest(group);}}
              disabled={!canManageMembers || loading}
            >
              <PersonRemoveIcon fontSize="small" color="warning" />
            </IconButton>
          </span>
        </Tooltip>
      ),
    }
  ];

  const fetchUsers = useCallback(async () => {
    if (!canRead) {
      setUsers([]);
      setError('Keine Berechtigung zum Anzeigen von Benutzern.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      console.log('[Users] Lade Benutzer von API...');
      const response = await usersApi.getAll();

      if (response.success && Array.isArray(response.data)) {
        console.log('[Users - fetchUsers] Empfangene Rohdaten (vor setUsers):', JSON.stringify(response.data, null, 2));
        setUsers(response.data);
        console.log('[Users] Benutzer geladen (im State):', response.data);
      } else {
        console.error('Fehler beim Laden der Benutzer:', response.message);
        setError(response.message || 'Fehler beim Laden der Benutzer.');
        setUsers([]);
      }
    } catch (err: unknown) {
      console.error('[Users] CATCH Fehler beim Laden der Benutzer:', err);
      setError(handleApiError(err));
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [canRead]);

  const fetchUserGroups = useCallback(async (userId: number | null) => {
    if (!userId || !canReadGroups) {
      setUserGroups([]);
      return;
    }
    setLoading(true);
    try {
      console.log(`[Users] Lade Gruppen für Benutzer ${userId}...`);
      const response = await userGroupApi.getGroupsForUser(userId);

      if (response.success && Array.isArray(response.data)) {
        setUserGroups(response.data);
        console.log(`[Users] Gruppen für Benutzer ${userId} geladen:`, response.data);
      } else {
        console.error(`[Users] Fehler beim Laden der Gruppen für Benutzer ${userId}:`, response.message);
        setSnackbar({ open: true, message: response.message || `Fehler beim Laden der Gruppen für Benutzer ${userId}.`, severity: 'error' });
        setUserGroups([]);
      }
    } catch (err: unknown) {
      console.error(`[Users] CATCH Fehler beim Laden der Gruppen für Benutzer ${userId}:`, err);
      setSnackbar({ open: true, message: handleApiError(err), severity: 'error' });
      setUserGroups([]);
    } finally {
      setLoading(false);
    }
  }, [canReadGroups]);

  const fetchAvailableGroups = useCallback(async () => {
    if (!canManageMembers) return;
    try {
      console.log('[Users] Lade alle verfügbaren Gruppen...');
      const response: ApiResponse<UserGroup[]> = await userGroupApi.getAll();

      if (response.success && Array.isArray(response.data)) {
        setAvailableGroups(response.data);
        console.log('[Users] Verfügbare Gruppen geladen:', response.data);
      } else {
        console.error('[Users] Fehler beim Laden der verfügbaren Gruppen:', response.message);
        setSnackbar({ open: true, message: response.message || 'Fehler beim Laden der verfügbaren Gruppen.', severity: 'error' });
        setAvailableGroups([]);
      }
    } catch (err: unknown) {
      console.error('[Users] CATCH Fehler beim Laden der verfügbaren Gruppen:', err);
      setSnackbar({ open: true, message: handleApiError(err), severity: 'error' });
      setAvailableGroups([]);
    }
  }, [canManageMembers]);

  const searchUsers = async () => {
    if (!searchTerm.trim()) {
      fetchUsers();
      return;
    }
    setLoading(true);
    setError(null);
    try {
      console.log(`[Users] Suche Benutzer mit Begriff: "${searchTerm}"...`);
      const response = await usersApi.search(searchTerm);

      if (response.success && Array.isArray(response.data)) {
        setUsers(response.data);
        console.log(`[Users] Suchergebnisse für "${searchTerm}":`, response.data);
        if(response.data.length === 0) {
          setSnackbar({ open: true, message: 'Keine Benutzer für den Suchbegriff gefunden.', severity: 'info' });
        }
      } else {
        console.error('Fehler bei der Benutzersuche:', response.message);
        setError(response.message || 'Fehler bei der Benutzersuche.');
        setUsers([]);
      }
    } catch (err: unknown) {
      console.error('[Users] CATCH Fehler bei der Benutzersuche:', err);
      setError(handleApiError(err));
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchRoles = useCallback(async () => {
    try {
      console.log('[Users] Lade Rollen...');
      const response = await roleApi.getAll();
      if (response.success && Array.isArray(response.data)) {
        const formattedRoles = response.data.map(r => ({
          id: r.id,
          name: r.name,
          label: r.name.charAt(0).toUpperCase() + r.name.slice(1),
          description: r.description
        }));
        setRoles(formattedRoles);
        console.log('[Users] Rollen geladen:', formattedRoles);
      } else {
        console.error('[Users] Fehler beim Laden der Rollen:', response.message);
        setSnackbar({ open: true, message: response.message || 'Fehler beim Laden der Rollen.', severity: 'error' });
      }
    } catch (err) {
      console.error('[Users] CATCH Fehler beim Laden der Rollen:', err);
      setSnackbar({ open: true, message: handleApiError(err), severity: 'error' });
    }
  }, []);

  const fetchDepartments = useCallback(async () => {
    try {
      console.log('[Users] Lade Abteilungen...');
      const response = await departmentApi.getAll();

      if (response.success && Array.isArray(response.data)) {
        setDepartments(response.data);
        console.log('[Users] Abteilungen geladen:', response.data);
      } else {
        console.error('[Users] Fehler beim Laden der Abteilungen:', response.message);
        setSnackbar({ open: true, message: response.message || 'Fehler beim Laden der Abteilungen.', severity: 'error' });
        setDepartments([]);
      }
    } catch (err) {
      console.error('[Users] CATCH Fehler beim Laden der Abteilungen:', err);
      setSnackbar({ open: true, message: handleApiError(err), severity: 'error' });
      setDepartments([]);
    }
  }, []);

  const fetchLocations = useCallback(async () => {
    try {
      console.log('[Users] Lade Standorte...');
      const response = await locationApi.getAll();
      if (response.success && Array.isArray(response.data)) {
        setLocations(response.data);
        console.log('[Users] Standorte geladen:', response.data);
      } else {
        console.error('[Users] Fehler beim Laden der Standorte:', response.message);
        setSnackbar({ open: true, message: response.message || 'Fehler beim Laden der Standorte.', severity: 'error' });
        setLocations([]);
      }
    } catch (err: unknown) {
      console.error('[Users] CATCH Fehler beim Laden der Standorte:', err);
      setSnackbar({ open: true, message: handleApiError(err), severity: 'error' });
      setLocations([]);
    }
  }, []);

  const fetchRoomsForLocation = useCallback(async (locationId: number | null) => {
    if (!locationId) {
      setRooms([]);
      return;
    }
    try {
      console.log(`[Users] Lade Räume für Standort ${locationId}...`);
      const response = await locationApi.getRoomsForLocation(locationId);

      if (response.success && Array.isArray(response.data)) {
        setRooms(response.data);
        console.log(`[Users] Räume für Standort ${locationId} geladen:`, response.data);
      } else {
        console.error(`[Users] Fehler beim Laden der Räume für Standort ${locationId}:`, response.message);
        setSnackbar({ open: true, message: response.message || 'Fehler beim Laden der Räume.', severity: 'error' });
        setRooms([]);
      }
    } catch (err: unknown) {
      console.error(`[Users] CATCH Fehler beim Laden der Räume für Standort ${locationId}:`, err);
      setSnackbar({ open: true, message: handleApiError(err), severity: 'error' });
      setRooms([]);
    }
  }, []);

  useEffect(() => {
    if (selectedLocationId) {
      fetchRoomsForLocation(Number(selectedLocationId));
    } else {
      setRooms([]);
      setSelectedRoomId('');
    }
  }, [selectedLocationId, fetchRoomsForLocation]);

  useEffect(() => {
    if (!isAuthLoading) {
      fetchUsers();
      fetchAvailableGroups();
      fetchLocations();
      fetchRoles();
      fetchDepartments();
    }
  }, [isAuthLoading, fetchUsers, fetchAvailableGroups, fetchLocations, fetchRoles, fetchDepartments]);

  const createUser = async () => {
    if (password !== confirmPassword) {
      setSnackbar({ open: true, message: 'Die Passwörter stimmen nicht überein', severity: 'error' });
      return;
    }

    try {
      setLoading(true);
      const userData = {
        username,
        first_name: firstName,
        last_name: lastName,
        email,
        role,
        department_id: departmentId === '' ? null : departmentId,
        location_id: selectedLocationId === '' ? null : selectedLocationId,
        room_id: selectedRoomId === '' ? null : selectedRoomId,
        phone: phone === '' ? null : phone,
        active: isActive,
        password
      };

      console.log("[Users] Erstelle Benutzer mit Daten (vor SnakeCase):", userData);
      const response = await usersApi.create(userData);

      if (response.success) {
        await fetchUsers();
        setSnackbar({ open: true, message: response.message || 'Benutzer erfolgreich erstellt', severity: 'success' });
        handleCloseDialog();
      } else {
        console.error('Fehler beim Erstellen des Benutzers:', response.message);
        setSnackbar({ open: true, message: response.message || 'Fehler beim Erstellen des Benutzers', severity: 'error' });
      }
    } catch (err: unknown) {
      console.error('[Users] CATCH Fehler beim Erstellen des Benutzers:', err);
      setSnackbar({ open: true, message: handleApiError(err), severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const updateUser = async () => {
    if (!currentUser) return;

    if (password && password !== confirmPassword) {
        setSnackbar({ open: true, message: 'Die neuen Passwörter stimmen nicht überein.', severity: 'warning' });
        return;
    }

    try {
      setLoading(true);
      const userData: any = {};
      if (username !== currentUser.username) userData.username = username;
      if (firstName !== currentUser.first_name) userData.firstName = firstName;
      if (lastName !== currentUser.last_name) userData.lastName = lastName;
      if (email !== currentUser.email) userData.email = email;
      if (role !== currentUser.role) userData.role = role;
      if (departmentId !== (currentUser.department_id ?? '')) userData.departmentId = departmentId === '' ? null : departmentId;
      if (selectedLocationId !== (currentUser.location_id ?? '')) userData.locationId = selectedLocationId === '' ? null : selectedLocationId;
      if (selectedRoomId !== (currentUser.room_id ?? '')) userData.roomId = selectedRoomId === '' ? null : selectedRoomId;
      if (isActive !== currentUser.active) userData.active = isActive;
      if (password) userData.password = password;

      console.log('[Users - updateUser] Zu sendende Daten (vor SnakeCase):', JSON.stringify(userData));

      if (Object.keys(userData).length === 0 && !password) {
         setSnackbar({ open: true, message: 'Keine Änderungen vorgenommen.', severity: 'info' });
         handleCloseDialog();
         setLoading(false);
         return;
       }

      console.log(`[Users] Aktualisiere Benutzer ${currentUser.id} mit Daten (vor SnakeCase):`, userData);
      const response = await usersApi.update(currentUser.id, userData);

      if (response.success) {
        await fetchUsers();
        setSnackbar({ open: true, message: response.message || 'Benutzer erfolgreich aktualisiert', severity: 'success' });
        handleCloseDialog();
      } else {
        console.error('Fehler beim Aktualisieren des Benutzers:', response.message);
        setSnackbar({ open: true, message: response.message || 'Fehler beim Aktualisieren des Benutzers', severity: 'error' });
      }
    } catch (err: unknown) {
      console.error('[Users] CATCH Fehler beim Aktualisieren des Benutzers:', err);
      setSnackbar({ open: true, message: handleApiError(err), severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRequest = (userToDelete: User) => {
    if (!canDelete) return;
    setUserToDelete(userToDelete);
    setConfirmDeleteDialogOpen(true);
  };

  const handleCloseConfirmDeleteDialog = () => {
    setConfirmDeleteDialogOpen(false);
    setUserToDelete(null);
  };

  const executeDeleteUser = async () => {
    if (!userToDelete || !canDelete) return;
    const userIdToDelete = userToDelete.id;
    const userName = userToDelete.username;

    handleCloseConfirmDeleteDialog();
    setLoading(true);

    try {
      console.log(`[Users] Lösche Benutzer ${userIdToDelete}...`);
      const response = await usersApi.delete(userIdToDelete);

      if (response.success) {
        setSnackbar({ open: true, message: response.message || `Benutzer '${userName}' erfolgreich gelöscht.`, severity: 'success' });
        await fetchUsers();
        if (selectedUser?.id === userIdToDelete) {
            setSelectedUser(null);
            setTabValue(0);
        }
      } else {
        setSnackbar({ open: true, message: response.message || `Fehler beim Löschen von Benutzer '${userName}'.`, severity: 'error' });
      }
    } catch (error) {
      console.error(`[Users] CATCH Fehler beim Löschen von Benutzer ${userIdToDelete}:`, error);
      setSnackbar({ open: true, message: handleApiError(error), severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const addUserToGroups = async () => {
    if (!selectedUser || selectedGroups.length === 0 || !canManageMembers) return;

    setLoading(true);
    try {
      console.log(`[Users] Füge Benutzer ${selectedUser.id} zu Gruppen hinzu:`, selectedGroups);

      let successCount = 0;
      let firstError = null;

      for (const groupId of selectedGroups) {
        try {
          const response = await userGroupApi.addUserToGroup(groupId, String(selectedUser.id));
          if (response.success) {
            successCount++;
          } else {
            if (!firstError) firstError = response.message || `Fehler beim Hinzufügen zu Gruppe ${groupId}`;
            console.error(`Fehler beim Hinzufügen zu Gruppe ${groupId}:`, response.message);
          }
        } catch (loopError) {
          if (!firstError) firstError = handleApiError(loopError);
          console.error(`CATCH Fehler beim Hinzufügen zu Gruppe ${groupId}:`, loopError);
        }
      }

      await fetchUserGroups(selectedUser.id);
      setSelectedGroups([]);

      if (successCount === selectedGroups.length) {
        setSnackbar({ open: true, message: 'Benutzer erfolgreich zu den ausgewählten Gruppen hinzugefügt', severity: 'success' });
      } else {
        setSnackbar({ open: true, message: `Fehler beim Hinzufügen zu ${selectedGroups.length - successCount} Gruppe(n). ${firstError || ''}`, severity: 'warning' });
      }
    } catch (err: unknown) {
      console.error('[Users] CATCH Fehler beim Hinzufügen zu Gruppen:', err);
      setSnackbar({ open: true, message: handleApiError(err), severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveUserFromGroupRequest = (group: UserGroup) => {
    if (!selectedUser || !canManageMembers) return;
    setUserToRemoveFromGroup(selectedUser);
    setGroupToRemoveFrom(group);
    setConfirmRemoveUserDialogOpen(true);
  };

  const handleCloseConfirmRemoveUserDialog = () => {
    setConfirmRemoveUserDialogOpen(false);
    setUserToRemoveFromGroup(null);
    setGroupToRemoveFrom(null);
  };

  const executeRemoveUserFromGroup = async () => {
    if (!userToRemoveFromGroup || !groupToRemoveFrom || !canManageMembers) return;

    const userId = userToRemoveFromGroup.id;
    const groupId = groupToRemoveFrom.id;

    handleCloseConfirmRemoveUserDialog();
    setLoading(true);
    try {
      console.log(`[Users] Entferne Benutzer ${userId} aus Gruppe ${groupId}...`);
      const response = await userGroupApi.removeUserFromGroup(groupId, String(userId));

      if (response.success) {
        await fetchUserGroups(userId);
        setSnackbar({ open: true, message: response.message || 'Benutzer erfolgreich aus Gruppe entfernt', severity: 'success' });
      } else {
        setSnackbar({ open: true, message: response.message || 'Fehler beim Entfernen aus Gruppe.', severity: 'error' });
      }
    } catch (err: unknown) {
      console.error(`[Users] CATCH Fehler beim Entfernen aus Gruppe ${groupId}:`, err);
      setSnackbar({ open: true, message: handleApiError(err), severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (type: 'create' | 'edit', user: User | null = null) => {
    setDialogType(type);
    setPassword('');
    setConfirmPassword('');

    if (type === 'edit' && user) {
      setCurrentUser(user);
      setUsername(user.username);
      setFirstName(user.first_name);
      setLastName(user.last_name);
      setEmail(user.email);
      setRole(user.role);
      setIsActive(user.active ?? true);
      setDepartmentId(user.department_id ?? '');
      setSelectedLocationId(user.location_id ?? '');
      setSelectedRoomId(user.room_id ?? '');

      if (user.location_id) {
          fetchRoomsForLocation(user.location_id);
      } else {
          setRooms([]);
      }

    } else {
      setCurrentUser(null);
      setUsername('');
      setFirstName('');
      setLastName('');
      setEmail('');
      setRole('');
      setIsActive(true);
      setDepartmentId('');
      setSelectedLocationId('');
      setSelectedRoomId('');
      setRooms([]);
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
  };

  const handleConfirmDialog = () => {
    if (dialogType === 'create') {
      createUser();
    } else {
      updateUser();
    }
  };

  const handleSelectUser = (user: User) => {
    setSelectedUser(user);
    fetchUserGroups(user.id);
    setTabValue(1);
  };

  const handleGroupSelect = (event: SelectChangeEvent<number[]>) => {
    const value = event.target.value;
    setSelectedGroups(typeof value === 'string' ? value.split(',').map(Number) : value);
  };

  const handleCloseSnackbar = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  const handleEditUser = (user: User) => {
    handleOpenDialog('edit', user);
  };

  const handleLocationChange = (event: SelectChangeEvent<number | string>) => {
    const value = event.target.value;
    const newLocationId = value === '' ? '' : Number(value);
    setSelectedLocationId(newLocationId);
    if (newLocationId) {
        fetchRoomsForLocation(newLocationId);
    } else {
        setRooms([]);
    }
    setSelectedRoomId('');
  };

  const handleRoomChange = (event: SelectChangeEvent<number | string>) => {
    const value = event.target.value;
    setSelectedRoomId(value === '' ? '' : Number(value));
  };

  const handleContextMenuOpen = (
    event: React.MouseEvent<HTMLElement>,
    userId: number
  ) => {
    event.preventDefault();
    event.stopPropagation();
    console.log('[Users - handleContextMenuOpen] Öffne Menü für User:', userId, 'an Position:', event.clientX, event.clientY);
    setContextMenu(
      contextMenu === null
        ? {
            mouseX: event.clientX + 2,
            mouseY: event.clientY - 6,
            userId,
          }
        : null,
    );
  };

  const handleContextMenuClose = () => {
    console.log('[Users - handleContextMenuClose] Schließe Menü.');
    setContextMenu(null);
  };

  const renderUserDetailView = () => {
    if (!selectedUser) return null;

    const userGroupIds = userGroups.map(group => group.id);
    const availableGroupsToAdd = availableGroups.filter(group => !userGroupIds.includes(group.id));

    const locationName = selectedUser.locationName || (locations.find(loc => loc.id === selectedUser.location_id)?.name) || 'Kein Standort';
    const roomName = selectedUser.roomName || (rooms.find(r => r.id === selectedUser.room_id)?.name) || 'Kein Raum';
    const departmentName = selectedUser.departmentName || (departments.find(dep => dep.id === selectedUser.department_id)?.name) || 'Keine Abteilung';

    return (
      <Paper elevation={0} sx={{ p: 2, height: 'calc(100vh - 160px)', overflowY: 'auto' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <Avatar sx={{ width: 60, height: 60, mr: 2, bgcolor: theme.palette.primary.main }}>
            <PersonIcon sx={{ fontSize: 30 }} />
          </Avatar>
          <Box>
            <Typography variant="h6">
              {selectedUser.first_name} {selectedUser.last_name}
            </Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              @{selectedUser.username}
            </Typography>
            <Chip
              label={selectedUser.active ? 'Aktiv' : 'Inaktiv'}
              color={selectedUser.active ? 'success' : 'error'}
              size="small"
            />
          </Box>
          <Box sx={{ ml: 'auto' }}>
              <Tooltip title="Bearbeiten">
                 <span>
                    <IconButton onClick={() => handleOpenDialog('edit', selectedUser)} disabled={!canUpdate}>
                        <EditIcon />
                    </IconButton>
                 </span>
              </Tooltip>
              <Tooltip title="Löschen">
                 <span>
                    <IconButton onClick={() => handleDeleteRequest(selectedUser)} disabled={!canDelete}>
                        <DeleteIcon color="error" />
                    </IconButton>
                 </span>
              </Tooltip>
          </Box>
        </Box>

        <Divider sx={{ my: 2 }} />

        <Grid container spacing={1} sx={{ mb: 2 }}>
             <Grid item xs={12} sm={6}>
                 <Typography variant="body2" color="text.secondary">
                     <EmailIcon fontSize="small" sx={{ mr: 1, verticalAlign: 'bottom' }} />
                     {selectedUser.email || '-'}
                 </Typography>
             </Grid>
             <Grid item xs={12} sm={6}>
                 <Typography variant="body2" color="text.secondary">
                     <SecurityIcon fontSize="small" sx={{ mr: 1, verticalAlign: 'bottom' }} />
                     {roles.find(r => r.name === selectedUser.role)?.label || selectedUser.role || '-'}
                 </Typography>
             </Grid>
             <Grid item xs={12} sm={6}>
                 <Typography variant="body2" color="text.secondary">
                     <GroupIcon fontSize="small" sx={{ mr: 1, verticalAlign: 'bottom' }} />
                     {departmentName}
                 </Typography>
             </Grid>
             <Grid item xs={12} sm={6}>
                 <Typography variant="body2" color="text.secondary">
                     <LocationCityIcon fontSize="small" sx={{ mr: 1, verticalAlign: 'bottom' }} />
                     {locationName}
                 </Typography>
             </Grid>
              <Grid item xs={12} sm={6}>
                 <Typography variant="body2" color="text.secondary">
                     <MeetingRoomIcon fontSize="small" sx={{ mr: 1, verticalAlign: 'bottom' }} />
                     {roomName}
                 </Typography>
             </Grid>
        </Grid>

        <Divider sx={{ my: 2 }} />

        <Typography variant="h6" gutterBottom>Gruppenmitgliedschaften</Typography>
        <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
          <FormControl fullWidth size="small">
            <InputLabel id="select-groups-label">Gruppen hinzufügen</InputLabel>
            <Select
              labelId="select-groups-label"
              multiple
              value={selectedGroups}
              onChange={handleGroupSelect}
              disabled={!canManageMembers || availableGroupsToAdd.length === 0}
              renderValue={(selected) => (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {(selected as number[]).map((groupId) => {
                    const group = availableGroups.find(g => g.id === groupId);
                    return <Chip key={groupId} label={group?.name || groupId} size="small" />;
                  })}
                </Box>
              )}
            >
              {availableGroupsToAdd.length === 0 && <MenuItem disabled>Keine weiteren Gruppen verfügbar</MenuItem>}
              {availableGroupsToAdd.map((group) => (
                <MenuItem key={group.id} value={group.id}>
                  <Checkbox checked={selectedGroups.includes(group.id)} />
                  <ListItemText primary={group.name} />
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Button
            variant="contained"
            color="primary"
            onClick={addUserToGroups}
            disabled={selectedGroups.length === 0 || !canManageMembers || loading}
            size="small"
          >
            Hinzufügen
          </Button>
        </Box>

        <AtlasTable
          columns={groupColumns}
          rows={userGroups}
          loading={loading}
          emptyMessage="Benutzer ist in keinen Gruppen Mitglied."
          heightPx={300}
          stickyHeader
        />

      </Paper>
    );
  };

  if (isAuthLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 'calc(100vh - 64px)' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!canRead) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">Keine Berechtigung zum Anzeigen der Benutzerverwaltung.</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', height: 'calc(100vh - 64px)', overflow: 'hidden' }}>
      <Box sx={{ flexGrow: 1, p: 3, overflowY: 'auto' }}>
        <Typography variant="h4" gutterBottom sx={{ mb: 3 }}>
          Benutzerverwaltung
        </Typography>

        <Paper sx={{ mb: 3, p: 2 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={6} md={8}>
              <TextField
                fullWidth
                label="Benutzer suchen (Name, Username, E-Mail)"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && searchUsers()}
                size="small"
                InputProps={{
                  endAdornment: (
                    <IconButton onClick={() => searchUsers()} size="small">
                      <SearchIcon />
                    </IconButton>
                  )
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={4} sx={{ textAlign: 'right' }}>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => handleOpenDialog('create')}
                disabled={!canCreate || loading}
              >
                Neuen Benutzer erstellen
              </Button>
            </Grid>
          </Grid>
        </Paper>

         <Paper>
            <AtlasTable
              columns={columns}
              rows={users}
              loading={loading}
              onRowClick={handleSelectUser}
              heightPx={450}
              emptyMessage="Keine Benutzer gefunden."
              stickyHeader
            />
         </Paper>

      </Box>

       {selectedUser && (
             <Box sx={{
                 width: '450px',
                 borderLeft: `1px solid ${theme.palette.divider}`,
                 height: '100%',
                 overflowY: 'auto',
                 p: 0
             }}>
                 {renderUserDetailView()}
             </Box>
         )}

      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {dialogType === 'create' ? 'Neuen Benutzer erstellen' : `Benutzer "${currentUser?.username || ''}" bearbeiten`}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{pt: 1}}>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth size="small" label="Benutzername" value={username} onChange={(e) => setUsername(e.target.value)} required />
            </Grid>
             <Grid item xs={12} sm={6}>
              <TextField fullWidth size="small" label="E-Mail" value={email} onChange={(e) => setEmail(e.target.value)} required type="email" />
            </Grid>
             <Grid item xs={12} sm={6}>
              <TextField fullWidth size="small" label="Vorname" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
            </Grid>
             <Grid item xs={12} sm={6}>
              <TextField fullWidth size="small" label="Nachname" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
            </Grid>
             <Grid item xs={12} sm={6}>
              <Autocomplete
                options={roles}
                getOptionLabel={(option) => option.label || option.name || ''}
                value={roles.find(r => r.name === role) || null}
                onChange={(event, newValue) => {
                    setRole(newValue?.name || '');
                }}
                isOptionEqualToValue={(option, value) => option.name === value?.name}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Rolle"
                    required
                    size="small"
                    error={dialogType === 'create' && !role}
                  />
                )}
              />
            </Grid>
             <Grid item xs={12} sm={6}>
               <TextField fullWidth size="small" label="Telefonnummer" value={phone} onChange={(e) => setPhone(e.target.value)} />
             </Grid>
            <Grid item xs={12} sm={6}>
              <Autocomplete
                options={departments}
                getOptionLabel={(option) => option.name || ''}
                value={departments.find(d => d.id === departmentId) || null}
                onChange={(event, newValue) => {
                  setDepartmentId(newValue?.id ?? '');
                }}
                isOptionEqualToValue={(option, value) => option.id === value?.id}
                renderInput={(params) => (
                  <TextField {...params} label="Abteilung" size="small" />
                )}
              />
            </Grid>
             <Grid item xs={12} sm={6}>
              <Autocomplete
                options={locations}
                getOptionLabel={(option) => option.name || ''}
                value={locations.find(l => l.id === selectedLocationId) || null}
                onChange={(event, newValue) => {
                  const newLocationId = newValue?.id ?? '';
                  setSelectedLocationId(newLocationId);
                  if (newLocationId) {
                      fetchRoomsForLocation(newLocationId);
                  } else {
                      setRooms([]);
                  }
                  setSelectedRoomId('');
                }}
                isOptionEqualToValue={(option, value) => option.id === value?.id}
                renderInput={(params) => (
                  <TextField {...params} label="Standort" size="small" />
                )}
              />
            </Grid>
             <Grid item xs={12} sm={6}>
              <Autocomplete
                options={rooms}
                getOptionLabel={(option) => option.name || ''}
                value={rooms.find(r => r.id === selectedRoomId) || null}
                onChange={(event, newValue) => {
                  setSelectedRoomId(newValue?.id ?? '');
                }}
                isOptionEqualToValue={(option, value) => option.id === value?.id}
                disabled={!selectedLocationId}
                renderInput={(params) => (
                  <TextField {...params} label="Raum" size="small" />
                )}
              />
            </Grid>
             <Grid item xs={12} sm={6}>
              <FormControlLabel control={ <Switch checked={isActive} onChange={(e) => setIsActive(e.target.checked)} /> } label="Benutzer aktiv" />
            </Grid>
            <Grid item xs={12}><Divider sx={{ my: 1 }}>Passwort ändern (optional)</Divider></Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                size="small"
                type="password"
                label={dialogType === 'create' ? "Passwort" : "Neues Passwort"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required={dialogType === 'create'}
                autoComplete="new-password"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                size="small"
                type="password"
                label="Passwort bestätigen"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required={dialogType === 'create' || password.length > 0}
                error={password !== confirmPassword}
                helperText={password !== confirmPassword ? 'Passwörter stimmen nicht überein' : ''}
                autoComplete="new-password"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} disabled={loading}>Abbrechen</Button>
          <Button onClick={handleConfirmDialog} variant="contained" disabled={loading || (password !== confirmPassword)}>
             {loading ? <CircularProgress size={24}/> : (dialogType === 'create' ? 'Erstellen' : 'Speichern')}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snackbar.open} autoHideDuration={6000} onClose={handleCloseSnackbar} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }} variant="filled">
          {snackbar.message}
        </Alert>
      </Snackbar>

      <ConfirmationDialog
        open={confirmDeleteDialogOpen}
        onClose={handleCloseConfirmDeleteDialog}
        onConfirm={executeDeleteUser}
        title="Benutzer löschen?"
        message={`Möchten Sie den Benutzer "${userToDelete?.username}" (${userToDelete?.first_name} ${userToDelete?.last_name}) wirklich endgültig löschen? Dies kann nicht rückgängig gemacht werden.`}
        confirmText="Löschen"
        confirmButtonColor="error"
      />

      <ConfirmationDialog
        open={confirmRemoveUserDialogOpen}
        onClose={handleCloseConfirmRemoveUserDialog}
        onConfirm={executeRemoveUserFromGroup}
        title="Benutzer aus Gruppe entfernen?"
        message={`Möchten Sie den Benutzer "${userToRemoveFromGroup?.username}" wirklich aus der Gruppe "${groupToRemoveFrom?.name}" entfernen?`}
        confirmText="Entfernen"
        confirmButtonColor="warning"
      />

      <Menu
        open={contextMenu !== null}
        onClose={handleContextMenuClose}
        anchorReference="anchorPosition"
        anchorPosition={
          contextMenu !== null
            ? { top: contextMenu.mouseY, left: contextMenu.mouseX }
            : undefined
        }
        PaperProps={{
            elevation: 3,
        }}
      >
        <MenuItem onClick={() => {
          const userToView = users.find(u => u.id === contextMenu?.userId);
          if(userToView) handleSelectUser(userToView);
          handleContextMenuClose();
        }}>
          Ansehen
        </MenuItem>
        <MenuItem onClick={() => {
          const userToEdit = users.find(u => u.id === contextMenu?.userId);
          if(userToEdit) handleOpenDialog('edit', userToEdit);
          handleContextMenuClose();
        }} disabled={!canUpdate}>
          Bearbeiten
        </MenuItem>
        <MenuItem onClick={() => {
           const userToDelete = users.find(u => u.id === contextMenu?.userId);
           if(userToDelete) handleDeleteRequest(userToDelete);
           handleContextMenuClose();
        }} disabled={!canDelete} sx={{ color: 'error.main' }}>
          Löschen
        </MenuItem>
      </Menu>

    </Box>
  );
};

export default Users;
