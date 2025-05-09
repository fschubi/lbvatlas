import React, { useState, useEffect } from 'react';
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
  ListItemText
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
  Cancel as CancelIcon
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import AtlasAppBar from '../components/AtlasAppBar';
import AtlasTable, { AtlasColumn } from '../components/AtlasTable';
import axios from 'axios';
import { ApiResponse, ApiError } from '../types/api';
import { useNavigate } from 'react-router-dom';

// API-Basis-URL
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

// Helper-Funktion für Axios-Anfragen mit Authorization Header
const getAuthConfig = () => {
  const token = localStorage.getItem('token');

  // Token-Validierung
  if (!token || token.trim() === '') {
    console.error('Kein Token vorhanden oder Token leer');
    // Optional: Umleitung zur Login-Seite
    // window.location.href = '/login';
    return {};
  }

  // Prüfe, ob das Token das richtige Format hat (drei Teile, getrennt durch Punkte)
  const parts = token.split('.');
  if (parts.length !== 3) {
    console.error('Ungültiges Token-Format:', token);
    // Entferne ungültiges Token
    localStorage.removeItem('token');
    // Optional: Umleitung zur Login-Seite
    // window.location.href = '/login';
    return {};
  }

  // Debug-Ausgabe
  console.log('Token wird verwendet:', `Bearer ${token.substring(0, 10)}...`);

  return {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  };
};

interface IUser {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  gender: 'male' | 'female' | 'diverse';
  email: string;
  role: string;
  department: string;
  location_id: number;
  room_id: number;
  phone: string;
  is_active: boolean;
  last_login: string;
}

interface UserGroup {
  id: number;
  name: string;
  description: string;
  added_at: string;
  added_by: string;
}

interface Role {
  id: number;
  name: string;
  label: string;
}

interface SnackbarState {
  open: boolean;
  message: string;
  severity: 'success' | 'error' | 'info' | 'warning';
}

interface Location {
  id: number;
  name: string;
  address: string;
  city: string;
}

interface Room {
  id: number;
  name: string;
  description: string;
  floor: string;
  room_number: string;
}

