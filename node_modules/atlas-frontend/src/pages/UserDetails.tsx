import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Tabs,
  Tab,
  Button,
  Chip,
  CircularProgress,
  Divider,
  IconButton,
  TextField,
  MenuItem,
  Snackbar,
  Alert,
  Avatar,
  Switch,
  FormControlLabel,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Tooltip
} from '@mui/material';
import {
  Edit as EditIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  ArrowBack as ArrowBackIcon,
  History as HistoryIcon,
  LockReset as ResetPasswordIcon,
  Delete as DeleteIcon,
  Person as PersonIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  Business as DepartmentIcon,
  LocationOn as LocationIcon,
  SupervisorAccount as RoleIcon,
  VpnKey as PermissionsIcon,
  Computer as DeviceIcon,
  Mouse as AccessoryIcon,
  Key as LicenseIcon
} from '@mui/icons-material';
import AtlasTable, { AtlasColumn } from '../components/AtlasTable';
import api from '../utils/api'; // Annahme: api importieren
// TODO: Korrekte Typen importieren
// import { User, UserHistory, Role } from '../types/userTypes';
// import { Asset } from '../types/assetTypes';
// import { Accessory } from '../types/accessoryTypes';
// import { License } from '../types/licenseTypes';
import ConfirmationDialog from '../components/ConfirmationDialog'; // Import ConfirmationDialog
// TODO: usePermissions Hook importieren
// import { usePermissions } from '../hooks/usePermissions';

