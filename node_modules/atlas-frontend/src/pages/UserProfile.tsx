import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Grid,
  Avatar,
  IconButton,
  Tab,
  Tabs,
  Divider,
  Alert,
  Snackbar,
  CircularProgress,
  FormControlLabel,
  Switch,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  SelectChangeEvent,
  InputAdornment
} from '@mui/material';
import {
  Person as PersonIcon,
  Edit as EditIcon,
  Save as SaveIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Settings as SettingsIcon,
  Lock as LockIcon,
  Photo as PhotoIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import axios from 'axios';
import AtlasAppBar from '../components/AtlasAppBar';

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

// Passwort-Validierung gegen die Richtlinien
const validatePassword = (password: string, passwordPolicy: any) => {
  const errors = [];

  if (password.length < passwordPolicy.min_length) {
    errors.push(`Passwort muss mindestens ${passwordPolicy.min_length} Zeichen lang sein.`);
  }

  if (passwordPolicy.require_uppercase && !/[A-Z]/.test(password)) {
    errors.push('Passwort muss mindestens einen Großbuchstaben enthalten.');
  }

  if (passwordPolicy.require_lowercase && !/[a-z]/.test(password)) {
    errors.push('Passwort muss mindestens einen Kleinbuchstaben enthalten.');
  }

  if (passwordPolicy.require_numbers && !/[0-9]/.test(password)) {
    errors.push('Passwort muss mindestens eine Zahl enthalten.');
  }

  if (passwordPolicy.require_special_chars && !/[^A-Za-z0-9]/.test(password)) {
    errors.push('Passwort muss mindestens ein Sonderzeichen enthalten.');
  }

  return errors;
};

interface SnackbarState {
  open: boolean;
  message: string;
  severity: 'success' | 'error' | 'info' | 'warning';
}

interface ProfileData {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  display_name: string;
  department_name: string;
  location_name: string;
  room_name: string;
  role: string;
  profile_image?: string;
  settings?: {
    theme: 'light' | 'dark';
    language: 'de' | 'en';
    notifications_enabled: boolean;
  };
}

interface PasswordPolicy {
  min_length: number;
  require_uppercase: boolean;
  require_lowercase: boolean;
  require_numbers: boolean;
  require_special_chars: boolean;
  password_expiry_days: number;
}

const UserProfile: React.FC = () => {
  const theme = useTheme();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [tabValue, setTabValue] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [profileData, setProfileData] = useState<ProfileData | null>(null);

  // Profilbearbeitung
  const [editMode, setEditMode] = useState<boolean>(false);
  const [firstName, setFirstName] = useState<string>('');
  const [lastName, setLastName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [displayName, setDisplayName] = useState<string>('');

  // Passwortänderung
  const [currentPassword, setCurrentPassword] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [passwordErrors, setPasswordErrors] = useState<string[]>([]);
  const [showCurrentPassword, setShowCurrentPassword] = useState<boolean>(false);
  const [showNewPassword, setShowNewPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);
  const [passwordPolicy, setPasswordPolicy] = useState<PasswordPolicy | null>(null);

  // Einstellungen
  const [userTheme, setUserTheme] = useState<'light' | 'dark'>('dark');
  const [language, setLanguage] = useState<'de' | 'en'>('de');
  const [notificationsEnabled, setNotificationsEnabled] = useState<boolean>(true);

  // Profilbild
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Snackbar
  const [snackbar, setSnackbar] = useState<SnackbarState>({
    open: false,
    message: '',
    severity: 'success'
  });

  // Profilbild auswählen
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      setSelectedFile(file);

      // Vorschau generieren
      const reader = new FileReader();
      reader.onload = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Tab wechseln
  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  // Passwort-Aktualisierung validieren
  const validatePasswordUpdate = () => {
    if (!passwordPolicy) return false;

    const errors = [];

    if (!currentPassword) {
      errors.push('Bitte geben Sie Ihr aktuelles Passwort ein.');
    }

    if (newPassword !== confirmPassword) {
      errors.push('Das neue Passwort und die Bestätigung stimmen nicht überein.');
    }

    const policyErrors = validatePassword(newPassword, passwordPolicy);
    errors.push(...policyErrors);

    setPasswordErrors(errors);

    return errors.length === 0;
  };

  // Passwortänderung speichern
  const handlePasswordChange = async () => {
    if (!validatePasswordUpdate()) {
      return;
    }

    try {
      setLoading(true);
      const response = await axios.post(
        `${API_BASE_URL}/passwords/change`,
        {
          currentPassword,
          newPassword
        },
        getAuthConfig()
      );

      if (response.data.success) {
        setSnackbar({
          open: true,
          message: 'Passwort erfolgreich geändert.',
          severity: 'success'
        });

        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setPasswordErrors([]);
      }
    } catch (error: any) {
      console.error('Fehler bei der Passwortänderung:', error);
      setSnackbar({
        open: true,
        message: error.response?.data?.message || 'Fehler bei der Passwortänderung',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  // Profiländerungen speichern
  const handleProfileUpdate = async () => {
    try {
      setLoading(true);
      const response = await axios.put(
        `${API_BASE_URL}/users/profile`,
        {
          first_name: firstName,
          last_name: lastName,
          email,
          display_name: displayName
        },
        getAuthConfig()
      );

      if (response.data.success) {
        setProfileData(response.data.data);
        setSnackbar({
          open: true,
          message: 'Profil erfolgreich aktualisiert.',
          severity: 'success'
        });
        setEditMode(false);
      }
    } catch (error: any) {
      console.error('Fehler bei der Profilaktualisierung:', error);
      setSnackbar({
        open: true,
        message: error.response?.data?.message || 'Fehler bei der Profilaktualisierung',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  // Profilbild hochladen
  const handleProfileImageUpload = async () => {
    if (!selectedFile) return;

    try {
      setLoading(true);
      const formData = new FormData();
      formData.append('profileImage', selectedFile);

      const response = await axios.post(
        `${API_BASE_URL}/users/profile-image`,
        formData,
        {
          ...getAuthConfig(),
          headers: {
            ...getAuthConfig().headers,
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      if (response.data.success) {
        setProfileData({
          ...profileData!,
          profile_image: response.data.data.profile_image
        });

        setSnackbar({
          open: true,
          message: 'Profilbild erfolgreich aktualisiert.',
          severity: 'success'
        });

        setSelectedFile(null);
      }
    } catch (error: any) {
      console.error('Fehler beim Hochladen des Profilbilds:', error);
      setSnackbar({
        open: true,
        message: error.response?.data?.message || 'Fehler beim Hochladen des Profilbilds',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  // Einstellungen speichern
  const handleSettingsSave = async () => {
    try {
      setLoading(true);
      const response = await axios.put(
        `${API_BASE_URL}/users/settings`,
        {
          theme: userTheme,
          language,
          notifications_enabled: notificationsEnabled
        },
        getAuthConfig()
      );

      if (response.data.success) {
        setProfileData({
          ...profileData!,
          settings: {
            theme: userTheme,
            language,
            notifications_enabled: notificationsEnabled
          }
        });

        setSnackbar({
          open: true,
          message: 'Einstellungen erfolgreich gespeichert.',
          severity: 'success'
        });
      }
    } catch (error: any) {
      console.error('Fehler beim Speichern der Einstellungen:', error);
      setSnackbar({
        open: true,
        message: error.response?.data?.message || 'Fehler beim Speichern der Einstellungen',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  // Profildaten laden
  const fetchProfileData = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/users/profile`, getAuthConfig());

      if (response.data) {
        setProfileData(response.data);

        // Formularfelder vorausfüllen
        setFirstName(response.data.first_name || '');
        setLastName(response.data.last_name || '');
        setEmail(response.data.email || '');
        setDisplayName(response.data.display_name || '');

        // Einstellungen setzen
        if (response.data.settings) {
          setUserTheme(response.data.settings.theme || 'dark');
          setLanguage(response.data.settings.language || 'de');
          setNotificationsEnabled(response.data.settings.notifications_enabled || true);
        }
      }
    } catch (error) {
      console.error('Fehler beim Laden der Profildaten:', error);
      setSnackbar({
        open: true,
        message: 'Fehler beim Laden der Profildaten',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  // Passwort-Richtlinien laden
  const fetchPasswordPolicy = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/passwords/policy`, getAuthConfig());

      if (response.data.success) {
        setPasswordPolicy(response.data.data);
      }
    } catch (error) {
      console.error('Fehler beim Laden der Passwort-Richtlinien:', error);
    }
  };

  // Bei Änderung des Passworts wird die Validierung durchgeführt
  useEffect(() => {
    if (newPassword && passwordPolicy) {
      const errors = validatePassword(newPassword, passwordPolicy);
      setPasswordErrors(errors);
    }
  }, [newPassword, passwordPolicy]);

  // Beim ersten Laden Daten abrufen
  useEffect(() => {
    fetchProfileData();
    fetchPasswordPolicy();
  }, []);

  // Snackbar schließen
  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  // Profil-Tab-Inhalt
  const renderProfileTab = () => {
    if (!profileData) return <CircularProgress />;

    return (
      <Box sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <Box sx={{ position: 'relative', mr: 3 }}>
            <Avatar
              src={previewUrl || profileData.profile_image}
              sx={{
                width: 100,
                height: 100,
                border: `2px solid ${theme.palette.primary.main}`
              }}
            >
              {!profileData.profile_image && !previewUrl &&
                `${profileData.first_name?.charAt(0) || ''}${profileData.last_name?.charAt(0) || ''}`}
            </Avatar>

            <IconButton
              sx={{
                position: 'absolute',
                bottom: 0,
                right: 0,
                backgroundColor: theme.palette.primary.main,
                '&:hover': { backgroundColor: theme.palette.primary.dark }
              }}
              onClick={() => fileInputRef.current?.click()}
            >
              <PhotoIcon fontSize="small" />
            </IconButton>

            <input
              type="file"
              ref={fileInputRef}
              style={{ display: 'none' }}
              accept="image/*"
              onChange={handleFileChange}
            />
          </Box>

          <Box>
            <Typography variant="h5">
              {profileData.display_name || `${profileData.first_name} ${profileData.last_name}`}
            </Typography>
            <Typography variant="body2" color="textSecondary">
              {profileData.role === 'admin' ? 'Administrator' :
               profileData.role === 'manager' ? 'Manager' :
               profileData.role === 'user' ? 'Benutzer' : 'Gast'}
            </Typography>
            <Typography variant="body2" color="textSecondary">
              {profileData.email}
            </Typography>
          </Box>

          <Box sx={{ ml: 'auto' }}>
            <Button
              variant={editMode ? "contained" : "outlined"}
              startIcon={editMode ? <SaveIcon /> : <EditIcon />}
              onClick={() => {
                if (editMode) {
                  handleProfileUpdate();
                } else {
                  setEditMode(true);
                }
              }}
            >
              {editMode ? 'Speichern' : 'Bearbeiten'}
            </Button>
          </Box>
        </Box>

        {selectedFile && (
          <Box sx={{ mb: 3 }}>
            <Button
              variant="contained"
              onClick={handleProfileImageUpload}
              disabled={loading}
            >
              Profilbild hochladen
            </Button>
          </Box>
        )}

        <Divider sx={{ my: 2 }} />

        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Vorname"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              disabled={!editMode}
              margin="normal"
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Nachname"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              disabled={!editMode}
              margin="normal"
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Anzeigename"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              disabled={!editMode}
              margin="normal"
              helperText="Dieser Name wird in der Anwendung angezeigt"
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="E-Mail"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={!editMode}
              margin="normal"
              type="email"
            />
          </Grid>
        </Grid>

        <Divider sx={{ my: 3 }} />

        <Typography variant="h6" gutterBottom>
          Weitere Informationen
        </Typography>

        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              label="Benutzername"
              value={profileData.username}
              disabled
              margin="normal"
            />
          </Grid>

          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              label="Abteilung"
              value={profileData.department_name || 'Keine Abteilung'}
              disabled
              margin="normal"
            />
          </Grid>

          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              label="Standort"
              value={`${profileData.location_name || 'Kein Standort'}${profileData.room_name ? ` / ${profileData.room_name}` : ''}`}
              disabled
              margin="normal"
            />
          </Grid>
        </Grid>
      </Box>
    );
  };

  // Passwort-Tab-Inhalt
  const renderPasswordTab = () => {
    return (
      <Box sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>
          Passwort ändern
        </Typography>

        {passwordPolicy && (
          <Paper sx={{ p: 2, mb: 3, backgroundColor: theme.palette.background.default }}>
            <Typography variant="subtitle2" gutterBottom>
              Passwortrichtlinien:
            </Typography>
            <Box component="ul" sx={{ pl: 2 }}>
              <Box component="li">
                <Typography variant="body2">
                  Mindestens {passwordPolicy.min_length} Zeichen
                </Typography>
              </Box>
              {passwordPolicy.require_uppercase && (
                <Box component="li">
                  <Typography variant="body2">
                    Mindestens ein Großbuchstabe
                  </Typography>
                </Box>
              )}
              {passwordPolicy.require_lowercase && (
                <Box component="li">
                  <Typography variant="body2">
                    Mindestens ein Kleinbuchstabe
                  </Typography>
                </Box>
              )}
              {passwordPolicy.require_numbers && (
                <Box component="li">
                  <Typography variant="body2">
                    Mindestens eine Zahl
                  </Typography>
                </Box>
              )}
              {passwordPolicy.require_special_chars && (
                <Box component="li">
                  <Typography variant="body2">
                    Mindestens ein Sonderzeichen
                  </Typography>
                </Box>
              )}
              <Box component="li">
                <Typography variant="body2">
                  Passwort läuft nach {passwordPolicy.password_expiry_days} Tagen ab
                </Typography>
              </Box>
            </Box>
          </Paper>
        )}

        <Grid container spacing={3}>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Aktuelles Passwort"
              type={showCurrentPassword ? 'text' : 'password'}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              margin="normal"
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      edge="end"
                    >
                      {showCurrentPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                    </IconButton>
                  </InputAdornment>
                )
              }}
            />
          </Grid>

          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Neues Passwort"
              type={showNewPassword ? 'text' : 'password'}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              margin="normal"
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      edge="end"
                    >
                      {showNewPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                    </IconButton>
                  </InputAdornment>
                )
              }}
            />
          </Grid>

          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Neues Passwort bestätigen"
              type={showConfirmPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              margin="normal"
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      edge="end"
                    >
                      {showConfirmPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                    </IconButton>
                  </InputAdornment>
                )
              }}
            />
          </Grid>
        </Grid>

        {passwordErrors.length > 0 && (
          <Box sx={{ mt: 2 }}>
            {passwordErrors.map((error, index) => (
              <Alert key={index} severity="error" sx={{ mb: 1 }}>
                {error}
              </Alert>
            ))}
          </Box>
        )}

        <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            variant="contained"
            color="primary"
            onClick={handlePasswordChange}
            disabled={loading || !currentPassword || !newPassword || !confirmPassword || passwordErrors.length > 0}
            startIcon={<LockIcon />}
          >
            Passwort ändern
          </Button>
        </Box>
      </Box>
    );
  };

  // Einstellungen-Tab-Inhalt
  const renderSettingsTab = () => {
    return (
      <Box sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>
          Benutzereinstellungen
        </Typography>

        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <FormControl fullWidth margin="normal">
              <InputLabel id="theme-select-label">Theme</InputLabel>
              <Select
                labelId="theme-select-label"
                value={userTheme}
                label="Theme"
                onChange={(e: SelectChangeEvent) => setUserTheme(e.target.value as 'light' | 'dark')}
              >
                <MenuItem value="light">Light Mode</MenuItem>
                <MenuItem value="dark">Dark Mode</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} md={6}>
            <FormControl fullWidth margin="normal">
              <InputLabel id="language-select-label">Sprache</InputLabel>
              <Select
                labelId="language-select-label"
                value={language}
                label="Sprache"
                onChange={(e: SelectChangeEvent) => setLanguage(e.target.value as 'de' | 'en')}
              >
                <MenuItem value="de">Deutsch</MenuItem>
                <MenuItem value="en">Englisch</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12}>
            <FormControlLabel
              control={
                <Switch
                  checked={notificationsEnabled}
                  onChange={(e) => setNotificationsEnabled(e.target.checked)}
                  color="primary"
                />
              }
              label="E-Mail-Benachrichtigungen aktivieren"
            />
          </Grid>
        </Grid>

        <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            variant="contained"
            color="primary"
            onClick={handleSettingsSave}
            disabled={loading}
            startIcon={<SaveIcon />}
          >
            Einstellungen speichern
          </Button>
        </Box>
      </Box>
    );
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <AtlasAppBar onMenuClick={() => {}} />

      <Box sx={{ flexGrow: 1, p: 3, overflow: 'auto' }}>
        <Typography variant="h4" gutterBottom>
          Mein Profil
        </Typography>

        <Paper sx={{ mb: 3 }}>
          <Tabs
            value={tabValue}
            onChange={handleTabChange}
            indicatorColor="primary"
            textColor="primary"
            variant="fullWidth"
          >
            <Tab icon={<PersonIcon />} label="Profil" />
            <Tab icon={<LockIcon />} label="Passwort" />
            <Tab icon={<SettingsIcon />} label="Einstellungen" />
          </Tabs>

          <Box>
            {tabValue === 0 && renderProfileTab()}
            {tabValue === 1 && renderPasswordTab()}
            {tabValue === 2 && renderSettingsTab()}
          </Box>
        </Paper>
      </Box>

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

export default UserProfile;
