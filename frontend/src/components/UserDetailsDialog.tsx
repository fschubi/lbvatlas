import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Tabs,
  Tab,
  Typography,
  Grid,
  TextField,
  CircularProgress,
  Alert,
  Switch,
  FormControlLabel,
  Divider,
  Chip,
} from '@mui/material';
import {
  Person as PersonIcon,
  Group as GroupIcon,
  Settings as SettingsIcon,
  Devices as DevicesIcon,
  VpnKey as VpnKeyIcon,
  Extension as ExtensionIcon,
} from '@mui/icons-material';
import { usersApi, ApiResponse } from '../utils/api';
import { User } from '../types/user';
import { Device } from '../types/device';
import { License } from '../types/license';
import { Accessory } from '../types/accessory';
import handleApiError from '../utils/errorHandler';
import AtlasTable, { AtlasColumn } from './AtlasTable';

interface UserDetailDialogProps {
  userId: number | null;
  open: boolean;
  onClose: () => void;
}

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
      id={`user-details-tabpanel-${index}`}
      aria-labelledby={`user-details-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
};

const UserDetailDialog: React.FC<UserDetailDialogProps> = ({
  userId,
  open,
  onClose,
}) => {
  const [tabValue, setTabValue] = useState(0);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<User>>({
    username: '',
    email: '',
    first_name: '',
    last_name: '',
    role: 'user',
    active: true,
    email_notifications_enabled: true,
    location: '',
    room: '',
    department: '',
    password_expires_at: null,
    password_changed_at: null,
    failed_login_attempts: 0,
    account_locked_until: null,
    phone: '',
    login_allowed: true,
    email_verified: false
  });

  // State für die Einstellungen
  const [isLoginActive, setIsLoginActive] = useState<boolean>(true);
  const [canReceiveEmails, setCanReceiveEmails] = useState<boolean>(true);
  const [settingsLoading, setSettingsLoading] = useState<boolean>(false);
  const [settingsError, setSettingsError] = useState<string | null>(null);

  // States für Asset-Daten
  const [devices, setDevices] = useState<Device[]>([]);
  const [devicesLoading, setDevicesLoading] = useState<boolean>(false);
  const [devicesError, setDevicesError] = useState<string | null>(null);
  const [licenses, setLicenses] = useState<License[]>([]);
  const [licensesLoading, setLicensesLoading] = useState<boolean>(false);
  const [licensesError, setLicensesError] = useState<string | null>(null);
  const [accessories, setAccessories] = useState<Accessory[]>([]);
  const [accessoriesLoading, setAccessoriesLoading] = useState<boolean>(false);
  const [accessoriesError, setAccessoriesError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserAndAssets = async () => {
      if (!open) {
        resetForm();
        return;
      }

      if (!userId) {
        // Neuer Benutzer
        resetForm();
        return;
      }

      // Bestehender Benutzer
      setLoading(true);
      setError(null);

      try {
        const userResponse = await usersApi.getById(userId);
        if (userResponse.success && userResponse.data) {
          setUser(userResponse.data);
          setFormData(userResponse.data);
          setIsLoginActive(userResponse.data.active ?? true);
          setCanReceiveEmails(userResponse.data.email_notifications_enabled ?? true);

          // Assets nur laden wenn ein bestehender Benutzer
          const [devicesResponse, licensesResponse, accessoriesResponse] = await Promise.all([
            usersApi.getUserDevices(userId),
            usersApi.getUserLicenses(userId),
            usersApi.getUserAccessories(userId)
          ]);

          if (devicesResponse.success) setDevices(devicesResponse.data);
          if (licensesResponse.success) setLicenses(licensesResponse.data);
          if (accessoriesResponse.success) setAccessories(accessoriesResponse.data);
        }
      } catch (err) {
        const errorMessage = handleApiError(err);
        setError(`Fehler beim Laden der Benutzerdaten: ${errorMessage}`);
      } finally {
        setLoading(false);
      }
    };

    fetchUserAndAssets();
  }, [userId, open]);

  const resetForm = () => {
    setUser(null);
    setFormData({
      username: '',
      email: '',
      first_name: '',
      last_name: '',
      role: 'user',
      active: true,
      email_notifications_enabled: true,
      location: '',
      room: '',
      department: '',
      password_expires_at: null,
      password_changed_at: null,
      failed_login_attempts: 0,
      account_locked_until: null,
      phone: '',
      login_allowed: true,
      email_verified: false
    });
    setError(null);
    setDevices([]);
    setLicenses([]);
    setAccessories([]);
    setTabValue(0);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      if (userId) {
        // Bestehenden Benutzer aktualisieren
        await usersApi.update(userId, formData);
      } else {
        // Neuen Benutzer erstellen
        await usersApi.create(formData);
      }
      onClose();
    } catch (err) {
      const errorMessage = handleApiError(err);
      setError(`Fehler beim ${userId ? 'Aktualisieren' : 'Erstellen'} des Benutzers: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  type UserSetting = 'active' | 'can_receive_emails';

  const handleSettingChange = async (settingName: UserSetting, value: boolean) => {
    if (!userId || !user) return;

    setSettingsLoading(true);
    setSettingsError(null);

    const previousValues = { active: isLoginActive, can_receive_emails: canReceiveEmails };
    if (settingName === 'active') setIsLoginActive(value);
    if (settingName === 'can_receive_emails') setCanReceiveEmails(value);

    try {
      const updateData: Partial<User> = { [settingName]: value };
      const response = await usersApi.update(userId, updateData);

      if (!response.success || !response.data) {
        throw new Error(response.message || `Fehler beim Speichern der Einstellung ${settingName}.`);
      }

      setUser(prev => prev ? { ...prev, ...response.data } : null);

      setIsLoginActive(response.data.active ?? true);
      setCanReceiveEmails(response.data.can_receive_emails ?? true);

    } catch (err) {
      if (settingName === 'active') setIsLoginActive(previousValues.active);
      if (settingName === 'can_receive_emails') setCanReceiveEmails(previousValues.can_receive_emails);

      const errorMessage = handleApiError(err);
      setSettingsError(`Fehler: ${errorMessage}`);
    } finally {
      setSettingsLoading(false);
    }
  };

  const renderField = (label: string, value: string | number | undefined | null) => (
    <Grid item xs={12} sm={6} sx={{ display: 'flex', flexDirection: 'column', mb: 1 }}>
      <Typography variant="caption" color="text.secondary" sx={{ mb: -0.5 }}>
        {label}
      </Typography>
      <Typography variant="body1">
        {value ?? '-'}
      </Typography>
    </Grid>
  );

  const deviceColumns: AtlasColumn[] = [{ label: 'Name', dataKey: 'name' }, { label: 'Seriennummer', dataKey: 'serialNumber' }];
  const licenseColumns: AtlasColumn[] = [{ label: 'Name', dataKey: 'name' }, { label: 'Key', dataKey: 'key_code' }];
  const accessoryColumns: AtlasColumn[] = [{ label: 'Name', dataKey: 'name' }, { label: 'Typ', dataKey: 'type' }];

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        {userId ? 'Benutzer bearbeiten' : 'Neuer Benutzer'}
      </DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
          <Tabs value={tabValue} onChange={handleTabChange}>
            <Tab icon={<PersonIcon />} label="Übersicht" />
            {userId && (
              <>
                <Tab icon={<GroupIcon />} label="Gruppen" />
                <Tab icon={<SettingsIcon />} label="Einstellungen" />
                <Tab icon={<DevicesIcon />} label="Geräte" />
                <Tab icon={<VpnKeyIcon />} label="Lizenzen" />
                <Tab icon={<ExtensionIcon />} label="Zubehör" />
              </>
            )}
          </Tabs>
        </Box>

        <TabPanel value={tabValue} index={0}>
          <Grid container spacing={2}>
            {/* Persönliche Informationen */}
            <Grid item xs={12}>
              <Typography variant="h6" sx={{ mb: 2 }}>Persönliche Informationen</Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Benutzername"
                name="username"
                value={formData.username}
                onChange={handleInputChange}
                required
                margin="normal"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="E-Mail"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleInputChange}
                required
                margin="normal"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Vorname"
                name="first_name"
                value={formData.first_name}
                onChange={handleInputChange}
                margin="normal"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Nachname"
                name="last_name"
                value={formData.last_name}
                onChange={handleInputChange}
                margin="normal"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Telefon"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                margin="normal"
              />
            </Grid>

            {/* Standort Informationen */}
            <Grid item xs={12}>
              <Typography variant="h6" sx={{ mt: 2, mb: 2 }}>Standort</Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Standort"
                name="location"
                value={formData.location}
                onChange={handleInputChange}
                margin="normal"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Raum"
                name="room"
                value={formData.room}
                onChange={handleInputChange}
                margin="normal"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Abteilung"
                name="department"
                value={formData.department}
                onChange={handleInputChange}
                margin="normal"
              />
            </Grid>

            {/* Konto Einstellungen */}
            <Grid item xs={12}>
              <Typography variant="h6" sx={{ mt: 2, mb: 2 }}>Konto Einstellungen</Typography>
            </Grid>
            {!userId && (
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Passwort"
                  name="password"
                  type="password"
                  value={formData.password || ''}
                  onChange={handleInputChange}
                  required
                  margin="normal"
                />
              </Grid>
            )}
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.active}
                    onChange={handleInputChange}
                    name="active"
                  />
                }
                label="Aktiv"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.email_notifications_enabled}
                    onChange={handleInputChange}
                    name="email_notifications_enabled"
                  />
                }
                label="E-Mail-Benachrichtigungen"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.login_allowed}
                    onChange={handleInputChange}
                    name="login_allowed"
                  />
                }
                label="Login erlaubt"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.email_verified}
                    onChange={handleInputChange}
                    name="email_verified"
                  />
                }
                label="E-Mail verifiziert"
              />
            </Grid>

            {/* Nur anzeigen wenn Benutzer existiert */}
            {userId && (
              <>
                <Grid item xs={12}>
                  <Typography variant="h6" sx={{ mt: 2, mb: 2 }}>Konto Status</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Fehlgeschlagene Login-Versuche"
                    name="failed_login_attempts"
                    value={formData.failed_login_attempts}
                    InputProps={{ readOnly: true }}
                    margin="normal"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Konto gesperrt bis"
                    name="account_locked_until"
                    value={formData.account_locked_until || '-'}
                    InputProps={{ readOnly: true }}
                    margin="normal"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Passwort geändert am"
                    name="password_changed_at"
                    value={formData.password_changed_at || '-'}
                    InputProps={{ readOnly: true }}
                    margin="normal"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Passwort läuft ab am"
                    name="password_expires_at"
                    value={formData.password_expires_at || '-'}
                    InputProps={{ readOnly: true }}
                    margin="normal"
                  />
                </Grid>
              </>
            )}
          </Grid>
        </TabPanel>

        {userId && (
          <>
            <TabPanel value={tabValue} index={1}>
              <Typography variant="h6">Gruppenverwaltung</Typography>
              <AtlasTable columns={[{ label: 'Gruppenname', dataKey: 'name' }]} rows={[]} loading={false} emptyMessage="Benutzer ist in keinen Gruppen." height={300} />
            </TabPanel>

            <TabPanel value={tabValue} index={2}>
              <Typography variant="h6">Kontoeinstellungen</Typography>
              {settingsError && (
                <Alert severity="error" sx={{ mb: 2 }}>{settingsError}</Alert>
              )}
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, position: 'relative' }}>
                {settingsLoading && (
                  <CircularProgress size={24} sx={{ position: 'absolute', top: 8, right: 8 }} />
                )}
                <FormControlLabel
                  control={
                    <Switch
                      checked={isLoginActive}
                      onChange={(e) => handleSettingChange('active', e.target.checked)}
                      name="loginActive"
                      color="success"
                      disabled={settingsLoading}
                    />
                  }
                  label="Login aktiviert"
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={canReceiveEmails}
                      onChange={(e) => handleSettingChange('can_receive_emails', e.target.checked)}
                      name="emailActive"
                      color="primary"
                      disabled={settingsLoading}
                    />
                  }
                  label="E-Mail-Benachrichtigungen aktiviert"
                />
                <Divider sx={{ my: 2 }} />
                <Typography variant="body2" color="text.secondary">
                  Hinweis: Änderungen werden direkt gespeichert.
                </Typography>
              </Box>
            </TabPanel>

            <TabPanel value={tabValue} index={3}>
              <Typography variant="h6">Zugewiesene Geräte</Typography>
              <AtlasTable columns={deviceColumns} rows={[]} loading={false} emptyMessage="Keine Geräte zugeordnet." height={300} />
            </TabPanel>

            <TabPanel value={tabValue} index={4}>
              <Typography variant="h6">Zugewiesene Lizenzen</Typography>
              <AtlasTable columns={licenseColumns} rows={[]} loading={false} emptyMessage="Keine Lizenzen zugeordnet." height={300} />
            </TabPanel>

            <TabPanel value={tabValue} index={5}>
              <Typography variant="h6">Zugewiesenes Zubehör</Typography>
              <AtlasTable columns={accessoryColumns} rows={[]} loading={false} emptyMessage="Kein Zubehör zugeordnet." height={300} />
            </TabPanel>
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Abbrechen</Button>
        <Button
          onClick={handleSave}
          variant="contained"
          color="primary"
          disabled={loading}
        >
          {loading ? <CircularProgress size={24} /> : (userId ? 'Speichern' : 'Erstellen')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default UserDetailDialog;