// --- Mock Typen als Platzhalter ---
type User = any;
type UserHistory = any;
type Role = any;
type Asset = any;
type Accessory = any;
type License = any;
// --- Ende Mock Typen ---

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = (props) => {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`user-tabpanel-${index}`}
      aria-labelledby={`user-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
};

// --- Mock Daten Generatoren ---
const generateMockHistory = (count: number): UserHistory[] => {
  // ... (Implementierung angepasst für User)
  return []; // Placeholder
};

const generateMockAssets = (count: number): Asset[] => {
  // ... (Implementierung)
  return []; // Placeholder
};
const generateMockAccessories = (count: number): Accessory[] => {
 // ... (Implementierung)
 return []; // Placeholder
};
const generateMockLicenses = (count: number): License[] => {
 // ... (Implementierung)
 return []; // Placeholder
};

const generateMockUser = (id: string): User => ({
  id: id,
  username: `user_${id}`,
  firstName: 'Max',
  lastName: 'Mustermann',
  email: `max.mustermann${id}@example.com`,
  phone: `0123-${id}56789`,
  department: { id: 1, name: 'IT-Abteilung' },
  department_id: 1,
  location: { id: 1, name: 'Hauptgebäude' },
  location_id: 1,
  role: { id: 2, name: 'Benutzer' },
  role_id: 2,
  isActive: true,
  lastLogin: new Date(Date.now() - 86400000 * Math.floor(Math.random() * 5)).toISOString(),
  createdAt: new Date(2022, 0, 15).toISOString(),
  notes: 'Standardbenutzer mit Zugriff auf Projekt X.'
});
// --- Ende Mock Daten Generatoren ---

const UserDetails: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  // const { userPermissions } = usePermissions(); // TODO: Aktivieren
  const userPermissions = ['users.update', 'users.delete', 'users.reset_password', 'users.history', 'users.view_assets', 'roles.read']; // Placeholder

  // Berechtigungen
  const canEdit = userPermissions.includes('users.update');
  const canDelete = userPermissions.includes('users.delete');
  const canResetPassword = userPermissions.includes('users.reset_password');
  const canViewHistory = userPermissions.includes('users.history');
  const canViewAssets = userPermissions.includes('users.view_assets');
  const canViewRoles = userPermissions.includes('roles.read');

  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [formData, setFormData] = useState<any>(null);
  const [history, setHistory] = useState<UserHistory[]>([]);
  const [assignedAssets, setAssignedAssets] = useState<Asset[]>([]);
  const [assignedAccessories, setAssignedAccessories] = useState<Accessory[]>([]);
  const [assignedLicenses, setAssignedLicenses] = useState<License[]>([]);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success'
  });
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false); // State für Dialog
  const [itemToDelete, setItemToDelete] = useState<User | null>(null); // State für zu löschenden User

  // --- Dropdown Optionen --- //
  const [roleOptions, setRoleOptions] = useState<Role[]>([]);
  const [locationOptions, setLocationOptions] = useState<{ id: number; name: string }[]>([]);
  const [departmentOptions, setDepartmentOptions] = useState<{ id: number; name: string }[]>([]);
  // --- Ende Dropdown Optionen --- //

  const loadUserData = useCallback(async () => {
    if (!userId) return;
    try {
      setLoading(true);
      // TODO: usersApi Call aktivieren
      // const response = await usersApi.getById(userId);
      // const userData = response.data;
      const userData = generateMockUser(userId);

      setUser(userData);
      setFormData({
        ...userData,
        // Konvertiere ggf. Daten für Formular
        department_id: userData.department_id ?? '',
        location_id: userData.location_id ?? '',
        role_id: userData.role_id ?? ''
      });

      // Verwandte Daten laden (Mock)
      if (canViewHistory) setHistory(generateMockHistory(10));
      if (canViewAssets) {
        setAssignedAssets(generateMockAssets(3));
        setAssignedAccessories(generateMockAccessories(2));
        setAssignedLicenses(generateMockLicenses(1));
      }

    } catch (error) {
      console.error('Fehler beim Laden der Benutzerdaten:', error);
      setSnackbar({ open: true, message: 'Fehler beim Laden der Benutzerdaten', severity: 'error' });
    } finally {
      setLoading(false);
    }
  }, [userId, canViewHistory, canViewAssets]);

  const loadDropdownOptions = useCallback(async () => {
    try {
      const [
        rolesRes,
        locationsRes,
        departmentsRes
      ] = await Promise.all([
        canViewRoles ? roleApi.getAll() : Promise.resolve([]), // Nur laden, wenn Berechtigung
        locationApi.getAll(),
        departmentApi.getAll()
      ]);

      setRoleOptions(rolesRes || []);
      setLocationOptions(locationsRes || []);
      setDepartmentOptions(departmentsRes || []);

    } catch (error) {
      console.error('Fehler beim Laden der Dropdown-Optionen:', error);
      setSnackbar({ open: true, message: 'Fehler beim Laden einiger Dropdown-Optionen.', severity: 'error' });
    }
  }, [canViewRoles]);

  useEffect(() => {
    loadUserData();
    loadDropdownOptions();
  }, [loadUserData, loadDropdownOptions]);

  // --- Handler --- //
  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

   const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | { name?: string; value: unknown }>) => {
    const target = e.target as HTMLInputElement;
    const { name, value, type, checked } = target;
    setFormData((prev: any) => ({ ...prev, [name as string]: type === 'checkbox' ? checked : value }));
  };

  const handleSelectChange = (name: string, value: string | number | null) => {
     setFormData((prevData: any) => ({
         ...prevData,
         [name]: value === '' ? null : value
     }));
  };

  const handleEditMode = () => setEditMode(true);

  const handleCancelEdit = () => {
    setFormData({
      ...user,
      department_id: user.department_id ?? '',
      location_id: user.location_id ?? '',
      role_id: user.role_id ?? ''
    });
    setEditMode(false);
  };

  const handleSaveChanges = async () => {
    if (!userId || !canEdit) return;
    try {
      setLoading(true);
      const dataToSend = { ...formData };
      // Konvertiere leere Strings zu null etc.
      Object.keys(dataToSend).forEach(key => {
        if (dataToSend[key] === '') dataToSend[key] = null;
      });
      // Passwort sollte hier nicht gesendet werden!
      delete dataToSend.password;
      delete dataToSend.confirmPassword;

      // TODO: usersApi Call aktivieren
      // await usersApi.update(userId, dataToSend);
      console.log('Speichern (simuliert): ', dataToSend);
      await new Promise(resolve => setTimeout(resolve, 500));

      setEditMode(false);
      setSnackbar({ open: true, message: 'Benutzer erfolgreich aktualisiert (simuliert)', severity: 'success' });
      loadUserData(); // Daten neu laden
    } catch (error: any) {
      console.error('Fehler beim Aktualisieren des Benutzers:', error);
      const errorMsg = error.response?.data?.message || 'Fehler beim Aktualisieren des Benutzers';
      setSnackbar({ open: true, message: errorMsg, severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = () => {
      if (!userId || !canResetPassword) return;
      // TODO: Implementiere Passwort-Reset Logik (z.B. Dialog öffnen, API call)
      alert('Passwort zurücksetzen (TODO)');
       setSnackbar({ open: true, message: 'Passwort-Reset angefordert (simuliert)', severity: 'info' });
  };

  // --- Delete Handling mit ConfirmationDialog ---
  const handleDeleteUser = () => {
    if (user && canDelete) {
      setItemToDelete(user); // User zum Löschen vormerken
      setConfirmDialogOpen(true); // Dialog öffnen
    }
  };

  const executeDelete = async () => {
    if (!itemToDelete || !canDelete) return;
    try {
      setLoading(true);
      // TODO: usersApi Call aktivieren
      // await usersApi.delete(itemToDelete.id);
      console.log('Löschen (simuliert): ', itemToDelete.id);
      await new Promise(resolve => setTimeout(resolve, 500));

      setSnackbar({ open: true, message: `Benutzer "${itemToDelete.username}" erfolgreich gelöscht (simuliert)`, severity: 'success' });
      navigate('/users'); // Zurück zur Liste
    } catch (error: any) {
      console.error('Fehler beim Löschen des Benutzers:', error);
      const errorMsg = error.response?.data?.message || 'Fehler beim Löschen des Benutzers';
      setSnackbar({ open: true, message: errorMsg, severity: 'error' });
    } finally {
      setConfirmDialogOpen(false);
      setItemToDelete(null);
      setLoading(false);
    }
  };

  const handleCloseConfirmDialog = () => {
    setConfirmDialogOpen(false);
    setItemToDelete(null);
  };
  // --- Ende Delete Handling ---

  const handleCloseSnackbar = () => setSnackbar({ ...snackbar, open: false });

  const handleGoBack = () => navigate('/users');

  // Spalten für Tabellen
  const historyColumns: AtlasColumn<UserHistory>[] = [ { label: 'ID', dataKey: 'id' /* ... */ } ];
  const assetColumns: AtlasColumn<Asset>[] = [ { label: 'ID', dataKey: 'id' /* ... */ } ];
  const accessoryColumns: AtlasColumn<Accessory>[] = [ { label: 'ID', dataKey: 'id' /* ... */ } ];
  const licenseColumns: AtlasColumn<License>[] = [ { label: 'ID', dataKey: 'id' /* ... */ } ];

  // Ladeanzeige
  if (loading && !user) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 'calc(100vh - 64px)' }}>
        <CircularProgress />
      </Box>
    );
  }

  // Fehleranzeige
  if (!user && !loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Button variant="outlined" startIcon={<ArrowBackIcon />} onClick={handleGoBack} sx={{ mb: 2 }}>Zurück</Button>
        <Alert severity="error">Benutzer nicht gefunden oder Fehler beim Laden.</Alert>
      </Box>
    );
  }

  const displayData = editMode ? formData : user;
  const userAvatarText = `${displayData?.firstName?.charAt(0) || ''}${displayData?.lastName?.charAt(0) || ''}`.toUpperCase();

  return (
    <Box sx={{ p: 3 }}>
      {/* --- Header --- */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Button variant="outlined" startIcon={<ArrowBackIcon />} onClick={handleGoBack}>
          Zurück zur Übersicht
        </Button>
        <Box>
          {canResetPassword && !editMode && (
               <Tooltip title="Passwort zurücksetzen">
                 <IconButton color="warning" onClick={handleResetPassword} sx={{ ml: 1 }} disabled={loading}>
                    <ResetPasswordIcon />
                 </IconButton>
              </Tooltip>
          )}
          {canDelete && (
            <IconButton
              color="error"
              onClick={handleDeleteUser} // Öffnet Dialog
              disabled={editMode || loading}
              sx={{ ml: 1 }}
            >
              <DeleteIcon />
            </IconButton>
          )}
          {canEdit && (
            <>
              {editMode ? (
                <>
                  <IconButton color="primary" onClick={handleSaveChanges} disabled={loading} sx={{ ml: 1 }}><SaveIcon /></IconButton>
                  <IconButton color="default" onClick={handleCancelEdit} disabled={loading} sx={{ ml: 1 }}><CancelIcon /></IconButton>
                </>
              ) : (
                <IconButton color="primary" onClick={handleEditMode} disabled={loading} sx={{ ml: 1 }}><EditIcon /></IconButton>
              )}
            </>
          )}
        </Box>
      </Box>

      {/* --- Titelbereich --- */}
      <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item>
             <Avatar sx={{ width: 56, height: 56, bgcolor: 'primary.main' }}>{userAvatarText}</Avatar>
          </Grid>
          <Grid item xs>
            <Typography variant="h5" component="h1" gutterBottom>
              {displayData?.firstName} {displayData?.lastName}
            </Typography>
            <Typography variant="subtitle1" color="text.secondary" gutterBottom>
              @{displayData?.username}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', mt: 1, flexWrap: 'wrap', gap: 1 }}>
               <Chip icon={<RoleIcon />} label={displayData?.role?.name || 'Unbekannt'} size="small" variant="outlined" />
               {displayData?.department?.name && <Chip icon={<DepartmentIcon />} label={displayData.department.name} size="small" variant="outlined" />}
               {displayData?.location?.name && <Chip icon={<LocationIcon />} label={displayData.location.name} size="small" variant="outlined" />}
            </Box>
          </Grid>
           <Grid item sx={{ textAlign: 'right' }}>
             <FormControlLabel
                control={<Switch checked={Boolean(displayData?.isActive)} onChange={handleInputChange} name="isActive" disabled={!editMode} />}
                label={displayData?.isActive ? "Aktiv" : "Inaktiv"}
                labelPlacement="start"
             />
             <Typography variant="caption" display="block" color="text.secondary">
                Letzter Login: {displayData?.lastLogin ? new Date(displayData.lastLogin).toLocaleString('de-DE') : 'Nie'}
             </Typography>
           </Grid>
        </Grid>
      </Paper>

      {/* --- Tabs --- */}
      <Paper elevation={3} sx={{ mb: 3 }}>
        <Tabs value={tabValue} onChange={handleTabChange} variant="scrollable" scrollButtons="auto" sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tab label="Details" id="user-tab-0" aria-controls="user-tabpanel-0" />
          <Tab label="Zugewiesene Assets" id="user-tab-1" aria-controls="user-tabpanel-1" disabled={!canViewAssets}/>
          <Tab label="Berechtigungen" id="user-tab-2" aria-controls="user-tabpanel-2" />
          {canViewHistory && <Tab label="Verlauf" id="user-tab-3" aria-controls="user-tabpanel-3" />}
        </Tabs>

        {/* --- Details-Tab --- */}
        <TabPanel value={tabValue} index={0}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
                <Typography variant="h6" sx={{ mb: 2 }}>Kontaktdaten</Typography>
                <TextField fullWidth label="Vorname" name="firstName" value={displayData?.firstName || ''} onChange={handleInputChange} disabled={!editMode} margin="dense" required />
                <TextField fullWidth label="Nachname" name="lastName" value={displayData?.lastName || ''} onChange={handleInputChange} disabled={!editMode} margin="dense" required />
                 <TextField fullWidth label="Benutzername" name="username" value={displayData?.username || ''} onChange={handleInputChange} disabled={!editMode} margin="dense" required />
                <TextField fullWidth label="E-Mail" name="email" type="email" value={displayData?.email || ''} onChange={handleInputChange} disabled={!editMode} margin="dense" required />
                <TextField fullWidth label="Telefon" name="phone" value={displayData?.phone || ''} onChange={handleInputChange} disabled={!editMode} margin="dense" />
            </Grid>
            <Grid item xs={12} md={6}>
                <Typography variant="h6" sx={{ mb: 2 }}>Organisation & Rolle</Typography>
                 <TextField
                    fullWidth select label="Abteilung" name="department_id"
                    value={displayData?.department_id ?? ''}
                    onChange={(e) => handleSelectChange('department_id', e.target.value)}
                    disabled={!editMode} margin="dense"
                  >
                     <MenuItem value=""><em>Keine Auswahl</em></MenuItem>
                    {departmentOptions.map(opt => <MenuItem key={opt.id} value={opt.id}>{opt.name}</MenuItem>)}
                 </TextField>
                 <TextField
                    fullWidth select label="Standort" name="location_id"
                    value={displayData?.location_id ?? ''}
                    onChange={(e) => handleSelectChange('location_id', e.target.value)}
                    disabled={!editMode} margin="dense"
                  >
                     <MenuItem value=""><em>Keine Auswahl</em></MenuItem>
                    {locationOptions.map(opt => <MenuItem key={opt.id} value={opt.id}>{opt.name}</MenuItem>)}
                 </TextField>
                 <TextField
                    fullWidth select label="Rolle" name="role_id"
                    value={displayData?.role_id ?? ''}
                    onChange={(e) => handleSelectChange('role_id', e.target.value)}
                    disabled={!editMode || !canViewRoles} margin="dense" required // Deaktiviert, wenn keine Rollen geladen/gesehen werden können
                  >
                     <MenuItem value=""><em>Keine Auswahl</em></MenuItem>
                     {roleOptions.map(opt => <MenuItem key={opt.id} value={opt.id}>{opt.name}</MenuItem>)}
                 </TextField>
                 <TextField fullWidth label="Notizen" name="notes" value={displayData?.notes || ''} onChange={handleInputChange} disabled={!editMode} margin="dense" multiline rows={4}/>
            </Grid>
             {/* Optional: Passwortfelder im Edit-Modus */}
             {editMode && (
                <Grid item xs={12}>
                    <Divider sx={{ my: 2 }} />
                    <Typography variant="h6" sx={{ mb: 2 }}>Passwort ändern (Optional)</Typography>
                    <TextField fullWidth type="password" label="Neues Passwort" name="password" onChange={handleInputChange} margin="dense" helperText="Leer lassen, um Passwort nicht zu ändern."/>
                    <TextField fullWidth type="password" label="Passwort bestätigen" name="confirmPassword" onChange={handleInputChange} margin="dense" />
                 </Grid>
             )}
          </Grid>
        </TabPanel>

        {/* --- Zugewiesene Assets-Tab --- */}
        <TabPanel value={tabValue} index={1}>
             <Typography variant="h6" sx={{ mb: 2 }}>Zugewiesene Geräte</Typography>
             <Box sx={{ height: 250, mb: 3 }}> {/* Feste Höhe für die Tabelle */}
                 <AtlasTable columns={assetColumns} rows={assignedAssets} heightPx={250} />
             </Box>

             <Typography variant="h6" sx={{ mb: 2 }}>Zugewiesenes Zubehör</Typography>
              <Box sx={{ height: 250, mb: 3 }}>
                <AtlasTable columns={accessoryColumns} rows={assignedAccessories} heightPx={250}/>
             </Box>

              <Typography variant="h6" sx={{ mb: 2 }}>Zugewiesene Lizenzen</Typography>
              <Box sx={{ height: 250 }}>
                <AtlasTable columns={licenseColumns} rows={assignedLicenses} heightPx={250}/>
             </Box>
        </TabPanel>

        {/* --- Berechtigungen-Tab --- */}
        <TabPanel value={tabValue} index={2}>
             <Typography variant="h6" sx={{ mb: 2 }}>Rolle & Berechtigungen</Typography>
             <Typography>Rolle: <strong>{displayData?.role?.name || 'Nicht zugewiesen'}</strong></Typography>
             {/* TODO: Anzeige der tatsächlichen Berechtigungen der Rolle */}
             <Typography sx={{ mt: 1 }}>Berechtigungen werden von der zugewiesenen Rolle geerbt.</Typography>
             {/* Optional: Button zum Rollen-Management? */}
        </TabPanel>

        {/* --- Verlauf-Tab --- */}
        {canViewHistory && (
            <TabPanel value={tabValue} index={3}>
                <Typography variant="h6" sx={{ mb: 3 }}>Änderungsverlauf</Typography>
                <Box sx={{ position: 'relative', height: 400 }}>
                    <AtlasTable columns={historyColumns} rows={history} heightPx={400} />
                </Box>
            </TabPanel>
        )}
      </Paper>

      {/* --- Confirmation Dialog für Löschen --- */}
      <ConfirmationDialog
        open={confirmDialogOpen}
        onClose={handleCloseConfirmDialog}
        onConfirm={executeDelete}
        title="Benutzer löschen"
        message={`Möchten Sie den Benutzer "${itemToDelete?.username}" (${itemToDelete?.firstName} ${itemToDelete?.lastName}) wirklich unwiderruflich löschen? Zugehörige Assets müssen manuell neu zugewiesen werden.`}
        confirmText="Löschen"
        cancelText="Abbrechen"
      />

      {/* --- Snackbar --- */}
      <Snackbar open={snackbar.open} autoHideDuration={6000} onClose={handleCloseSnackbar}>
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default UserDetails;