const Users: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const [users, setUsers] = useState<IUser[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [openDialog, setOpenDialog] = useState<boolean>(false);
  const [dialogType, setDialogType] = useState<'create' | 'edit'>('create');
  const [currentUser, setCurrentUser] = useState<IUser | null>(null);
  const [username, setUsername] = useState<string>('');
  const [firstName, setFirstName] = useState<string>('');
  const [lastName, setLastName] = useState<string>('');
  const [gender, setGender] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [role, setRole] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [isActive, setIsActive] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [tabValue, setTabValue] = useState<number>(0);
  const [selectedUser, setSelectedUser] = useState<IUser | null>(null);
  const [userGroups, setUserGroups] = useState<UserGroup[]>([]);
  const [availableGroups, setAvailableGroups] = useState<UserGroup[]>([]);
  const [selectedGroups, setSelectedGroups] = useState<number[]>([]);
  const [snackbar, setSnackbar] = useState<SnackbarState>({
    open: false,
    message: '',
    severity: 'success'
  });
  const [roles] = useState<Role[]>([
    { id: 1, name: 'admin', label: 'Administrator' },
    { id: 2, name: 'manager', label: 'Manager' },
    { id: 3, name: 'user', label: 'Benutzer' },
    { id: 4, name: 'guest', label: 'Gast' }
  ]);
  const [department, setDepartment] = useState<string>('');
  const [locations, setLocations] = useState<Location[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [selectedLocationId, setSelectedLocationId] = useState<number | ''>('');
  const [selectedRoomId, setSelectedRoomId] = useState<number | ''>('');
  const [phone, setPhone] = useState<string>('');

  // Spalten für die Benutzer-Tabelle
  const columns: AtlasColumn<IUser>[] = [
    { label: 'ID', dataKey: 'id', numeric: true, width: 80 },
    { label: 'Benutzername', dataKey: 'username', width: 120 },
    { label: 'Vorname', dataKey: 'first_name', width: 150 },
    { label: 'Nachname', dataKey: 'last_name', width: 150 },
    { label: 'E-Mail', dataKey: 'email', width: 200 },
    { label: 'Abteilung', dataKey: 'department', width: 150 },
    { label: 'Standort', dataKey: 'location', width: 150 },
    { label: 'Rolle', dataKey: 'role', width: 120 },
    {
      label: 'Status',
<<<<<<< HEAD
<<<<<<< HEAD
      dataKey: 'active',
      width: 80,
      render: (value: boolean | undefined) => (
        <Chip label={value ? 'Aktiv' : 'Inaktiv'} color={value ? 'success' : 'default'} size="small" />
      )
    },
    {
      label: 'Aktionen',
      dataKey: 'actions',
      width: 80,
      render: (_value: any, row: User) => (
        <Box sx={{ display: 'flex', justifyContent: 'center' }}>
          <Tooltip title="Details anzeigen">
            <IconButton size="small" onClick={(e) => { e.stopPropagation(); handleViewUser(Number(row.id)); }}>
              <VisibilityIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
=======
=======
>>>>>>> parent of 7b3be34f (benutzer verwaltung)
      dataKey: 'is_active',
      width: 100,
      render: (value: boolean) => (
        <Chip
          label={value ? 'Aktiv' : 'Inaktiv'}
          color={value ? 'success' : 'error'}
          size="small"
        />
<<<<<<< HEAD
>>>>>>> parent of 7b3be34f (benutzer verwaltung)
=======
>>>>>>> parent of 7b3be34f (benutzer verwaltung)
      )
    }
  ];

  // Spalten für die Benutzergruppen-Tabelle
  const groupColumns: AtlasColumn<UserGroup>[] = [
    { label: 'ID', dataKey: 'id', numeric: true, width: 80 },
    { label: 'Name', dataKey: 'name', width: 200 },
    { label: 'Beschreibung', dataKey: 'description', width: 300 },
    { label: 'Hinzugefügt am', dataKey: 'added_at', width: 180 },
    { label: 'Hinzugefügt von', dataKey: 'added_by', width: 150 }
  ];

  // Benutzer laden
  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await axios.get<ApiResponse<IUser[]>>(`${API_BASE_URL}/users`, getAuthConfig());
      setUsers(response.data.data);
      setError(null);
    } catch (err: unknown) {
      console.error('Fehler beim Laden der Benutzer:', err);
      setError('Fehler beim Laden der Benutzer');
    } finally {
      setLoading(false);
    }
  };

  // Benutzergruppen laden
  const fetchUserGroups = async (userId: number) => {
    try {
      setLoading(true);
      const response = await axios.get<ApiResponse<UserGroup[]>>(
        `${API_BASE_URL}/users/${userId}/groups`,
        getAuthConfig()
      );
      setUserGroups(response.data.data);
      setError(null);
    } catch (err: unknown) {
      console.error('Fehler beim Laden der Benutzergruppen:', err);
      setError('Fehler beim Laden der Benutzergruppen');
    } finally {
      setLoading(false);
    }
  };

  // Verfügbare Gruppen laden
  const fetchAvailableGroups = async () => {
    try {
      const response = await axios.get<ApiResponse<UserGroup[]>>(
        `${API_BASE_URL}/user-groups`,
        getAuthConfig()
      );
      setAvailableGroups(response.data.data);
    } catch (err: unknown) {
      console.error('Fehler beim Laden der verfügbaren Gruppen:', err);
    }
  };

  // Benutzer suchen
  const searchUsers = async () => {
    if (!searchTerm.trim()) {
      fetchUsers();
      return;
    }

    try {
      setLoading(true);
      const response = await axios.get<ApiResponse<IUser[]>>(
        `${API_BASE_URL}/users/search?searchTerm=${searchTerm}`,
        getAuthConfig()
      );
      setUsers(response.data.data);
      setError(null);
    } catch (err: unknown) {
      console.error('Fehler bei der Suche nach Benutzern:', err);
      setError('Fehler bei der Suche nach Benutzern');
    } finally {
      setLoading(false);
    }
  };

  // Locations laden
  const fetchLocations = async () => {
    try {
      const response = await axios.get<ApiResponse<Location[]>>(`${API_BASE_URL}/users/locations`, getAuthConfig());
      setLocations(response.data.data);
    } catch (err: unknown) {
      console.error('Fehler beim Laden der Standorte:', err);
      setSnackbar({
        open: true,
        message: 'Fehler beim Laden der Standorte',
        severity: 'error'
      });
    }
  };

  // Räume für einen Standort laden
  const fetchRoomsForLocation = async (locationId: number) => {
    try {
      if (!locationId) {
        setRooms([]);
        return;
      }

      const response = await axios.get<ApiResponse<Room[]>>(
        `${API_BASE_URL}/users/locations/${locationId}/rooms`,
        getAuthConfig()
      );
      setRooms(response.data.data);
    } catch (err: unknown) {
      console.error('Fehler beim Laden der Räume:', err);
      setSnackbar({
        open: true,
        message: 'Fehler beim Laden der Räume',
        severity: 'error'
      });
    }
  };

  // Wenn sich der ausgewählte Standort ändert, Räume laden
  useEffect(() => {
    if (selectedLocationId) {
      fetchRoomsForLocation(Number(selectedLocationId));
    } else {
      setRooms([]);
    }
  }, [selectedLocationId]);

  // Alle notwendigen Daten zu Beginn laden
  useEffect(() => {
    fetchUsers();
    fetchAvailableGroups();
    fetchLocations();
  }, []);

  // Benutzer erstellen
  const createUser = async () => {
    if (password !== confirmPassword) {
      setSnackbar({
        open: true,
        message: 'Die Passwörter stimmen nicht überein',
        severity: 'error'
      });
      return;
    }

    try {
      setLoading(true);
      const response = await axios.post<ApiResponse<IUser>>(
        `${API_BASE_URL}/users`,
        {
          username,
          first_name: firstName,
          last_name: lastName,
          gender,
          email,
          role_id: parseInt(role, 10),
          department,
          location_id: selectedLocationId === '' ? null : selectedLocationId,
          room_id: selectedRoomId === '' ? null : selectedRoomId,
          phone,
          is_active: isActive,
          password
        },
        getAuthConfig()
      );

      // Sicherstellen, dass wir ein vollständiges Benutzerobjekt mit ID haben
      if (response.data && response.data.data) {
        // Vollständigen Benutzer neu laden, um alle Daten für die Tabelle zu haben
        await fetchUsers();

        setSnackbar({
          open: true,
          message: 'Benutzer erfolgreich erstellt',
          severity: 'success'
        });
        handleCloseDialog();
      } else {
        console.error('Unerwartete API-Antwort:', response);
        setSnackbar({
          open: true,
          message: 'Unerwartete Serverantwort beim Erstellen des Benutzers',
          severity: 'error'
        });
      }
    } catch (err: unknown) {
      console.error('Fehler beim Erstellen des Benutzers:', err);
      setSnackbar({
        open: true,
        message: 'Fehler beim Erstellen des Benutzers',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  // Benutzer aktualisieren
  const updateUser = async () => {
    if (!currentUser) return;

    try {
      setLoading(true);
      const response = await axios.put<ApiResponse<IUser>>(
        `${API_BASE_URL}/users/${currentUser.id}`,
        {
          username,
          first_name: firstName,
          last_name: lastName,
          gender,
          email,
          role_id: parseInt(role, 10),
          department,
          location_id: selectedLocationId === '' ? null : selectedLocationId,
          room_id: selectedRoomId === '' ? null : selectedRoomId,
          phone,
          is_active: isActive,
          ...(password ? { password } : {})
        },
        getAuthConfig()
      );

      // Nach dem Update alle Benutzer neu laden statt lokale Manipulation
      await fetchUsers();

      setSnackbar({
        open: true,
        message: 'Benutzer erfolgreich aktualisiert',
        severity: 'success'
      });
      handleCloseDialog();
    } catch (err: unknown) {
      console.error('Fehler beim Aktualisieren des Benutzers:', err);
      setSnackbar({
        open: true,
        message: 'Fehler beim Aktualisieren des Benutzers',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  // Benutzer löschen
  const deleteUser = async (userId: number) => {
    try {
      setLoading(true);
      await axios.delete<ApiResponse<void>>(
        `${API_BASE_URL}/users/${userId}`,
        getAuthConfig()
      );

      // Nach dem Löschen alle Benutzer neu laden
      await fetchUsers();

      setSnackbar({
        open: true,
        message: 'Benutzer erfolgreich gelöscht',
        severity: 'success'
      });
    } catch (err: unknown) {
      console.error('Fehler beim Löschen des Benutzers:', err);
      setSnackbar({
        open: true,
        message: 'Fehler beim Löschen des Benutzers',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  // Benutzer zu Gruppen hinzufügen
  const addUserToGroups = async () => {
    if (!selectedUser || selectedGroups.length === 0) return;

    try {
      setLoading(true);
      await axios.post<ApiResponse<void>>(
        `${API_BASE_URL}/users/${selectedUser.id}/groups`,
        {
          group_ids: selectedGroups
        },
        getAuthConfig()
      );

      await fetchUserGroups(selectedUser.id);
      setSelectedGroups([]);
      setSnackbar({
        open: true,
        message: 'Benutzer erfolgreich zu Gruppen hinzugefügt',
        severity: 'success'
      });
    } catch (err: unknown) {
      setSnackbar({
        open: true,
        message: 'Fehler beim Hinzufügen zu Gruppen',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  // Benutzer aus Gruppe entfernen
  const removeUserFromGroup = async (groupId: number) => {
    if (!selectedUser) return;

    try {
      setLoading(true);
      await axios.delete<ApiResponse<void>>(
        `${API_BASE_URL}/users/${selectedUser.id}/groups/${groupId}`,
        getAuthConfig()
      );

      await fetchUserGroups(selectedUser.id);
      setSnackbar({
        open: true,
        message: 'Benutzer erfolgreich aus Gruppe entfernt',
        severity: 'success'
      });
    } catch (err: unknown) {
      setSnackbar({
        open: true,
        message: 'Fehler beim Entfernen aus Gruppe',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  // Dialog öffnen
  const handleOpenDialog = (type: 'create' | 'edit', user: IUser | null = null) => {
    setDialogType(type);
    if (type === 'edit' && user) {
      setCurrentUser(user);
      setUsername(user.username);
      setFirstName(user.first_name);
      setLastName(user.last_name);
      setGender(user.gender);
      setEmail(user.email);
      setRole(user.role);
      setIsActive(user.is_active);
      setPassword('');
      setConfirmPassword('');
      setDepartment(user.department);
      setSelectedLocationId(user.location_id || '');
      setSelectedRoomId(user.room_id || '');
      setPhone(user.phone);
    } else {
      setCurrentUser(null);
      setUsername('');
      setFirstName('');
      setLastName('');
      setGender('');
      setEmail('');
      setRole('');
      setPassword('');
      setConfirmPassword('');
      setIsActive(true);
      setDepartment('');
      setSelectedLocationId('');
      setSelectedRoomId('');
      setPhone('');
    }
    setOpenDialog(true);
  };

  // Dialog schließen
  const handleCloseDialog = () => {
    setOpenDialog(false);
    setCurrentUser(null);
    setUsername('');
    setFirstName('');
    setLastName('');
    setGender('');
    setEmail('');
    setRole('');
    setPassword('');
    setConfirmPassword('');
    setIsActive(true);
    setDepartment('');
    setSelectedLocationId('');
    setSelectedRoomId('');
    setPhone('');
  };

  // Dialog bestätigen
  const handleConfirmDialog = () => {
    if (dialogType === 'create') {
      createUser();
    } else {
      updateUser();
    }
  };

  // Benutzer auswählen
  const handleSelectUser = (user: IUser) => {
    setSelectedUser(user);
    fetchUserGroups(user.id);
  };

  // Gruppen auswählen
  const handleGroupSelect = (event: SelectChangeEvent<number[]>) => {
    setSelectedGroups(event.target.value as number[]);
  };

  // Snackbar schließen
  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  // Benutzer für Seitenleiste auswählen
  const handleUserSelect = (user: IUser) => {
    setSelectedUser(user);
    setTabValue(1);
    fetchUserGroups(user.id);
  };

  // Dialog zum Bearbeiten eines Benutzers öffnen
  const handleEditUser = (user: IUser) => {
    setDialogType('edit');
    setCurrentUser(user);
    setUsername(user.username);
    setFirstName(user.first_name);
    setLastName(user.last_name);
    setGender(user.gender);
    setEmail(user.email);
    setRole(user.role);
    setIsActive(user.is_active);
    setPassword('');
    setConfirmPassword('');
    setDepartment(user.department);
    setSelectedLocationId(user.location_id || '');
    setSelectedRoomId(user.room_id || '');
    setPhone(user.phone);
    setOpenDialog(true);

    if (user.location_id) {
      fetchRoomsForLocation(user.location_id);
    }
  };

  // Standort auswählen
  const handleLocationChange = (event: SelectChangeEvent<number | string>) => {
    const value = event.target.value;
    setSelectedLocationId(value === '' ? '' : Number(value));
    setSelectedRoomId(''); // Raum zurücksetzen, wenn Standort geändert wird
  };

  // Raum auswählen
  const handleRoomChange = (event: SelectChangeEvent<number | string>) => {
    const value = event.target.value;
    setSelectedRoomId(value === '' ? '' : Number(value));
  };

  // Seitenleiste mit Benutzerdetails
  const renderUserSidebar = () => {
    if (!selectedUser) return null;

    // Standortnamen aus der locations-Liste ermitteln
    const locationName = selectedUser.location_id
      ? locations.find(loc => loc.id === selectedUser.location_id)?.name || 'Unbekannt'
      : 'Kein Standort';

    // Raumnamen aus der rooms-Liste ermitteln
    const roomName = selectedUser.room_id
      ? rooms.find(r => r.id === selectedUser.room_id)?.name || 'Unbekannt'
      : 'Kein Raum';

    return (
      <Paper elevation={0} sx={{ p: 2, height: '100%' }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 3 }}>
          <Avatar
            sx={{
              width: 80,
              height: 80,
              mb: 2,
              bgcolor: theme.palette.primary.main
            }}
          >
            <PersonIcon sx={{ fontSize: 40 }} />
          </Avatar>
          <Typography variant="h6" gutterBottom>
            {selectedUser.first_name} {selectedUser.last_name}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {selectedUser.username}
          </Typography>
          <Chip
            label={selectedUser.is_active ? 'Aktiv' : 'Inaktiv'}
            color={selectedUser.is_active ? 'success' : 'error'}
            size="small"
            sx={{ mt: 1 }}
          />
        </Box>

        <Divider sx={{ mb: 2 }} />

        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            <EmailIcon fontSize="small" sx={{ mr: 1, verticalAlign: 'middle' }} />
            {selectedUser.email}
          </Typography>
          {selectedUser.department && (
            <Typography variant="body2" color="text.secondary" gutterBottom>
              <GroupIcon fontSize="small" sx={{ mr: 1, verticalAlign: 'middle' }} />
              {selectedUser.department}
            </Typography>
          )}
          <Typography variant="body2" color="text.secondary" gutterBottom>
            <SecurityIcon fontSize="small" sx={{ mr: 1, verticalAlign: 'middle' }} />
            {roles.find(r => r.name === selectedUser.role)?.label || selectedUser.role}
          </Typography>
        </Box>

        <Divider sx={{ mb: 2 }} />

        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
          <Button
            variant="outlined"
            startIcon={<EditIcon />}
            onClick={() => handleEditUser(selectedUser)}
          >
            Bearbeiten
          </Button>
          <Button
            variant="outlined"
            color="error"
            startIcon={<DeleteIcon />}
            onClick={() => deleteUser(selectedUser.id)}
          >
            Löschen
          </Button>
        </Box>
      </Paper>
    );
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <AtlasAppBar onMenuClick={() => {}} />

      <Box sx={{ p: 3, flexGrow: 1 }}>
        <Typography variant="h4" gutterBottom>
          Benutzerverwaltung
        </Typography>

        <Paper sx={{ mb: 3, p: 2 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={6} md={4}>
              <TextField
                fullWidth
                label="Benutzer suchen"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && searchUsers()}
                InputProps={{
                  endAdornment: (
                    <IconButton onClick={() => searchUsers()}>
                      <SearchIcon />
                    </IconButton>
                  )
                }}
              />
            </Grid>
            <Grid item>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => handleOpenDialog('create')}
              >
                Neuer Benutzer
              </Button>
            </Grid>
          </Grid>
        </Paper>

        <Paper>
          <Box sx={{ display: 'flex', backgroundColor: 'background.paper' }}>
            <Tabs value={tabValue} onChange={(e, value) => setTabValue(value)}>
              <Tab label="BENUTZER" icon={<PersonIcon />} />
            </Tabs>
            <Button
              sx={{
                minHeight: 48,
                px: 2,
                borderRadius: 0,
                borderBottom: tabValue === 0 ? '2px solid transparent' : '2px solid primary.main',
                color: 'text.primary',
                '&:hover': {
                  backgroundColor: 'action.hover'
                }
              }}
              startIcon={<GroupIcon />}
              onClick={() => navigate('/settings/user-groups')}
            >
              GRUPPEN
            </Button>
          </Box>

          <Box sx={{ p: 2 }}>
            <AtlasTable
              columns={columns}
              rows={users}
              loading={loading}
              onRowClick={handleSelectUser}
              heightPx={400}
              emptyMessage="Keine Benutzer gefunden"
              onEdit={(user) => handleOpenDialog('edit', user)}
              onDelete={(user) => deleteUser(user.id)}
            />
          </Box>
        </Paper>
      </Box>

      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {dialogType === 'create' ? 'Neuen Benutzer erstellen' : 'Benutzer bearbeiten'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Benutzername"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Vorname"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Nachname"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="E-Mail"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Rolle</InputLabel>
                <Select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                >
                  {roles.map((role) => (
                    <MenuItem key={role.id} value={role.name}>
                      {role.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                type="password"
                label="Passwort"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                type="password"
                label="Passwort bestätigen"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                  />
                }
                label="Aktiv"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Abteilung"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
              />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Standort</InputLabel>
                <Select
                  value={selectedLocationId}
                  onChange={handleLocationChange}
                  label="Standort"
                >
                  <MenuItem value="">
                    <em>Kein Standort</em>
                  </MenuItem>
                  {locations.map((location) => (
                    <MenuItem key={location.id} value={location.id}>
                      {location.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth disabled={!selectedLocationId}>
                <InputLabel>Raum</InputLabel>
                <Select
                  value={selectedRoomId}
                  onChange={handleRoomChange}
                  label="Raum"
                >
                  <MenuItem value="">
                    <em>Kein Raum</em>
                  </MenuItem>
                  {rooms.map((room) => (
                    <MenuItem key={room.id} value={room.id}>
                      {room.name} ({room.room_number})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Telefonnummer"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Abbrechen</Button>
          <Button onClick={handleConfirmDialog} variant="contained">
            {dialogType === 'create' ? 'Erstellen' : 'Speichern'}
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

export default Users;
