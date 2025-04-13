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
  Divider,
  Tabs,
  Tab,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Snackbar,
  Alert,
  CircularProgress,
  InputAdornment,
  FormHelperText,
  SelectChangeEvent
} from '@mui/material';
import {
  Save as SaveIcon,
  PhotoCamera as PhotoCameraIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';
import axios from 'axios';

// API-Basis-URL
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

// Typen
interface UserProfile {
  id: number;
  user_id: number;
  profile_picture?: string;
  phone?: string;
  department?: string;
  position?: string;
  bio?: string;
}

interface UserPreferences {
  id: number;
  user_id: number;
  theme: 'light' | 'dark' | 'system';
  language: 'de' | 'en';
  notifications_enabled: boolean;
  email_notifications: boolean;
  dashboard_layout?: Record<string, unknown>;
}

interface SnackbarState {
  open: boolean;
  message: string;
  severity: 'success' | 'error' | 'info' | 'warning';
}

// Helper für Authorization Header
const getAuthConfig = () => {
  const token = localStorage.getItem('token');
  return {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  };
};

// Props-Definition
interface UserProfileSettingsProps {
  userId?: number; // Optional - falls nicht gesetzt, wird der aktuelle Benutzer angenommen
  onUpdate?: (profile: UserProfile) => void;
}

const UserProfileSettings: React.FC<UserProfileSettingsProps> = ({ userId, onUpdate }) => {
  // Tabs
  const [tabValue, setTabValue] = useState<number>(0);

  // Ladezustand
  const [loading, setLoading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);

  // Benutzerprofil und Voreinstellungen
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);

  // Passwort-Änderung
  const [currentPassword, setCurrentPassword] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [showCurrentPassword, setShowCurrentPassword] = useState<boolean>(false);
  const [showNewPassword, setShowNewPassword] = useState<boolean>(false);
  const [passwordErrors, setPasswordErrors] = useState<{
    currentPassword?: string;
    newPassword?: string;
    confirmPassword?: string;
  }>({});

  // Profilbild
  const [profileImage, setProfileImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Benachrichtigungen
  const [snackbar, setSnackbar] = useState<SnackbarState>({
    open: false,
    message: '',
    severity: 'success'
  });

  // Aktuellen Benutzer laden, falls kein userId angegeben
  const [currentUserId, setCurrentUserId] = useState<number | undefined>(userId);

  // Beim Laden und bei Änderung von userId
  useEffect(() => {
    if (!currentUserId) {
      // Aktuellen Benutzer aus dem Token ermitteln
      const token = localStorage.getItem('token');
      if (token) {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setCurrentUserId(payload.id);
      }
    }

    if (currentUserId) {
      loadUserProfile();
      loadUserPreferences();
    }
  }, [currentUserId]);

  // Benutzerprofil laden
  const loadUserProfile = async () => {
    if (!currentUserId) return;

    try {
      setLoading(true);
      const response = await axios.get<{ data: UserProfile }>(
        `${API_BASE_URL}/users/${currentUserId}/profile`,
        getAuthConfig()
      );

      setProfile(response.data.data);
      if (response.data.data.profile_picture) {
        setPreviewUrl(`${API_BASE_URL}/uploads/${response.data.data.profile_picture}`);
      }
    } catch (error) {
      console.error('Fehler beim Laden des Benutzerprofils:', error);
      setSnackbar({
        open: true,
        message: 'Fehler beim Laden des Benutzerprofils',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  // Benutzervoreinstellungen laden
  const loadUserPreferences = async () => {
    if (!currentUserId) return;

    try {
      setLoading(true);
      const response = await axios.get<{ data: UserPreferences }>(
        `${API_BASE_URL}/users/${currentUserId}/preferences`,
        getAuthConfig()
      );

      setPreferences(response.data.data);
    } catch (error) {
      console.error('Fehler beim Laden der Benutzervoreinstellungen:', error);

      // Falls noch keine Voreinstellungen vorhanden sind, Standardwerte setzen
      setPreferences({
        id: 0,
        user_id: currentUserId,
        theme: 'dark',
        language: 'de',
        notifications_enabled: true,
        email_notifications: true
      });
    } finally {
      setLoading(false);
    }
  };

  // Tab wechseln
  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  // Profilfelder ändern
  const handleProfileChange = (field: keyof UserProfile) => (
    event: React.ChangeEvent<HTMLInputElement | { value: unknown }>
  ) => {
    if (!profile) return;

    const value = event.target.value;
    setProfile({
      ...profile,
      [field]: value
    });
  };

  // Voreinstellungen ändern
  const handlePreferencesChange = (field: keyof UserPreferences) => (
    event: React.ChangeEvent<HTMLInputElement> | SelectChangeEvent
  ) => {
    if (!preferences) return;

    const value =
      'type' in event.target && event.target.type === 'checkbox'
        ? (event.target as HTMLInputElement).checked
        : event.target.value;

    setPreferences({
      ...preferences,
      [field]: value
    });
  };

  // Profilbild auswählen
  const handleSelectImage = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      const file = event.target.files[0];
      setProfileImage(file);

      // Vorschau generieren
      const reader = new FileReader();
      reader.onload = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Profilbild entfernen
  const handleRemoveImage = () => {
    setProfileImage(null);
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Profil speichern
  const handleSaveProfile = async () => {
    if (!profile || !currentUserId) return;

    try {
      setSaving(true);

      // Profildaten speichern
      const response = await axios.put<{ data: UserProfile }>(
        `${API_BASE_URL}/users/${currentUserId}/profile`,
        profile,
        getAuthConfig()
      );

      // Wenn ein neues Profilbild ausgewählt wurde, dieses hochladen
      if (profileImage) {
        const formData = new FormData();
        formData.append('profile_picture', profileImage);

        const uploadResponse = await axios.post<{ data: { profile_picture: string } }>(
          `${API_BASE_URL}/users/${currentUserId}/profile/picture`,
          formData,
          {
            ...getAuthConfig(),
            headers: {
              ...getAuthConfig().headers,
              'Content-Type': 'multipart/form-data'
            }
          }
        );

        // Aktualisiertes Profil setzen
        setProfile({
          ...response.data.data,
          profile_picture: uploadResponse.data.data.profile_picture
        });

        // Profilbild zurücksetzen
        setProfileImage(null);
      } else {
        // Aktualisiertes Profil setzen
        setProfile(response.data.data);
      }

      // Callback aufrufen, falls vorhanden
      if (onUpdate) {
        onUpdate(response.data.data);
      }

      setSnackbar({
        open: true,
        message: 'Profil erfolgreich gespeichert',
        severity: 'success'
      });
    } catch (error) {
      console.error('Fehler beim Speichern des Profils:', error);
      setSnackbar({
        open: true,
        message: 'Fehler beim Speichern des Profils',
        severity: 'error'
      });
    } finally {
      setSaving(false);
    }
  };

  // Voreinstellungen speichern
  const handleSavePreferences = async () => {
    if (!preferences || !currentUserId) return;

    try {
      setSaving(true);

      const response = await axios.put<{ data: UserPreferences }>(
        `${API_BASE_URL}/users/${currentUserId}/preferences`,
        preferences,
        getAuthConfig()
      );

      setPreferences(response.data.data);

      // Theme anwenden
      document.documentElement.setAttribute('data-theme', preferences.theme);

      setSnackbar({
        open: true,
        message: 'Einstellungen erfolgreich gespeichert',
        severity: 'success'
      });
    } catch (error) {
      console.error('Fehler beim Speichern der Einstellungen:', error);
      setSnackbar({
        open: true,
        message: 'Fehler beim Speichern der Einstellungen',
        severity: 'error'
      });
    } finally {
      setSaving(false);
    }
  };

  // Passwort validieren
  const validatePassword = (): boolean => {
    const errors: {
      currentPassword?: string;
      newPassword?: string;
      confirmPassword?: string;
    } = {};

    if (!currentPassword) {
      errors.currentPassword = 'Bitte geben Sie Ihr aktuelles Passwort ein';
    }

    if (!newPassword) {
      errors.newPassword = 'Bitte geben Sie ein neues Passwort ein';
    } else if (newPassword.length < 8) {
      errors.newPassword = 'Das Passwort muss mindestens 8 Zeichen lang sein';
    }

    if (!confirmPassword) {
      errors.confirmPassword = 'Bitte bestätigen Sie Ihr neues Passwort';
    } else if (newPassword !== confirmPassword) {
      errors.confirmPassword = 'Die Passwörter stimmen nicht überein';
    }

    setPasswordErrors(errors);

    return Object.keys(errors).length === 0;
  };

  // Passwort ändern
  const handleChangePassword = async () => {
    if (!currentUserId) return;

    // Passwort validieren
    if (!validatePassword()) {
      return;
    }

    try {
      setSaving(true);

      await axios.post(
        `${API_BASE_URL}/users/${currentUserId}/password`,
        {
          current_password: currentPassword,
          new_password: newPassword
        },
        getAuthConfig()
      );

      // Felder zurücksetzen
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordErrors({});

      setSnackbar({
        open: true,
        message: 'Passwort erfolgreich geändert',
        severity: 'success'
      });
    } catch (error: any) {
      console.error('Fehler beim Ändern des Passworts:', error);

      // API-Fehlermeldung auswerten
      if (error.response?.data?.message === 'Falsches aktuelles Passwort') {
        setPasswordErrors({
          ...passwordErrors,
          currentPassword: 'Das aktuelle Passwort ist falsch'
        });
      } else {
        setSnackbar({
          open: true,
          message: 'Fehler beim Ändern des Passworts',
          severity: 'error'
        });
      }
    } finally {
      setSaving(false);
    }
  };

  // Snackbar schließen
  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  // Ladeanzeige
  if (loading && !profile && !preferences) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab label="Profil" id="tab-0" />
          <Tab label="Passwort ändern" id="tab-1" />
          <Tab label="Einstellungen" id="tab-2" />
        </Tabs>

        {/* Profil-Tab */}
        {tabValue === 0 && profile && (
          <Box sx={{ p: 3 }}>
            <Grid container spacing={3}>
              <Grid item xs={12} sm={4} md={3} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <Box sx={{ position: 'relative' }}>
                  <Avatar
                    src={previewUrl || ''}
                    sx={{
                      width: 150,
                      height: 150,
                      mb: 2,
                      border: '1px solid',
                      borderColor: 'divider'
                    }}
                  />
                  <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                    <input
                      accept="image/*"
                      style={{ display: 'none' }}
                      id="profile-picture-upload"
                      type="file"
                      onChange={handleSelectImage}
                      ref={fileInputRef}
                    />
                    <label htmlFor="profile-picture-upload">
                      <Button
                        variant="outlined"
                        component="span"
                        startIcon={<PhotoCameraIcon />}
                        size="small"
                      >
                        Bild wählen
                      </Button>
                    </label>
                    {previewUrl && (
                      <IconButton
                        color="error"
                        size="small"
                        onClick={handleRemoveImage}
                      >
                        <DeleteIcon />
                      </IconButton>
                    )}
                  </Box>
                </Box>
                <Typography variant="caption" sx={{ mt: 1, textAlign: 'center' }}>
                  Empfohlene Größe: 300x300 Pixel
                </Typography>
              </Grid>
              <Grid item xs={12} sm={8} md={9}>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="Telefon"
                      fullWidth
                      variant="outlined"
                      value={profile.phone || ''}
                      onChange={handleProfileChange('phone')}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="Abteilung"
                      fullWidth
                      variant="outlined"
                      value={profile.department || ''}
                      onChange={handleProfileChange('department')}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="Position"
                      fullWidth
                      variant="outlined"
                      value={profile.position || ''}
                      onChange={handleProfileChange('position')}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      label="Über mich"
                      fullWidth
                      variant="outlined"
                      value={profile.bio || ''}
                      onChange={handleProfileChange('bio')}
                      multiline
                      rows={4}
                    />
                  </Grid>
                </Grid>
              </Grid>
              <Grid item xs={12} sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<SaveIcon />}
                  onClick={handleSaveProfile}
                  disabled={saving}
                >
                  {saving ? 'Wird gespeichert...' : 'Profil speichern'}
                </Button>
              </Grid>
            </Grid>
          </Box>
        )}

        {/* Passwort-Tab */}
        {tabValue === 1 && (
          <Box sx={{ p: 3 }}>
            <Grid container spacing={3} maxWidth="md">
              <Grid item xs={12}>
                <Typography variant="subtitle1" gutterBottom>
                  Ändern Sie Ihr Passwort
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Das Passwort sollte mindestens 8 Zeichen lang sein und Groß- und Kleinbuchstaben, Zahlen sowie Sonderzeichen enthalten.
                </Typography>
                <Divider sx={{ mb: 3 }} />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label="Aktuelles Passwort"
                  type={showCurrentPassword ? 'text' : 'password'}
                  fullWidth
                  variant="outlined"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  error={!!passwordErrors.currentPassword}
                  helperText={passwordErrors.currentPassword}
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
                  sx={{ mb: 2 }}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label="Neues Passwort"
                  type={showNewPassword ? 'text' : 'password'}
                  fullWidth
                  variant="outlined"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  error={!!passwordErrors.newPassword}
                  helperText={passwordErrors.newPassword}
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
                  sx={{ mb: 2 }}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label="Neues Passwort bestätigen"
                  type="password"
                  fullWidth
                  variant="outlined"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  error={!!passwordErrors.confirmPassword}
                  helperText={passwordErrors.confirmPassword}
                  sx={{ mb: 3 }}
                />
              </Grid>
              <Grid item xs={12} sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={handleChangePassword}
                  disabled={saving}
                >
                  {saving ? 'Wird geändert...' : 'Passwort ändern'}
                </Button>
              </Grid>
            </Grid>
          </Box>
        )}

        {/* Einstellungen-Tab */}
        {tabValue === 2 && preferences && (
          <Box sx={{ p: 3 }}>
            <Grid container spacing={3} maxWidth="md">
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth variant="outlined">
                  <InputLabel id="theme-label">Design</InputLabel>
                  <Select
                    labelId="theme-label"
                    id="theme-select"
                    value={preferences.theme}
                    onChange={handlePreferencesChange('theme')}
                    label="Design"
                  >
                    <MenuItem value="light">Hell</MenuItem>
                    <MenuItem value="dark">Dunkel</MenuItem>
                    <MenuItem value="system">Systemeinstellung</MenuItem>
                  </Select>
                  <FormHelperText>Wählen Sie das Erscheinungsbild der Anwendung</FormHelperText>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth variant="outlined">
                  <InputLabel id="language-label">Sprache</InputLabel>
                  <Select
                    labelId="language-label"
                    id="language-select"
                    value={preferences.language}
                    onChange={handlePreferencesChange('language')}
                    label="Sprache"
                  >
                    <MenuItem value="de">Deutsch</MenuItem>
                    <MenuItem value="en">Englisch</MenuItem>
                  </Select>
                  <FormHelperText>Wählen Sie die Anzeigesprache</FormHelperText>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle1" gutterBottom sx={{ mt: 2 }}>
                  Benachrichtigungen
                </Typography>
                <Divider sx={{ mb: 2 }} />
              </Grid>
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={preferences.notifications_enabled}
                      onChange={handlePreferencesChange('notifications_enabled')}
                      color="primary"
                    />
                  }
                  label="Benachrichtigungen in der Anwendung anzeigen"
                />
              </Grid>
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={preferences.email_notifications}
                      onChange={handlePreferencesChange('email_notifications')}
                      color="primary"
                    />
                  }
                  label="E-Mail-Benachrichtigungen erhalten"
                />
              </Grid>
              <Grid item xs={12} sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<SaveIcon />}
                  onClick={handleSavePreferences}
                  disabled={saving}
                >
                  {saving ? 'Wird gespeichert...' : 'Einstellungen speichern'}
                </Button>
              </Grid>
            </Grid>
          </Box>
        )}
      </Paper>

      {/* Benachrichtigungen */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={5000}
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

export default UserProfileSettings;
